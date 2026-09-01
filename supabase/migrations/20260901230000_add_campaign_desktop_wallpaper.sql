-- O tema 8 usa dois wallpapers, como a campanha de referência do Felipe:
-- 1600x893 no desktop e 768x1376 no celular. A coluna existente
-- `imagem_lateral` continua sendo o wallpaper vertical; esta coluna guarda a
-- versão horizontal sem misturar as duas proporções.
begin;

alter table public.campanhas
  add column if not exists imagem_desktop text;

alter table public.campanhas
  drop constraint if exists campanhas_imagem_desktop_valida;

alter table public.campanhas
  add constraint campanhas_imagem_desktop_valida
  check (
    imagem_desktop is null
    or (
      octet_length(imagem_desktop) <= 7000000
      and imagem_desktop ~ '^data:image/(jpeg|png|webp);base64,'
    )
  );

commit;
