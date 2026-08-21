begin;

alter table public.campanhas
  add column if not exists texto_form text,
  add column if not exists texto_dot text,
  add column if not exists destaque_primario text,
  add column if not exists destaque_secundario text,
  add column if not exists cor_destaque text,
  add column if not exists imagem_fundo text,
  add column if not exists imagem_lateral text,
  add column if not exists tema smallint,
  add column if not exists texto_contexto text,
  add column if not exists texto_proposta text,
  add column if not exists texto_conclusao text,
  add column if not exists texto_impacto text,
  add column if not exists texto_impacto_apoio text,
  add column if not exists url_formulario text;

update public.campanhas
set cor_destaque = '#E05A5A'
where cor_destaque is null
   or cor_destaque !~ '^#[0-9A-Fa-f]{6}$';

alter table public.campanhas
  alter column cor_destaque set default '#E05A5A',
  alter column cor_destaque set not null;

update public.campanhas
set tema = 1
where tema is null or tema not in (1, 2);

alter table public.campanhas
  alter column tema set default 1,
  alter column tema set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_cor_destaque_hex'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_cor_destaque_hex
      check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_tema_valido'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_tema_valido
      check (tema in (1, 2));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_imagem_fundo_valida'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_imagem_fundo_valida
      check (
        imagem_fundo is null
        or (
          octet_length(imagem_fundo) <= 7000000
          and imagem_fundo ~ '^data:image/(jpeg|png|webp);base64,'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_imagem_lateral_valida'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_imagem_lateral_valida
      check (
        imagem_lateral is null
        or (
          octet_length(imagem_lateral) <= 7000000
          and imagem_lateral ~ '^data:image/(jpeg|png|webp);base64,'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_textos_tema2_tamanho'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_textos_tema2_tamanho
      check (
        (texto_contexto is null or char_length(texto_contexto) <= 8000)
        and (texto_proposta is null or char_length(texto_proposta) <= 4000)
        and (texto_conclusao is null or char_length(texto_conclusao) <= 4000)
        and (texto_impacto is null or char_length(texto_impacto) <= 300)
        and (texto_impacto_apoio is null or char_length(texto_impacto_apoio) <= 500)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_texto_conclusao_tamanho'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_texto_conclusao_tamanho
      check (texto_conclusao is null or char_length(texto_conclusao) <= 4000);
  end if;
end $$;

update public.campanhas
set url_formulario = null
where url_formulario is not null
  and url_formulario !~* '^https://(wa\.me|([a-z0-9-]+\.)*whatsapp\.com)(/|$)';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_url_formulario_whatsapp'
      and conrelid = 'public.campanhas'::regclass
  ) then
    alter table public.campanhas
      add constraint campanhas_url_formulario_whatsapp
      check (
        url_formulario is null
        or (
          octet_length(url_formulario) <= 2048
          and url_formulario ~* '^https://(wa\.me|([a-z0-9-]+\.)*whatsapp\.com)(/|$)'
        )
      );
  end if;
end $$;

alter table public.campanhas drop column if exists html;

commit;
