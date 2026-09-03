-- Cria uma segunda campanha para Miguel Patriota com o tema Bandeira, o fluxo
-- progressivo de cadastro da página de referência e wallpapers versionados na
-- aplicação. A campanha nasce como rascunho para revisão antes da publicação.
--
-- Idempotente: reaproveita o candidato da campanha existente e não altera nem
-- duplica registros quando o slug novo já está cadastrado.
begin;

do $$
declare
  source_campaign public.campanhas%rowtype;
  campaign_id uuid := gen_random_uuid();
  target_slug constant text := 'gauchos-com-flavio-bolsonaro-rs';
begin
  if exists (
    select 1
    from public.campanhas
    where lower(slug) = target_slug
  ) then
    raise notice 'Campanha % ja existe; nada foi alterado.', target_slug;
    return;
  end if;

  select campaign.*
  into source_campaign
  from public.campanhas as campaign
  where campaign.slug in (
    'miguel-patriota-rony-gabriel-rs',
    'miguel-patriota'
  )
  order by
    case when campaign.slug = 'miguel-patriota-rony-gabriel-rs' then 0 else 1 end,
    campaign.created_at nulls last
  limit 1;

  if source_campaign.id is null or source_campaign.candidato_id is null then
    raise exception 'Campanha de referencia de Miguel Patriota nao encontrada';
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
    og_image,
    form_config,
    settings
  )
  values (
    campaign_id,
    source_campaign.candidato_id,
    target_slug,
    '🇧🇷 Gaúchos com Flávio Bolsonaro',
    8,
    'bandeira',
    'draft',
    false,
    '#FACC15',
    'O Rio Grande do Sul sempre mostrou sua força na defesa dos nossos valores. Agora é hora de mostrar, mais uma vez, de que lado estamos.',
    'Movimento oficial',
    '👇 Assine agora e faça parte desse movimento',
    'Quero fazer parte do movimento',
    'Estamos reunindo o maior movimento de apoio de gaúchos bolsonaristas a Flávio Bolsonaro no Rio Grande do Sul.',
    'Se você acredita na continuidade do legado de Bolsonaro, na defesa da liberdade, da família e dos valores que compartilhamos, coloque seu nome nessa mobilização.' ||
      chr(10) || chr(10) ||
      'Assine agora e cadastre-se para receber materiais do Bolsonaro na sua casa.',
    'Eu sou gaúcho. Eu sou bolsonarista. Eu apoio Flávio Bolsonaro.',
    'Coloque seu nome nessa mobilização e faça parte do maior movimento de apoio de gaúchos bolsonaristas a Flávio Bolsonaro no Rio Grande do Sul.',
    null,
    'Cadastre-se para receber materiais do Bolsonaro na sua casa.',
    '🇧🇷 Faça parte da mobilização gaúcha' || chr(10) ||
      '📲 Receba materiais do Bolsonaro' || chr(10) ||
      '📬 Receba conteúdos na sua casa' || chr(10) ||
      '🚨 Acompanhe as próximas ações',
    '👇 Assine agora e faça parte desse movimento',
    'Cadastre-se para receber materiais do Bolsonaro na sua casa.',
    'Convide outros gaúchos para fazer parte deste movimento.',
    'Gaúchos com Flávio Bolsonaro | Miguel Patriota',
    'Movimento de apoio de gaúchos bolsonaristas a Flávio Bolsonaro no Rio Grande do Sul.',
    'Gaúchos com Flávio Bolsonaro',
    'Assine e faça parte do movimento de apoio a Flávio Bolsonaro no Rio Grande do Sul.',
    '/campaigns/gauchos-com-flavio-bolsonaro-rs/social.jpg',
    jsonb_build_object(
      'version', 1,
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'name', 'key', 'nome', 'type', 'text',
          'label', 'Nome completo', 'options', jsonb_build_array(),
          'required', true, 'placeholder', 'Seu nome completo'
        ),
        jsonb_build_object(
          'id', 'email', 'key', 'email', 'type', 'email',
          'label', 'E-mail', 'options', jsonb_build_array(),
          'required', true, 'placeholder', 'nome@email.com'
        ),
        jsonb_build_object(
          'id', 'phone', 'key', 'telefone', 'type', 'phone',
          'label', 'WhatsApp', 'options', jsonb_build_array(),
          'required', true, 'placeholder', 'WhatsApp com DDD'
        )
      )
    ),
    jsonb_build_object(
      'allow_sharing', true,
      'collect_address', true,
      'require_consent', true,
      'bandeira_hide_logo', true,
      'bandeira_labels', jsonb_build_object(
        'hero', 'Movimento oficial',
        'support', 'Apoio',
        'topics', 'Mobilização',
        'group', 'Assine agora'
      ),
      'bandeira_wallpapers', jsonb_build_object(
        'desktopUrl', '/campaigns/gauchos-com-flavio-bolsonaro-rs/hero-desktop.png',
        'mobileUrl', '/campaigns/gauchos-com-flavio-bolsonaro-rs/hero-mobile.png'
      ),
      'title_highlights', jsonb_build_array(
        jsonb_build_object('index', 3, 'color', '#FACC15'),
        jsonb_build_object('index', 4, 'color', '#22C55E')
      )
    ) || case
      when source_campaign.settings ? 'legal'
        then jsonb_build_object('legal', source_campaign.settings -> 'legal')
      else '{}'::jsonb
    end
  );

  raise notice 'Campanha % criada como rascunho.', target_slug;
end
$$;

commit;
