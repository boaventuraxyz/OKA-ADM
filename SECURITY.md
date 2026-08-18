# Segurança

Este documento registra os controles implementados, as responsabilidades operacionais e os riscos residuais do OKA Admin.

> **Estado operacional:** os controles de código estão documentados, mas não há afirmação aqui de que migrations, Vercel Firewall, domínios ou produção já tenham sido validados. Consulte e preencha [DEPLOY.md](DEPLOY.md).

## Modelo de confiança

O sistema possui quatro fronteiras principais:

1. navegador e internet não confiáveis;
2. aplicação Next.js no servidor;
3. Supabase Auth/Postgres, protegido por sessão, grants e RLS;
4. serviços privilegiados: Secret key do Supabase e AI Gateway/OIDC.

Toda entrada HTTP, metadata de usuário, query string, formulário, JSON e hostname é não confiável. Autorização e validação precisam ocorrer novamente no servidor, mesmo quando a interface já esconde uma ação.

## Identidade e RBAC

- login usa Supabase Auth com e-mail e senha;
- o servidor confirma a identidade por `auth.getUser()`, que consulta o serviço Auth;
- o papel vem somente de `public.profiles.role`;
- o acesso exige `public.profiles.is_active = true`;
- `user_metadata` nunca concede papel, ativação ou acesso;
- `app_metadata.password_change_required` é controlado pelo servidor e serve apenas ao fluxo de senha;
- o adapter legado `lib/auth.ts` delega ao contexto Supabase e não mantém senha global, HMAC ou sessão própria.

| Papel | Permissões sensíveis |
| --- | --- |
| `editor` | Criar, editar e duplicar rascunhos; sem publicação, leads ou usuários |
| `admin` | Publicar/arquivar, consultar e exportar leads, configurações |
| `master` | Tudo de `admin`, mais convites e alterações de usuários |

Somente um `master` pode gerenciar usuários. O serviço impede auto-desativação e impede rebaixar/desativar o último `master` ativo. A interface não oferece hard-delete.

### Convite, recovery e senha

- convites são enviados pela Admin API no servidor e nunca recebem uma senha pronta;
- callback e parâmetro `next` aceitam somente caminhos internos seguros;
- convite e recovery forçam `/auth/set-password`;
- a senha deve ter 12–128 caracteres, minúscula, maiúscula, número e símbolo;
- confirmação precisa ser idêntica;
- o marcador de troca obrigatória só é removido depois da atualização bem-sucedida;
- mensagens de login não revelam se um e-mail existe, está inativo ou tem outro papel.

No Supabase, configure Site URL, Redirect URLs, SMTP e templates. Evite wildcards amplos em produção e revise periodicamente identidades, sessões e perfis ativos.

## Segredos e variáveis

| Variável | Classificação | Regra |
| --- | --- | --- |
| `APP_URL` | configuração | HTTPS canônico; não é segredo, mas afeta callbacks |
| `SUPABASE_URL` | configuração | pode identificar o projeto; não concede acesso sozinha |
| `SUPABASE_PUBLISHABLE_KEY` | publicável | sempre sujeita a grants/RLS; nunca substitui autorização |
| `SUPABASE_SECRET_KEY` | segredo crítico | server-only, contorna RLS, menor escopo operacional possível |
| `AI_GATEWAY_API_KEY` | segredo | preferir OIDC na Vercel; rotacionar se exposta |
| `AI_API_KEY` | segredo/alias | mesmo tratamento da chave do Gateway |
| `VERCEL_OIDC_TOKEN` | token temporário | gerado/puxado pela Vercel; nunca commitar ou registrar |

`config/env.ts` valida chaves Supabase e reporta apenas nomes inválidos, sem valores. Clientes administrativos importam `server-only`, não persistem sessão e não podem ser usados em Client Components.

Regras obrigatórias:

- nunca usar prefixo `NEXT_PUBLIC_` para Secret key ou chave de IA;
- nunca colocar valores reais em `.env.example`, documentação, screenshots ou issues;
- manter `.env.local` fora do Git;
- separar credenciais de Development, Preview e Production;
- após alterar variável na Vercel, criar novo deployment — o anterior não é atualizado;
- limitar membros capazes de visualizar ou alterar variáveis.

Para AI Gateway na Vercel, prefira OIDC de curta duração. `vercel env pull` pode gravar um token temporário em `.env.local`; renove quando expirar e não o trate como credencial permanente.

## Banco, grants e RLS

As migrations em [`supabase/migrations`](supabase/migrations) são a única fonte canônica. Elas estabelecem schema, perfis, funções de papel, grants, RLS e o hotfix que fecha acesso público indevido pela Data API.

Princípios:

