import "server-only";

import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export const PASSWORD_CHANGE_REQUIRED_KEY = "password_change_required";

export function userRequiresPasswordChange(user: User): boolean {
  return user.app_metadata?.[PASSWORD_CHANGE_REQUIRED_KEY] === true;
}

/**
 * O Auth do Supabase faz MERGE de `app_metadata`: chaves ausentes do payload
 * permanecem como estao. Omitir a chave nao a apaga — quem limpa e o valor
 * `null` explicito. Sem isso a marca de "troque a senha" nunca saia e a pessoa
 * era mandada de volta para /auth/set-password em todo login.
 */
export function passwordChangeMetadataPatch(required: boolean) {
  return { [PASSWORD_CHANGE_REQUIRED_KEY]: required ? true : null };
}

export async function setPasswordChangeRequired(
  user: User,
  required: boolean,
) {
  if (userRequiresPasswordChange(user) === required) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: passwordChangeMetadataPatch(required),
  });

  if (error) {
    throw new Error("Não foi possível atualizar o estado do fluxo de senha.", {
      cause: error,
    });
  }
}
