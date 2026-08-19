import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createCandidatoAction } from "@/app/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateForm } from "@/features/candidates/CandidateForm";
import { requireAdmin } from "@/lib/auth";

import styles from "@/features/candidates/candidates-admin.module.css";

export const metadata: Metadata = { title: "Novo candidato" };

export default async function NewCandidatePage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const context = await requireAdmin();
  if (context.profile.role === "editor") redirect("/admin/candidates");
  const { erro } = await searchParams;

  return (
    <div className={styles.page}>
      <PageHeader
        description="Cadastre a identidade e o endereço do hub público."
        eyebrow="Candidatos"
        title="Novo candidato"
      />
      <CandidateForm action={createCandidatoAction} error={erro} mode="create" />
    </div>
  );
}
