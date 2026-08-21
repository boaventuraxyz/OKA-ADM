-- ============================================================================
-- OKA-ADM · migracoes pendentes, na ordem
--
-- Cole tudo de uma vez no SQL Editor do Supabase e execute. Cada passo e uma
-- transacao propria: se um falhar, so aquele passo e desfeito.
--
-- RODE UMA VEZ SO. O passo 1 e antigo e fixa a restricao de tema em 1..7; o
-- passo 4 amplia para 1..8. Numa segunda execucao, com a campanha do passo 6 ja
-- criada no tema 8, o passo 1 falha ao tentar estreitar a restricao de volta.
-- Se precisar repetir, comece pelo passo 2.
--
-- Validado com PGlite partindo de um banco atrasado: sem os temas 5 a 8, com o
-- limite antigo de imagem e sem as colunas slug_publico e dominio_formularios.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASSO 1 de 6 · Temas 5, 6 e 7 (a que faltava e causava o erro 23514)
-- arquivo: supabase/migrations/20260819122000_add_blue_green_campaign_themes.sql
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- PASSO 2 de 6 · Coluna slug_publico (vinha de um script avulso, nunca virou migracao)
-- arquivo: supabase/migrations/20260821151000_add_candidate_public_slug.sql
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- PASSO 3 de 6 · Coluna dominio_formularios (mesma situacao)
-- arquivo: supabase/migrations/20260821151500_add_candidate_forms_domain.sql
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- PASSO 4 de 6 · Tema 8 Bandeira
-- arquivo: supabase/migrations/20260821153000_add_bandeira_campaign_theme.sql
-- ----------------------------------------------------------------------------

-- Libera o tema 8 (Bandeira) na restricao e na trigger de campos legados.
-- A restricao aceita o valor e a trigger traduz theme_key para o numero; sem as
-- duas o insert falha com Postgres 23514.
begin;

alter table public.campanhas
  drop constraint if exists campanhas_tema_valido;

alter table public.campanhas
  add constraint campanhas_tema_valido
  check (tema in (1, 2, 3, 4, 5, 6, 7, 8));

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
    when 8 then 'bandeira'
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
    elsif new.theme_key = 'bandeira' then
      new.tema := 8;
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
      elsif new.theme_key = 'bandeira' then
        new.tema := 8;
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

-- ----------------------------------------------------------------------------
-- PASSO 5 de 6 · Imagens de ~900 KB para 5 MB
-- arquivo: supabase/migrations/20260821161500_raise_campaign_image_limit.sql
-- ----------------------------------------------------------------------------

-- Amplia o limite das imagens da campanha de ~900 KB para 5 MB decodificados.
-- O valor da restricao e o tamanho do data URI: base64 cresce ~4/3 sobre os
-- bytes, mais o prefixo `data:image/...;base64,`.
begin;

alter table public.campanhas
  drop constraint if exists campanhas_imagem_fundo_valida;

alter table public.campanhas
  add constraint campanhas_imagem_fundo_valida
  check (
    imagem_fundo is null
    or (
      octet_length(imagem_fundo) <= 7000000
      and imagem_fundo ~ '^data:image/(jpeg|png|webp);base64,'
    )
  );

alter table public.campanhas
  drop constraint if exists campanhas_imagem_lateral_valida;

alter table public.campanhas
  add constraint campanhas_imagem_lateral_valida
  check (
    imagem_lateral is null
    or (
      octet_length(imagem_lateral) <= 7000000
      and imagem_lateral ~ '^data:image/(jpeg|png|webp);base64,'
    )
  );

commit;

-- ----------------------------------------------------------------------------
-- PASSO 6 de 6 · Campanha do Felipe Sertanejo (rascunho inativo)
-- arquivo: supabase/migrations/20260821164500_seed_felipe_sertanejo_campaign.sql
-- ----------------------------------------------------------------------------

-- Cria a candidatura e a campanha do Felipe Sertanejo no tema Bandeira.
--
-- Só conteúdo público de campanha entra aqui. O rodapé de propaganda eleitoral
-- traz endereço e contato do candidato, então é preenchido pelo painel, em
-- Configurações > Propaganda eleitoral, e fica apenas no banco.
--
-- Idempotente: rodar de novo não duplica nem sobrescreve edições feitas depois,
-- porque o insert da campanha é condicionado ao slug ainda não existir.
begin;

do $$
declare
  candidate_name constant text := 'Felipe Sertanejo';
  candidate_id uuid;
  campaign_id uuid := 'e4f2c9a8-7b61-4d35-8c02-1a9f6e3b5d84';
  has_slug boolean;
  candidate_slug text := 'felipe-sertanejo';
