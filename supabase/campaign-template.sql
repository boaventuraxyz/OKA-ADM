begin;

alter table public.campanhas
  add column if not exists destaque_primario text,
  add column if not exists destaque_secundario text,
  add column if not exists cor_destaque text;

update public.campanhas
set cor_destaque = '#E05A5A'
where cor_destaque is null
   or cor_destaque !~ '^#[0-9A-Fa-f]{6}$';

alter table public.campanhas
  alter column cor_destaque set default '#E05A5A',
  alter column cor_destaque set not null;

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

alter table public.campanhas drop column if exists html;

commit;
