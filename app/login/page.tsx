import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    auth_error?: string;
    erro?: string;
    mensagem?: string;
  }>;
}) {
  if (await isAuthenticated()) {
    redirect("/admin");
  }

  const { auth_error: authError, erro, mensagem } = await searchParams;

  const errorMessage =
    erro === "credenciais" || erro === "senha"
      ? "E-mail ou senha inválidos."
      : erro === "limite"
        ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        : erro === "acesso"
          ? "Este acesso ainda não está liberado."
          : erro === "indisponivel" || erro === "config"
            ? "Não foi possível entrar agora. Tente novamente mais tarde."
            : authError === "expirado"
              ? "Este convite expirou. Peça um novo link para quem administra o painel."
              : authError === "usado"
                ? "Este link já foi utilizado. Peça um novo link para quem administra o painel."
                : authError === "invalido" || authError === "invalid_or_expired_link"
                  ? "O link de autenticação é inválido ou expirou. Peça um novo link para quem administra o painel."
                  : null;

  return (
    <main className="login-page">
      <form action="/api/login" className="login-card" method="post">
        <div className="avatar" style={{ marginBottom: 16 }}>
          <LockKeyhole size={18} />
        </div>
        <h1>Acesso</h1>
        <p>Entre com seu e-mail e senha.</p>

        {errorMessage ? (
          <div aria-live="polite" className="alert error" role="alert">
            {errorMessage}
          </div>
        ) : mensagem === "senha_atualizada" ? (
          <div aria-live="polite" className="alert success" role="status">
            Senha definida com sucesso. Você já pode entrar.
          </div>
        ) : null}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              autoComplete="email"
              autoFocus
              className="input"
              id="email"
              inputMode="email"
              maxLength={320}
              name="email"
              placeholder="voce@exemplo.com"
              required
              type="email"
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              autoComplete="current-password"
              className="input"
              id="senha"
              maxLength={256}
              name="senha"
              placeholder="Digite sua senha"
              required
              type="password"
            />
          </div>
        </div>
        <button className="button primary" style={{ marginTop: 18, width: "100%" }} type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
