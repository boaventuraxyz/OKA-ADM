-- Centraliza o número eleitoral no candidato. Campanhas antigas continuam com
-- candidate_number em settings como compatibilidade, mas o cadastro passa a ser
-- a fonte principal para todos os temas.

alter table public.candidatos
  add column if not exists numero text;

update public.candidatos
set numero = nullif(
  left(regexp_replace(coalesce(numero, ''), '[^0-9]', '', 'g'), 8),
  ''
)
where numero is not null
  and numero is distinct from nullif(
    left(regexp_replace(coalesce(numero, ''), '[^0-9]', '', 'g'), 8),
    ''
  );

with prepared as (
  select
    campanha.candidato_id,
    nullif(
      left(
        regexp_replace(
          coalesce(campanha.settings ->> 'candidate_number', ''),
          '[^0-9]',
          '',
          'g'
        ),
        8
      ),
      ''
    ) as numero,
    coalesce(
      campanha.updated_at,
      campanha.created_at,
      campanha.criado_em at time zone 'America/Sao_Paulo'
    ) as ordenacao,
    campanha.id
  from public.campanhas campanha
  where campanha.candidato_id is not null
), ranked as (
  select
    candidato_id,
    numero,
    row_number() over (
      partition by candidato_id
      order by ordenacao desc nulls last, id desc
    ) as posicao
  from prepared
  where numero is not null
)
update public.candidatos candidato
set numero = ranked.numero
from ranked
where ranked.candidato_id = candidato.id
  and ranked.posicao = 1
  and candidato.numero is null;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidatos_numero_valido'
      and conrelid = 'public.candidatos'::regclass
  ) then
    alter table public.candidatos
      add constraint candidatos_numero_valido
      check (numero is null or numero ~ '^[0-9]{1,8}$') not valid;
  end if;
end
$constraints$;

alter table public.candidatos
  validate constraint candidatos_numero_valido;

comment on column public.candidatos.numero is
  'Número eleitoral do candidato, usado automaticamente por todos os temas.';
