import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  APP_ROLES,
  type AuthContext,
  type AuthProfile,
  type AuthUser,
} from "./types";
import { userRequiresPasswordChange } from "./password-flow";

const profileRowSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable(),
    display_name: z.string().nullable(),
    role: z.enum(APP_ROLES),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export class AuthServiceError extends Error {
  readonly code = "AUTH_SERVICE_UNAVAILABLE";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthServiceError";
  }
}

function isMissingOrInvalidSession(error: { name?: string; status?: number }) {
  return error.name === "AuthSessionMissingError" || error.status === 401;
}

function mapUser(user: User): AuthUser {
  // The identity comes from the remote Auth server response. user_metadata is
  // intentionally not read because users can modify it themselves.
  return {
    id: user.id,
    email: user.email ?? null,
    passwordChangeRequired: userRequiresPasswordChange(user),
    phone: user.phone ?? null,
  };
}

function mapProfile(row: z.infer<typeof profileRowSchema>): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Resolves the current identity remotely with auth.getUser(), then reads the
 * authorization profile through the user's RLS-scoped client.
 */
export async function getAuthContext(
  supabase: SupabaseClient<Database>,
): Promise<AuthContext | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingOrInvalidSession(userError)) {
      return null;
    }

    throw new AuthServiceError("Não foi possível validar a sessão atual.", {
      cause: userError,
    });
  }

  if (!user) {
    return null;
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, role, is_active, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthServiceError("Não foi possível carregar o perfil de acesso.", {
      cause: profileError,
    });
  }

  if (!profileRow) {
    return {
      user: mapUser(user),
      profile: null,
    };
  }

  const parsedProfile = profileRowSchema.safeParse(profileRow);

  if (!parsedProfile.success) {
    throw new AuthServiceError("O perfil de acesso possui formato inválido.", {
      cause: parsedProfile.error,
    });
  }

  return {
    user: mapUser(user),
    profile: mapProfile(parsedProfile.data),
  };
}

export async function getCurrentAuthContext(): Promise<AuthContext | null> {
  return getAuthContext(await createServerClient());
}
