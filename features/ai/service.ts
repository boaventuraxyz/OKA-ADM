import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { createCampaign } from "@/features/campaigns/service";

import { mapGeneratedDraftToCampaignInput } from "./campaign-draft";
import { generateCampaignDraft } from "./generator";
import { campaignGenerationInputSchema } from "./schemas";

export async function createCampaignDraftWithAI(input: unknown) {
  const context = await requireActiveProfile();
  const actorInput = campaignGenerationInputSchema.parse(input);
  const generated = await generateCampaignDraft(actorInput, context.user.id);
  const campaign = await createCampaign(
    mapGeneratedDraftToCampaignInput({
      actorInput,
      draft: generated.draft,
      generatedAt: new Date().toISOString(),
      modelId: generated.modelId,
      usage: generated.usage,
    })
  );

  return {
    campaign,
    generation: {
      modelId: generated.modelId,
      suggestedThemeKey: generated.draft.themeKey,
      warnings: generated.warnings,
    },
  };
}
