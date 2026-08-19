-- OKA platform database bootstrap and reconciliation script.
--
-- Intended for a Supabase Postgres project. It is self-contained: no psql
-- includes, local files, secrets, fixed users, or destructive data cleanup.
-- Existing application rows and legacy columns are preserved. Constraints are
-- added NOT VALID first and validated when existing data permits; a warning is
-- emitted instead of deleting or truncating incompatible legacy values.

begin;

-- ---------------------------------------------------------------------------
-- Types and non-exposed authorization schema
-- ---------------------------------------------------------------------------

do $types$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('master', 'admin', 'editor');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'campaign_status'
  ) then
    create type public.campaign_status as enum (
      'draft',
      'published',
      'archived'
    );
  end if;
end
$types$;

create schema if not exists private;
revoke all privileges on schema private
  from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Core and legacy-compatible tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key
    constraint profiles_id_fkey references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.app_role not null default 'editor',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists role public.app_role,
  add column if not exists is_active boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.profiles
set
  role = coalesce(role, 'editor'::public.app_role),
  is_active = coalesce(is_active, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where role is null
   or is_active is null
   or created_at is null
   or updated_at is null;

alter table public.profiles
  alter column role set default 'editor'::public.app_role,
  alter column role set not null,
  alter column is_active set default false,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create table if not exists public.candidatos (
  id uuid primary key default gen_random_uuid(),
  nome character varying not null,
  partido character varying,
  cargo character varying,
  estado character(2),
  municipio character varying,
  criado_em timestamp without time zone default now(),
  dominio_formularios text,
  slug_publico text
);

alter table public.candidatos
  add column if not exists nome character varying,
  add column if not exists partido character varying,
  add column if not exists cargo character varying,
  add column if not exists estado character(2),
  add column if not exists municipio character varying,
  add column if not exists criado_em timestamp without time zone,
  add column if not exists dominio_formularios text,
  add column if not exists slug_publico text;

-- Domain normalization is lossless apart from casing and a redundant www.
-- prefix. Invalid non-null values are retained and reported during validation.
update public.candidatos
set dominio_formularios = lower(
  regexp_replace(btrim(dominio_formularios), '^www\.', '', 'i')
)
where dominio_formularios is not null
  and dominio_formularios is distinct from lower(
    regexp_replace(btrim(dominio_formularios), '^www\.', '', 'i')
  );

with normalized as (
  select
    id,
    left(
      trim(
        both '-'
        from regexp_replace(
          translate(
            lower(coalesce(nome, '')),
            'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
            'aaaaaaeeeeiiiiooooouuuucnyy'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )
      ),
      63
    ) as raw_slug
  from public.candidatos
  where slug_publico is null or btrim(slug_publico) = ''
), prepared as (
  select
    id,
    case when raw_slug = '' then 'candidato' else raw_slug end as base_slug
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
          from public.candidatos existing
          where existing.id <> ranked.id
            and lower(existing.slug_publico) = lower(ranked.base_slug)
        )
        then ranked.base_slug
      else left(ranked.base_slug, 43) || '-' || ranked.id::text
    end as generated_slug
  from ranked
)
update public.candidatos candidato
set slug_publico = assigned.generated_slug
from assigned
where candidato.id = assigned.id;

alter table public.candidatos
  alter column slug_publico set not null;

create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  titulo character varying not null,
  descricao text,
  candidato_id uuid,
  url_formulario character varying,
  ativa boolean default true,
  inicio_em timestamp without time zone,
  fim_em timestamp without time zone,
  criado_em timestamp without time zone default now(),
  id_planilha text,
  assinaturas_meta bigint,
  texto_form character varying,
  texto_dot character varying,
  destaque_primario text,
  destaque_secundario text,
  cor_destaque text not null default '#E05A5A',
  imagem_fundo text,
  imagem_lateral text,
  tema smallint not null default 1,
  texto_contexto text,
  texto_proposta text,
  texto_conclusao text,
  texto_impacto text,
  texto_impacto_apoio text,
  texto_faixa text,
  titulo_topicos text,
  texto_topicos_intro text,
  texto_topicos text,
  titulo_citacao text,
  texto_citacao text,
  nota_citacao text,
  titulo_video text,
  video_url text,
  texto_video text,
  legenda_video text,
  nota_video text,
  titulo_assinar text,
  texto_assinar text,
  texto_compartilhar text,
  status public.campaign_status,
  slug text,
  theme_key text,
  meta_title text,
  meta_description text,
  og_title text,
  og_description text,
  og_image text,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  form_config jsonb,
  settings jsonb
);

