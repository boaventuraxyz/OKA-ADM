begin;

alter table public.candidatos
  add column if not exists dominio_formularios text;

update public.candidatos
set dominio_formularios = lower(
  regexp_replace(trim(dominio_formularios), '^www\.', '', 'i')
)
where dominio_formularios is not null;

with tiemi as (
  select id
  from public.candidatos
  where lower(nome) like '%tiemi%nevoeiro%'
  order by criado_em asc nulls last
  limit 1
)
update public.candidatos as candidato
set dominio_formularios = 'tieminevoeiro.com'
from tiemi
where candidato.id = tiemi.id
  and (
    candidato.dominio_formularios is null
    or candidato.dominio_formularios = 'tieminevoeirocrc.com.br'
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidatos_dominio_formularios_valido'
      and conrelid = 'public.candidatos'::regclass
  ) then
    alter table public.candidatos
      add constraint candidatos_dominio_formularios_valido
      check (
        dominio_formularios is null
        or (
          char_length(dominio_formularios) <= 253
          and dominio_formularios = lower(dominio_formularios)
          and dominio_formularios !~ '^www\.'
          and dominio_formularios ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])$'
        )
      );
  end if;
end $$;

create unique index if not exists candidatos_dominio_formularios_unico
  on public.candidatos (dominio_formularios)
  where dominio_formularios is not null;

commit;
