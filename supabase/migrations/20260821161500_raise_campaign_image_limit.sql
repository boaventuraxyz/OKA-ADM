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
