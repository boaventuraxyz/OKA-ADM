import { redirect } from "next/navigation";
import {
  CandidateCampaignHub,
  CandidateHubUnavailable
} from "@/components/CandidateCampaignHub";
import { normalizeCandidateSlug } from "@/lib/candidate-slug";
import { getPublicCandidateIndexBySlug } from "@/lib/public-campaign";

export const dynamic = "force-dynamic";

export default async function CandidateHubPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = normalizeCandidateSlug(slug);

  if (!normalizedSlug) {
    return <CandidateHubUnavailable title="Candidato não encontrado" />;
  }
  if (slug !== normalizedSlug) redirect(`/c/${normalizedSlug}`);

  const result = await getPublicCandidateIndexBySlug(normalizedSlug);
  if (!result) {
    return <CandidateHubUnavailable title="Candidato não encontrado" />;
  }

  return <CandidateCampaignHub {...result} />;
}