begin
  has_slug := exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'candidatos'
      and column_name = 'slug_publico'
  );

  -- Reaproveita o candidato que ja existir, em vez de criar outro: o banco pode
  -- ja te-lo, inclusive com o slug gerado pelo backfill da migracao anterior.
  select id into candidate_id
  from public.candidatos
  where lower(btrim(nome)) = lower(candidate_name)
  order by criado_em nulls last
  limit 1;

  if candidate_id is null then
    candidate_id := 'b7c1a0d4-5f83-4c2e-9a16-3d8e5f2b91c7'::uuid;

    if has_slug then
      -- O slug e unico: se outro candidato ja o ocupa, cai para uma variante.
      if exists (
        select 1 from public.candidatos
        where lower(slug_publico) = candidate_slug
      ) then
        candidate_slug := candidate_slug || '-' || left(candidate_id::text, 8);
      end if;

      execute $ins$
        insert into public.candidatos (
          id, nome, slug_publico, partido, cargo, estado, municipio
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do nothing
      $ins$
      using
        candidate_id,
        candidate_name,
        candidate_slug,
        'Partido Liberal (PL)',
        'Deputado Estadual',
        'SP',
        'São Paulo';
    else
      insert into public.candidatos (id, nome, partido, cargo, estado, municipio)
      values (
        candidate_id,
        candidate_name,
        'Partido Liberal (PL)',
        'Deputado Estadual',
        'SP',
        'São Paulo'
      )
      on conflict (id) do nothing;
    end if;

    raise notice 'Candidato % criado.', candidate_name;
  else
    raise notice 'Candidato % ja existia; a campanha sera vinculada a ele.', candidate_name;
  end if;

  if exists (select 1 from public.campanhas where slug = 'felipe-sertanejo') then
    raise notice 'Campanha felipe-sertanejo já existe; nada foi alterado.';
    return;
  end if;

  insert into public.campanhas (
    id,
    candidato_id,
    slug,
    titulo,
    tema,
    theme_key,
    status,
    ativa,
    cor_destaque,
    descricao,
    texto_faixa,
    texto_dot,
    texto_form,
    titulo_topicos,
    texto_contexto,
    titulo_citacao,
    texto_proposta,
    texto_citacao,
    titulo_video,
    titulo_assinar,
    texto_topicos_intro,
    texto_topicos,
    texto_assinar,
    texto_conclusao,
    texto_impacto,
    texto_impacto_apoio,
    texto_compartilhar,
    meta_title,
    meta_description,
    og_title,
    og_description,
    form_config,
    settings
  )
  values (
    campaign_id,
    candidate_id,
    'felipe-sertanejo',
    'A luta agora é outra',
    8,
    'bandeira',
    'draft',
    false,
    '#1EC65B',
    'Passei a vida lutando. Agora eu luto por São Paulo — dentro da Assembleia!' ||
      chr(10) || chr(10) ||
      'Essa caminhada também é sua. Venha construir comigo o futuro que queremos para São Paulo.',
    'Candidato a deputado estadual · São Paulo',
    'Entrar no grupo de WhatsApp',
    'Entre para o movimento',
    'A nossa voz precisa chegar à Assembleia.',
    'O Nikolas Ferreira me chamou pra essa luta. Em 2024 ele me desafiou a entrar na política. Eu aceitei e disputei a Câmara Municipal de São Paulo. Fiquei como primeiro suplente na maior cidade do país.' ||
      chr(10) || chr(10) ||
      'Agora o desafio é maior: representar o estado inteiro na Assembleia Legislativa. E eu não faço isso sozinho.',
    'Por que eu quero chegar à Assembleia?',
    'Quero fiscalizar o governo do estado, combater os abusos do poder e propor leis que protejam nossas famílias e a liberdade dos paulistas.' ||
      chr(10) || chr(10) ||
      'Vou representar São Paulo com coragem, sem negociar meus valores.',
    'Minha missão é defender o futuro de São Paulo. Para isso, preciso ter você ao meu lado.',
    'Quero falar diretamente com você.',
    'O que eu vou defender.',
    'Posições claras. Coragem para defender. Compromisso para agir.',
    'Polícia valorizada, rua mais segura' || chr(10) ||
      'Salário digno, isenção de taxas e condições de vida à altura do risco que o policial corre todo dia.' ||
      chr(10) || chr(10) ||
    'Escola pra ensinar, não para doutrinar' || chr(10) ||
      'Ensino religioso facultativo garantido e foco no aprendizado. Militância política não é matéria escolar.' ||
      chr(10) || chr(10) ||
    'Oportunidade para quem precisa' || chr(10) ||
      'Cota por renda, não por cor ou rótulo. Quem é pobre merece chance, seja quem for.' ||
      chr(10) || chr(10) ||
    'Criança tem que ser criança' || chr(10) ||
      'Proibir que crianças façam transição de gênero ou tratamento hormonal nos hospitais do estado de São Paulo.' ||
      chr(10) || chr(10) ||
    'Em defesa da vida' || chr(10) ||
      'Destinar recursos para entidades pró-vida e criar protocolos para evitar o aborto.' ||
      chr(10) || chr(10) ||
    'Esporte justo para todos' || chr(10) ||
      'Proibir que pessoas trans compitam em categoria diferente do seu sexo biológico.' ||
      chr(10) || chr(10) ||
    'Fim da farra nas universidades' || chr(10) ||
      'Alunos que fizerem greve serão suspensos; alunos que repetirem dois anos seguidos serão expulsos.',
    'Entre no meu grupo oficial e acompanhe de perto tudo o que estamos construindo.',
    'Agendas e encontros presenciais' || chr(10) ||
      'Materiais de divulgação' || chr(10) ||
      'Bastidores de toda a campanha' || chr(10) ||
      'Informações antecipadas',
    'O futuro é nosso.',
    'Estou pronto para levar a nossa voz até a Assembleia. Agora, quero saber se posso contar com você.',
    'Eu apoiei o Felipe Sertanejo 22110. Participe também:',
    'Felipe Sertanejo 22110 · Deputado Estadual',
    'Faça parte do movimento que vai mudar o rumo de São Paulo. Entre no grupo oficial da campanha.',
    'Felipe Sertanejo 22110',
    'Faça parte do movimento que vai mudar o rumo de São Paulo.',
    jsonb_build_object(
      'version', 1,
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'name', 'key', 'nome', 'label', 'Nome',
          'placeholder', 'Como você quer ser chamado',
          'options', jsonb_build_array(), 'required', true, 'type', 'text'
        ),
        jsonb_build_object(
          'id', 'phone', 'key', 'telefone', 'label', 'WhatsApp',
          'placeholder', '(11) 9 9999-9999',
          'options', jsonb_build_array(), 'required', true, 'type', 'phone'
        ),
        jsonb_build_object(
          'id', 'state', 'key', 'estado', 'label', 'Seu estado',
          'placeholder', '', 'options', jsonb_build_array(),
          'required', true, 'type', 'state'
        )
      ),
      'capture', jsonb_build_object(
        'consentText',
          'Autorizo a campanha de Felipe Sertanejo e o Partido Liberal (PL) a me enviarem avisos, ' ||
          'conteúdos, convites e pesquisas de opinião por WhatsApp e SMS — inclusive sobre as ' ||
          'campanhas eleitorais de outros candidatos do PL e as campanhas institucionais do ' ||
          'partido. Declaro estar de acordo com a Política de Privacidade. Posso cancelar quando quiser.',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'fields', jsonb_build_array('nome', 'telefone'),
            'label', 'Seus dados',
            'note', 'Ao continuar, seu nome e WhatsApp ficam registrados com a campanha. Você conclui o cadastro na próxima etapa.',
            'submitLabel', 'Continuar',
            'subtitle', 'Leva 10 segundos. Depois você já cai direto no grupo.',
            'title', 'Preencha e entre para o movimento'
          ),
          jsonb_build_object(
            'fields', jsonb_build_array('estado'),
            'label', 'Seu estado',
            'note', 'Seus dados não são vendidos nem usados para fins comerciais.',
            'submitLabel', 'Entrar no grupo',
            'subtitle', 'É assim que a campanha se organiza por região.',
            'title', 'Qual o seu estado?'
          )
        ),
        'done', jsonb_build_object(
          'buttonLabel', 'Fazer parte do grupo',
          'label', 'Pronto',
          'message', 'Você já faz parte do movimento. Estamos te levando para o grupo oficial no WhatsApp.',
          'title', 'Cadastro confirmado!'
        )
      )
    ),
    jsonb_build_object(
      'allow_sharing', true,
      'candidate_number', '22110',
      'collect_address', false,
      'require_consent', true,
      'title_highlights', jsonb_build_array(
        jsonb_build_object('index', 3, 'color', '#F7CB34')
      )
    )
  );

  raise notice 'Campanha felipe-sertanejo criada como rascunho.';
end
$$;

commit;

-- ============================================================================
-- Conferencia depois de rodar
-- ============================================================================

-- Restricao de tema deve listar 1..8:
select pg_get_constraintdef(oid) as tema_valido
from pg_constraint
where conname = 'campanhas_tema_valido';

-- Limite das imagens deve mostrar 7000000:
select conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conname in ('campanhas_imagem_fundo_valida', 'campanhas_imagem_lateral_valida');

-- As duas colunas que faltavam devem existir:
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'candidatos'
  and column_name in ('slug_publico', 'dominio_formularios')
order by column_name;

-- A campanha deve aparecer como rascunho no tema 8:
select slug, titulo, tema, theme_key, status, ativa,
       settings -> 'candidate_number' as numero,
       jsonb_array_length(form_config -> 'capture' -> 'steps') as etapas_do_formulario
from public.campanhas
where slug = 'felipe-sertanejo';

-- Ainda falta preencher (esperado vir tudo vazio agora):
select
  url_formulario as link_do_grupo,
  imagem_lateral is not null as tem_foto_do_topo,
  imagem_fundo is not null as tem_foto_da_missao,
  settings -> 'legal' as rodape_legal
from public.campanhas
where slug = 'felipe-sertanejo';