alter table public.campanhas
  add column if not exists titulo character varying,
  add column if not exists descricao text,
  add column if not exists candidato_id uuid,
  add column if not exists url_formulario character varying,
  add column if not exists ativa boolean,
  add column if not exists inicio_em timestamp without time zone,
  add column if not exists fim_em timestamp without time zone,
  add column if not exists criado_em timestamp without time zone,
  add column if not exists id_planilha text,
  add column if not exists assinaturas_meta bigint,
  add column if not exists texto_form text,
  add column if not exists texto_dot text,
  add column if not exists destaque_primario text,
  add column if not exists destaque_secundario text,
  add column if not exists cor_destaque text,
  add column if not exists imagem_fundo text,
  add column if not exists imagem_lateral text,
  add column if not exists tema smallint,
  add column if not exists texto_contexto text,
  add column if not exists texto_proposta text,
  add column if not exists texto_conclusao text,
  add column if not exists texto_impacto text,
  add column if not exists texto_impacto_apoio text,
  add column if not exists texto_faixa text,
  add column if not exists titulo_topicos text,
  add column if not exists texto_topicos_intro text,
  add column if not exists texto_topicos text,
  add column if not exists titulo_citacao text,
  add column if not exists texto_citacao text,
  add column if not exists nota_citacao text,
  add column if not exists titulo_video text,
  add column if not exists video_url text,
  add column if not exists texto_video text,
  add column if not exists legenda_video text,
  add column if not exists nota_video text,
  add column if not exists titulo_assinar text,
  add column if not exists texto_assinar text,
  add column if not exists texto_compartilhar text,
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
set cor_destaque = '#E05A5A'
where cor_destaque is null;

update public.campanhas
set tema = 1
where tema is null;

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
  when 5 then 'horizon-blue'
  when 6 then 'green-community'
  when 7 then 'teal-pulse'
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
  alter column ativa set default true,
  alter column cor_destaque set default '#E05A5A',
  alter column cor_destaque set not null,
  alter column tema set default 1,
  alter column tema set not null,
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

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null,
  nome_assinante character varying,
  numero_assinante character varying,
  email_assinante character varying,
  endereco_assinante character varying,
  n_assinante integer,
  cidade_assinante character varying,
  cep_assinante character varying,
  estado_assinante character(2),
  ip_origem text,
  assinado_em timestamptz default (now() at time zone 'America/Sao_Paulo'),
  complemento_assinante character varying,
  source text,
  consented_at timestamptz,
  responses jsonb,
  metadata jsonb,
  user_agent text
);

alter table public.assinaturas
  add column if not exists campanha_id uuid,
  add column if not exists nome_assinante character varying,
  add column if not exists numero_assinante character varying,
  add column if not exists email_assinante character varying,
  add column if not exists endereco_assinante character varying,
  add column if not exists n_assinante integer,
  add column if not exists cidade_assinante character varying,
  add column if not exists cep_assinante character varying,
  add column if not exists estado_assinante character(2),
  add column if not exists ip_origem text,
  add column if not exists assinado_em timestamptz,
  add column if not exists complemento_assinante character varying,
  add column if not exists source text,
  add column if not exists consented_at timestamptz,
  add column if not exists responses jsonb,
  add column if not exists metadata jsonb,
  add column if not exists user_agent text;

-- A campaign may omit the name field through form_config. Required fields are
-- validated by the server against that campaign configuration.
alter table public.assinaturas
  alter column nome_assinante drop not null;

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

