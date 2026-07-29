# Deploy na Vercel

Este repositorio agora tem uma versao Next.js na raiz, compatível com a Vercel.
Os arquivos ASP.NET MVC 5 antigos continuam no projeto como referencia de
migracao, mas a Vercel vai detectar e buildar o app Next.js por causa do
`package.json`.

## Variaveis obrigatorias

Configure estas variaveis em Vercel > Project > Settings > Environment
Variables:

```text
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-do-supabase
SENHA_ADMIN=sua-senha-admin
SESSION_SECRET=uma-chave-grande-e-aleatoria
```

Use a mesma `SUPABASE_URL` e a mesma chave que o projeto antigo usava. A
`SENHA_ADMIN` substitui a senha que antes ficava no `Web.config`. A
`SESSION_SECRET` assina o cookie de login; use qualquer valor longo e aleatorio.

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

As URLs antigas com letras maiusculas, como `/Formulario` e `/Campanha`, foram
redirecionadas para as novas rotas.
