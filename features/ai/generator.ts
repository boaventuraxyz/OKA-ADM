import "server-only";

import {
  createGateway,
  gateway,
  generateText,
  type LanguageModel,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output
} from "ai";
import {
  campaignGenerationInputSchema,
  campaignGenerationOutputSchema,
  type CampaignGenerationInput
} from "./schemas";
import {
  campaignGenerationPrompt,
  campaignGenerationSystemPrompt
} from "./prompt";

export const DEFAULT_AI_MODEL = "openai/gpt-5.6-luna";
export const DEFAULT_AI_FALLBACK_MODELS = [
  "openai/gpt-5.4-mini",
  "google/gemini-3.7-flash"
] as const;

export class CampaignGenerationError extends Error {
  constructor(
    public readonly code:
      | "AI_INVALID_INPUT"
      | "AI_INVALID_OUTPUT"
      | "AI_TIMEOUT"
      | "AI_UNAVAILABLE"
  ) {
    super(code);
    this.name = "CampaignGenerationError";
  }
}

type CampaignGenerationOptions = {
  /** Deterministic model injection used by unit tests; production uses Gateway. */
  model?: LanguageModel;
  modelId?: string;
  maxRetries?: number;
  timeoutMs?: number;
};

function selectedModelId() {
  const model = process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(model)) {
    throw new CampaignGenerationError("AI_UNAVAILABLE");
  }
  return model;
}

function selectedGateway() {
  const explicitApiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.AI_API_KEY?.trim();

  return explicitApiKey ? createGateway({ apiKey: explicitApiKey }) : gateway;
}

function isTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /timeout|timed out/i.test(error.message))
  );
}

export async function generateCampaignDraft(
  rawInput: CampaignGenerationInput,
  actorId: string,
  options: CampaignGenerationOptions = {}
) {
  const parsedInput = campaignGenerationInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new CampaignGenerationError("AI_INVALID_INPUT");
  }

  try {
    const modelId = options.modelId ?? selectedModelId();
    const timeoutMs = options.timeoutMs ?? 35_000;
    const result = await generateText({
      model: options.model ?? selectedGateway()(modelId),
      output: Output.object({
        name: "CampaignDraft",
        description: "Rascunho editável de campanha cívica para revisão humana.",
        schema: campaignGenerationOutputSchema
      }),
      system: campaignGenerationSystemPrompt(),
      prompt: campaignGenerationPrompt(parsedInput.data),
      maxOutputTokens: 2_500,
      maxRetries: options.maxRetries ?? 2,
      reasoning: "low",
      timeout: { totalMs: timeoutMs, stepMs: Math.min(30_000, timeoutMs) },
      providerOptions: {
        gateway: {
          models: [...DEFAULT_AI_FALLBACK_MODELS],
          tags: ["oka-admin", "campaign-draft"],
          user: actorId,
          disallowPromptTraining: true
        }
      }
    });

    return {
      draft: result.output,
      modelId,
      usage: result.totalUsage,
      warnings: result.warnings?.map((warning) => warning.type) ?? []
    };
  } catch (error) {
    if (
      NoObjectGeneratedError.isInstance(error) ||
      NoOutputGeneratedError.isInstance(error)
    ) {
      throw new CampaignGenerationError("AI_INVALID_OUTPUT");
    }
    if (isTimeout(error)) {
      throw new CampaignGenerationError("AI_TIMEOUT");
    }
    if (error instanceof CampaignGenerationError) throw error;
    throw new CampaignGenerationError("AI_UNAVAILABLE");
  }
}
