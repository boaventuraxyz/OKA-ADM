-- Aponta a campanha do Felipe para as artes oficiais versionadas junto com a
-- aplicação e restaura o formulário curto usado na página de referência.
begin;

update public.campanhas
set
  form_config = jsonb_build_object(
    'version', 1,
    'captureMode', 'configured',
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
        'Autorizo a campanha de Felipe Sertanejo e o Partido Liberal (PL) a me enviarem avisos, conteúdos, convites e pesquisas de opinião por WhatsApp e SMS. Posso cancelar quando quiser.',
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
  settings = jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{bandeira_assets}',
      jsonb_build_object(
        'heroUrl', '/campaigns/felipe-sertanejo/hero.png',
        'logoUrl', '/campaigns/felipe-sertanejo/logo.png'
      ),
      true
    ),
    '{title_highlights}',
    '[]'::jsonb,
    true
  ),
  updated_at = now()
where slug = 'felipe-sertanejo'
  and tema = 8;

commit;
