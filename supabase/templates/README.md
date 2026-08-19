# Modelos de e-mail de autenticação

O Supabase envia os e-mails de convite e de recuperação a partir de modelos
configurados no painel do projeto (**Authentication → Emails → Templates**).
Os arquivos deste diretório são a versão oficial usada pelo painel OKA.

## Como aplicar

1. Abra **Authentication → Emails → Templates** no projeto do Supabase.
2. Em **Invite user**, cole o conteúdo de [`invite.html`](invite.html).
3. Em **Reset password**, cole o conteúdo de [`recovery.html`](recovery.html).
4. Confirme que **Authentication → URL Configuration → Site URL** aponta para a
   mesma origem de `APP_URL`, e que `"<APP_URL>/auth/callback"` está na lista de
   **Redirect URLs**.

## Por que o link não usa `{{ .ConfirmationURL }}`

`{{ .ConfirmationURL }}` faz o Supabase validar o token e devolver a sessão no
**fragmento** da URL (`#access_token=...`). O fragmento nunca é enviado ao
servidor, então uma aplicação renderizada no servidor não enxerga a sessão e o
link parece inválido.

Os modelos daqui usam o formato que a rota `/auth/callback` verifica no
servidor:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/set-password
```

O convite entra por `/auth/callback`, a sessão vira cookie e a pessoa cai
direto em `/auth/set-password`.

Links no formato antigo continuam funcionando: quando `/auth/callback` não
recebe `code` nem `token_hash`, ele encaminha para `/auth/continuar`, que lê o
fragmento no navegador e conclui o acesso pela rota `/api/auth/session`.
