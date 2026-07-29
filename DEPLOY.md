# Deploy na Vercel

Este repositorio agora esta em Next.js na raiz e pode ser importado direto pela Vercel. O ASP.NET MVC 5 legado foi removido do projeto ativo; as paginas publicas que precisavam manter visual identico foram preservadas como arquivos estaticos em `public/legacy`.

## Variaveis obrigatorias

Configure estas variaveis em Vercel > Project > Settings > Environment Variables:

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-do-supabase
SENHA_ADMIN=sua-senha-admin
SESSION_SECRET=uma-chave-grande-e-aleatoria
```

Use a mesma `SUPABASE_URL` e a mesma chave que o projeto antigo usava. A `SENHA_ADMIN` define a senha do painel administrativo. A `SESSION_SECRET` assina o cookie de login; use qualquer valor longo e aleatorio.

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
- `/grupo-wpp`
- `/grupo-wpp/tias`

As URLs antigas com letras maiusculas, como `/Formulario` e `/Campanha`, foram redirecionadas para as novas rotas. O POST antigo `/Formulario/Create` tambem funciona e aponta para `/api/assinaturas`.
