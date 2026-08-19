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

export type CampaignGenerationErrorCode =
  | "AI_INVALID_INPUT"
  | "AI_INVALID_OUTPUT"
  | "AI_MODEL_NOT_FOUND"
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_TIMEOUT"
  | "AI_UNAVAILABLE";

export class CampaignGenerationError extends Error {
  constructor(
    public readonly code: CampaignGenerationErrorCode,
    options?: ErrorOptions
  ) {
    super(code, options);
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
    throw new CampaignGenerationError("AI_NOT_CONFIGURED");
  }
  return model;
}

/**
 * Credencial visível no ambiente do processo. NÃO é a lista completa: o AI
 * Gateway também aceita OIDC vindo do cabeçalho `x-vercel-oidc-token` da
 * requisição e do refresh via OAuth no desenvolvimento local. Por isso este
 * sinal serve só para orientar a interface — nunca para impedir a chamada.
 */
export function aiGatewayCredentialInEnvironment() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "";
  if (apiKey) return "api-key" as const;
  return process.env.VERCEL_OIDC_TOKEN?.trim() ? ("oidc" as const) : null;
}

function selectedGateway() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || "";
  // Sem chave explícita, deixamos o provider resolver o OIDC sozinho: ele lê o
  // cabeçalho da requisição na Vercel, a variável de ambiente e o refresh local,
  // caminhos que uma checagem de process.env aqui nao enxergaria.
  return apiKey ? createGateway({ apiKey }) : gateway;
}

function isTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /timeout|timed out/i.test(error.message))
  );
}

/**
 * O pacote `@ai-sdk/gateway` não é dependência direta, então a classificação
 * usa as marcas que os erros dele carregam em vez de `instanceof`.
 */
function gatewayErrorCode(error: unknown): CampaignGenerationErrorCode | null {
  if (!error || typeof error !== "object") return null;
  const { name, type, statusCode } = error as {
    name?: unknown;
    type?: unknown;
    statusCode?: unknown;
  };
  if (typeof name !== "string" || !name.startsWith("Gateway")) return null;

  switch (type) {
    case "authentication_error":
    case "forbidden":
      return "AI_NOT_CONFIGURED";
    case "model_not_found":
      return "AI_MODEL_NOT_FOUND";
    case "rate_limit_exceeded":
      return "AI_QUOTA_EXCEEDED";
    case "invalid_request_error":
      return statusCode === 402 ? "AI_QUOTA_EXCEEDED" : "AI_UNAVAILABLE";
    default:
      return "AI_UNAVAILABLE";
  }
}

/** O motivo real some no erro genérico da API; sem log não há como diagnosticar. */
function reportGenerationFailure(code: CampaignGenerationErrorCode, error: unknown) {
  const detail =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name)
      : typeof error;
  console.error(
    `[ai] geração de campanha falhou (${code})`,
    detail,
    error instanceof Error ? error.message : ""
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
    if (error instanceof CampaignGenerationError) {
      reportGenerationFailure(error.code, error);
      throw error;
    }

    const code =
      NoObjectGeneratedError.isInstance(error) ||
      NoOutputGeneratedError.isInstance(error)
        ? "AI_INVALID_OUTPUT"
        : isTimeout(error)
          ? "AI_TIMEOUT"
          : gatewayErrorCode(error) ?? "AI_UNAVAILABLE";

    reportGenerationFailure(code, error);
    throw new CampaignGenerationError(code, { cause: error });
  }
}
