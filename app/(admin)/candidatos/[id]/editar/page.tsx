import { permanentRedirect } from "next/navigation";

export default async function LegacyEditCandidatePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/admin/candidates/${encodeURIComponent(id)}/edit`);
}