- `anon` não lista nem altera campanhas, candidatos, leads, perfis ou auditoria;
- usuários autenticados ainda dependem de perfil ativo e policies compatíveis com o papel;
- funções privilegiadas precisam de `search_path` fixo e grants mínimos;
- a Secret key só aparece em caminhos server-only com guard explícito;
- mudanças de schema são aditivas, versionadas, revisadas e aplicadas por operador único;
- SQL avulso na raiz de `supabase/` é histórico e não deve ser reaplicado em produção;
- tipos em `lib/supabase/database.types.ts` acompanham o schema.

Consulte [docs/DATABASE.md](docs/DATABASE.md) e [docs/MIGRATION.md](docs/MIGRATION.md) para o contrato detalhado e o procedimento de verificação.

## Proteções HTTP

`next.config.mjs` aplica:

- Content Security Policy;
- `frame-ancestors 'none'` e `X-Frame-Options: DENY`;
- HSTS com `max-age=63072000`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- Cross-Origin Opener Policy;
- Permissions Policy que bloqueia câmera, geolocalização, microfone, pagamento e USB;
- `private, no-store` e `noindex` nas páginas privadas e de Auth.

O CSP atual ainda permite `'unsafe-inline'` em scripts e estilos por compatibilidade com o aplicativo. Isso é risco residual; antes de removê-lo, faça uma migração testada para nonce/hash sem quebrar Next.js, estilos ou hydration.

Route Handlers sensíveis verificam mesma origem, Content-Type e tamanho real do stream. A checagem não depende apenas de `Content-Length`.

## Isolamento por domínio

`proxy.ts` separa a plataforma dos domínios públicos de candidatos:

- refresh de Auth ocorre apenas no hostname da plataforma;
- HTTP e `www` de candidato convergem para HTTPS no domínio raiz;
- domínio de candidato aceita somente rotas públicas e assets necessários;
- `/admin`, `/login` e APIs administrativas respondem `404` nesse hostname;
- a submissão confirma que a campanha pertence ao domínio solicitado;
- respostas bloqueadas recebem `noindex`.

Qualquer mudança no proxy deve preservar cookies de sessão em redirects/rewrites e ser coberta por `scripts/security-smoke.mjs`.

## Endpoints sensíveis

| Endpoint | Controles no aplicativo |
| --- | --- |
| `POST /api/login` | mesma origem, urlencoded, 4 KiB, 5 tentativas/15 min, atraso em falha, erro genérico |
| `POST /api/logout` | mesma origem e encerramento da sessão Supabase |
| `GET /auth/callback` | troca/verificação Supabase, `next` interno, cache privado, link inválido genérico |
| `POST /api/auth/set-password` | sessão válida marcada, mesma origem, 4 KiB, senha forte, 5/15 min |
| `POST /api/assinaturas` | mesma origem, multipart, 32 KiB, 10/min, honeypot, domínio, disponibilidade e consentimento |
| `POST /api/ai/campaigns` | perfil ativo, mesma origem, JSON, 16 KiB, 8/hora, schema de saída, timeout/retries |
| `GET /api/admin/leads/export` | `master`/`admin`, mesma origem, filtros Zod, 5/5 min, máximo 5.000 linhas |

`lib/rate-limit.ts` é uma defesa em memória por instância. Em Vercel Functions, instâncias não compartilham o mapa; portanto configure a camada distribuída no Vercel Firewall conforme [DEPLOY.md](DEPLOY.md). Primeiro observe regras com ação `Log`, depois publique a mitigação revisada.

## Formulários públicos e abuso

A API de assinatura:

- exige campanha existente e disponível no período;
- valida UUID, nome, telefone, e-mail, endereço, CEP, cidade, UF e consentimento;
- usa honeypot para bots básicos;
- verifica o domínio de candidato quando a origem não é o hostname da plataforma;
- registra consentimento, data, origem, IP truncado e user-agent limitado;
- responde conflito para duplicata e não expõe erro interno do banco.

O consentimento é uma invariável em `features/forms/config.ts` e não pode ser desligado por JSON. CAPTCHA e proteção distribuída adicional não estão implementados no código; avalie-os com base no tráfego e risco.

## Leads, CSV e dados pessoais

Assinaturas contêm dados pessoais e metadados de rede. Acesso é restrito a `master` e `admin`.

O CSV:

- exporta apenas o recorte filtrado;
- limita 5.000 registros por arquivo;
- transmite em lotes, sem carregar toda a base na memória;
- usa UTF-8/BOM e neutraliza células que poderiam executar fórmula;
- recebe `private, no-store`, `nosniff` e `Vary: Cookie`;
- registra início, conclusão, cancelamento ou falha no log do servidor sem registrar o conteúdo das linhas.