create table if not exists public.campaign_activity (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  user_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.campaign_activity
  add column if not exists campaign_id uuid,
  add column if not exists user_id uuid,
  add column if not exists action text,
  add column if not exists details jsonb,
  add column if not exists created_at timestamptz;

update public.campaign_activity
set
  details = coalesce(details, '{}'::jsonb),
  created_at = coalesce(created_at, now())
where details is null or created_at is null;

alter table public.campaign_activity
  alter column details set default '{}'::jsonb,
  alter column details set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

-- ---------------------------------------------------------------------------
-- Constraints: additive, idempotent, and preservation-first
-- ---------------------------------------------------------------------------

-- This constraint existed in narrower legacy versions (themes 1 and 2 only).
-- Replacing its definition changes no row and makes all registered themes valid.
alter table public.campanhas
  drop constraint if exists campanhas_tema_valido;

do $constraints$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        (
          'profiles',
          'profiles_id_fkey',
          'foreign key (id) references auth.users(id) on delete cascade not valid'
        ),
        (
          'profiles',
          'profiles_email_length',
          'check (email is null or char_length(email) <= 320) not valid'
        ),
        (
          'profiles',
          'profiles_display_name_length',
          'check (display_name is null or char_length(display_name) <= 160) not valid'
        ),
        (
          'candidatos',
          'candidatos_dominio_formularios_valido',
          'check (dominio_formularios is null or (char_length(dominio_formularios) <= 253 and dominio_formularios = lower(dominio_formularios) and dominio_formularios !~ ''^www\.'' and dominio_formularios ~ ''^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])$'')) not valid'
        ),
        (
          'candidatos',
          'candidatos_slug_publico_valido',
          'check (char_length(slug_publico) between 1 and 80 and slug_publico = lower(slug_publico) and slug_publico ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'') not valid'
        ),
        (
          'campanhas',
          'campanhas_candidato_id_fkey',
          'foreign key (candidato_id) references public.candidatos(id) on delete set null not valid'
        ),
        (
          'campanhas',
          'campanhas_cor_destaque_hex',
          'check (cor_destaque ~ ''^#[0-9A-Fa-f]{6}$'') not valid'
        ),
        (
          'campanhas',
          'campanhas_tema_valido',
          'check (tema in (1, 2, 3, 4, 5, 6, 7)) not valid'
        ),
        (
          'campanhas',
          'campanhas_imagem_fundo_valida',
          'check (imagem_fundo is null or (octet_length(imagem_fundo) <= 1230000 and imagem_fundo ~ ''^data:image/(jpeg|png|webp);base64,'')) not valid'
        ),
        (
          'campanhas',
          'campanhas_imagem_lateral_valida',
          'check (imagem_lateral is null or (octet_length(imagem_lateral) <= 1230000 and imagem_lateral ~ ''^data:image/(jpeg|png|webp);base64,'')) not valid'
        ),
        (
          'campanhas',
          'campanhas_textos_tema2_tamanho',
          'check ((texto_contexto is null or char_length(texto_contexto) <= 8000) and (texto_proposta is null or char_length(texto_proposta) <= 4000) and (texto_conclusao is null or char_length(texto_conclusao) <= 4000) and (texto_impacto is null or char_length(texto_impacto) <= 300) and (texto_impacto_apoio is null or char_length(texto_impacto_apoio) <= 500)) not valid'
        ),
        (
          'campanhas',
          'campanhas_texto_conclusao_tamanho',
          'check (texto_conclusao is null or char_length(texto_conclusao) <= 4000) not valid'
        ),
        (
          'campanhas',
          'campanhas_url_formulario_whatsapp',
          'check (url_formulario is null or (octet_length(url_formulario) <= 2048 and url_formulario ~* ''^https://(wa\.me|([a-z0-9-]+\.)*whatsapp\.com)(/|$)'')) not valid'
        ),
        (
          'campanhas',
          'campanhas_video_url_valida',
          'check (video_url is null or (octet_length(video_url) <= 2048 and video_url ~* ''^(https://|/)'')) not valid'
        ),
        (
          'campanhas',
          'campanhas_textos_tema3_tamanho',
          'check ((texto_faixa is null or char_length(texto_faixa) <= 500) and (titulo_topicos is null or char_length(titulo_topicos) <= 200) and (texto_topicos_intro is null or char_length(texto_topicos_intro) <= 2000) and (texto_topicos is null or char_length(texto_topicos) <= 8000) and (titulo_citacao is null or char_length(titulo_citacao) <= 200) and (texto_citacao is null or char_length(texto_citacao) <= 2000) and (nota_citacao is null or char_length(nota_citacao) <= 1000) and (titulo_video is null or char_length(titulo_video) <= 200) and (texto_video is null or char_length(texto_video) <= 4000) and (legenda_video is null or char_length(legenda_video) <= 300) and (nota_video is null or char_length(nota_video) <= 1000) and (titulo_assinar is null or char_length(titulo_assinar) <= 200) and (texto_assinar is null or char_length(texto_assinar) <= 2000) and (texto_compartilhar is null or char_length(texto_compartilhar) <= 500)) not valid'
        ),
        (
          'campanhas',
          'campanhas_slug_valid',
          'check (slug is null or (char_length(slug) between 1 and 120 and slug = lower(slug) and slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'')) not valid'
        ),
        (
          'campanhas',
          'campanhas_theme_key_valid',
          'check (char_length(theme_key) between 1 and 80 and theme_key = lower(theme_key) and theme_key ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'') not valid'
        ),
        (
          'campanhas',
          'campanhas_seo_lengths',
          'check ((meta_title is null or char_length(meta_title) <= 120) and (meta_description is null or char_length(meta_description) <= 320) and (og_title is null or char_length(og_title) <= 120) and (og_description is null or char_length(og_description) <= 320) and (og_image is null or char_length(og_image) <= 2048)) not valid'
        ),
        (
          'campanhas',
          'campanhas_og_image_valid',
          'check (og_image is null or og_image ~* ''^(https://|/)'') not valid'
        ),
        (
          'campanhas',
          'campanhas_form_config_object',
          'check (jsonb_typeof(form_config) = ''object'') not valid'
        ),
        (
          'campanhas',
          'campanhas_settings_object',
          'check (jsonb_typeof(settings) = ''object'') not valid'
        ),
        (
          'campanhas',
          'campanhas_created_by_fkey',
          'foreign key (created_by) references public.profiles(id) on delete set null not valid'
        ),
        (
          'campanhas',
          'campanhas_updated_by_fkey',
          'foreign key (updated_by) references public.profiles(id) on delete set null not valid'
        ),
        (
          'assinaturas',
          'assinaturas_source_length',
          'check (char_length(source) between 1 and 80) not valid'
        ),
        (
          'assinaturas',
          'assinaturas_responses_object',
          'check (jsonb_typeof(responses) = ''object'') not valid'
        ),
        (
          'assinaturas',
          'assinaturas_metadata_object',
          'check (jsonb_typeof(metadata) = ''object'') not valid'
        ),
        (
          'assinaturas',
          'assinaturas_user_agent_length',
          'check (user_agent is null or char_length(user_agent) <= 512) not valid'
        ),
        (
          'campaign_activity',
          'campaign_activity_campaign_id_fkey',
          'foreign key (campaign_id) references public.campanhas(id) on delete restrict not valid'
        ),
        (
          'campaign_activity',
          'campaign_activity_user_id_fkey',
          'foreign key (user_id) references public.profiles(id) on delete set null not valid'
        ),
        (
          'campaign_activity',
          'campaign_activity_action_valid',
          'check (action in (''created'', ''edited'', ''published'', ''unpublished'', ''duplicated'', ''archived'')) not valid'
        ),
        (
          'campaign_activity',
          'campaign_activity_details_object',
          'check (jsonb_typeof(details) = ''object'') not valid'
        )
    ) as definitions(table_name, constraint_name, constraint_definition)
  loop
    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid = to_regclass('public.' || item.table_name)
        and c.conname = item.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I %s',
        item.table_name,
        item.constraint_name,
        item.constraint_definition
      );
    end if;
  end loop;
