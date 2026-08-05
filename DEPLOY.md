# Deploy na Vercel

Este repositorio esta em Next.js na raiz e pode ser importado direto pela Vercel. O ASP.NET MVC 5 legado foi removido do projeto ativo e as campanhas publicas usam um template padrao sincronizado com os dados do Supabase.

## Variaveis obrigatorias

Configure estas variaveis em Vercel > Project > Settings > Environment Variables:

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sb_secret_sua-chave-secreta
SENHA_ADMIN=uma-senha-forte-com-12-ou-mais-caracteres
SESSION_SECRET=uma-chave-aleatoria-com-pelo-menos-32-bytes
```

Crie uma Secret key exclusiva para o backend em Supabase > Settings > API Keys. Nao
use a chave `anon`/publishable e nunca exponha `SUPABASE_SECRET_KEY` no navegador.
A `SENHA_ADMIN` define a senha do painel. Gere `SESSION_SECRET` com um gerador
criptografico, por exemplo `openssl rand -base64 48`.

Depois de configurar a Secret key, execute
[`supabase/security-hardening.sql`](supabase/security-hardening.sql) no SQL Editor
do Supabase. O script remove o acesso direto de `anon` e `authenticated` aos dados;
o navegador passa a acessar o banco somente pelas rotas validadas deste projeto.

Para migrar campanhas que ainda possuem HTML em Base64, execute tambem
[`supabase/campaign-template.sql`](supabase/campaign-template.sql). Ele adiciona
os campos de destaque do template padrao e remove definitivamente a coluna `html`.

Para usar dominios exclusivos por candidato, execute tambem
[`supabase/candidate-domain.sql`](supabase/candidate-domain.sql). O script cria o
campo `dominio_formularios` e tenta associar `tieminevoeiro.com` ao primeiro
candidato cujo nome contenha "Tiemi Nevoeiro". O dominio tambem pode ser definido
ou alterado em **Candidatos > Editar**.

Para criar um hub publico para todos os candidatos, inclusive os que nao possuem
dominio proprio, execute [`supabase/candidate-hubs.sql`](supabase/candidate-hubs.sql).
O script gera um `slug_publico` unico para cada cadastro existente.

## Dominio dos formularios

1. Adicione o dominio raiz e o `www` em Vercel > Project > Settings > Domains.
2. No provedor DNS, copie exatamente os registros exibidos pela Vercel.
3. No cadastro do candidato, informe somente o dominio raiz, sem `https://` e sem
   caminho, por exemplo `tieminevoeiro.com`.
4. Faca um novo deploy depois de executar a migracao do Supabase.

A raiz do dominio lista somente as campanhas ativas daquele candidato. Os links
gerados na tela de campanhas usam automaticamente o dominio configurado. Tanto o
endereco raiz quanto o `www` sao reconhecidos pela aplicacao.
Em dominios personalizados, os formularios usam a URL curta `/{idCampanha}`. As
URLs antigas em `/formulario/{idCampanha}` continuam funcionando.

## Firewall

No Vercel Firewall, configure rate limiting por IP:

- `/api/login`: 5 requisicoes a cada 10 minutos.
- `/api/assinaturas`: 10 requisicoes por minuto.

O codigo possui uma segunda camada local de limite, mas o Firewall e necessario
para aplicar a regra globalmente entre todas as funcoes serverless.

## Deploy

1. Envie o repositorio para o GitHub.
2. Importe o repositorio na Vercel.
3. Framework Preset: `Next.js`.
4. Build Command: deixe vazio ou use `npm run build`.
5. Output Directory: deixe vazio.
6. Adicione as variaveis de ambiente.
7. Clique em Deploy.

## Rotas migradas

- `/login`
- `/`
- `/campanhas`
- `/campanhas/novo`
- `/campanhas/[id]/editar`
- `/candidatos`
- `/candidatos/novo`
- `/candidatos/[id]/editar`
- `/assinaturas?campanhaId=...`
- `/assinaturas/[id]`
- `/formulario?idCampanha=...`
- `/formulario/[idCampanha]`
- `/formularios` (indice publico usado na raiz do dominio do candidato)
- `/c/[slug]` (hub publico de candidato sem dominio proprio)
- `/grupo-wpp`
- `/grupo-wpp/tias`

As URLs antigas com letras maiusculas, como `/Formulario` e `/Campanha`, foram redirecionadas para as novas rotas. O POST antigo `/Formulario/Create` tambem funciona e aponta para `/api/assinaturas`.
