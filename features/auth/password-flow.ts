import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

const PASSWORD_CHANGE_REQUIRED_KEY = "password_change_required";

export function userRequiresPasswordChange(user: User): boolean {
  return user.app_metadata?.[PASSWORD_CHANGE_REQUIRED_KEY] === true;
}

export async function setPasswordChangeRequired(
  user: User,
  required: boolean,
) {
  if (userRequiresPasswordChange(user) === required) {
    return;
  }

  const appMetadata = { ...(user.app_metadata ?? {}) };
  delete appMetadata[PASSWORD_CHANGE_REQUIRED_KEY];
  const nextAppMetadata = required
    ? { ...appMetadata, [PASSWORD_CHANGE_REQUIRED_KEY]: true }
    : appMetadata;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: nextAppMetadata,
  });

  if (error) {
    throw new Error("Não foi possível atualizar o estado do fluxo de senha.", {
      cause: error,
    });
  }
}
