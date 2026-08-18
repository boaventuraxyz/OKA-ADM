begin;

alter table public.campanhas
  add column if not exists texto_faixa text,
  add column if not exists titulo_topicos text,
  add column if not exists texto_topicos_intro text,
  add column if not exists texto_topicos text,
  add column if not exists titulo_citacao text,
  add column if not exists texto_citacao text,
  add column if not exists nota_citacao text,
  add column if not exists titulo_video text,
  add column if not exists video_url text,
  add column if not exists texto_video text,
  add column if not exists legenda_video text,
  add column if not exists nota_video text,
  add column if not exists titulo_assinar text,
  add column if not exists texto_assinar text,
  add column if not exists texto_compartilhar text;

alter table public.campanhas drop constraint if exists campanhas_tema_valido;
alter table public.campanhas
  add constraint campanhas_tema_valido
  check (tema in (1, 2, 3, 4));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_video_url_valida'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_video_url_valida
      check (
        video_url is null
        or (
          octet_length(video_url) <= 2048
          and video_url ~* '^(https://|/)'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_textos_tema3_tamanho'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_textos_tema3_tamanho
      check (
        (texto_faixa is null or char_length(texto_faixa) <= 500)
        and (titulo_topicos is null or char_length(titulo_topicos) <= 200)
        and (texto_topicos_intro is null or char_length(texto_topicos_intro) <= 2000)
        and (texto_topicos is null or char_length(texto_topicos) <= 8000)
        and (titulo_citacao is null or char_length(titulo_citacao) <= 200)
        and (texto_citacao is null or char_length(texto_citacao) <= 2000)
        and (nota_citacao is null or char_length(nota_citacao) <= 1000)
        and (titulo_video is null or char_length(titulo_video) <= 200)
        and (texto_video is null or char_length(texto_video) <= 4000)
        and (legenda_video is null or char_length(legenda_video) <= 300)
        and (nota_video is null or char_length(nota_video) <= 1000)
        and (titulo_assinar is null or char_length(titulo_assinar) <= 200)
        and (texto_assinar is null or char_length(texto_assinar) <= 2000)
        and (texto_compartilhar is null or char_length(texto_compartilhar) <= 500)
      );
  end if;
end $$;

commit;
