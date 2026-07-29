# Seguranca operacional

## Obrigatorio antes do deploy

1. Crie uma nova Secret key (`sb_secret_...`) no Supabase.
2. Configure-a na Vercel como `SUPABASE_SECRET_KEY`, somente no servidor.
3. Execute `supabase/security-hardening.sql` no SQL Editor.
4. Use `SESSION_SECRET` aleatorio com pelo menos 32 bytes.
5. Use uma senha administrativa longa, unica e armazenada apenas na Vercel.
6. Configure os limites de `/api/login` e `/api/assinaturas` no Vercel Firewall.

## Resposta a incidente

Se uma chave secreta for exposta, crie outra no Supabase, atualize a Vercel,
publique novamente e revogue a chave antiga. Alterar somente o codigo ou apagar
o arquivo atual nao remove segredos do historico Git.

## Dados pessoais

As assinaturas contem dados pessoais. Mantenha o repositorio e o projeto Vercel
com acesso restrito, revise os membros periodicamente e nao envie exports CSV por
canais publicos.
