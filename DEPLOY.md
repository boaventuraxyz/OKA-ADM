# Deploy e operação na Vercel

Este é o procedimento canônico para preparar Supabase, validar um Preview e, somente depois, promover o OKA Admin para produção.

> **Status:** este documento não confirma que migrations, Firewall, Preview ou produção já foram aplicados. Preencha a seção [Registro da promoção](#registro-da-promoção) com evidências reais ao concluir cada etapa.

## Ordem de execução

1. validar o repositório localmente;
2. aplicar as migrations em um ambiente Supabase de teste/preview;
3. configurar Auth, callbacks, SMTP e o primeiro Master;
4. criar ou vincular o projeto Vercel e configurar variáveis por ambiente;
5. validar um Preview completo;
6. observar e publicar regras do Firewall;
7. aplicar migrations de produção com operador único;
8. promover o mesmo commit para produção;
9. executar smoke/E2E limitados a dados descartáveis e registrar evidências.

Não inverta banco e aplicação quando o novo código depender de mudanças de schema ainda ausentes.

## Pré-requisitos

- Node.js `>=22`;
- pnpm `11.19.0` via Corepack;
- Supabase CLI instalado por um [método oficial](https://supabase.com/docs/guides/local-development/cli/getting-started);
- Vercel CLI autenticado ou integração GitHub autorizada;
- acesso administrativo aos projetos Supabase e Vercel corretos;
- backup e plano de restauração adequados ao ambiente;
- um projeto/branch de preview separado sempre que possível.

## 1. Validação local

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` executa lint, typecheck, unitários, equivalência do banco, build e security smoke. Execute também o E2E; os testes públicos não gravam dados e os fluxos autenticados futuros devem usar registros descartáveis:

```bash
pnpm test:e2e
```

Não use dados pessoais reais nos testes. A configuração Playwright está no repositório, mas a disponibilidade da suíte e das credenciais deve ser confirmada no momento do deploy.

## 2. Banco e migrations

A fonte canônica é exclusivamente [`supabase/migrations`](supabase/migrations). Consulte [docs/MIGRATION.md](docs/MIGRATION.md) para ordem, pré-checks e rollback operacional.

Arquivos `.sql` diretamente em `supabase/` são históricos. Não execute `campaign-template.sql`, `candidate-domain.sql`, `candidate-hubs.sql`, `security-hardening.sql` ou outro script avulso como etapa de um deploy novo. Tudo que ainda for necessário deve virar uma migration versionada, revisada e testada.

No ambiente de preview/staging:

```bash
supabase login
supabase link
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

Revise o projeto exibido pelo CLI antes do push. Um único operador deve aplicar migrations por ambiente. Não execute `db reset --linked` em um banco remoto com dados.

Depois do push:

- confirme tabelas, funções, triggers, grants e policies descritos em [docs/DATABASE.md](docs/DATABASE.md);
- valide que `anon` não consegue listar ou gravar dados administrativos;
- valide que uma submissão pública legítima funciona apenas pelo endpoint do servidor;
- regenere e compare tipos se o schema mudou;
- registre os timestamps aplicados e o ambiente.

## 3. Supabase Auth e primeiro Master

Em **Authentication → URL Configuration**, configure:

- **Site URL:** a origem canônica do painel no ambiente;
- **Redirect URLs:** `${APP_URL}/auth/callback` e somente callbacks de Preview explicitamente aprovados;
- SMTP e templates de convite/recuperação compatíveis com o ambiente.

Evite wildcards amplos em callbacks de produção. O fluxo de convite termina em `/auth/set-password` e exige senha forte.

O primeiro Master precisa de bootstrap controlado:

1. crie ou convide a identidade no Supabase Auth;
2. altere apenas o perfil correspondente em `public.profiles` para `role = 'master'` e `is_active = true`;
3. nunca defina papel ou ativação em `user_metadata`;
4. confirme o login, a definição de senha e o acesso a `/admin/users`;
5. registre operador e horário.

Depois do bootstrap, convites e mudanças de acesso devem passar por `/admin/users`. O sistema impede auto-desativação e a remoção do último Master ativo.

## 4. Variáveis na Vercel

Configure as variáveis em **Project → Settings → Environment Variables**. Separe Development, Preview e Production; uma alteração só chega a deployments novos.

### Application

```text
APP_URL=https://painel.exemplo.com
```

`APP_URL` precisa ser HTTPS em ambientes compartilhados e corresponder à origem usada nos callbacks. Para Preview com convite/Auth, use uma URL estável e autorizada ou adicione exatamente a URL do Preview ao Supabase.

### Supabase

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

- `SUPABASE_PUBLISHABLE_KEY` é usada pelo cliente SSR sujeito a RLS;
- `SUPABASE_SECRET_KEY` é server-only, contorna RLS e é necessária nos fluxos controlados de usuário e definição de senha; configure-a somente no runtime do servidor de cada ambiente funcional;
- use projetos/chaves diferentes entre Preview e Production;
- nunca crie variáveis `NEXT_PUBLIC_*` para a Secret key.

O projeto vinculado também declara `APP_URL` e a chave **publicável** em
`vercel.json`, para que deployments acionados pelo Git preservem essa
configuração pública. A Secret key continua exclusivamente nas variáveis
protegidas do projeto e nunca deve ser adicionada ao arquivo. Se a URL ou o
projeto Supabase mudar, atualize Project Settings e este arquivo no mesmo
deploy.

### Auth

Não há senha administrativa global nem segredo de sessão próprio. O Auth usa as variáveis Supabase e cookies SSR. A configuração essencial fica nas URLs e templates do Supabase Auth.

### IA e AI Gateway

```text
AI_MODEL=openai/gpt-5.6-luna
```

Escolha uma estratégia:

1. **OIDC na Vercel (preferencial):** habilite Secure Backend Access/OIDC no projeto e não configure `AI_GATEWAY_API_KEY` nem `AI_API_KEY`;
2. **chave explícita do Gateway:** configure `AI_GATEWAY_API_KEY` no ambiente necessário;
3. **alias de compatibilidade:** use `AI_API_KEY` somente se a integração existente exigir esse nome.

O código prioriza `AI_GATEWAY_API_KEY`, depois `AI_API_KEY`; sem ambas, usa o provider padrão do AI SDK, que pode autenticar no AI Gateway pelo OIDC da Vercel.

`VERCEL_OIDC_TOKEN` é temporário e fornecido pela plataforma. Para desenvolvimento vinculado:

```bash
vercel link
vercel env pull .env.local
```

Repita o pull quando o token expirar. Não copie o token para `.env.example`, documentação, logs ou Git. Consulte [OIDC na Vercel](https://vercel.com/docs/oidc) e [autenticação do AI Gateway](https://vercel.com/docs/ai-gateway/authentication-and-byok).

#### Quando a geração por IA falha

A tela de criação por IA traduz o motivo em vez de mostrar uma indisponibilidade genérica, e o erro completo vai para o log do servidor com o prefixo `[ai]`.

| Mensagem | Causa | O que fazer |
| --- | --- | --- |
| O AI Gateway recusou a autenticação | Nenhuma credencial válida: sem `AI_GATEWAY_API_KEY` e sem OIDC utilizável | Defina a chave no ambiente ou habilite Secure Backend Access/OIDC no projeto |
| O modelo definido em `AI_MODEL` não existe | Identificador fora do catálogo do Gateway | Ajuste `AI_MODEL` para um `provedor/modelo` disponível |
| O AI Gateway recusou a chamada por limite ou crédito | Cota, limite de taxa ou saldo | Verifique consumo e créditos do projeto |
| A IA devolveu um rascunho inválido | Saída fora do schema | Tente novamente; se persistir, revise o briefing |
| O banco recusou um valor da campanha por restrição | Violação de `check` (Postgres 23514) | Aplique as migrações pendentes; veja abaixo |
| O banco recusou a gravação da campanha | Outro erro do Postgres | Leia o `db=<código>` na linha `[ai]` do log |

Não bloqueamos a chamada por ausência de variável de ambiente: o OIDC também chega pelo cabeçalho `x-vercel-oidc-token` da requisição e pelo refresh local, caminhos invisíveis a `process.env`. Quem decide se há credencial é o próprio provider.

#### Migração pendente recusa temas recentes

A restrição `campanhas_tema_valido` limita a coluna `tema` aos temas que existiam quando o banco foi migrado por último. Se o banco está atrás do código, criar campanha com um tema recente falha na gravação — pela IA ou pelo editor — com `db=23514` no log.

Confira quais migrações o banco já recebeu e aplique as que faltam:

```bash
supabase migration list
```

```bash
supabase db push
```

Sem a CLI vinculada, rode no SQL Editor do projeto o conteúdo do arquivo de migração correspondente em [`supabase/migrations`](../supabase/migrations). Cada migração é transacional e idempotente nas partes que recriam restrição e trigger.

O par restrição + trigger precisa ser aplicado junto: a restrição libera o valor de `tema` e a trigger `sync_campaign_legacy_fields` traduz `theme_key` para o número correspondente. Aplicar só um dos dois mantém a falha.

## 5. Preview

Pela integração Git, abra/atualize o pull request e use o Preview gerado. Pela CLI:

```bash
vercel link
vercel
```

Valide no Preview, sem dados pessoais reais:

- `/` redireciona para `/admin` no hostname da plataforma;
- usuário anônimo é enviado para `/login`;
- login inválido devolve mensagem genérica;
- convite/recovery chega ao callback e exige definição de senha;
- `editor`, `admin` e `master` veem somente as áreas permitidas;
- criação manual e por IA resultam em `draft` inativo;
- somente `master`/`admin` publica e acessa leads/CSV;
- somente `master` gerencia usuários;
- página `/p/[slug]` publicada e submissão pública funcionam;
- um domínio de candidato não expõe `/admin`;
- redirects legados ainda chegam ao destino esperado;
- logs não exibem credenciais, tokens, senhas ou corpo de leads.

Rode testes E2E somente com usuários e registros criados para a verificação e remova/desative esses dados ao final.

## 6. Firewall

Os limites em `lib/rate-limit.ts` vivem na memória de uma instância. Eles são defesa complementar, não um limite global em serverless. Configure Vercel Firewall/WAF para a camada distribuída.

Comece cada regra com ação **Log**, observe tráfego legítimo, ajuste e só então publique `Rate Limit`, `Challenge` ou `Deny`. A [documentação oficial](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) recomenda essa progressão.

Baseline a validar:

| Caminho e método | Limite no aplicativo | Baseline do Firewall |
| --- | --- | --- |
| `POST /api/login` | 5 / 15 min | 5 / 15 min por IP, resposta `429` ou challenge |
| `POST /api/auth/set-password` | 5 / 15 min | 5 / 15 min por IP, com cuidado para não bloquear recovery legítimo |
| `POST /api/assinaturas` | 10 / min | 10 / min por IP, resposta `429` |
| `POST /api/ai/campaigns` | 8 / hora por contexto | observe e adote teto defensivo por IP sem prejudicar redes compartilhadas |
| `GET /api/admin/leads/export` | 5 / 5 min | observe usuários administrativos antes de limitar por IP |

Também revise Managed Rulesets e alertas. Mudanças de Firewall só contam depois de **Review Changes → Publish**; salvar um rascunho não prova que a proteção está ativa.

## 7. Domínios

### Painel

1. adicione o domínio canônico em **Project → Settings → Domains**;
2. configure DNS exatamente como a Vercel indicar;
3. use esse HTTPS em `APP_URL` e no Site URL/Redirect URLs do Supabase;
4. confirme que a raiz redireciona para `/admin`.

### Domínio público de candidato

1. adicione domínio raiz e `www` à Vercel;
2. configure DNS e aguarde verificação/TLS;
3. associe somente o hostname raiz, sem protocolo ou caminho, ao candidato correspondente;
4. confirme que `www` redireciona para o raiz e HTTP para HTTPS;
5. confirme que `/` lista campanhas e `/{uuid}` abre o formulário;
6. confirme que `/admin`, `/login` e APIs administrativas respondem `404` nesse hostname.

## 8. Produção

Só promova o mesmo commit validado em Preview. Pela integração Git, faça merge conforme a proteção da branch. Pela CLI, quando autorizado:

```bash
vercel --prod
```

Antes da aplicação, execute `supabase db push --dry-run` no projeto de produção, revise a lista e faça o push com operador único. Depois do deploy:

- repita o smoke das rotas críticas;
- valide Auth e um fluxo completo com registros descartáveis;
- confirme migrations e headers;
- publique/revise o Firewall;
- monitore logs, erros, Auth, banco e uso/custo do AI Gateway;
- revogue ou remova dados e acessos temporários.

Não faça rollback destrutivo de migration. Em incidente, reverta a aplicação quando compatível e crie uma migration aditiva de correção.

## Registro da promoção

Preencha no relatório da entrega; não marque sem evidência.

- [ ] Commit/branch validado: `PREENCHER`
- [ ] `pnpm verify`: `PREENCHER`
- [ ] `pnpm test:e2e`: `PREENCHER` ou justificativa
- [ ] Projeto Supabase Preview: `PREENCHER`
- [ ] Migrations Preview aplicadas: `PREENCHER`
- [ ] URL do Preview: `PREENCHER`
- [ ] Auth/callback/SMTP no Preview: `PREENCHER`
- [ ] Primeiro Master validado: `PREENCHER`
- [ ] Regras de Firewall observadas/publicadas: `PREENCHER`
- [ ] Projeto Supabase Production: `PREENCHER`
- [ ] Migrations Production aplicadas: `PREENCHER`
- [ ] URL de produção: `PREENCHER`
- [ ] Smoke pós-deploy: `PREENCHER`
- [ ] Monitoramento e responsável: `PREENCHER`

## Referências

- [README](README.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Migrations](docs/MIGRATION.md)
- [Segurança](SECURITY.md)
- [Supabase: database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Vercel: environment variables](https://vercel.com/docs/environment-variables)
- [Vercel: OIDC](https://vercel.com/docs/oidc)
- [Vercel: Firewall](https://vercel.com/docs/vercel-firewall)
