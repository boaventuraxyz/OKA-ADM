import "server-only";

import {
  createServerClient as createSupabaseSsrClient,
  type CookieOptions,
} from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerEnv } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

type PendingCookie = {
  name: string;
  options: CookieOptions;
  value: string;
};

export type RefreshedProxySession = {
  apply(response: NextResponse): NextResponse;
  requestHeaders: Headers;
};

/**
 * Refreshes the cookie session without deciding authorization. Page and API
 * guards still validate the user remotely and enforce public.profiles RBAC.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<RefreshedProxySession> {
  const env = getSupabaseServerEnv();
  const pendingCookies = new Map<string, PendingCookie>();
  const authHeaders = new Headers();
  const supabase = createSupabaseSsrClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            pendingCookies.set(cookie.name, cookie);
          }

          for (const [key, value] of Object.entries(headers)) {
            authHeaders.set(key, value);
          }
        },
      },
    },
  );

  try {
    await supabase.auth.getClaims();
  } catch {
    // Authorization remains fail-closed in getUser()/profile guards even if a
    // transient Auth outage prevents a refresh in the proxy.
  }

  const requestHeaders = new Headers(request.headers);
  const serializedCookies = request.cookies.toString();

  if (serializedCookies) {
    requestHeaders.set("cookie", serializedCookies);
  } else {
    requestHeaders.delete("cookie");
  }

  return {
    requestHeaders,
    apply(response) {
      authHeaders.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") {
          response.headers.set(key, value);
        }
      });

      for (const { name, options, value } of pendingCookies.values()) {
        response.cookies.set(name, value, options);
      }

      return response;
    },
  };
}
