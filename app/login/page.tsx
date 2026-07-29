import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await isAuthenticated()) {
    redirect("/");
  }

  const { erro } = await searchParams;

  return (
    <main className="login-page">
      <form action="/api/login" className="login-card" method="post">
        <div className="avatar" style={{ marginBottom: 16 }}>
          <LockKeyhole size={18} />
        </div>
        <h1>Acesso</h1>
        <p>Entre com a senha administrativa.</p>

        {erro === "senha" ? (
          <div className="alert error">Senha incorreta.</div>
        ) : erro === "limite" ? (
          <div className="alert error">Muitas tentativas. Aguarde 15 minutos.</div>
        ) : erro === "config" ? (
          <div className="alert error">Configuração de autenticação inválida.</div>
        ) : null}

        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input
            autoFocus
            className="input"
            id="senha"
            name="senha"
            placeholder="Digite sua senha"
            required
            type="password"
          />
        </div>
        <button className="button primary" style={{ marginTop: 18, width: "100%" }} type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
