import { NextResponse } from "next/server";
import { z } from "zod";

import { hasMinimumRole } from "@/features/auth/guards";
import { getAuthContext } from "@/features/auth/service";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit,
} from "@/lib/request-security";
import { createServerClient } from "@/lib/supabase/server";

const MAX_LOGIN_BODY_BYTES = 4096;

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(256),
});

type LoginError = "credenciais" | "indisponivel" | "limite";

function loginRedirect(
  request: Request,
  authHeaders: Headers,
  error?: LoginError,
  successPath = "/admin",
) {
  const path = error ? `/login?erro=${error}` : successPath;
  const response = NextResponse.redirect(new URL(path, request.url), 303);

  authHeaders.forEach((value, key) => response.headers.set(key, value));
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

async function slowInvalidAttempt() {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

export async function POST(request: Request) {
  const authHeaders = new Headers();

  if (!isSameOrigin(request)) {
    return new Response("Origem nao permitida.", { status: 403 });
  }

  if (
    !requestBodyWithinLimit(request, MAX_LOGIN_BODY_BYTES) ||
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  ) {
    return new Response("Requisicao invalida.", { status: 413 });
  }

  const rateLimit = consumeRateLimit("login", request.headers, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const response = loginRedirect(request, authHeaders, "limite");
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const formData = await readFormDataWithinLimit(request, MAX_LOGIN_BODY_BYTES);

  if (!formData) {
    return new Response("Requisicao invalida.", { status: 413 });
  }

  const parsedCredentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("senha"),
  });

  if (!parsedCredentials.success) {
    await slowInvalidAttempt();
    return loginRedirect(request, authHeaders, "credenciais");
  }

  try {
    const supabase = await createServerClient({
      onAuthHeaders(headers) {
        for (const [key, value] of Object.entries(headers)) {
          authHeaders.set(key, value);
        }
      },
    });
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsedCredentials.data.email,
      password: parsedCredentials.data.password,
    });

    if (signInError) {
      await slowInvalidAttempt();
      return loginRedirect(request, authHeaders, "credenciais");
    }

    const context = await getAuthContext(supabase);

    if (context?.user.passwordChangeRequired) {
      clearRateLimit("login", request.headers);
      return loginRedirect(
        request,
        authHeaders,
        undefined,
        "/auth/set-password",
      );
    }

    const authorized = Boolean(
      context?.profile?.isActive &&
        hasMinimumRole(context.profile.role, "editor"),
    );

    if (!authorized) {
      await supabase.auth.signOut({ scope: "local" });
      await slowInvalidAttempt();
      return loginRedirect(request, authHeaders, "credenciais");
    }

    clearRateLimit("login", request.headers);
    return loginRedirect(request, authHeaders);
  } catch {
    return loginRedirect(request, authHeaders, "indisponivel");
  }
}
