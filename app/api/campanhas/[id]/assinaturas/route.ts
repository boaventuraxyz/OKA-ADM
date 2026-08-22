import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
  requireRole,
} from "@/features/auth/guards";
import { apiError } from "@/lib/api/response";
import { getCampaignCsvDownload } from "@/lib/campaign-download";
import { isUuid } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["master", "admin"]);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return apiError("AUTHENTICATION_REQUIRED", "Sessão expirada.", 401);
    }
    if (error instanceof AuthorizationRequiredError) {
      return apiError(
        "AUTHORIZATION_REQUIRED",
        "Usuário sem permissão para exportar assinaturas.",
        403,
      );
    }
    return apiError(
      "AUTH_SERVICE_UNAVAILABLE",
      "Não foi possível validar a sessão.",
      503,
    );
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  const download = await getCampaignCsvDownload(id);

  if (!download) {
    return Response.json({ erro: "Campanha nao encontrada" }, { status: 404 });
  }

  return new Response(download.body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${download.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
