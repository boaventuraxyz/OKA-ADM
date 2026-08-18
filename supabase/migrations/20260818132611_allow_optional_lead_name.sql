-- Campaign form_config decides whether a name is requested/required. Keeping
-- this column globally NOT NULL would force the server to invent personal data
-- for valid forms that omit the field. Dropping NOT NULL preserves every row
-- and remains idempotent.

begin;

alter table public.assinaturas
  alter column nome_assinante drop not null;

comment on column public.assinaturas.nome_assinante is
  'Optional lead name; requiredness is defined by campaign form_config and enforced server-side.';

commit;
