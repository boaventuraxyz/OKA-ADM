import "server-only";

import type { User } from "@supabase/supabase-js";

import { requireRole } from "@/features/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  buildManagedUserAuthRedirect,
  inviteManagedUserSchema,
  managedUserListSchema,
  profileTransitionViolation,
  resendUserAccessSchema,
  updateManagedUserSchema,
} from "./schemas";
import {
  authUserRequiresPasswordChange,
  countActiveMasters,
  getAuthUserById,
  getProfileRow,
  inviteAuthUser,
  listAuthUsers,
  listProfileRowsByIds,
  resendAuthInvite,
  sendPasswordRecovery,
  updatePasswordChangeRequirement,
  updateProfileRow,
  upsertProfileRow,
  type UsersAdminClient,
} from "./repository";
import type {
  ManagedUser,
  ManagedUserPage,
  UserAccessDeliveryResult,
  UserMutationResult,
  UserProfileRow,
} from "./types";

const MASTER_ONLY = ["master"] as const;

export type UsersServiceErrorCode =
  | "CONFIGURATION_ERROR"
  | "DELIVERY_MODE_MISMATCH"
  | "LAST_ACTIVE_MASTER"
  | "NOT_FOUND"
  | "PROFILE_MISSING"
  | "SELF_DEACTIVATION"
  | "STATE_CONFLICT";

export class UsersServiceError extends Error {
  readonly code: UsersServiceErrorCode;

  constructor(
    code: UsersServiceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UsersServiceError";
    this.code = code;
  }
}

function authRedirect(): string {
  try {
    return buildManagedUserAuthRedirect(process.env.APP_URL);
  } catch (error) {
    throw new UsersServiceError(
      "CONFIGURATION_ERROR",
      "A URL segura da aplicação não está configurada.",
      { cause: error },
    );
  }
}

function mutationResult(row: UserProfileRow): UserMutationResult {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

function isConfirmed(user: {
  confirmed_at?: string;
  email_confirmed_at?: string;
}): boolean {
  return Boolean(user.confirmed_at ?? user.email_confirmed_at);
}

export async function listManagedUsers(
  input: unknown = {},
): Promise<ManagedUserPage> {
  await requireRole(MASTER_ONLY);
  const params = managedUserListSchema.parse(input);
  const client = createAdminClient();
  const { users, total } = await listAuthUsers(
    client,
    params.page,
    params.pageSize,
  );
  const profiles = await listProfileRowsByIds(
    client,
    users.map((user) => user.id),
  );
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const items: ManagedUser[] = users.map((user) => {
    const profile = profilesById.get(user.id) ?? null;

    return {
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      displayName: profile?.display_name ?? null,
      // Authorization fields deliberately have no Auth metadata fallback.
      role: profile?.role ?? null,
      isActive: profile?.is_active ?? false,
      profileExists: Boolean(profile),
      passwordChangeRequired: authUserRequiresPasswordChange(user),
      invitedAt: user.invited_at ?? null,
      confirmedAt: user.confirmed_at ?? user.email_confirmed_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
      profileUpdatedAt: profile?.updated_at ?? null,
    };
  });

  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.ceil(total / params.pageSize),
    total,
  };
}

export async function inviteManagedUser(
  input: unknown,
): Promise<UserMutationResult> {
  await requireRole(MASTER_ONLY);
  const parsed = inviteManagedUserSchema.parse(input);
  const redirectTo = authRedirect();
  const client = createAdminClient();
  const user = await inviteAuthUser(client, parsed.email, redirectTo);

  // The marker is server-controlled app_metadata. Roles and activation are
  // persisted only in the profile below.
  await updatePasswordChangeRequirement(client, user, true);

  const row = await upsertProfileRow(client, {
    id: user.id,
    email: parsed.email,
    displayName: parsed.displayName,
    role: parsed.role,
    isActive: parsed.isActive,
  });

  return mutationResult(row);
}

function transitionError(code: "LAST_ACTIVE_MASTER" | "SELF_DEACTIVATION") {
  if (code === "SELF_DEACTIVATION") {
    return new UsersServiceError(
      code,
      "Você não pode desativar o próprio acesso.",
    );
  }

  return new UsersServiceError(
    code,
    "Mantenha ao menos um usuário master ativo.",
  );
}

