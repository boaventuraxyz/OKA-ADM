import type { Metadata } from "next";

import { CampaignEditor } from "@/features/campaigns/CampaignEditor";
import { listCandidateOptions } from "@/features/candidates/service";
import { getThemeByKey } from "@/features/themes/registry";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nova campanha" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewAdminCampaignPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const requestedTheme = Array.isArray(params.theme) ? params.theme[0] : params.theme;
  const initialThemeKey = requestedTheme ? getThemeByKey(requestedTheme)?.key : undefined;
  const candidateOptions = await listCandidateOptions();
  const candidates = candidateOptions.map(({ id, nome, numero, partido }) => ({
    id,
    nome: partido ? `${nome} (${partido})` : nome,
    numero,
  }));

  return (
    <CampaignEditor
      candidates={candidates}
      initialThemeKey={initialThemeKey}
      mode="create"
    />
  );
}
