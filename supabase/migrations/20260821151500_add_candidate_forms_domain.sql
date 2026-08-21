-- Adiciona candidatos.dominio_formularios, o dominio proprio do candidato.
--
-- Mesma situacao do slug: a coluna vinha de supabase/candidate-domain.sql, um
-- script avulso que nunca virou migracao. Aqui entra so o esquema; o script
-- original tambem gravava o dominio de um candidato especifico, o que e dado e
-- nao pertence a uma migracao.
--
-- Idempotente: pode rodar em banco que ja tem a coluna.
begin;

alter table public.candidatos
  add column if not exists dominio_formularios text;

-- Normaliza caixa e o prefixo www, sem descartar valor invalido: a validacao da
-- restricao fica para depois, com not valid.
update public.candidatos
set dominio_formularios = lower(
  regexp_replace(btrim(dominio_formularios), '^www\.', '', 'i')
)
where dominio_formularios is not null
  and dominio_formularios is distinct from lower(
    regexp_replace(btrim(dominio_formularios), '^www\.', '', 'i')
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'candidatos_dominio_formularios_valido'
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
      )
      not valid;
  end if;
end
$$;

-- O indice unico so entra se nao houver dominio repetido no banco.
do $$
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
      raise notice
        'Indice candidatos_dominio_formularios_unico ignorado: ha dominios repetidos.';
    end if;
  end if;
end
$$;

commit;