async function restoreProfileAfterInvariantFailure(
  client: UsersAdminClient,
  original: UserProfileRow,
  changed: UserProfileRow,
) {
  const restored = await updateProfileRow(client, changed, {
    display_name: original.display_name,
    role: original.role,
    is_active: original.is_active,
  });

  if (!restored) {
    throw new UsersServiceError(
      "STATE_CONFLICT",
      "O perfil mudou durante a verificação. Atualize a lista antes de tentar novamente.",
    );
  }
}

export async function updateManagedUser(
  input: unknown,
): Promise<UserMutationResult> {
  const context = await requireRole(MASTER_ONLY);
  const parsed = updateManagedUserSchema.parse(input);
  const client = createAdminClient();
  const current = await getProfileRow(client, parsed.id);

  if (!current) {
    throw new UsersServiceError("NOT_FOUND", "Usuário não encontrado.");
  }

  const activeMasterCount = await countActiveMasters(client);
  const violation = profileTransitionViolation({
    actorId: context.user.id,
    targetId: current.id,
    currentRole: current.role,
    currentIsActive: current.is_active,
    nextRole: parsed.role,
    nextIsActive: parsed.isActive,
    activeMasterCount,
  });

  if (violation) throw transitionError(violation);

  const row = await updateProfileRow(client, current, {
    display_name: parsed.displayName,
    role: parsed.role,
    is_active: parsed.isActive,
  });

  if (!row) {
    throw new UsersServiceError(
      "STATE_CONFLICT",
      "O perfil mudou durante a operação. Atualize a lista antes de tentar novamente.",
    );
  }

  const removedActiveMaster =
    current.role === "master" &&
    current.is_active &&
    (row.role !== "master" || !row.is_active);

  if (removedActiveMaster && (await countActiveMasters(client)) === 0) {
    await restoreProfileAfterInvariantFailure(client, current, row);
    throw transitionError("LAST_ACTIVE_MASTER");
  }

  return mutationResult(row);
}

async function rollbackPasswordRequirement(
  client: UsersAdminClient,
  user: User,
  wasRequired: boolean,
) {
  if (!wasRequired) {
    await updatePasswordChangeRequirement(client, user, false);
  }
}

export async function resendManagedUserAccess(
  input: unknown,
): Promise<UserAccessDeliveryResult> {
  await requireRole(MASTER_ONLY);
  const parsed = resendUserAccessSchema.parse(input);
  const redirectTo = authRedirect();
  const client = createAdminClient();
  const [user, profile] = await Promise.all([
    getAuthUserById(client, parsed.id),
    getProfileRow(client, parsed.id),
  ]);

  if (!user) {
    throw new UsersServiceError("NOT_FOUND", "Usuário não encontrado.");
  }
  if (!profile) {
    throw new UsersServiceError(
      "PROFILE_MISSING",
      "O usuário não possui um perfil de autorização válido.",
    );
  }
  if (!user.email) {
    throw new UsersServiceError(
      "DELIVERY_MODE_MISMATCH",
      "O usuário não possui um e-mail apto para este fluxo.",
    );
  }

  const confirmed = isConfirmed(user);
  if (
    (parsed.mode === "invite" && confirmed) ||
    (parsed.mode === "recovery" && !confirmed)
  ) {
    throw new UsersServiceError(
      "DELIVERY_MODE_MISMATCH",
      confirmed
        ? "Use a recuperação de senha para um usuário já confirmado."
        : "Use o reenvio de convite para um usuário ainda não confirmado.",
    );
  }

  const wasRequired = authUserRequiresPasswordChange(user);
  const markedUser = await updatePasswordChangeRequirement(client, user, true);

  try {
    if (parsed.mode === "invite") {
      const invitedUser = await resendAuthInvite(
        client,
        user.email,
        redirectTo,
      );

      if (invitedUser.id !== user.id) {
        throw new UsersServiceError(
          "STATE_CONFLICT",
          "O estado do convite mudou. Atualize a lista antes de tentar novamente.",
        );
      }
    } else {
      await sendPasswordRecovery(client, user.email, redirectTo);
    }
  } catch (error) {
    try {
      await rollbackPasswordRequirement(client, markedUser, wasRequired);
    } catch {
      // The fail-closed marker is safer than masking the original delivery
      // failure with a second error.
    }
    throw error;
  }

  return { id: user.id, delivery: parsed.mode };
}
