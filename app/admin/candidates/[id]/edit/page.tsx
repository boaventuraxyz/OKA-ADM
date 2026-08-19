import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { updateCandidatoAction } from "@/app/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateForm } from "@/features/candidates/CandidateForm";
import { getCandidate } from "@/features/candidates/service";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

import styles from "@/features/candidates/candidates-admin.module.css";

export const metadata: Metadata = { title: "Editar candidato" };

export default async function EditCandidatePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const context = await requireAdmin();
  if (context.profile.role === "editor") redirect("/admin/candidates");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [{ erro }, candidate] = await Promise.all([searchParams, getCandidate(id)]);
  if (!candidate) notFound();

  return (
    <div className={styles.page}>
      <PageHeader
        description="Atualize os dados usados nas campanhas e no hub público."
        eyebrow="Candidatos"
        title={candidate.nome}
      />
      <CandidateForm
        action={updateCandidatoAction}
        candidate={candidate}
        error={erro}
        mode="edit"
      />
    </div>
  );
}
