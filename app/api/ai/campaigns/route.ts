import { ZodError } from "zod";

import { CampaignGenerationError } from "@/features/ai/generator";
import { createCampaignDraftWithAI } from "@/features/ai/service";
import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import { getCurrentAuthContext } from "@/features/auth/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readJsonWithinLimit,
  requestBodyWithinLimit,
} from "@/lib/request-security";

const MAX_AI_BODY_BYTES = 16_384;

export const runtime = "nodejs";
export const maxDuration = 60;

function generationError(error: CampaignGenerationError) {
  const messages = {
    AI_INVALID_INPUT: ["AI_INVALID_INPUT", "Revise o tema e o briefing.", 400],
    AI_INVALID_OUTPUT: ["AI_INVALID_OUTPUT", "A IA devolveu um rascunho inválido. Tente novamente.", 422],
    AI_TIMEOUT: ["AI_TIMEOUT", "A geração demorou além do limite. Tente novamente.", 504],
    AI_UNAVAILABLE: ["AI_UNAVAILABLE", "O gerador está temporariamente indisponível.", 503],
  } as const;
  const [code, message, status] = messages[error.code];
  return apiError(code, message, status);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("ORIGIN_NOT_ALLOWED", "Origem não permitida.", 403);
  }
  if (
    !requestBodyWithinLimit(request, MAX_AI_BODY_BYTES) ||
    !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
  ) {
    return apiError("INVALID_REQUEST", "Requisição inválida.", 413);
  }

  let context: Awaited<ReturnType<typeof getCurrentAuthContext>>;
  try {
    context = await getCurrentAuthContext();
  } catch {
    return apiError("AUTH_SERVICE_UNAVAILABLE", "Não foi possível validar a sessão.", 503);
  }
  if (!context) return apiError("AUTHENTICATION_REQUIRED", "Entre novamente.", 401);
  if (!context.profile?.isActive || context.user.passwordChangeRequired) {
    return apiError("AUTHORIZATION_REQUIRED", "Acesso não autorizado.", 403);
  }

  const rateLimit = consumeRateLimit(`ai-campaign:${context.user.id}`, request.headers, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Limite temporário de gerações atingido.", 429, {
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
  }

  const body = await readJsonWithinLimit(request, MAX_AI_BODY_BYTES);
  if (!body) return apiError("INVALID_REQUEST", "JSON inválido.", 400);

  try {
    return apiSuccess(await createCampaignDraftWithAI(body), { status: 201 });
  } catch (error) {
    if (error instanceof CampaignGenerationError) return generationError(error);
    if (error instanceof ZodError) {
      return apiError("VALIDATION_ERROR", "Revise o tema e o briefing.", 400);
    }
    if (error instanceof AuthenticationRequiredError) {
      return apiError("AUTHENTICATION_REQUIRED", "Entre novamente.", 401);
    }
    if (error instanceof AuthorizationRequiredError) {
      return apiError("AUTHORIZATION_REQUIRED", "Acesso não autorizado.", 403);
    }
    return apiError("AI_CAMPAIGN_FAILED", "Não foi possível criar o rascunho.", 500);
  }
}
