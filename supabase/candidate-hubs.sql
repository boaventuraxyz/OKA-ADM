begin;

alter table public.candidatos
  add column if not exists slug_publico text;

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
    ) as base_slug
  from public.candidatos
),
ranked as (
  select
    id,
    case when base_slug = '' then 'candidato' else base_slug end as base_slug,
    count(*) over (partition by base_slug) as same_name_count
  from normalized
)
update public.candidatos as candidato
set slug_publico = case
  when ranked.same_name_count = 1
    and not exists (
      select 1
      from public.candidatos as existing
      where existing.id <> candidato.id
        and existing.slug_publico = ranked.base_slug
    )
    then ranked.base_slug
  else left(ranked.base_slug, 68) || '-' || left(candidato.id::text, 8)
end
from ranked
where candidato.id = ranked.id
  and candidato.slug_publico is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidatos_slug_publico_valido'
      and conrelid = 'public.candidatos'::regclass
  ) then
    alter table public.candidatos
      add constraint candidatos_slug_publico_valido
      check (
        char_length(slug_publico) between 1 and 80
        and slug_publico = lower(slug_publico)
        and slug_publico ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      );
  end if;
end $$;

create unique index if not exists candidatos_slug_publico_unico
  on public.candidatos (slug_publico);

alter table public.candidatos
  alter column slug_publico set not null;

commit;
