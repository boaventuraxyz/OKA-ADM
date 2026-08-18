-- Targeted copy corrections reviewed against the current production records.
-- Every update is guarded by both id and the previous value so later editorial
-- changes are never overwritten when this migration is replayed.

begin;

update public.campanhas
set descricao = replace(
  descricao,
  '<b>Estupradores condenados precisam enfrentar medidas rigorosas.<b>',
  '<b>Estupradores condenados precisam enfrentar medidas rigorosas.</b>'
)
where id = 'b6b55fcb-8e46-4ddc-906c-f007c8fccb92'::uuid
  and descricao like '%<b>Estupradores condenados precisam enfrentar medidas rigorosas.<b>%';

update public.campanhas
set titulo = 'Pelo fim dos pedágios Free Flow — contra a máfia dos pedágios!'
where id = 'aa6132d5-574d-465b-8c0a-2297c66c47c4'::uuid
  and titulo = 'Pelo fim dos pedágios Free Flow! ㅤㅤㅤㅤㅤㅤContra a máfia dos pedágios!';

update public.campanhas
set legenda_video = 'Lucas Pavanato'
where id = '549d96b2-c02b-48bf-8006-937b19393361'::uuid
  and legenda_video = 'lucas pavanato';

update public.campanhas
set titulo = 'Abaixo-assinado contra invasores de terra'
where id = 'ea0ebe53-e8e1-4ded-b25f-571a471948b7'::uuid
  and titulo = 'Abaixo-Assinado Contra invasores de terra';

commit;

