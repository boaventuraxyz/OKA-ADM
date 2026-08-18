import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { userRequiresPasswordChange } from "@/features/auth/password-flow";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SetPasswordPageProps = {
  searchParams: Promise<{ erro?: string }>;
};

export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  let sessionState: "invalid" | "ready" | "unavailable" = "invalid";

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    sessionState =
      user && !error && userRequiresPasswordChange(user) ? "ready" : "invalid";
  } catch {
    sessionState = "unavailable";
  }

  if (sessionState === "unavailable") {
    redirect("/login?erro=indisponivel");
  }

  if (sessionState !== "ready") {
    redirect("/login?auth_error=invalid_or_expired_link");
  }

  const { erro } = await searchParams;
  const errorMessage =
    erro === "confirmacao"
      ? "As senhas informadas não coincidem."
      : erro === "requisitos"
        ? "A senha não atende aos requisitos de segurança."
        : erro === "limite"
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : erro === "sessao"
            ? "A sessão expirou. Solicite um novo link."
            : erro === "indisponivel"
              ? "Não foi possível definir a senha agora. Tente novamente."
              : null;

  return (
    <main className="login-page">
      <form
        action="/api/auth/set-password"
        className="login-card"
        method="post"
      >
        <div className="avatar" style={{ marginBottom: 16 }}>
          <KeyRound size={18} />
        </div>
        <h1>Defina sua senha</h1>
        <p>Conclua o acesso criando uma senha forte.</p>

        {errorMessage ? (
          <div aria-live="polite" className="alert error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="senha">Nova senha</label>
            <input
              aria-describedby="password-requirements"
              autoComplete="new-password"
              autoFocus
              className="input"
              id="senha"
              maxLength={128}
              minLength={12}
              name="senha"
              required
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="confirmacao">Confirme a nova senha</label>
            <input
              autoComplete="new-password"
              className="input"
              id="confirmacao"
              maxLength={128}
              minLength={12}
              name="confirmacao"
              required
              type="password"
            />
          </div>
        </div>

        <p id="password-requirements">
          Use pelo menos 12 caracteres, com letras maiúsculas e minúsculas,
          número e símbolo.
        </p>

        <button
          className="button primary"
          style={{ marginTop: 18, width: "100%" }}
          type="submit"
        >
          Salvar senha
        </button>
      </form>
    </main>
  );
}
