-- Redistribute Julia de Castro's reviewed portfolio across the four public
-- themes. Most campaigns use the direct Cover layout; the three long-form
-- themes are reserved for campaigns whose copy best fits each format.
do $$
declare
  updated_campaigns integer;
  assigned_campaigns integer;
begin
  if not exists (
    select 1
    from public.candidatos
    where id = '44e501d2-6153-4d47-a552-8ae16be927a4'::uuid
      and nome = 'Julia de Castro'
  ) then
    raise exception 'Julia de Castro candidate record was not found';
  end if;

  with theme_distribution (
    id,
    tema,
    theme_key,
    accent,
    texto_contexto,
    texto_proposta,
    texto_conclusao,
    texto_impacto,
    texto_impacto_apoio
  ) as (
    values
      -- Cover: concise campaigns that benefit from an immediate CTA.
      (
        'ed58ffdb-b358-4f0a-8a5b-119406cef2b0'::uuid,
        1::smallint,
        'cover'::text,
        '#C43D42'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text
      ),
      (
        'f175dedd-0f35-439f-aa06-882a29e009ac'::uuid,
        1::smallint,
        'cover'::text,
        '#C43D42'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text
      ),
      (
        '7da492d8-48f1-4004-a989-6109824f09a5'::uuid,
        1::smallint,
        'cover'::text,
        '#C43D42'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text
      ),
      (
        '9bbc7503-08a9-4eb6-a554-4e171a7fb369'::uuid,
        1::smallint,
        'cover'::text,
        '#C43D42'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text
      ),
      -- Manifesto: the strongest argument-led campaign in the portfolio.
      (
        '02b1a4ce-d68a-4322-aec5-89829a40f123'::uuid,
        3::smallint,
        'manifesto'::text,
        '#E2382B'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text
      ),
      -- Impact dark: personal testimony, urgency and long-form mobilization.
      (
        'b30d3d7f-d508-4eb5-9d35-86c3d70ad0c1'::uuid,
        4::smallint,
        'impact-dark'::text,
        '#D81F26'::text,
        'Chega de silêncio: escola e universidade precisam voltar a ser espaços de conhecimento, liberdade e respeito a quem pensa diferente.'::text,
        null::text,
        null::text,
        'Conhecimento abre caminhos. Doutrinação fecha.'::text,
        'Cada assinatura fortalece a liberdade para aprender, ensinar, perguntar e discordar.'::text
      ),
      -- Editorial: a public-policy proposal that benefits from context and a
      -- clear sequence from problem to solution.
      (
        'def2a5d2-7c0d-4697-8665-7b4ed1eb94f9'::uuid,
        2::smallint,
        'editorial'::text,
        '#D77A45'::text,
        'O Centro do Rio perdeu movimento, oportunidades e negócios enquanto quem empreende enfrenta burocracia, insegurança e regras que dificultam manter as portas abertas.'::text,
        'Simplificar regras, dar previsibilidade a comerciantes e estimular a ocupação econômica dos bairros para devolver trabalho, renda e vitalidade à cidade.'::text,
        'Um Rio mais vivo começa quando trabalhar e empreender deixam de ser uma corrida de obstáculos.'::text,
        'Portas abertas geram trabalho, renda e bairros mais vivos.'::text,
        'Assine por menos burocracia e mais liberdade para quem faz o Rio crescer.'::text
      )
  )
  update public.campanhas as campaign
  set
    tema = distribution.tema,
    theme_key = distribution.theme_key,
    cor_destaque = distribution.accent,
    texto_contexto = case
      when distribution.texto_contexto is null then campaign.texto_contexto
      else distribution.texto_contexto
    end,
    texto_proposta = case
      when distribution.texto_proposta is null then campaign.texto_proposta
      else distribution.texto_proposta
    end,
    texto_conclusao = case
      when distribution.texto_conclusao is null then campaign.texto_conclusao
      else distribution.texto_conclusao
    end,
    texto_impacto = case
      when distribution.texto_impacto is null then campaign.texto_impacto
      else distribution.texto_impacto
    end,
    texto_impacto_apoio = case
      when distribution.texto_impacto_apoio is null then campaign.texto_impacto_apoio
      else distribution.texto_impacto_apoio
    end,
    updated_at = now()
  from theme_distribution as distribution
  where campaign.id = distribution.id
    and campaign.candidato_id = '44e501d2-6153-4d47-a552-8ae16be927a4'::uuid
    and (
      campaign.tema is distinct from distribution.tema
      or campaign.theme_key is distinct from distribution.theme_key
      or campaign.cor_destaque is distinct from distribution.accent
      or (
        distribution.texto_contexto is not null
        and campaign.texto_contexto is distinct from distribution.texto_contexto
      )
      or (
        distribution.texto_proposta is not null
        and campaign.texto_proposta is distinct from distribution.texto_proposta
      )
      or (
        distribution.texto_conclusao is not null
        and campaign.texto_conclusao is distinct from distribution.texto_conclusao
      )
      or (
        distribution.texto_impacto is not null
        and campaign.texto_impacto is distinct from distribution.texto_impacto
      )
      or (
        distribution.texto_impacto_apoio is not null
        and campaign.texto_impacto_apoio is distinct from distribution.texto_impacto_apoio
      )
    );

  get diagnostics updated_campaigns = row_count;

  select count(*)
  into assigned_campaigns
  from public.campanhas
  where candidato_id = '44e501d2-6153-4d47-a552-8ae16be927a4'::uuid
    and (
      (id in (
        'ed58ffdb-b358-4f0a-8a5b-119406cef2b0'::uuid,
        'f175dedd-0f35-439f-aa06-882a29e009ac'::uuid,
        '7da492d8-48f1-4004-a989-6109824f09a5'::uuid,
        '9bbc7503-08a9-4eb6-a554-4e171a7fb369'::uuid
      ) and tema = 1 and theme_key = 'cover')
      or (id = 'def2a5d2-7c0d-4697-8665-7b4ed1eb94f9'::uuid and tema = 2 and theme_key = 'editorial')
      or (id = '02b1a4ce-d68a-4322-aec5-89829a40f123'::uuid and tema = 3 and theme_key = 'manifesto')
      or (id = 'b30d3d7f-d508-4eb5-9d35-86c3d70ad0c1'::uuid and tema = 4 and theme_key = 'impact-dark')
    );

  if assigned_campaigns <> 7 then
    raise exception 'Julia de Castro theme distribution is incomplete: expected 7, found %', assigned_campaigns;
  end if;

  raise notice 'Julia de Castro campaigns redistributed: % updated, % validated',
    updated_campaigns,
    assigned_campaigns;
end
$$;