end
$constraints$;

-- Replace a legacy CASCADE/NO ACTION relationship with retention-safe RESTRICT.
do $signature_fk$
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
end
$signature_fk$;

-- Validate clean datasets. Dirty legacy values remain untouched; NOT VALID
-- constraints still protect all future inserts and updates.
do $validation$
declare
  item record;
begin
  for item in
    select
      format('%I.%I', n.nspname, r.relname) as relation_name,
      c.conname
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname in (
        'profiles',
        'candidatos',
        'campanhas',
        'assinaturas',
        'campaign_activity'
      )
      and not c.convalidated
  loop
    begin
      execute format(
        'alter table %s validate constraint %I',
        item.relation_name,
        item.conname
      );
    exception when others then
      raise warning
        'Preserved legacy rows: constraint %.% remains NOT VALID (%).',
        item.relation_name,
        item.conname,
        sqlerrm;
    end;
  end loop;
end
$validation$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists profiles_email_normalized_idx
  on public.profiles (lower(btrim(email)))
  where email is not null and btrim(email) <> '';

do $candidate_domain_index$
begin
  if to_regclass('public.candidatos_dominio_formularios_unico') is null then
    if not exists (
      select 1
      from public.candidatos
      where dominio_formularios is not null
      group by dominio_formularios
      having count(*) > 1
    ) then
      create unique index candidatos_dominio_formularios_unico
        on public.candidatos (dominio_formularios)
        where dominio_formularios is not null;
    else
      raise warning
        'Index candidatos_dominio_formularios_unico skipped: duplicate legacy domains exist.';
    end if;
  end if;
