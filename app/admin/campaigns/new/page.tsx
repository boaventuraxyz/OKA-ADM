import type { Metadata } from "next";

import { CampaignEditor } from "@/features/campaigns/CampaignEditor";
import { listCandidateOptions } from "@/features/candidates/service";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nova campanha" };
export const dynamic = "force-dynamic";

export default async function NewAdminCampaignPage() {
  await requireAdmin();
  const candidateOptions = await listCandidateOptions();
  const candidates = candidateOptions.map(({ id, nome, partido }) => ({
    id,
    nome: partido ? `${nome} (${partido})` : nome
  }));

  return <CampaignEditor candidates={candidates} mode="create" />;
}
