-- The security hotfix was registered in migration history after the additive
-- platform foundation. Reconcile only the authenticated staff grants guarded
-- by the platform RLS policies. Public and anon remain fully revoked.

begin;

revoke all privileges on table public.candidatos
  from public, anon, authenticated;
revoke all privileges on table public.campanhas
  from public, anon, authenticated;
revoke all privileges on table public.assinaturas
  from public, anon, authenticated;

grant select, insert, update on table public.candidatos to authenticated;
grant select, insert, update on table public.campanhas to authenticated;
grant select on table public.assinaturas to authenticated;

commit;
