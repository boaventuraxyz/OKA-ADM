import { headers } from "next/headers";
import {
  CandidateCampaignHub,
  CandidateHubUnavailable
} from "@/components/CandidateCampaignHub";
import {
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";
import { getPublicCandidateIndex } from "@/lib/public-campaign";

export const dynamic = "force-dynamic";

export default async function FormulariosPage() {
  const requestHeaders = await headers();
  const hostname = normalizeRequestHostname(
    requestHeaders.get("host") || requestHeaders.get("x-forwarded-host")
  );

  if (!hostname || isPlatformHostname(hostname)) {
    return <CandidateHubUnavailable title="Domínio público não configurado" />;
  }

  const result = await getPublicCandidateIndex(hostname);
  if (!result) {
    return <CandidateHubUnavailable title="Domínio público não encontrado" />;
  }

  return <CandidateCampaignHub {...result} />;
}
