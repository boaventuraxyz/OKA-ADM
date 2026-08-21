-- ============================================================================
-- OKA-ADM · migracoes pendentes, na ordem
--
-- Cole tudo de uma vez no SQL Editor do Supabase e execute. Cada bloco e
-- transacional: se um falhar, so aquele bloco e desfeito.
--
-- Todos foram validados contra o schema real com PGlite (pnpm test:seed).
--
-- Se o passo 1 reclamar que algo ja existe, ele ja foi aplicado antes: pule
-- para o passo 2. Os passos 1 a 3 sao idempotentes (recriam restricao e
-- trigger). O passo 4 nao duplica: ele checa o slug antes de inserir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASSO 1 de 4 · Temas 5, 6 e 7 (a que faltava e causava o erro 23514)
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
-- PASSO 2 de 4 · Tema 8 Bandeira
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
-- PASSO 3 de 4 · Imagens de ~900 KB para 5 MB
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
-- PASSO 4 de 4 · Campanha do Felipe Sertanejo (rascunho inativo)
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
  candidate_id uuid := 'b7c1a0d4-5f83-4c2e-9a16-3d8e5f2b91c7';
  campaign_id uuid := 'e4f2c9a8-7b61-4d35-8c02-1a9f6e3b5d84';
begin
  -- slug_publico e obrigatorio: e o endereco do hub publico do candidato.
  insert into public.candidatos (
    id, nome, slug_publico, partido, cargo, estado, municipio
  )
  values (
    candidate_id,
    'Felipe Sertanejo',
    'felipe-sertanejo',
    'Partido Liberal (PL)',
    'Deputado Estadual',
    'SP',
    'São Paulo'
  )
  on conflict (id) do nothing;

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
