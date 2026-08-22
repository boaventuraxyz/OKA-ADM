-- Alinha a campanha publicada do Felipe Sertanejo ao layout de referência.
-- O update é intencionalmente limitado pelo slug e pelo tema para não alcançar
-- outras campanhas que também usem o tema Bandeira.
begin;

update public.campanhas
set
  descricao =
    'Passei a vida lutando. Agora eu luto por São Paulo — dentro da Assembleia!' ||
    chr(10) || chr(10) ||
    'Faça parte do movimento que vai mudar o rumo de São Paulo',
  titulo_topicos = 'O Nikolas Ferreira me chamou pra essa luta.',
  texto_contexto =
    'Em 2024 ele me desafiou a entrar na política. Eu aceitei e disputei a Câmara de São Paulo. ' ||
    'Fiquei como primeiro suplente na maior cidade do país.' ||
    chr(10) || chr(10) ||
    'Agora o desafio é maior: representar o estado inteiro na Assembleia Legislativa. ' ||
    'E eu não faço isso sozinho.',
  titulo_video = 'Ato na Paulista',
  video_url = 'https://felipesertanejo.com.br/wp-content/uploads/2026/08/IMG_5208.mp4',
  titulo_assinar = 'O que eu vou defender',
  texto_impacto = 'Se una a pessoas que estão lutando pelo futuro de São Paulo',
  texto_impacto_apoio = 'Ao se inscrever, você receberá acesso exclusivo à campanha.',
  url_formulario = 'https://chat.whatsapp.com/D2nj0uee8zA2S4fY3f3ZVw?s=cl&p=i&mlu=4',
  settings = jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{video_carousel}',
      jsonb_build_array(
        jsonb_build_object(
          'caption', 'Ato na Paulista',
          'url', 'https://felipesertanejo.com.br/wp-content/uploads/2026/08/IMG_5208.mp4'
        )
      ),
      true
    ),
    '{allow_sharing}',
    'false'::jsonb,
    true
  ),
  updated_at = now()
where slug = 'felipe-sertanejo'
  and tema = 8;

commit;
