export const CAMPAIGN_STATUSES = ["draft", "published", "archived"] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada"
};

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return (
    typeof value === "string" &&
    CAMPAIGN_STATUSES.includes(value as CampaignStatus)
  );
}

export function campaignStatusFromLegacy(
  status: unknown,
  active: boolean | null | undefined
): CampaignStatus {
  return isCampaignStatus(status) ? status : active ? "published" : "draft";
}

export function normalizeCampaignSlug(value: string | null | undefined) {
  if (!value?.trim()) return null;

  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");

  return slug || null;
}
