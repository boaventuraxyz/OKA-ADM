-- Additive platform foundation. This migration deliberately preserves every
-- legacy table and column while introducing Auth/RBAC, campaign lifecycle,
-- auditability, and safer lead retention semantics.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('master', 'admin', 'editor');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'campaign_status'
  ) then
    create type public.campaign_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

create schema if not exists private;
revoke all privileges on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'editor',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_email_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_email_length
      check (email is null or char_length(email) <= 320);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) <= 160);
  end if;
end $$;

create index if not exists profiles_email_normalized_idx
  on public.profiles (lower(btrim(email)))
  where email is not null and btrim(email) <> '';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all privileges on function private.set_updated_at()
  from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before insert or update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    is_active
  )
  values (
    new.id,
    left(lower(nullif(btrim(new.email), '')), 320),
    left(
      nullif(
        btrim(
          coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        ''
      ),
      160
    ),
    'editor'::public.app_role,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all privileges on function private.handle_new_auth_user_profile()
  from public, anon, authenticated;

drop trigger if exists platform_create_profile_after_auth_user_insert on auth.users;
create trigger platform_create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function private.handle_new_auth_user_profile();

-- Backfill is authorization-safe: every pre-existing user starts as an
-- inactive editor. User metadata is used only for a display label.
insert into public.profiles (
  id,
  email,
  display_name,
  role,
  is_active,
  created_at,
  updated_at
)
select
  u.id,
  left(lower(nullif(btrim(u.email), '')), 320),
  left(
    nullif(
      btrim(
        coalesce(
          u.raw_user_meta_data ->> 'full_name',
          u.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    160
  ),
  'editor'::public.app_role,
  false,
  coalesce(u.created_at, now()),
  coalesce(u.updated_at, u.created_at, now())
from auth.users u
on conflict (id) do nothing;

create or replace function private.has_role(allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role = any(allowed)
    );
$$;

revoke all privileges on function private.has_role(public.app_role[])
  from public, anon, authenticated, service_role;
grant execute on function private.has_role(public.app_role[])
  to authenticated;

alter table public.campanhas
  add column if not exists status public.campaign_status,
  add column if not exists slug text,
  add column if not exists theme_key text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists form_config jsonb,
  add column if not exists settings jsonb;

update public.campanhas
set status = case
  when coalesce(ativa, false) then 'published'::public.campaign_status
  else 'draft'::public.campaign_status
end
where status is null;

update public.campanhas
set theme_key = case coalesce(tema, 1)
  when 2 then 'editorial'
  when 3 then 'manifesto'
  when 4 then 'impact-dark'
  else 'cover'
end
where theme_key is null or btrim(theme_key) = '';

with normalized as (
  select
    id,
    left(
      trim(
        both '-'
        from regexp_replace(
          translate(
            lower(coalesce(titulo, '')),
            'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
            'aaaaaaeeeeiiiiooooouuuucnyy'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      70
    ) as raw_slug
  from public.campanhas
  where slug is null or btrim(slug) = ''
), prepared as (
  select
    id,
    case when raw_slug = '' then 'campaign' else raw_slug end as base_slug
  from normalized
), ranked as (
  select
    id,
    base_slug,
    count(*) over (partition by base_slug) as same_slug_count
  from prepared
), assigned as (
  select
    ranked.id,
    case
      when ranked.same_slug_count = 1
        and not exists (
          select 1
          from public.campanhas existing
          where existing.id <> ranked.id
            and lower(existing.slug) = lower(ranked.base_slug)
        )
        then ranked.base_slug
      else left(ranked.base_slug, 70) || '-' || ranked.id::text
    end as generated_slug
  from ranked
)
update public.campanhas campanha
set slug = assigned.generated_slug
from assigned
where campanha.id = assigned.id;

update public.campanhas
set
  created_at = coalesce(
    created_at,
    criado_em at time zone 'America/Sao_Paulo',
    now()
  ),
  updated_at = coalesce(
    updated_at,
    criado_em at time zone 'America/Sao_Paulo',
    now()
  ),
  form_config = coalesce(form_config, '{}'::jsonb),
  settings = coalesce(settings, '{}'::jsonb)
where created_at is null
   or updated_at is null
   or form_config is null
   or settings is null;

update public.campanhas
set published_at = coalesce(published_at, created_at)
where status = 'published'::public.campaign_status
  and published_at is null;

alter table public.campanhas
  alter column status set not null,
  alter column theme_key set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column form_config set default '{}'::jsonb,
  alter column form_config set not null,
  alter column settings set default '{}'::jsonb,
  alter column settings set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_slug_valid'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_slug_valid
      check (
        slug is null
        or (
          char_length(slug) between 1 and 120
          and slug = lower(slug)
          and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_theme_key_valid'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_theme_key_valid
      check (
        char_length(theme_key) between 1 and 80
        and theme_key = lower(theme_key)
        and theme_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_seo_lengths'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_seo_lengths
      check (
        (meta_title is null or char_length(meta_title) <= 120)
        and (meta_description is null or char_length(meta_description) <= 320)
        and (og_title is null or char_length(og_title) <= 120)
        and (og_description is null or char_length(og_description) <= 320)
        and (og_image is null or char_length(og_image) <= 2048)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_og_image_valid'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_og_image_valid
      check (og_image is null or og_image ~* '^(https://|/)');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_form_config_object'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_form_config_object
      check (jsonb_typeof(form_config) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_settings_object'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_settings_object
      check (jsonb_typeof(settings) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_created_by_fkey'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campanhas_updated_by_fkey'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_updated_by_fkey
      foreign key (updated_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists campanhas_slug_normalized_uidx
  on public.campanhas (lower(slug))
  where slug is not null and btrim(slug) <> '';

create index if not exists campanhas_candidato_id_idx
  on public.campanhas (candidato_id);

create index if not exists campanhas_status_updated_at_idx
  on public.campanhas (status, updated_at desc);

create index if not exists campanhas_theme_key_idx
  on public.campanhas (theme_key);

create index if not exists campanhas_created_by_idx
  on public.campanhas (created_by)
  where created_by is not null;

create index if not exists campanhas_updated_by_idx
  on public.campanhas (updated_by)
  where updated_by is not null;

create or replace function private.sync_campaign_legacy_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  legacy_theme_key text;
begin
  legacy_theme_key := case coalesce(new.tema, 1)
    when 2 then 'editorial'
    when 3 then 'manifesto'
    when 4 then 'impact-dark'
    else 'cover'
  end;

  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case
        when coalesce(new.ativa, false) then 'published'::public.campaign_status
        else 'draft'::public.campaign_status
      end;
    else
      new.ativa := new.status = 'published'::public.campaign_status;
    end if;

    if new.theme_key is null or btrim(new.theme_key) = '' then
      new.theme_key := legacy_theme_key;
    elsif new.theme_key = 'cover' then
      new.tema := 1;
    elsif new.theme_key = 'editorial' then
      new.tema := 2;
    elsif new.theme_key = 'manifesto' then
      new.tema := 3;
    elsif new.theme_key = 'impact-dark' then
      new.tema := 4;
    end if;
  else
    if new.status is distinct from old.status then
      new.ativa := new.status = 'published'::public.campaign_status;
    elsif new.ativa is distinct from old.ativa then
      new.status := case
        when coalesce(new.ativa, false) then 'published'::public.campaign_status
        else 'draft'::public.campaign_status
      end;
    end if;

    if new.theme_key is distinct from old.theme_key then
      if new.theme_key = 'cover' then
        new.tema := 1;
      elsif new.theme_key = 'editorial' then
        new.tema := 2;
      elsif new.theme_key = 'manifesto' then
        new.tema := 3;
      elsif new.theme_key = 'impact-dark' then
        new.tema := 4;
      end if;
    elsif new.tema is distinct from old.tema then
      new.theme_key := legacy_theme_key;
    end if;
  end if;

  if new.status = 'published'::public.campaign_status
    and new.published_at is null then
    new.published_at := now();
  end if;

  if new.status = 'archived'::public.campaign_status
    and new.archived_at is null then
    new.archived_at := now();
  end if;

  return new;
end;
$$;

revoke all privileges on function private.sync_campaign_legacy_fields()
  from public, anon, authenticated;

create or replace function private.set_campaign_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor_id;
  else
    new.created_by := old.created_by;
  end if;

  new.updated_by := actor_id;
  return new;
end;
$$;

revoke all privileges on function private.set_campaign_actor()
  from public, anon, authenticated;

drop trigger if exists campaigns_10_sync_legacy_fields on public.campanhas;
create trigger campaigns_10_sync_legacy_fields
before insert or update on public.campanhas
for each row execute function private.sync_campaign_legacy_fields();

drop trigger if exists campaigns_20_set_actor on public.campanhas;
create trigger campaigns_20_set_actor
before insert or update on public.campanhas
for each row execute function private.set_campaign_actor();

drop trigger if exists campaigns_90_set_updated_at on public.campanhas;
create trigger campaigns_90_set_updated_at
before insert or update on public.campanhas
for each row execute function private.set_updated_at();

alter table public.assinaturas
  add column if not exists source text,
  add column if not exists consented_at timestamptz,
  add column if not exists responses jsonb,
  add column if not exists metadata jsonb,
  add column if not exists user_agent text;

update public.assinaturas
set
  source = coalesce(nullif(btrim(source), ''), 'public_form'),
  responses = coalesce(responses, '{}'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb)
where source is null
   or btrim(source) = ''
   or responses is null
   or metadata is null;

alter table public.assinaturas
  alter column source set default 'public_form',
  alter column source set not null,
  alter column responses set default '{}'::jsonb,
  alter column responses set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assinaturas_source_length'
      and conrelid = 'public.assinaturas'::regclass
  ) then
    alter table public.assinaturas
      add constraint assinaturas_source_length
      check (char_length(source) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'assinaturas_responses_object'
      and conrelid = 'public.assinaturas'::regclass
  ) then
    alter table public.assinaturas
      add constraint assinaturas_responses_object
      check (jsonb_typeof(responses) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'assinaturas_metadata_object'
      and conrelid = 'public.assinaturas'::regclass
  ) then
    alter table public.assinaturas
      add constraint assinaturas_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'assinaturas_user_agent_length'
      and conrelid = 'public.assinaturas'::regclass
  ) then
    alter table public.assinaturas
      add constraint assinaturas_user_agent_length
      check (user_agent is null or char_length(user_agent) <= 512);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'assinaturas_campanha_id_fkey'
      and conrelid = 'public.assinaturas'::regclass
      and confdeltype <> 'r'
  ) then
    alter table public.assinaturas
      drop constraint assinaturas_campanha_id_fkey;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'assinaturas_campanha_id_fkey'
      and conrelid = 'public.assinaturas'::regclass
  ) then
    alter table public.assinaturas
      add constraint assinaturas_campanha_id_fkey
      foreign key (campanha_id)
      references public.campanhas(id)
      on delete restrict
      not valid;
  end if;
end $$;

alter table public.assinaturas
  validate constraint assinaturas_campanha_id_fkey;

create index if not exists assinaturas_campanha_assinado_em_idx
  on public.assinaturas (campanha_id, assinado_em desc);

create unique index if not exists assinaturas_campanha_email_normalized_uidx
  on public.assinaturas (campanha_id, lower(btrim(email_assinante)))
  where email_assinante is not null and btrim(email_assinante) <> '';

create unique index if not exists assinaturas_campanha_phone_normalized_uidx
  on public.assinaturas (
    campanha_id,
    regexp_replace(numero_assinante, '[^0-9]', '', 'g')
  )
  where numero_assinante is not null
    and btrim(numero_assinante) <> ''
    and regexp_replace(numero_assinante, '[^0-9]', '', 'g') <> '';

create table if not exists public.campaign_activity (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campanhas(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_activity_action_valid'
      and conrelid = 'public.campaign_activity'::regclass
  ) then
    alter table public.campaign_activity
      add constraint campaign_activity_action_valid
      check (
        action in (
          'created',
          'edited',
          'published',
          'unpublished',
          'duplicated',
          'archived'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_activity_details_object'
      and conrelid = 'public.campaign_activity'::regclass
  ) then
    alter table public.campaign_activity
      add constraint campaign_activity_details_object
      check (jsonb_typeof(details) = 'object');
  end if;
end $$;

create index if not exists campaign_activity_campaign_created_at_idx
  on public.campaign_activity (campaign_id, created_at desc);

create index if not exists campaign_activity_user_created_at_idx
  on public.campaign_activity (user_id, created_at desc)
  where user_id is not null;

alter table public.profiles enable row level security;
alter table public.candidatos enable row level security;
alter table public.campanhas enable row level security;
alter table public.assinaturas enable row level security;
alter table public.campaign_activity enable row level security;

revoke all privileges on type public.app_role
  from public, anon, authenticated;
revoke all privileges on type public.campaign_status
  from public, anon, authenticated;
grant usage on type public.app_role, public.campaign_status
  to authenticated, service_role;

revoke all privileges on table public.profiles
  from public, anon, authenticated;
revoke all privileges on table public.candidatos
  from public, anon, authenticated;
revoke all privileges on table public.campanhas
  from public, anon, authenticated;
revoke all privileges on table public.assinaturas
  from public, anon, authenticated;
revoke all privileges on table public.campaign_activity
  from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select, insert, update on table public.candidatos to authenticated;
grant select, insert, update on table public.campanhas to authenticated;
grant select on table public.assinaturas to authenticated;
grant select, insert on table public.campaign_activity to authenticated;

grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.candidatos to service_role;
grant select, insert, update, delete on table public.campanhas to service_role;
grant select, insert, update, delete on table public.assinaturas to service_role;
grant select, insert on table public.campaign_activity to service_role;

drop policy if exists profiles_select_own_or_managers on public.profiles;
create policy profiles_select_own_or_managers
on public.profiles
for select
to authenticated
using (
  ((select auth.uid()) = id and is_active)
  or (select private.has_role(array['master', 'admin']::public.app_role[]))
);

drop policy if exists profiles_update_own_display_name on public.profiles;
create policy profiles_update_own_display_name
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id and is_active)
with check ((select auth.uid()) = id and is_active);

drop policy if exists candidatos_read_staff on public.candidatos;
create policy candidatos_read_staff
on public.candidatos
for select
to authenticated
using (
  (select private.has_role(array['master', 'admin', 'editor']::public.app_role[]))
);

drop policy if exists candidatos_create_managers on public.candidatos;
create policy candidatos_create_managers
on public.candidatos
for insert
to authenticated
with check (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
);

drop policy if exists candidatos_update_managers on public.candidatos;
create policy candidatos_update_managers
on public.candidatos
for update
to authenticated
using (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
)
with check (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
);

drop policy if exists campanhas_read_staff on public.campanhas;
create policy campanhas_read_staff
on public.campanhas
for select
to authenticated
using (
  (select private.has_role(array['master', 'admin', 'editor']::public.app_role[]))
);

drop policy if exists campanhas_create_staff on public.campanhas;
create policy campanhas_create_staff
on public.campanhas
for insert
to authenticated
with check (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
  or (
    (select private.has_role(array['editor']::public.app_role[]))
    and status = 'draft'::public.campaign_status
  )
);

drop policy if exists campanhas_update_staff on public.campanhas;
create policy campanhas_update_staff
on public.campanhas
for update
to authenticated
using (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
  or (
    (select private.has_role(array['editor']::public.app_role[]))
    and status = 'draft'::public.campaign_status
  )
)
with check (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
  or (
    (select private.has_role(array['editor']::public.app_role[]))
    and status = 'draft'::public.campaign_status
  )
);

drop policy if exists assinaturas_read_managers on public.assinaturas;
create policy assinaturas_read_managers
on public.assinaturas
for select
to authenticated
using (
  (select private.has_role(array['master', 'admin']::public.app_role[]))
);

drop policy if exists campaign_activity_read_staff on public.campaign_activity;
create policy campaign_activity_read_staff
on public.campaign_activity
for select
to authenticated
using (
  (select private.has_role(array['master', 'admin', 'editor']::public.app_role[]))
);

drop policy if exists campaign_activity_create_self on public.campaign_activity;
create policy campaign_activity_create_self
on public.campaign_activity
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and jsonb_typeof(details) = 'object'
  and (
    select private.has_role(
      array['master', 'admin', 'editor']::public.app_role[]
    )
  )
);

commit;
