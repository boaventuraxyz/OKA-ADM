import { CampaignThemePreviewCanvas } from "@/features/themes/CampaignThemePreviewCanvas";

export default async function ThemePreviewPage({ searchParams }: {
  searchParams: Promise<{ instance?: string; theme?: string }>;
}) {
  const { instance = "standalone", theme = "1" } = await searchParams;
  const themeId = Number.parseInt(theme, 10);

  return (
    <CampaignThemePreviewCanvas
      instanceId={instance.slice(0, 100)}
      themeId={Number.isFinite(themeId) ? themeId : 1}
    />
  );
}
