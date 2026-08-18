import { THEME_REGISTRY, type LegacyThemeId } from "@/features/themes/registry";

export const CAMPAIGN_THEME_LIBRARY = THEME_REGISTRY.map((theme) => ({
  description: theme.description,
  id: theme.id,
  name: theme.name,
  supports: {
    backgroundImage: theme.capabilities.backgroundImage,
    sideImage: theme.capabilities.sideImage,
    video: theme.capabilities.video
  }
}));

export type CampaignThemeId = LegacyThemeId;

export function normalizeCampaignTheme(value: unknown): CampaignThemeId {
  const parsed = typeof value === "string" ? Number(value) : value;
  return CAMPAIGN_THEME_LIBRARY.some((theme) => theme.id === parsed)
    ? (parsed as CampaignThemeId)
    : 1;
}

export function resolveCampaignTheme(themeKey: unknown, legacyId: unknown): CampaignThemeId {
  const byKey = typeof themeKey === "string"
    ? THEME_REGISTRY.find((theme) => theme.key === themeKey.trim())
    : undefined;
  return byKey?.id ?? normalizeCampaignTheme(legacyId);
}
