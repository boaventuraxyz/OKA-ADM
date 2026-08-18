import type { Metadata } from "next";

import { AICampaignCreator } from "@/features/ai/AICampaignCreator";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Criar com IA" };

export default async function CreateCampaignWithAIPage() {
  await requireAdmin();
  return <AICampaignCreator />;
}