end
$candidate_domain_index$;

do $candidate_slug_index$
begin
  if to_regclass('public.candidatos_slug_publico_unico') is null then
    if not exists (
      select 1
      from public.candidatos
      group by lower(slug_publico)
      having count(*) > 1
    ) then
      create unique index candidatos_slug_publico_unico
        on public.candidatos (slug_publico);
    else
      raise warning
        'Index candidatos_slug_publico_unico skipped: duplicate legacy slugs exist.';
    end if;
  end if;
end
$candidate_slug_index$;

do $campaign_slug_index$
begin
  if to_regclass('public.campanhas_slug_normalized_uidx') is null then
    if not exists (
      select 1
      from public.campanhas
      where slug is not null and btrim(slug) <> ''
      group by lower(slug)
      having count(*) > 1
    ) then
      create unique index campanhas_slug_normalized_uidx
        on public.campanhas (lower(slug))
        where slug is not null and btrim(slug) <> '';
    else
      raise warning
        'Index campanhas_slug_normalized_uidx skipped: duplicate legacy slugs exist.';
    end if;
  end if;
end
$campaign_slug_index$;

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

create index if not exists idx_assinaturas_campanha
  on public.assinaturas (campanha_id);

create index if not exists assinaturas_campanha_assinado_em_idx
  on public.assinaturas (campanha_id, assinado_em desc);

do $legacy_signature_email_index$
begin
  if to_regclass('public.idx_assinaturas_unico') is null then
    if not exists (
      select 1
      from public.assinaturas
      where email_assinante is not null
      group by campanha_id, email_assinante
      having count(*) > 1
    ) then
      create unique index idx_assinaturas_unico
        on public.assinaturas (campanha_id, email_assinante);
    else
      raise warning
        'Index idx_assinaturas_unico skipped: exact duplicate legacy emails exist.';
    end if;
  end if;
end
$legacy_signature_email_index$;

do $signature_email_index$
begin
  if to_regclass('public.assinaturas_campanha_email_normalized_uidx') is null then
    if not exists (
      select 1
      from public.assinaturas
      where email_assinante is not null and btrim(email_assinante) <> ''
      group by campanha_id, lower(btrim(email_assinante))
      having count(*) > 1
    ) then
      create unique index assinaturas_campanha_email_normalized_uidx
        on public.assinaturas (campanha_id, lower(btrim(email_assinante)))
        where email_assinante is not null and btrim(email_assinante) <> '';
    else
      raise warning
        'Index assinaturas_campanha_email_normalized_uidx skipped: normalized duplicate legacy emails exist.';
    end if;
  end if;
