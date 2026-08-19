import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { setPasswordChangeRequired } from "@/features/auth/password-flow";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function safeNextPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const baseUrl = new URL("https://local.invalid");
    const targetUrl = new URL(value, baseUrl);

    if (targetUrl.origin !== baseUrl.origin) {
      return fallback;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return fallback;
  }
}

function redirectWithAuthHeaders(
  request: NextRequest,
  path: string,
  authHeaders: Headers,
) {
  const response = NextResponse.redirect(
    new URL(path, request.nextUrl.origin),
    303,
  );

  authHeaders.forEach((value, key) => response.headers.set(key, value));
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

function authErrorPath() {
  return "/login?auth_error=invalido";
}

export async function GET(request: NextRequest) {
  const authHeaders = new Headers();
  const supabase = await createServerClient({
    onAuthHeaders(headers) {
      for (const [key, value] of Object.entries(headers)) {
        authHeaders.set(key, value);
      }
    },
  });

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const requiresPassword =
    Boolean(code) || rawType === "invite" || rawType === "recovery";
  const nextPath = requiresPassword
    ? "/auth/set-password"
    : safeNextPath(request.nextUrl.searchParams.get("next"), "/admin");
  let authenticated = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authenticated = !error;
  } else if (tokenHash && rawType && ALLOWED_OTP_TYPES.has(rawType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType,
    });
    authenticated = !error;
  } else {
    // Sem código nem token_hash o link veio pelo fluxo implícito: os tokens
    // estão no fragmento da URL, que o navegador não envia ao servidor. O
    // fragmento sobrevive ao redirecionamento e é lido na página seguinte.
    return redirectWithAuthHeaders(request, "/auth/continuar", authHeaders);
  }

  if (!authenticated) {
    return redirectWithAuthHeaders(request, authErrorPath(), authHeaders);
  }

  if (requiresPassword) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      await supabase.auth.signOut({ scope: "local" });
      return redirectWithAuthHeaders(request, authErrorPath(), authHeaders);
    }

    try {
      await setPasswordChangeRequired(user, true);
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return redirectWithAuthHeaders(request, authErrorPath(), authHeaders);
    }
  }

  return redirectWithAuthHeaders(request, nextPath, authHeaders);
}
