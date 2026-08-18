import { NextResponse } from "next/server";
import { z } from "zod";

import { hasMinimumRole } from "@/features/auth/guards";
import {
  setPasswordChangeRequired,
  userRequiresPasswordChange,
} from "@/features/auth/password-flow";
import { getAuthContext } from "@/features/auth/service";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit,
} from "@/lib/request-security";
import { createServerClient } from "@/lib/supabase/server";

const MAX_PASSWORD_BODY_BYTES = 4096;

const strongPasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9\s]/);

type PasswordError =
  | "confirmacao"
  | "indisponivel"
  | "limite"
  | "requisitos"
  | "sessao";

function passwordRedirect(
  request: Request,
  authHeaders: Headers,
  error?: PasswordError,
  successPath = "/admin",
) {
  const path = error ? `/auth/set-password?erro=${error}` : successPath;
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

export async function POST(request: Request) {
  const authHeaders = new Headers();

  if (!isSameOrigin(request)) {
    return new Response("Origem nao permitida.", { status: 403 });
  }

  if (
    !requestBodyWithinLimit(request, MAX_PASSWORD_BODY_BYTES) ||
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  ) {
    return new Response("Requisicao invalida.", { status: 413 });
  }

  const rateLimit = consumeRateLimit("set-password", request.headers, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    const response = passwordRedirect(request, authHeaders, "limite");
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const formData = await readFormDataWithinLimit(
    request,
    MAX_PASSWORD_BODY_BYTES,
  );

  if (!formData) {
    return new Response("Requisicao invalida.", { status: 413 });
  }

  const passwordValue = formData.get("senha");
  const confirmationValue = formData.get("confirmacao");

  if (
    typeof passwordValue !== "string" ||
    typeof confirmationValue !== "string"
  ) {
    return passwordRedirect(request, authHeaders, "requisitos");
  }

  if (passwordValue !== confirmationValue) {
    return passwordRedirect(request, authHeaders, "confirmacao");
  }

  const parsedPassword = strongPasswordSchema.safeParse(passwordValue);

  if (!parsedPassword.success) {
    return passwordRedirect(request, authHeaders, "requisitos");
  }

  try {
    const supabase = await createServerClient({
      onAuthHeaders(headers) {
        for (const [key, value] of Object.entries(headers)) {
          authHeaders.set(key, value);
        }
      },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !userRequiresPasswordChange(user)) {
      return passwordRedirect(request, authHeaders, "sessao");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsedPassword.data,
    });

    if (updateError) {
      return passwordRedirect(
        request,
        authHeaders,
        updateError.code === "weak_password" ? "requisitos" : "indisponivel",
      );
    }

    await setPasswordChangeRequired(user, false);
    const context = await getAuthContext(supabase);
    const authorized = Boolean(
      context?.profile?.isActive &&
        !context.user.passwordChangeRequired &&
        hasMinimumRole(context.profile.role, "editor"),
    );

    clearRateLimit("set-password", request.headers);
    return passwordRedirect(
      request,
      authHeaders,
      undefined,
      authorized ? "/admin" : "/login?mensagem=senha_atualizada",
    );
  } catch {
    return passwordRedirect(request, authHeaders, "indisponivel");
  }
}
