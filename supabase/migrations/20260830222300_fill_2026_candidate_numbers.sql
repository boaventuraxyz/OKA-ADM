-- Números de urna conferidos em 30/08/2026 no conjunto de candidaturas 2026
-- do Portal de Dados Abertos do TSE:
-- https://dadosabertos.tse.jus.br/pt_BR/dataset/candidatos-2026
--
-- A identificação combina slug, nome, partido e UF para evitar atualizar
-- homônimos ou registros cujo enquadramento eleitoral tenha divergido.
with numeros_2026 (slug_publico, nome, partido, estado, numero) as (
  values
    ('abilio-santana', 'Abílio Santana', 'PSDB', 'BA', '4533'),
    ('julia-de-castro', 'Julia de Castro', 'PL', 'RJ', '2202'),
    ('lucas-pavanato', 'Lucas Pavanato', 'PL', 'SP', '2211'),
    ('tiemi-nevoeiro', 'Tiemi Nevoeiro', 'PL', 'SP', '2232')
)
update public.candidatos as candidato
set numero = numeros.numero
from numeros_2026 as numeros
where candidato.slug_publico = numeros.slug_publico
  and candidato.nome = numeros.nome
  and candidato.partido = numeros.partido
  and candidato.estado = numeros.estado
  and (candidato.numero is null or candidato.numero = numeros.numero);
