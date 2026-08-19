import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import { FormularioContent } from "@/app/formulario/page";
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
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await resolveCampaign(slug);
  return campaign
    ? publicCampaignMetadata(campaign.id)
    : { title: "Campanha não encontrada", robots: { index: false, follow: false } };
}

export default async function PublicCampaignPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await resolveCampaign(slug);
  if (!campaign) notFound();

  if (slug !== campaign.slug) {
    permanentRedirect(`/f/${encodeURIComponent(campaign.slug)}`);
  }

  return <FormularioContent idCampanha={campaign.id} />;
}
