import { redirect } from "next/navigation";

export default async function LegacyEditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/campaigns/${encodeURIComponent(id)}/edit`);
}
