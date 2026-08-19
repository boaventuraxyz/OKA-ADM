# OKA Admin

Painel administrativo em Next.js para criar e publicar campanhas cívicas, configurar formulários, receber assinaturas e administrar acessos com Supabase Auth e RBAC.

> **Estado do projeto:** a reformulação está implementada e publicada no projeto Vercel vinculado. Validações que exigem uma conta Master ou dados descartáveis continuam identificadas no checklist, sem testar sobre dados reais.

## Documentação

- [Arquitetura e contratos](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Migrations e procedimento de mudança](docs/MIGRATION.md)
- [Auditoria da reformulação](docs/IMPLEMENTATION-AUDIT.md)
- [Checklist dos 75 requisitos](docs/REQUIREMENTS-CHECKLIST.md)
- [Criação e manutenção de temas](docs/THEMES.md)
- [Deploy e operação na Vercel](DEPLOY.md)
- [Segurança](SECURITY.md)

## O que a plataforma faz

- oferece um painel privado em `/admin`, protegido por Supabase Auth;
- aplica autorização por perfil ativo e papel `master`, `admin` ou `editor`;
- cria campanhas manualmente ou com IA — **as duas entradas sempre salvam um rascunho**;
- mantém um catálogo de temas e configurações de formulário por campanha;
- publica campanhas em URLs por slug e preserva URLs públicas legadas por compatibilidade;
- recebe assinaturas com consentimento obrigatório e validação no servidor;
- lista, filtra, importa CSV/XLSX e exporta leads para usuários autorizados;
- permite que somente `master` convide e gerencie usuários;
- isola o painel administrativo dos domínios públicos personalizados de candidatos.

## Stack e requisitos

- Node.js `>=22`;
- pnpm `11.19.0`, fixado em `package.json`;
- Next.js 16 com App Router e React 19;
- TypeScript, ESLint, Vitest e Playwright;
- Supabase Postgres, Auth, RLS e clientes SSR;
- Vercel AI SDK e AI Gateway para a geração assistida;
- Vercel para preview, produção, OIDC e Firewall.

