-- Adiciona candidatos.slug_publico, o endereco do hub publico do candidato.
--
-- A coluna existia apenas em supabase/candidate-hubs.sql, um script avulso que
-- nunca virou migracao: bancos que aplicaram so as migracoes ficaram sem ela.
-- O conteudo aqui e o mesmo de database/setup.sql, na forma canonica.
--
-- Idempotente: pode rodar em banco que ja tem a coluna.
begin;

alter table public.candidatos
  add column if not exists slug_publico text;

-- Gera slug a partir do nome para quem ainda nao tem, resolvendo repeticao com
-- o id no fim. Precisa vir antes do not null.
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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidatos_slug_publico_valido'
  ) then
    alter table public.candidatos
      add constraint candidatos_slug_publico_valido
      check (
        char_length(slug_publico) between 1 and 80
        and slug_publico = lower(slug_publico)
        and slug_publico ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      )
      not valid;
  end if;
end
$$;

create unique index if not exists candidatos_slug_publico_unico
  on public.candidatos (lower(slug_publico));

commit;