end
$signature_email_index$;

do $signature_phone_index$
begin
  if to_regclass('public.assinaturas_campanha_phone_normalized_uidx') is null then
    if not exists (
      select 1
      from public.assinaturas
      where numero_assinante is not null
        and btrim(numero_assinante) <> ''
        and regexp_replace(numero_assinante, '[^0-9]', '', 'g') <> ''
      group by
        campanha_id,
        regexp_replace(numero_assinante, '[^0-9]', '', 'g')
      having count(*) > 1
    ) then
      create unique index assinaturas_campanha_phone_normalized_uidx
        on public.assinaturas (
          campanha_id,
          regexp_replace(numero_assinante, '[^0-9]', '', 'g')
        )
        where numero_assinante is not null
          and btrim(numero_assinante) <> ''
          and regexp_replace(numero_assinante, '[^0-9]', '', 'g') <> '';
    else
      raise warning
        'Index assinaturas_campanha_phone_normalized_uidx skipped: normalized duplicate legacy phones exist.';
    end if;
  end if;
end
$signature_phone_index$;

create index if not exists campaign_activity_campaign_created_at_idx
  on public.campaign_activity (campaign_id, created_at desc);

create index if not exists campaign_activity_user_created_at_idx
  on public.campaign_activity (user_id, created_at desc)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all privileges on function private.set_updated_at()
  from public, anon, authenticated, service_role;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before insert or update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
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
$function$;

revoke all privileges on function private.handle_new_auth_user_profile()
  from public, anon, authenticated, service_role;

drop trigger if exists platform_create_profile_after_auth_user_insert
  on auth.users;
create trigger platform_create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function private.handle_new_auth_user_profile();

-- Existing Auth users are deliberately inactive editors. Authorization never
-- comes from user-editable metadata; a manager must explicitly activate/assign.
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
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role = any(allowed)
    );
$function$;

revoke all privileges on function private.has_role(public.app_role[])
  from public, anon, authenticated, service_role;
grant execute on function private.has_role(public.app_role[])
  to authenticated;

create or replace function private.sync_campaign_legacy_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  legacy_theme_key text;
begin
  legacy_theme_key := case coalesce(new.tema, 1)
    when 2 then 'editorial'
    when 3 then 'manifesto'
    when 4 then 'impact-dark'
    when 5 then 'horizon-blue'
    when 6 then 'green-community'
    when 7 then 'teal-pulse'
    else 'cover'
  end;

  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case
        when coalesce(new.ativa, false)
          then 'published'::public.campaign_status
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
    elsif new.theme_key = 'horizon-blue' then
      new.tema := 5;
    elsif new.theme_key = 'green-community' then
      new.tema := 6;
    elsif new.theme_key = 'teal-pulse' then
      new.tema := 7;
    end if;
  else
    if new.status is distinct from old.status then
      new.ativa := new.status = 'published'::public.campaign_status;
    elsif new.ativa is distinct from old.ativa then
      new.status := case
        when coalesce(new.ativa, false)
          then 'published'::public.campaign_status
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
      elsif new.theme_key = 'horizon-blue' then
        new.tema := 5;
      elsif new.theme_key = 'green-community' then
        new.tema := 6;
      elsif new.theme_key = 'teal-pulse' then
        new.tema := 7;
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
$function$;

revoke all privileges on function private.sync_campaign_legacy_fields()
  from public, anon, authenticated, service_role;

create or replace function private.set_campaign_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
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
$function$;

revoke all privileges on function private.set_campaign_actor()
  from public, anon, authenticated, service_role;

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

-- Defense in depth for future tables created in the exposed public schema.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  command record;
begin
  for command in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if command.schema_name = 'public' then
      begin
        execute format(
          'alter table if exists %s enable row level security',
          command.object_identity
        );
      exception when others then
        raise log
          'rls_auto_enable could not enable RLS on %: %',
          command.object_identity,
          sqlerrm;
      end;
    end if;
  end loop;
end;
$function$;

