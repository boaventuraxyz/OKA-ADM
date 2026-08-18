import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui/PageHeader";
import { DEFAULT_AI_MODEL } from "@/features/ai/generator";
import { requireAdmin } from "@/lib/auth";

import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const context = await requireAdmin();
  if (context.profile.role === "editor") redirect("/admin");

  const checks = [
    ["URL do aplicativo", Boolean(process.env.APP_URL)],
    ["URL do Supabase", Boolean(process.env.SUPABASE_URL)],
    ["Chave publicável", Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)],
    ["Chave secreta server-only", Boolean(process.env.SUPABASE_SECRET_KEY)],
    [
      "Vercel AI Gateway",
      Boolean(
        process.env.AI_GATEWAY_API_KEY ||
          process.env.AI_API_KEY ||
          process.env.VERCEL_OIDC_TOKEN
      ),
    ],
  ] as const;

  return (
    <div className={styles.page}>
      <PageHeader
        description="Visão segura da configuração operacional. Segredos nunca são exibidos nesta tela."
        eyebrow="Administração"
        title="Configurações"
      />

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Ambiente</h2>
          <ul className={styles.statusList}>
            {checks.map(([label, configured]) => (
              <li className={styles.statusItem} key={label}>
                <span>{label}</span>
                <span className={configured ? styles.statusOk : styles.statusMissing}>
                  {configured ? "Configurado" : "Pendente"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card}>
          <h2>Inteligência artificial</h2>
          <p>Modelo primário usado para criar rascunhos; fallbacks são controlados no backend.</p>
          <code className={styles.code}>{process.env.AI_MODEL || DEFAULT_AI_MODEL}</code>
        </section>

        <section className={styles.card}>
          <h2>Segurança</h2>
          <p>
            Identidade via Supabase Auth, autorização por perfil ativo e papéis
            master/admin/editor. Acesso público às tabelas administrativas permanece bloqueado.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Publicação</h2>
          <p>
            Campanhas novas e geradas por IA começam como rascunho. Somente master e admin
            podem publicar, despublicar ou arquivar.
          </p>
        </section>
      </div>
    </div>
  );
}
