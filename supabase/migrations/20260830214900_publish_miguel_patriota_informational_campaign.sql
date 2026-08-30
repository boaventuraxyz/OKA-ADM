-- Publica somente a campanha informativa criada pela migration imediatamente
-- anterior. Imagens, URL externa e dados legais continuam editáveis no painel.
--
-- Idempotente: se a campanha já estiver publicada com a identificação
-- esperada, uma nova execução apenas valida o estado atual.
begin;

do $$
declare
  updated_campaigns integer;
begin
  update public.campanhas
  set
    status = 'published',
    updated_at = now()
  where slug = 'miguel-patriota'
    and titulo = 'Miguel Patriota e Rony Gabriel'
    and theme_key = 'bandeira'
    and status = 'draft';

  get diagnostics updated_campaigns = row_count;

  if not exists (
    select 1
    from public.campanhas
    where slug = 'miguel-patriota'
      and titulo = 'Miguel Patriota e Rony Gabriel'
      and theme_key = 'bandeira'
      and status = 'published'
      and ativa = true
      and published_at is not null
  ) then
    raise exception 'Campanha miguel-patriota nao foi encontrada ou nao pode ser publicada';
  end if;

  raise notice 'Campanha informativa miguel-patriota publicada: % registro atualizado.',
    updated_campaigns;
end
$$;

commit;
