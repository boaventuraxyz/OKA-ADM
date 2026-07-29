begin;

alter table public.campanhas enable row level security;
alter table public.candidatos enable row level security;
alter table public.assinaturas enable row level security;

revoke all privileges on table public.campanhas from public, anon, authenticated;
revoke all privileges on table public.candidatos from public, anon, authenticated;
revoke all privileges on table public.assinaturas from public, anon, authenticated;

grant select, insert, update, delete on table public.campanhas to service_role;
grant select, insert, update, delete on table public.candidatos to service_role;
grant select, insert, update, delete on table public.assinaturas to service_role;

create unique index if not exists assinaturas_campanha_email_unique
  on public.assinaturas (campanha_id, lower(email_assinante))
  where email_assinante is not null and btrim(email_assinante) <> '';

create unique index if not exists assinaturas_campanha_telefone_unique
  on public.assinaturas (
    campanha_id,
    regexp_replace(numero_assinante, '[^0-9]', '', 'g')
  )
  where numero_assinante is not null and btrim(numero_assinante) <> '';

alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;

commit;
