import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import { importLeads, LEAD_IMPORT_MAX_BYTES } from "@/features/leads/import";
import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOrigin, readFormDataWithinLimit, requestBodyWithinLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("FORBIDDEN_ORIGIN", "Origem não permitida.", 403);
  const rateLimit = consumeRateLimit("admin-leads-import", request.headers, { limit: 8, windowMs: 5 * 60_000 });
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Muitas importações em sequência. Aguarde alguns minutos.", 429, { headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });

  const maxBodyBytes = LEAD_IMPORT_MAX_BYTES + 64_000;
  if (!requestBodyWithinLimit(request, maxBodyBytes)) return apiError("FILE_TOO_LARGE", "A planilha deve ter no máximo 2 MB.", 413);
  const formData = await readFormDataWithinLimit(request, maxBodyBytes);
  const file = formData?.get("arquivo");
  const campaignId = formData?.get("campaignId");
  if (!(file instanceof File) || typeof campaignId !== "string") return apiError("INVALID_INPUT", "Selecione a campanha e a planilha.", 400);

  try {
    return apiSuccess(await importLeads(campaignId, file));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return apiError("AUTHENTICATION_REQUIRED", "Sessão expirada.", 401);
    if (error instanceof AuthorizationRequiredError) return apiError("AUTHORIZATION_REQUIRED", "Usuário sem permissão para importar leads.", 403);
    return apiError("IMPORT_ERROR", error instanceof Error ? error.message : "Não foi possível importar a planilha.", 400);
  }
}

