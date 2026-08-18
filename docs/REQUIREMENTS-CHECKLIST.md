# Checklist dos 75 requisitos

Este documento cruza o prompt de reformulação com a implementação atual e
separa código concluído de validações que dependem de acesso ou dados remotos.

Legenda: **Concluído** = implementado e testado; **Decisão segura** = objetivo
atendido por solução equivalente documentada; **Operacional** = código pronto,
mas confirmação final depende do ambiente ou de uma conta de teste.

| # | Requisito | Estado | Evidência principal |
| ---: | --- | --- | --- |
| 0 | Auditoria de acessos | Operacional | Git e deploy disponíveis; Settings/logs Vercel e administração Supabase dependem da sessão do proprietário |
| 1 | Qualidade | Concluído | `pnpm verify`, E2E e revisão final |
| 2 | Auditoria do legado | Concluído | `IMPLEMENTATION-AUDIT.md` e `MIGRATION.md` |
| 3 | Stack Vercel + Supabase | Concluído | Next.js, TypeScript, Supabase e Vercel |
| 4 | Arquitetura clara | Concluído | `app`, `features`, services, repositories, `lib/supabase`, `config` |
| 5 | Design system | Concluído | `components/ui`, tokens, shell e estados compartilhados |
| 6 | Repaginação | Concluído | painel `/admin` e páginas públicas temáticas |
| 7 | Área administrativa | Concluído | dashboard, campanhas, temas, formulários, leads, usuários e configurações |
| 8 | Login e autenticação | Concluído | Supabase Auth SSR, refresh, guards e logout |
| 9 | Master/admin/editor | Operacional | RBAC e bootstrap prontos; primeiro Master é promovido pelo operador no Supabase |
| 10 | Dashboard | Concluído | métricas, itens recentes e atalhos |
| 11 | Gestão de campanhas | Concluído | busca, filtros, ordenação, paginação e ações |
| 12 | Status | Concluído | `draft`, `published`, `archived` |
| 13 | Duplicação | Concluído | conteúdo, formulário, tema, configurações e SEO em novo draft |
| 14 | Criar com IA | Concluído | `/admin/campaigns/ai` |
| 15 | IA somente em draft | Concluído | serviço força draft inativo |
| 16 | Campos da IA | Concluído | schema estruturado e tudo editável |
| 17 | Slogans contextuais | Concluído | prompt contextual e testes |
| 18 | Tema sugerido pela IA | Concluído | catálogo fechado e `themeKey` validada |
| 19 | Editor em tabs | Concluído | Conteúdo, Formulário, Tema, SEO, Configurações e Preview |
| 20 | Preview em tempo real | Concluído | copy, CTA, cor, tema e campos ao vivo |
| 21 | Autosave | Concluído | debounce, validação, fila única e conflito por `updated_at` |
| 22 | Slug | Concluído | geração, edição e unique constraint |
| 23 | SEO | Concluído | campos e defaults de metadata |
| 24 | Biblioteca de temas | Concluído | galeria, metadados, filtros e contagem de uso |
| 25 | Preview real de temas | Concluído | headline, CTA, card e formulário |
| 26 | Preview responsivo | Concluído | desktop, tablet e celular |
| 27 | Organização de temas | Concluído | registry tipado como fonte única |
| 28 | Criar tema | Concluído | procedimento em `THEMES.md` |
| 29 | Página com todos os temas | Concluído | `/theme-library` no mesmo registry |
| 30 | Formulários públicos | Concluído | layout, validação e estados responsivos |
| 31 | Páginas de formulário | Concluído | narrativa, contexto, CTA, confiança e confirmação |
| 32 | Textos dos formulários | Concluído | hierarquia e defaults editáveis |
| 33 | Form builder | Concluído | nove tipos, ordem, obrigatoriedade e opções |
| 34 | Leads | Concluído | busca, filtros, paginação e CSV |
| 35 | FK de campanha no lead | Concluído | `assinaturas.campanha_id` |
| 36 | Revisão Supabase | Concluído | schema mínimo documentado |
| 37 | Integridade do banco | Concluído | UUID, PK, FK, índices, checks e uniques |
| 38 | `updated_at` | Concluído | trigger e controle otimista no editor |
| 39 | Supabase centralizado | Concluído | clientes server/admin/proxy e camadas de dados |
| 40 | Padrão de API | Concluído | `{ success, data/error }`, com aliases legados onde necessários |
| 41 | Validação dupla | Concluído | UX no cliente e Zod/regras no servidor |
| 42 | Segurança | Concluído | `SECURITY.md`, CSP, origem, limites, sanitização e guards |
| 43 | RLS | Concluído | policies e grants mínimos nas migrations |
| 44 | Segurança da IA | Concluído | chamada e segredo somente no backend |
| 45 | Proteção da IA | Concluído | sessão, papel, origem, body limit e rate limit |
| 46 | Atividade | Concluído | `campaign_activity` cobre o ciclo de vida |
| 47 | Confirmações | Concluído | dialogs para publicar, retirar do ar e arquivar |
| 48 | Soft delete | Decisão segura | campanha é arquivada; painel canônico não exclui definitivamente |
| 49 | Empty states | Concluído | componente compartilhado nas listas |
| 50 | Loading/feedback | Concluído | skeletons, botões bloqueados e status de envio/autosave |
| 51 | Remover o inútil | Concluído | artefatos redundantes removidos e legado necessário isolado |
| 52 | Não remover no escuro | Concluído | compatibilidade preservada e depreciações documentadas |
| 53 | Admin simples | Concluído | tabs e configurações avançadas recolhidas |
| 54 | Limpeza do banco | Operacional | remoção destrutiva aguarda comprovação dos dados remotos |
| 55 | Simplificação | Concluído | fluxo canônico, registry único e menos duplicação |
| 56 | Performance | Concluído | paginação, lotes CSV, joins, limites e índices |
| 57 | Responsividade | Concluído | CSS responsivo, E2E desktop/celular e preview tablet |
| 58 | Preservar campanhas/URLs | Concluído | redirects, rewrites e leitura/sync legados |
| 59 | Migração segura | Concluído | migrations aditivas sem reset/drop de dados |
| 60 | SQL final | Concluído | `database/setup.sql` equivalente às migrations |
| 61 | `.env.example` | Concluído | seções pedidas, sem secrets reais |
| 62 | Limpeza final | Concluído | lint e package manager consolidados |
| 63 | README | Concluído | setup, arquitetura, áreas, Auth, banco e deploy |
| 64 | Onde alterar | Concluído | tabela dedicada no README |
| 65 | Testes automatizados | Concluído | lint, tipos, unitários, banco, build, smoke e E2E |
| 66 | Testes funcionais | Operacional | fluxos públicos/Auth testados; escrita real exige Master e dados descartáveis |
| 67 | Testes da IA | Concluído | sucesso, tema, JSON inválido, timeout, indisponibilidade e fallback |
| 68 | Build | Concluído | build local e Vercel |
| 69 | Deploy Vercel | Concluído | integração GitHub → `okaservices` e smoke |
| 70 | Produção | Operacional | página, login, admin anônimo, temas, headers e IA protegida validados; escrita autenticada depende do Master |
| 71 | Revisão final | Concluído | arquitetura, segurança, UX, código e produção |
| 72 | Fluxo principal | Concluído | IA → draft → editor → preview → publicação → leads |
| 73 | Prioridades | Concluído | dados, segurança e estabilidade antes da simplificação |
| 74 | Autonomia | Concluído | sem secrets no chat ou hardcode |
| 75 | Relatório | Concluído | documentação técnica e relatório de entrega |

## Pendências que não são código

1. confirmar no Supabase o Master ativo, Auth URLs, SMTP e dados descartáveis;
2. executar o roteiro autenticado de produção sem usar leads reais;
3. observar e publicar regras de Firewall no painel Vercel;
4. remover estruturas depreciadas somente após consultar banco e integrações.

Essas etapas exigem a sessão administrativa do proprietário. Nenhuma deve ser
substituída por senha no Git, hardcode ou secret enviado em chat.
