import type { Metadata } from "next";
import { headers } from "next/headers";

import { AICampaignCreator } from "@/features/ai/AICampaignCreator";
import { aiGatewayCredentialInEnvironment } from "@/features/ai/generator";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar com IA" };
export const dynamic = "force-dynamic";

export default async function CreateCampaignWithAIPage() {
  await requireAdmin();
  // Na Vercel o token OIDC chega por cabeçalho, fora do process.env.
  const requestHeaders = await headers();
  const credentialVisible =
    aiGatewayCredentialInEnvironment() !== null ||
    Boolean(requestHeaders.get("x-vercel-oidc-token"));

  return <AICampaignCreator credentialVisible={credentialVisible} />;
}