Operação:

- exporte somente quando necessário e para finalidade autorizada;
- não envie CSV por canal público;
- use armazenamento criptografado e controle de acesso;
- defina formalmente retenção, descarte, atendimento ao titular e base legal;
- não use dados reais em desenvolvimento, Preview, IA ou testes;
- revise logs e backups como parte do mesmo inventário de dados.

O repositório não implementa sozinho uma política organizacional de retenção ou atendimento LGPD; isso precisa de procedimento, responsáveis e prazos externos ao código.

## IA

A IA é assistiva e nunca publica conteúdo. O endpoint exige usuário ativo, valida entrada e saída e salva o resultado como `draft` inativo para revisão humana.

O gerador:

- limita corpo e frequência;
- usa schema Zod, timeout, retries e fallbacks;
- envia identificador técnico do ator para observabilidade do Gateway;
- solicita `disallowPromptTraining` ao Gateway;
- não deve receber leads, senhas, tokens ou outro dado pessoal no briefing.

A política final de processamento e retenção depende da Vercel e do provedor roteado. Antes de produção, revise modelos/provedores permitidos, região, Zero Data Retention quando aplicável, orçamento, alertas e acesso ao dashboard.

## Logs e auditoria

- campanhas registram mutações em `campaign_activity`;
- exportações registram eventos estruturados no log da função;
- falhas externas retornam mensagens seguras ao usuário;
- segredos, tokens, senhas, callbacks completos e linhas de leads não devem ser logados.

Defina retenção de logs e acesso por ambiente. Alertas mínimos: aumento de `401/403/429/5xx`, falha de Auth, erro de migration, exportações anormais, picos de assinatura e gasto de IA.

## Verificação de segurança

Antes de cada promoção:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:security
```

O security smoke verifica headers, isolamento de hostname, bloqueio anônimo do admin, origem/tamanho/rate limit do login, submissão pública, logout e autorização da IA. Ele é uma regressão útil, não um pentest.

Complete também:

- revisão das migrations e policies no ambiente alvo;
- `pnpm audit` ou scanner equivalente, com análise dos achados;
- teste E2E com dados descartáveis;
- inspeção de logs por vazamento de segredo/PII;
- validação do Firewall publicado, não apenas salvo;
- revisão de membros, chaves e callbacks.

## Riscos residuais conhecidos

- rate limit do aplicativo não é distribuído entre instâncias;
- CSP ainda usa `'unsafe-inline'`;
- CAPTCHA não está configurado no formulário público;
- MFA não é exigido pelo código; avalie política obrigatória para `master`/`admin` no Supabase;
- auditoria de exportação depende da retenção de logs da plataforma;
- política de retenção/LGPD precisa de processo organizacional;
- a validação final de Preview, Firewall e produção permanece pendente até o registro em [DEPLOY.md](DEPLOY.md).

## Resposta a incidente

### Chave Supabase ou AI exposta

1. restrinja acesso e preserve evidências sem copiar o segredo;
2. crie uma nova chave no provedor;
3. atualize os ambientes Vercel afetados e faça novo deployment;
4. valide o novo deployment;
5. revogue a chave antiga;
6. revise logs, uso e histórico Git; apagar o arquivo atual não remove o segredo do histórico.

### Conta administrativa comprometida

1. desative o perfil afetado em `public.profiles` por canal seguro;
2. revogue sessões no Supabase Auth e redefina credenciais;
3. preserve ao menos um `master` legítimo ativo;
4. revise usuários, campanhas, exportações, logs e callbacks;
5. rotacione chaves se houver indício de acesso a segredos.

### Exposição de dados pessoais

1. interrompa o fluxo ou exportação afetada;
2. preserve logs e identifique escopo, período e titulares;
3. acione responsáveis jurídicos/privacidade e o plano LGPD;
4. corrija com migration/hotfix aditivo e valide em Preview;
5. documente causa, impacto, notificação e prevenção de recorrência.

### Abuso de API ou IA

1. publique regra temporária de Firewall/Challenge/Deny;
2. reduza ou suspenda credenciais/orçamento do Gateway quando necessário;
3. analise origem, endpoint, custo e falsos positivos;
4. transforme a contenção em regra revisada e teste o fluxo legítimo.

## Reporte responsável

Reporte vulnerabilidades por canal privado ao mantenedor do projeto. Não abra issue pública com token, credencial, dados pessoais, URL de convite/recovery ou instruções de exploração contra produção.

## Referências

- [README](README.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Migrations](docs/MIGRATION.md)
- [Deploy](DEPLOY.md)
- [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel: OIDC](https://vercel.com/docs/oidc)
- [Vercel: WAF Custom Rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
