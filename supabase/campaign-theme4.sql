begin;

alter table public.campanhas drop constraint if exists campanhas_tema_valido;

alter table public.campanhas
  add constraint campanhas_tema_valido
  check (tema in (1, 2, 3, 4));

commit;
