-- Emergency containment applied to production on 2026-08-18.
-- All application data access currently goes through a trusted Next.js server
-- using a Supabase secret key, so public Data API roles need no table access.

begin;

alter table public.campanhas enable row level security;
alter table public.candidatos enable row level security;
alter table public.assinaturas enable row level security;

drop policy if exists allow_public_insert on public.campanhas;
drop policy if exists allow_public_select on public.campanhas;
drop policy if exists full_access on public.campanhas;

drop policy if exists allow_public_insert on public.candidatos;
drop policy if exists allow_public_select on public.candidatos;
drop policy if exists full_access on public.candidatos;

drop policy if exists allow_public_insert on public.assinaturas;
drop policy if exists allow_public_select on public.assinaturas;
drop policy if exists full_access on public.assinaturas;

revoke all privileges on table public.campanhas from public, anon, authenticated;
revoke all privileges on table public.candidatos from public, anon, authenticated;
revoke all privileges on table public.assinaturas from public, anon, authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;

alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;

alter default privileges in schema public
  revoke execute on functions from anon, authenticated;

commit;
