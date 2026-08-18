import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { normalizeCampaignSlug } from "@/features/campaigns/domain";
import { publicCampaignMetadata } from "@/lib/public-campaign-metadata";
import { getPublishedCampaignIdBySlug } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const resolveCampaign = cache(async function resolveCampaign(rawSlug: string) {
  const slug = normalizeCampaignSlug(rawSlug);
  if (!slug) return null;
  return getPublishedCampaignIdBySlug(slug);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await resolveCampaign(slug);
  return campaign
    ? publicCampaignMetadata(campaign.id)
    : { title: "Campanha não encontrada", robots: { index: false, follow: false } };
}

export default async function PublicCampaignSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await resolveCampaign(slug);
  if (!campaign) notFound();
  redirect(`/formulario/${encodeURIComponent(campaign.id)}`);
}
