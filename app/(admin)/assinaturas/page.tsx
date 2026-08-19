import { permanentRedirect } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LegacySignaturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { campanhaId } = await searchParams;
  const campaignId = Array.isArray(campanhaId) ? campanhaId[0] : campanhaId;

  permanentRedirect(
    campaignId && UUID.test(campaignId)
      ? `/admin/leads?campaignId=${campaignId}`
      : "/admin/leads",
  );
}
