-- Cria a candidatura de Miguel Patriota e uma campanha informativa no tema
-- Bandeira. A página identifica os candidatos e oferece cadastro opcional para
-- receber agenda, materiais e comunicados oficiais, sem pedido de apoio ou voto.
--
-- O conteúdo nasce como rascunho inativo. Dados legais, imagens e eventual URL
-- de redirecionamento devem ser conferidos e preenchidos no painel antes da
-- publicação.
--
-- Idempotente: reaproveita um candidato de mesmo nome, corrige somente cargo e
-- UF confirmados no briefing e não sobrescreve uma campanha que já use o slug
-- miguel-patriota.
begin;

do $$
declare
  candidate_name constant text := 'Miguel Patriota';
  candidate_id uuid;
  campaign_id uuid := gen_random_uuid();
  candidate_slug text := 'miguel-patriota';
begin
  select id into candidate_id
  from public.candidatos
  where lower(btrim(nome)) = lower(candidate_name)
  order by criado_em nulls last
  limit 1;

  if candidate_id is null then
    candidate_id := gen_random_uuid();

    if exists (
      select 1
      from public.candidatos
      where lower(slug_publico) = candidate_slug
    ) then
      candidate_slug := candidate_slug || '-' || left(candidate_id::text, 8);
    end if;

    insert into public.candidatos (
      id,
      nome,
      slug_publico,
      partido,
      cargo,
      estado,
      municipio
    )
    values (
      candidate_id,
      candidate_name,
      candidate_slug,
      null,
      'Deputado Estadual',
      'RS',
      null
    )
    on conflict (id) do nothing;

    raise notice 'Candidato % criado.', candidate_name;
  else
    raise notice 'Candidato % ja existia; a campanha sera vinculada a ele.', candidate_name;
  end if;

  update public.candidatos
  set
    cargo = 'Deputado Estadual',
    municipio = case
      when btrim(estado) is distinct from 'RS' then null
      else municipio
    end,
    estado = 'RS'
  where id = candidate_id
    and (
      cargo is distinct from 'Deputado Estadual'
      or btrim(estado) is distinct from 'RS'
    );

  if exists (
    select 1
    from public.campanhas
    where lower(slug) = 'miguel-patriota'
  ) then
    raise notice 'Campanha miguel-patriota ja existe; nada foi alterado.';
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
    'miguel-patriota',
    'Miguel Patriota e Rony Gabriel',
    8,
    'bandeira',
    'draft',
    false,
    '#F7CB34',
    'Informações oficiais sobre as candidaturas de Miguel Patriota e Rony Gabriel no Rio Grande do Sul.' ||
      chr(10) || chr(10) ||
      'Consulte agenda pública, materiais da campanha, registros de atividades e comunicados.',
    'Candidaturas no Rio Grande do Sul',
    'Cadastrar para atualizações',
    'Receba informações oficiais',
    'Identificação dos candidatos',
    'Miguel Patriota é candidato a deputado estadual, número 20221.' ||
      chr(10) || chr(10) ||
      'Rony Gabriel é candidato a deputado federal, número 2022.' ||
      chr(10) || chr(10) ||
      'Esta página reúne informações publicadas pela campanha e os respectivos canais oficiais.',
    'Informações disponíveis',
    'Conteúdos organizados para consulta e acompanhamento.',
    'Agenda pública' || chr(10) ||
      'Datas, horários e locais de eventos divulgados oficialmente.' ||
      chr(10) || chr(10) ||
      'Materiais oficiais' || chr(10) ||
      'Peças e documentos publicados pela campanha.' ||
      chr(10) || chr(10) ||
      'Registros de atividades' || chr(10) ||
      'Imagens e vídeos disponibilizados nos canais oficiais.' ||
      chr(10) || chr(10) ||
      'Comunicados' || chr(10) ||
      'Avisos sobre encontros, eventos e próximas mobilizações.',
    'O cadastro é opcional e pode ser cancelado a qualquer momento.',
    'Agenda e encontros presenciais' || chr(10) ||
      'Materiais oficiais da campanha' || chr(10) ||
      'Registros públicos de atividades' || chr(10) ||
      'Comunicados sobre próximas mobilizações',
    'Atualizações oficiais em um só canal',
    'Cadastre-se para receber informações oficiais sobre agenda, eventos, materiais e comunicados.',
    'Página informativa oficial de Miguel Patriota 20221 e Rony Gabriel 2022.',
    'Miguel Patriota 20221 e Rony Gabriel 2022',
    'Informações oficiais, agenda pública e materiais das candidaturas de Miguel Patriota e Rony Gabriel no Rio Grande do Sul.',
    'Miguel Patriota 20221 e Rony Gabriel 2022',
    'Consulte agenda, materiais e comunicados oficiais das duas candidaturas no Rio Grande do Sul.',
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
          'placeholder', '(51) 9 9999-9999',
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
          'Autorizo as campanhas de Miguel Patriota e Rony Gabriel a me enviarem informações ' ||
          'oficiais sobre agenda pública, eventos, materiais e comunicados por WhatsApp e SMS. ' ||
          'Declaro estar de acordo com a Política de Privacidade. Posso cancelar quando quiser.',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'fields', jsonb_build_array('nome', 'telefone'),
            'label', 'Seus dados',
            'note', 'Ao continuar, seus dados de contato ficam registrados para o envio das atualizações solicitadas.',
            'submitLabel', 'Continuar',
            'subtitle', 'Informe os dados necessários para receber comunicados oficiais.',
            'title', 'Dados de contato'
          ),
          jsonb_build_object(
            'fields', jsonb_build_array('estado'),
            'label', 'Seu estado',
            'note', 'Seus dados não são vendidos nem usados para fins comerciais.',
            'submitLabel', 'Concluir cadastro',
            'subtitle', 'A informação permite organizar os comunicados por região.',
            'title', 'Confirme seu estado'
          )
        ),
        'done', jsonb_build_object(
          'buttonLabel', 'Continuar',
          'label', 'Pronto',
          'message', 'Seu cadastro foi recebido. As atualizações oficiais poderão ser enviadas pelos canais informados.',
          'title', 'Cadastro confirmado'
        )
      )
    ),
    jsonb_build_object(
      'allow_sharing', false,
      'candidate_number', '20221',
      'collect_address', false,
      'require_consent', true,
      'bandeira_labels', jsonb_build_object(
        'hero', 'Informações oficiais',
        'support', 'Candidaturas',
        'topics', 'Conteúdos',
        'group', 'Atualizações'
      ),
      'title_highlights', jsonb_build_array(
        jsonb_build_object('index', 3, 'color', '#F7CB34')
      )
    )
  );

  raise notice 'Campanha informativa miguel-patriota criada como rascunho.';
end
$$;

commit;
