# Auditoria da reformulação

Esta auditoria compara `origin/master` com a implementação da branch de reformulação. Ela não substitui a validação do deploy nem afirma que um ambiente remoto foi promovido.

## Comparação objetiva

| Indicador | `origin/master` | Reformulação local |
| --- | ---: | ---: |
| Arquivos do projeto | 93 | 234 |
| Páginas App Router | 14 | 28 |
| Route Handlers | 8 | 12 |
| Arquivos de teste | 0 | 14 |
| Migrations versionadas | 0 | 4 |

A `master` concentrava painel, regras e acesso privilegiado ao Supabase em páginas/actions legadas. A reformulação adiciona a rota canônica `/admin`, camadas `features → services → repositories`, clientes Supabase separados, Supabase Auth, RBAC, RLS, migrations, design system, IA, editor, biblioteca de temas, form builder, leads e testes.

## Cobertura da especificação

| Área | Implementação verificada |
| --- | --- |
| Arquitetura | `app/`, `features/`, repositórios, `lib/supabase/`, `config/` e contratos tipados |
| Admin | Dashboard, campanhas, temas, formulários, leads, usuários e configurações com shell/sidebar |
| Auth | Supabase Auth SSR, refresh por proxy, logout, sessão expirada, perfis e papéis `master/admin/editor` |
| Campanhas | Busca, filtros, paginação, ordenação, draft/publicação/arquivo, duplicação, slug e SEO |
| IA | Backend autenticado, rate limit, catálogo fechado de temas, saída Zod, fallback/timeout e criação somente em draft |
| Editor | Tabs, validação cliente/servidor, autosave seguro de drafts persistidos e preview ao vivo de tema, cor, textos, CTA e campos |
| Temas | Registry único, quatro previews reais e comparação desktop/tablet/celular em `/admin/themes` e `/theme-library` |
| Formulários | Configuração por campanha, nove tipos de campo, consentimento obrigatório, validação e compatibilidade legada |
| Leads | FK de campanha, busca, filtros, paginação e CSV limitado/protegido contra fórmula |
| Banco | UUIDs, FKs, checks, índices, timestamps, triggers, `profiles`, `campaign_activity`, RLS e grants mínimos |
| Segurança | Guards centrais, Secret key server-only, CSRF/origin, CSP, limites de corpo, honeypot, rate limit e sanitização |
| Compatibilidade | URLs, colunas e renderizadores legados preservados por redirects, rewrites, sync e leitura dupla |
| Qualidade | lint, TypeScript, unitários, equivalência SQL, build, smoke de segurança, audit de dependências e E2E responsivo |

## Decisões deliberadas

- campanhas são arquivadas, não excluídas; isso preserva leads e histórico;
- campanhas novas exigem o primeiro salvamento explícito; depois disso, drafts persistidos usam autosave com debounce, validação prévia, uma gravação por vez e controle otimista por `updated_at` contra sobrescrita entre sessões;
- temas ficam em registry tipado, não em tabela editável, porque também dependem de componentes React versionados;
- configuração simples de formulário fica em JSON validado por campanha, evitando um page builder e tabelas desnecessárias;
- colunas legadas não são removidas enquanto ainda houver consumidores ou uso remoto não comprovado.

## Correções da segunda auditoria

- o guard central passou a rejeitar também sessões com troca obrigatória de senha, inclusive em chamadas diretas a Server Actions;
- o preview do editor deixou de usar apenas copy demonstrativa e passou a acompanhar os valores ainda não salvos;
- foram adicionados E2E de desktop/celular para login, proteção do admin, biblioteca de temas e bloqueio da IA;
- `pnpm verify` passou a comparar automaticamente migrations com `database/setup.sql`.

## Limite operacional

Fluxos autenticados que escrevem no Supabase, criação real por IA e produção devem ser repetidos com usuário/dados descartáveis no ambiente alvo. Registre commit, URL, migrations, Auth, Firewall e smoke pós-deploy no checklist de [`DEPLOY.md`](../DEPLOY.md).
