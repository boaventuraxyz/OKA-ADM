import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new Response("Origem nao permitida.", { status: 403 });
  }

  await clearAdminSession();
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
