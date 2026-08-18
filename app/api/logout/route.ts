import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/request-security";
import { createServerClient } from "@/lib/supabase/server";

function logoutRedirect(request: Request, authHeaders: Headers) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

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
  if (!isSameOrigin(request)) {
    return new Response("Origem nao permitida.", { status: 403 });
  }

  const authHeaders = new Headers();

  try {
    const supabase = await createServerClient({
      onAuthHeaders(headers) {
        for (const [key, value] of Object.entries(headers)) {
          authHeaders.set(key, value);
        }
      },
    });

    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Logout remains idempotent; the authorization guard still fails closed.
  }

  return logoutRedirect(request, authHeaders);
}
