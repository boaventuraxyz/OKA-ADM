import { NextResponse } from "next/server";
import {
  createAdminSession,
  getAuthConfigurationError,
  verifyAdminPassword
} from "@/lib/auth";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit
} from "@/lib/request-security";

const MAX_LOGIN_BODY_BYTES = 4096;

function loginRedirect(request: Request, error?: "config" | "limite" | "senha") {
  const path = error ? `/login?erro=${error}` : "/";
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
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

  if (getAuthConfigurationError()) {
    return loginRedirect(request, "config");
  }

  const rateLimit = consumeRateLimit("login", request.headers, {
    limit: 5,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    const response = loginRedirect(request, "limite");
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const formData = await readFormDataWithinLimit(request, MAX_LOGIN_BODY_BYTES);
  if (!formData) {
    return new Response("Requisicao invalida.", { status: 413 });
  }

  const value = formData.get("senha");
  const password = typeof value === "string" ? value.trim() : "";

  if (
    !password ||
    Buffer.byteLength(password, "utf8") > 256 ||
    !verifyAdminPassword(password)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return loginRedirect(request, "senha");
  }

  clearRateLimit("login", request.headers);
  await createAdminSession();
  return loginRedirect(request);
}