O Supabase CLI é necessário apenas para o fluxo local completo e para aplicar migrations. Ele não faz parte das dependências do aplicativo; instale-o por um dos métodos da [documentação oficial do Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Configuração local

### 1. Instale as dependências

Na raiz do repositório:

```bash
node --version
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

Use a versão de pnpm declarada no projeto. Não gere nem mantenha um segundo lockfile.

### 2. Crie o arquivo local de ambiente

Copie `.env.example` para `.env.local` e preencha apenas com credenciais do ambiente de desenvolvimento. Nunca publique, imprima em logs ou faça commit de `.env.local`.

```bash
cp .env.example .env.local
```

No PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

### 3. Prepare o Supabase

Use um projeto ou branch de desenvolvimento. Aplique, em ordem, somente as migrations de [`supabase/migrations`](supabase/migrations). O procedimento detalhado está em [docs/MIGRATION.md](docs/MIGRATION.md).

Arquivos `.sql` diretamente em `supabase/` são artefatos históricos de fases anteriores. Eles **não** são a fonte de verdade para um deploy novo e não devem ser reaplicados isoladamente em produção.

No Supabase Auth, configure:

- o Site URL com a URL canônica do painel;
- `${APP_URL}/auth/callback` como Redirect URL permitida;
- entrega de e-mail/SMTP apropriada para convite e recuperação.

### 4. Inicie o aplicativo

```bash
pnpm dev
```

Por padrão, abra `http://localhost:3000`. Para testar callbacks de Auth localmente, `APP_URL` e as Redirect URLs do Supabase devem apontar para a mesma origem.

## Variáveis de ambiente

Use [`.env.example`](.env.example) como catálogo, sem colocar valores reais no repositório.

| Seção | Variável | Uso |
| --- | --- | --- |
| Application | `APP_URL` | Origem HTTPS canônica do painel; também compõe callbacks de convite e recuperação. |
| Supabase | `SUPABASE_URL` | URL do projeto Supabase. |
| Supabase | `SUPABASE_PUBLISHABLE_KEY` | Chave publicável usada pelo cliente SSR sujeito a RLS. Não concede privilégios administrativos. |
| Supabase | `SUPABASE_SECRET_KEY` | Chave secreta exclusiva do servidor, usada somente em operações administrativas controladas. |
| AI | `AI_GATEWAY_API_KEY` | Credencial explícita preferencial do AI Gateway, útil fora da Vercel. |
| AI | `AI_API_KEY` | Alias de compatibilidade usado somente quando `AI_GATEWAY_API_KEY` não foi definido. |
| AI | `AI_MODEL` | Modelo no formato `provedor/modelo`; o padrão do código é `openai/gpt-5.6-luna`. |

`VERCEL_OIDC_TOKEN` é fornecido pela Vercel quando OIDC está habilitado. Ele é temporário, não deve ser copiado para `.env.example` nem persistido no Git. Em desenvolvimento vinculado à Vercel, `vercel env pull` pode atualizá-lo em `.env.local`.

## Autenticação, Master e papéis

A identidade é confirmada remotamente pelo Supabase Auth. A autorização vem exclusivamente de `public.profiles`; `user_metadata` e campos enviados pelo navegador nunca definem papel ou ativação.

| Papel | Acesso principal |
| --- | --- |
| `editor` | Dashboard, campanhas, temas e formulários; pode criar, editar e duplicar rascunhos. |
| `admin` | Tudo de `editor`, além de publicar/retirar publicação/arquivar campanhas, consultar leads, exportar CSV e acessar configurações. |
| `master` | Tudo de `admin`, além de listar, convidar e alterar usuários. |

Todo papel exige `is_active = true`. Usuários convidados precisam definir uma senha forte no fluxo `/auth/set-password` antes do uso normal do painel.

### Primeiro Master

O primeiro `master` é um bootstrap operacional, não uma permissão derivada de e-mail ou metadata:

1. aplique e valide as migrations;
2. crie ou convide o usuário no Supabase Auth por um canal administrativo controlado;
3. promova o perfil correspondente em `public.profiles` para `role = 'master'` e `is_active = true`, seguindo [docs/DATABASE.md](docs/DATABASE.md);
4. confirme o login e registre operador, horário e ambiente;
5. passe a usar `/admin/users` para convites e alterações seguintes.

O serviço impede auto-desativação e impede rebaixar ou desativar o último `master` ativo. Não há exclusão definitiva de usuário pela interface.

## Campanhas: manual e IA

As telas canônicas são:

- `/admin/campaigns` — lista e ciclo de vida;
- `/admin/campaigns/new` — criação manual;
- `/admin/campaigns/[id]/edit` — editor de conteúdo, formulário, tema, SEO e configurações;
- `/admin/campaigns/ai` — geração assistida por IA.

Manual e IA convergem em `features/campaigns/service.ts`. Toda nova campanha recebe `status = 'draft'`, `ativa = false` e datas de publicação/arquivamento vazias. A IA gera conteúdo estruturado e editável; ela não publica nem ativa uma campanha.

Somente `master` e `admin` podem publicar, retirar publicação ou arquivar. Alterações importantes são registradas em `campaign_activity`.

## Temas e formulários

O catálogo canônico de temas fica em [`features/themes/registry.ts`](features/themes/registry.ts). As chaves atuais são `cover`, `editorial`, `manifesto` e `impact-dark`. Adicione ou desative temas no registro e mantenha os componentes de renderização compatíveis com as chaves persistidas.

O procedimento completo para duplicar, adicionar, testar, depreciar e remover
um tema está em [`docs/THEMES.md`](docs/THEMES.md).

Cada campanha guarda `form_config` e `settings`. A normalização do formulário fica em [`features/forms/config.ts`](features/forms/config.ts):

- até 24 campos configurados;
- tipos suportados definidos no próprio arquivo;
- chaves de campo únicas e normalizadas;
- consentimento sempre obrigatório, mesmo que um JSON tente desativá-lo;
- fallback legado para campanhas ainda sem configuração estruturada.

## Leads e CSV

`/admin/leads` é restrito a `master` e `admin`. A tela aceita busca, campanha e intervalo de datas. O endpoint `/api/admin/leads/export` reutiliza os filtros, transmite o CSV em lotes e limita cada arquivo a 5.000 linhas. A importação exige que a campanha seja selecionada fora do arquivo, normaliza e-mail/telefone e ignora duplicados dentro da mesma campanha; ela nunca atualiza um lead de outra campanha.

O export usa UTF-8 com BOM, separador `;`, neutralização de fórmulas e cabeçalhos `private, no-store`. Trate o arquivo como dado pessoal: armazene pelo menor tempo possível e compartilhe apenas por canal autorizado.

## Rotas canônicas e compatibilidade

| Área | Rota canônica |
| --- | --- |
| Login | `/login` |
| Painel | `/admin` |
| Campanhas | `/admin/campaigns` |
| Candidatos | `/admin/candidates` |
| Temas | `/admin/themes` |
| Formulários | `/admin/forms` |
| Leads | `/admin/leads` |
| Usuários | `/admin/users` |
| Configurações | `/admin/settings` |
| Campanha pública por slug | `/formulario/[slug]` |
| Hub público de candidato | `/c/[slug]` |

A raiz do hostname da plataforma redireciona para `/admin`. Rotas MVC antigas e caminhos administrativos em português são redirecionados quando necessário, mas não devem aparecer em novos links. `/p/[slug]` redireciona para a URL canônica por slug. `/candidatos/*` redireciona para a área canônica de candidatos no painel 2.0.

Em um domínio público de candidato, `/` exibe o índice de formulários, `/{slug}` abre a campanha e qualquer caminho administrativo retorna `404`. `/formulario/[slug]` e o POST legado `/Formulario/Create` continuam disponíveis para links e integrações existentes.

## Estrutura principal

```text
app/                     rotas, layouts, páginas e Route Handlers
components/              componentes compartilhados e primitives de UI
config/                  validação de configuração do servidor
features/                regras por domínio (auth, campaigns, forms, leads...)
lib/                     adapters de infraestrutura e compatibilidade
supabase/migrations/     fonte canônica do schema, grants, policies e hotfixes
tests/unit/              testes unitários Vitest
scripts/                 verificações operacionais, incluindo security smoke
docs/                    arquitetura, banco e processo de migration
proxy.ts                 roteamento por hostname, compatibilidade e refresh Auth
next.config.mjs          headers de segurança e limites globais do Next.js
```

## ONDE ALTERAR CADA COISA

> Use esta tabela antes de editar. Regras de negócio ficam em `features/`; páginas devem coordenar serviços, não duplicar autorização ou acesso ao banco.

| Quero alterar... | Fonte principal | Verifique também |
| --- | --- | --- |
| Navegação e shell do painel | `components/admin/` | `app/admin/layout.tsx` e regras de papel |
| Primitives visuais | `components/ui/` | `app/globals.css` e acessibilidade |
| Página administrativa | `app/admin/<area>/` | serviço correspondente em `features/<area>/` |
| Lista, criação ou ciclo de campanha | `features/campaigns/` | `app/admin/campaigns/` e `campaign_activity` |
| Cadastro e hubs de candidatos | `features/candidates/` | `app/admin/candidates/` e `app/c/[slug]` |
| Campos e preview do editor | `features/campaigns/CampaignEditor.tsx` | schemas, actions e renderização pública |
| Prompt, schema ou modelo de IA | `features/ai/` | `app/api/ai/campaigns/route.ts` e testes de geração |
| Catálogo de temas | `features/themes/registry.ts` | previews e componentes públicos que consomem cada chave |
| Adicionar ou duplicar tema | `docs/THEMES.md` | registry, preview, renderer público e migration quando necessária |
| Configuração de formulário | `features/forms/config.ts` | editor de campanha e `components/PublicSignatureForm.tsx` |
| Página pública por slug | `app/formulario/[slug]/` | `lib/public-campaign.ts` e componentes de tema |
| Assinatura pública | `app/api/assinaturas/route.ts` | validações, disponibilidade e RLS/grants |
| Consulta ou exportação de leads | `features/leads/` | `app/admin/leads/` e `app/api/admin/leads/export/` |
| Login, sessão e guards | `features/auth/` | `lib/auth.ts`, `lib/supabase/` e `proxy.ts` |
| Convites e papéis de usuário | `features/users/` | `app/admin/users/` e invariantes de último Master |
| Schema, policy ou função SQL | nova migration em `supabase/migrations/` | `docs/DATABASE.md`, tipos e testes |
| Variável de ambiente | `.env.example` e `config/env.ts` | Vercel Development/Preview/Production |
| Hostnames, redirects e URLs legadas | `proxy.ts` | `lib/candidate-domain.ts` e security smoke |
| CSP, HSTS e cache privado | `next.config.mjs` | `SECURITY.md` e `scripts/security-smoke.mjs` |
| Limites de API | Route Handler correspondente | `lib/request-security.ts`, `lib/rate-limit.ts` e Vercel Firewall |

## Qualidade e testes

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:database
pnpm build
pnpm test:security
pnpm test:e2e
```

`pnpm verify` executa lint, typecheck, testes unitários, equivalência entre migrations e `database/setup.sql`, build e security smoke em sequência. O Playwright executa os limites públicos e responsivos em desktop/celular separadamente; fluxos autenticados que gravam dados exigem usuários e registros descartáveis no ambiente alvo.

Nenhum comando acima, por si só, comprova que preview ou produção foram validados. Registre URLs, commit, migrations e resultados no checklist de [DEPLOY.md](DEPLOY.md).

## Referências oficiais

- [Supabase: SSR com Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase: migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Vercel: variáveis de ambiente](https://vercel.com/docs/environment-variables)
- [Vercel: OIDC](https://vercel.com/docs/oidc)
- [Vercel: AI Gateway](https://vercel.com/docs/ai-gateway)
- [Vercel: Firewall](https://vercel.com/docs/vercel-firewall)

O comparativo entre a `master` original e esta reformulação está em [docs/IMPLEMENTATION-AUDIT.md](docs/IMPLEMENTATION-AUDIT.md).