revoke all privileges on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

do $event_trigger$
begin
  if not exists (
    select 1 from pg_event_trigger where evtname = 'ensure_rls'
  ) then
    execute $ddl$
      create event trigger ensure_rls
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable()
    $ddl$;
  end if;
exception
  when insufficient_privilege or feature_not_supported then
    raise warning
      'ensure_rls event trigger was not installed: execute setup as the Supabase database owner.';
end
$event_trigger$;

-- ---------------------------------------------------------------------------
-- RLS, explicit grants, and policies
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.candidatos enable row level security;
alter table public.campanhas enable row level security;
alter table public.assinaturas enable row level security;
alter table public.campaign_activity enable row level security;

revoke all privileges on type public.app_role
  from public, anon, authenticated, service_role;
revoke all privileges on type public.campaign_status
  from public, anon, authenticated, service_role;
grant usage on type public.app_role, public.campaign_status
  to authenticated, service_role;

-- Revoke before granting so the outcome does not depend on project defaults.
revoke all privileges on table public.profiles
  from public, anon, authenticated, service_role;
revoke all privileges on table public.candidatos
  from public, anon, authenticated, service_role;
revoke all privileges on table public.campanhas
  from public, anon, authenticated, service_role;
revoke all privileges on table public.assinaturas
  from public, anon, authenticated, service_role;
revoke all privileges on table public.campaign_activity
  from public, anon, authenticated, service_role;

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

drop policy if exists allow_public_insert on public.profiles;
drop policy if exists allow_public_select on public.profiles;
drop policy if exists full_access on public.profiles;
drop policy if exists allow_public_insert on public.candidatos;
drop policy if exists allow_public_select on public.candidatos;
drop policy if exists full_access on public.candidatos;
drop policy if exists allow_public_insert on public.campanhas;
drop policy if exists allow_public_select on public.campanhas;
drop policy if exists full_access on public.campanhas;
drop policy if exists allow_public_insert on public.assinaturas;
drop policy if exists allow_public_select on public.assinaturas;
drop policy if exists full_access on public.assinaturas;

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
  (select private.has_role(
    array['master', 'admin', 'editor']::public.app_role[]
  ))
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
  (select private.has_role(
    array['master', 'admin', 'editor']::public.app_role[]
  ))
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

drop policy if exists campaign_activity_read_staff
  on public.campaign_activity;
create policy campaign_activity_read_staff
on public.campaign_activity
for select
to authenticated
using (
  (select private.has_role(
    array['master', 'admin', 'editor']::public.app_role[]
  ))
);

drop policy if exists campaign_activity_create_self
  on public.campaign_activity;
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

-- ---------------------------------------------------------------------------
-- Default-ACL mitigation and schema notes
-- ---------------------------------------------------------------------------

-- ALTER DEFAULT PRIVILEGES is owner-scoped. These statements intentionally
-- affect only the role executing setup.sql. They do not assume permission to
-- mutate the internal supabase_admin defaults; every object above is therefore
-- also explicitly revoked/granted.
alter default privileges in schema public
  revoke all privileges on tables
  from public, anon, authenticated, service_role;

alter default privileges in schema public
  revoke all privileges on sequences
  from public, anon, authenticated, service_role;

alter default privileges in schema public
  revoke execute on functions
  from public, anon, authenticated, service_role;

alter default privileges in schema public
  revoke usage on types
  from public, anon, authenticated, service_role;

comment on column public.campanhas.ativa is
  'Deprecated compatibility field; use status. Kept synchronized by trigger.';
comment on column public.campanhas.tema is
  'Deprecated compatibility field; use theme_key. Kept synchronized by trigger.';
comment on column public.campanhas.criado_em is
  'Deprecated compatibility timestamp; use created_at.';
comment on column public.campanhas.id_planilha is
  'Legacy external integration identifier; verify consumers before removal.';
comment on column public.candidatos.slug_publico is
  'Stable public candidate-hub slug.';
comment on column public.assinaturas.consented_at is
  'Timestamp of explicit consent; nullable only for preserved historical leads.';

commit;
