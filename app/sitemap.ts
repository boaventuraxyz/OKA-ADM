import type { MetadataRoute } from "next";

import { listPublishedCampaignSitemap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  if (!base) return [];

  const campaigns = await listPublishedCampaignSitemap();
  return campaigns.map((campaign) => ({
    url: `${base}/formulario/${encodeURIComponent(campaign.id)}`,
    lastModified: campaign.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}
