import "server-only";

import type {
  AuthError,
  PostgrestError,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

import {
  PASSWORD_CHANGE_REQUIRED_KEY,
  passwordChangeMetadataPatch,
} from "@/features/auth/password-flow";
import type { Database } from "@/lib/supabase/database.types";

import type { UserProfileRow } from "./types";

export type UsersAdminClient = SupabaseClient<Database>;

type RepositoryErrorSource = "auth" | "database";

export class UsersRepositoryError extends Error {
  readonly authCode?: string;
  readonly operation: string;
  readonly source: RepositoryErrorSource;
  readonly status?: number;

  constructor(
    operation: string,
    source: RepositoryErrorSource,
    error: Error,
  ) {
    super("Não foi possível acessar os dados de usuários.", { cause: error });
    this.name = "UsersRepositoryError";
    this.authCode =
      source === "auth" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;
    this.operation = operation;
    this.source = source;
    this.status =
      "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
  }
}

function databaseError(operation: string, error: PostgrestError | null) {
  if (error) {
    throw new UsersRepositoryError(operation, "database", error);
  }
}

function authError(operation: string, error: AuthError | null) {
  if (error) throw new UsersRepositoryError(operation, "auth", error);
}

function repositoryInvariant(
  operation: string,
  source: RepositoryErrorSource,
): never {
  throw new UsersRepositoryError(
    operation,
    source,
    new Error("Resposta inesperada do serviço."),
  );
}

export function isUserAlreadyRegistered(error: unknown): boolean {
  return (
    error instanceof UsersRepositoryError &&
    error.source === "auth" &&
    error.operation === "invite" &&
    (error.authCode === "email_exists" ||
      error.authCode === "user_already_exists" ||
      error.status === 422)
  );
}

export async function listAuthUsers(
  client: UsersAdminClient,
  page: number,
  pageSize: number,
): Promise<{ users: User[]; total: number }> {
  const { data, error } = await client.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  authError("list-auth-users", error);

  return {
    users: data.users,
    total:
      "total" in data && typeof data.total === "number"
        ? data.total
        : data.users.length,
  };
}

export async function listProfileRowsByIds(
  client: UsersAdminClient,
  ids: string[],
): Promise<UserProfileRow[]> {
  if (ids.length === 0) return [];

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .in("id", ids);

  databaseError("list-profiles", error);
  return data ?? [];
}

export async function getProfileRow(
  client: UsersAdminClient,
  id: string,
): Promise<UserProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  databaseError("get-profile", error);
  return data;
}

export async function countActiveMasters(
  client: UsersAdminClient,
): Promise<number> {
  const { count, error } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "master")
    .eq("is_active", true);

  databaseError("count-active-masters", error);
  return count ?? 0;
}

export async function inviteAuthUser(
  client: UsersAdminClient,
  email: string,
  redirectTo: string,
): Promise<User> {
  // Deliberately omit `data`: that option writes user_metadata, which is not
  // an authorization source and must not carry roles or activation state.
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  authError("invite", error);

  if (!data.user) {
    repositoryInvariant("invite", "auth");
  }

  return data.user;
}

export async function getAuthUserById(
  client: UsersAdminClient,
  id: string,
): Promise<User | null> {
  const { data, error } = await client.auth.admin.getUserById(id);

  if (error?.code === "user_not_found" || error?.status === 404) return null;
  authError("get-auth-user", error);
  return data.user;
}

export function authUserRequiresPasswordChange(user: User): boolean {
  return user.app_metadata?.[PASSWORD_CHANGE_REQUIRED_KEY] === true;
}

export async function updatePasswordChangeRequirement(
  client: UsersAdminClient,
  user: User,
  required: boolean,
): Promise<User> {
  if (authUserRequiresPasswordChange(user) === required) return user;

  const { data, error } = await client.auth.admin.updateUserById(user.id, {
    app_metadata: passwordChangeMetadataPatch(required),
  });

  authError("update-password-requirement", error);

  if (!data.user) {
    repositoryInvariant("update-password-requirement", "auth");
  }

  return data.user;
}

export async function upsertProfileRow(
  client: UsersAdminClient,
  input: {
    id: string;
    email: string;
    displayName: string;
    role: UserProfileRow["role"];
    isActive: boolean;
  },
): Promise<UserProfileRow> {
  const { data, error } = await client
    .from("profiles")
    .upsert(
      {
        id: input.id,
        email: input.email,
        display_name: input.displayName,
        role: input.role,
        is_active: input.isActive,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  databaseError("upsert-profile", error);
  if (!data) repositoryInvariant("upsert-profile", "database");
  return data;
}

export async function updateProfileRow(
  client: UsersAdminClient,
  current: UserProfileRow,
  input: Pick<UserProfileRow, "display_name" | "is_active" | "role">,
): Promise<UserProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .update(input)
    .eq("id", current.id)
    .eq("updated_at", current.updated_at)
    .select("*")
    .maybeSingle();

  databaseError("update-profile", error);
  return data;
}

export async function resendAuthInvite(
  client: UsersAdminClient,
  email: string,
  redirectTo: string,
): Promise<User> {
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  authError("resend-invite", error);

  if (!data.user) {
    repositoryInvariant("resend-invite", "auth");
  }

  return data.user;
}

export async function sendPasswordRecovery(
  client: UsersAdminClient,
  email: string,
  redirectTo: string,
): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  authError("send-recovery", error);
}
