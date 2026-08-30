import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampaignEditor } from "@/features/campaigns/CampaignEditor";
import { campaignIdSchema } from "@/features/campaigns/schemas";
import { getCampaign } from "@/features/campaigns/service";
import { listCandidateOptions } from "@/features/candidates/service";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Editar campanha" };
export const dynamic = "force-dynamic";

export default async function EditAdminCampaignPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const parsedId = campaignIdSchema.safeParse(id);

  if (!parsedId.success) notFound();

  const [campaign, candidateOptions] = await Promise.all([
    getCampaign(parsedId.data),
    listCandidateOptions()
  ]);

  if (!campaign) notFound();

  const candidates = candidateOptions.map(({ id: candidateId, nome, numero, partido }) => ({
    id: candidateId,
    nome: partido ? `${nome} (${partido})` : nome,
    numero,
  }));

  return (
    <CampaignEditor
      candidates={candidates}
      initialCampaign={campaign}
      mode="edit"
    />
  );
}
