import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminEnv } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Creates a request-scoped administrative client.
 *
 * This client bypasses RLS and must never be imported by Client Components or
 * used as a substitute for authorization checks.
 */
export function createAdminClient() {
  const env = getSupabaseAdminEnv();

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
