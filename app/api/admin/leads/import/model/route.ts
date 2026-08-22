import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
  requireRole,
} from "@/features/auth/guards";
import { leadImportModelCsv } from "@/features/leads/import";
import { apiError } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole(["master", "admin"]);
    return new Response(leadImportModelCsv(), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": "attachment; filename=\"modelo-importacao-leads.csv\"",
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return apiError("AUTHENTICATION_REQUIRED", "Sessão expirada.", 401);
    }
    if (error instanceof AuthorizationRequiredError) {
      return apiError(
        "AUTHORIZATION_REQUIRED",
        "Usuário sem permissão para importar leads.",
        403,
      );
    }
    return apiError(
      "AUTH_SERVICE_UNAVAILABLE",
      "Não foi possível validar a sessão.",
      503,
    );
  }
}
