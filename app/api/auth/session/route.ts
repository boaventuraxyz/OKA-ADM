import { type NextRequest, NextResponse } from "next/server";

import { setPasswordChangeRequired } from "@/features/auth/password-flow";
import { apiError } from "@/lib/api/response";
import { isSameOrigin, requestBodyWithinLimit } from "@/lib/request-security";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;
const PASSWORD_FLOWS = new Set(["invite", "recovery"]);

/**
 * Fecha o fluxo implícito do Supabase: o link de e-mail devolve os tokens no
 * fragmento da URL, que nunca chega ao servidor. A página de continuação lê o
 * fragmento no navegador e envia os tokens para cá, onde a sessão vira cookie.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return apiError("ORIGIN_NOT_ALLOWED", "Origem não permitida.", 403);
  }
  if (
    !requestBodyWithinLimit(request, MAX_BODY_BYTES) ||
    !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
  ) {
    return apiError("INVALID_REQUEST", "Requisição inválida.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", "JSON inválido.", 400);
  }

  const payload = body as Record<string, unknown> | null;
  const accessToken = typeof payload?.accessToken === "string" ? payload.accessToken : "";
  const refreshToken = typeof payload?.refreshToken === "string" ? payload.refreshToken : "";
  const type = typeof payload?.type === "string" ? payload.type : "";
  if (!accessToken || !refreshToken) {
    return apiError("INVALID_LINK", "Link de autenticação incompleto.", 400);
  }

  const authHeaders = new Headers();
  const supabase = await createServerClient({
    onAuthHeaders(headers) {
      for (const [key, value] of Object.entries(headers)) {
        authHeaders.set(key, value);
      }
    },
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.user) {
    return apiError("INVALID_LINK", "O link de autenticação é inválido ou expirou.", 401);
  }

  const requiresPassword = PASSWORD_FLOWS.has(type);
  if (requiresPassword) {
    try {
      await setPasswordChangeRequired(data.user, true);
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return apiError("SESSION_FAILED", "Não foi possível concluir o acesso.", 503);
    }
  }

  const response = NextResponse.json(
    { success: true, data: { next: requiresPassword ? "/auth/set-password" : "/admin" } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  authHeaders.forEach((value, key) => response.headers.set(key, value));

  return response;
}
