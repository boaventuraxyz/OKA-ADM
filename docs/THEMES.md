# Temas: criação e manutenção

`features/themes/registry.ts` é a única fonte de metadados e campos usada pelo editor,
pela IA, pela galeria administrativa e por `/theme-library`. Não mantenha uma
segunda lista em páginas ou componentes. Cada entrada contém seções e campos
com chave persistida, rótulo, tipo, limite, ajuda e obrigatoriedade. O editor
filtra também o payload por essa definição; trocar de tema não apaga conteúdo
legado, mas dados de outro tema não são gravados por engano.

## Campos atuais

- `cover`: slogan principal, complemento, descrição e imagem de fundo;
- `editorial`: destaques, resumo, imagem lateral, contexto, proposta, conclusão
  e chamada intermediária;
- `manifesto`: abertura, faixa, tópicos, citação, vídeo, notas, assinatura e
  compartilhamento;
- `impact-dark`: marca, chamada principal, resumo, vídeo, relato, reforços e
  chamada final.

## Adicionar um tema

1. duplique o renderer público mais próximo em `components/`;
2. duplique e adapte a prévia correspondente em
   `features/themes/ThemePreview.tsx`;
3. adicione uma entrada completa em `THEME_REGISTRY`, com `key` estável,
   metadados, paleta, status, tags, capacidades e `sections`;
4. registre o renderer no roteamento público de `app/formulario/page.tsx`;
5. se o novo tema precisar de outro identificador numérico legado, crie uma
   migration aditiva para ampliar a constraint e o trigger de sincronização;
6. atualize `lib/supabase/database.types.ts` após aplicar a migration;
7. adicione o novo tema aos casos de preview/E2E e rode `pnpm verify` e
   `pnpm test:e2e`.

Ao concluir os passos 2 e 3, o tema aparece automaticamente nas duas galerias,
nos filtros, no editor e no catálogo fechado enviado à IA. A etapa 4 é
obrigatória para que a página pública tenha uma composição própria em vez de
um fallback.

## Duplicar um tema

Duplicar significa criar uma nova `key` e um novo renderer versionado. Não
copie apenas a entrada do registry usando o mesmo componente se o resultado
visual precisar evoluir de forma independente.

Use uma `key` curta, em kebab-case, e trate-a como contrato persistido. Depois
que uma campanha usa a chave, renomeá-la exige migration e fallback de leitura.

## Desativar ou remover

- use `status: "deprecated"` primeiro;
- mantenha o renderer enquanto existir campanha com a chave;
- consulte o uso exibido em `/admin/themes` e confirme os dados no banco;
- migre campanhas para outro tema antes de remover código ou constraints;
- nunca remova uma chave ativa apenas porque não aparece em uma busca local.

## Checklist de revisão visual

- desktop, tablet e celular;
- headline curta e longa;
- CTA e formulário com todos os estados;
- contraste, foco e navegação por teclado;
- conteúdo opcional ausente;
- vídeo/imagens indisponíveis;
- confirmação de assinatura e compartilhamento;
- metadados SEO/Open Graph.
