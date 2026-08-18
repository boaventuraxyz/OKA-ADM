import { ZodError } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import { createLeadCsvExport } from "@/features/leads/export";
import { LeadRepositoryError } from "@/features/leads/repository";
import { apiError } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function exportFilters(request: Request) {
  const params = new URL(request.url).searchParams;

  return {
    search: params.get("search") || undefined,
    campaignId: params.get("campaignId") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  };
}

export async function GET(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError("FORBIDDEN_ORIGIN", "Origem não permitida.", 403);
  }

  const rateLimit = consumeRateLimit("admin-leads-export", request.headers, {
    limit: 5,
    windowMs: 5 * 60_000,
  });

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Muitas exportações em sequência. Aguarde alguns minutos.",
      429,
      { headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const exportResult = await createLeadCsvExport(exportFilters(request));

    return new Response(exportResult.stream, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
        Pragma: "no-cache",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
        "X-Export-Row-Limit": String(exportResult.rowLimit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError("INVALID_FILTERS", "Filtros inválidos.", 400);
    }
    if (error instanceof AuthenticationRequiredError) {
      return apiError("AUTHENTICATION_REQUIRED", "Sessão expirada.", 401);
    }
    if (error instanceof AuthorizationRequiredError) {
      return apiError(
        "AUTHORIZATION_REQUIRED",
        "Usuário sem permissão para exportar leads.",
        403,
      );
    }
    if (error instanceof LeadRepositoryError) {
      return apiError(
        "DATABASE_ERROR",
        "Não foi possível preparar a exportação.",
        502,
      );
    }

    return apiError(
      "INTERNAL_ERROR",
      "Não foi possível preparar a exportação.",
      500,
    );
  }
}
