-- Mantém somente o conteúdo da campanha do Felipe sincronizado com a página oficial.
-- O update é limitado pelo slug, tema e status publicados para não alcançar outras campanhas.
begin;

update public.campanhas
set
  titulo = 'A luta agora é outra.',
  descricao =
    'Passei a vida lutando. Agora eu luto por São Paulo — dentro da Assembleia!' ||
    chr(10) || chr(10) ||
    'Faça parte do movimento que vai mudar o rumo de São Paulo',
  titulo_topicos = 'O Nikolas Ferreira me chamou pra essa luta.',
  texto_contexto =
    '<strong>Em 2024 ele me desafiou a entrar na política.</strong> ' ||
    'Eu aceitei e disputei a Câmara de São Paulo. Fiquei como primeiro suplente na maior cidade do país.' ||
    chr(10) || chr(10) ||
    'Agora o desafio é maior: representar o estado inteiro na Assembleia Legislativa. ' ||
    'E eu não faço isso sozinho.',
  titulo_video = 'Ato na Paulista',
  video_url = 'https://felipesertanejo.com.br/wp-content/uploads/2026/08/IMG_5208.mp4',
  titulo_assinar = 'O que eu vou defender',
  texto_topicos_intro = null,
  texto_topicos =
    'Polícia valorizada, rua mais segura' || chr(10) ||
    'Salário digno, isenção de taxas e condições de vida à altura do risco que o policial corre todo dia.' ||
    chr(10) || chr(10) ||
    'Escola pra ensinar, não para doutrinar' || chr(10) ||
    'Ensino religioso facultativo garantido e foco no aprendizado. Militância política não é matéria escolar.' ||
    chr(10) || chr(10) ||
    'Oportunidade para quem precisa' || chr(10) ||
    'Cota por renda, não por cor ou rótulo. Quem é pobre merece uma chance, seja quem for.' ||
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
  texto_impacto = 'Se una a pessoas que estão lutando pelo futuro de São Paulo',
  texto_impacto_apoio = 'Ao se inscrever, você receberá acesso exclusivo à:',
  texto_conclusao =
    'Agendas e Encontros Presenciais' || chr(10) ||
    'Materiais de Divulgação' || chr(10) ||
    'Bastidores de toda a campanha' || chr(10) ||
    'Informações Antecipadas',
  texto_form = 'Preencha e entre para o movimento',
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
    '{legal,committee}',
    to_jsonb((
      'Endereço do comitê: ainda não definido — correspondência provisória na residência do candidato: ' ||
      'Rua Francisco Marcondes Vieira, 3 — Apartamento 224, bloco 1 — São Paulo - SP — CEP 05639-090'
    )::text),
    true
  ),
  updated_at = now()
where slug = 'felipe-sertanejo'
  and tema = 8
  and status = 'published';

commit;
