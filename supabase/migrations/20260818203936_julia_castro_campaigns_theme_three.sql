-- Standardize every campaign owned by Julia de Castro on Theme 3 (Manifesto).
-- The candidate identity guard prevents an accidental update if the UUID is
-- ever reused in a different environment.
do $$
declare
  updated_campaigns integer;
begin
  if not exists (
    select 1
    from public.candidatos
    where id = '44e501d2-6153-4d47-a552-8ae16be927a4'::uuid
      and nome = 'Julia de Castro'
  ) then
    raise exception 'Julia de Castro candidate record was not found';
  end if;

  update public.campanhas
  set
    tema = 3,
    theme_key = 'manifesto',
    updated_at = now()
  where candidato_id = '44e501d2-6153-4d47-a552-8ae16be927a4'::uuid
    and (
      tema is distinct from 3
      or theme_key is distinct from 'manifesto'
    );

  get diagnostics updated_campaigns = row_count;
  raise notice 'Julia de Castro campaigns updated to Theme 3: %', updated_campaigns;
end
$$;
