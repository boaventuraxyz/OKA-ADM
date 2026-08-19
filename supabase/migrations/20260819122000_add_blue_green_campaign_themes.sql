begin;

alter table public.campanhas
  drop constraint if exists campanhas_tema_valido;

alter table public.campanhas
  add constraint campanhas_tema_valido
  check (tema in (1, 2, 3, 4, 5, 6, 7));

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
$$;

commit;
