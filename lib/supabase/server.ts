import "server-only";

import { createServerClient as createSupabaseSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseServerEnv } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

type AuthResponseHeaders = Readonly<Record<string, string>>;

export type CreateServerClientOptions = {
  /**
   * Route Handlers can copy the cache-control headers emitted during an auth
   * cookie refresh onto their response.
   */
  onAuthHeaders?: (headers: AuthResponseHeaders) => void;
};

function isReadOnlyCookieStoreError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Cookies can only be modified")
  );
}

/** Creates a fresh cookie-backed Supabase client for the current request. */
export async function createServerClient(
  options: CreateServerClientOptions = {},
) {
  const env = getSupabaseServerEnv();
  const cookieStore = await cookies();

  return createSupabaseSsrClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          options.onAuthHeaders?.(headers);

          try {
            for (const { name, value, options: cookieOptions } of cookiesToSet) {
              cookieStore.set(name, value, cookieOptions);
            }
          } catch (error) {
            // Server Components cannot write cookies. Route Handlers and Server
            // Actions can; a future proxy integration will refresh sessions for
            // read-only renders.
            if (!isReadOnlyCookieStoreError(error)) {
              throw error;
            }
          }
        },
      },
    },
  );
}
