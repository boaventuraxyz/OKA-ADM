import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import {
  PASSWORD_CHANGE_REQUIRED_KEY,
  passwordChangeMetadataPatch,
  userRequiresPasswordChange,
} from "@/features/auth/password-flow";
import {
  authUserRequiresPasswordChange,
  updatePasswordChangeRequirement,
  type UsersAdminClient,
} from "@/features/users/repository";

function authUser(appMetadata: Record<string, unknown>): User {
  return {
    app_metadata: appMetadata,
    aud: "authenticated",
    created_at: "2026-08-01T00:00:00.000Z",
    id: "11111111-1111-4111-8111-111111111111",
    user_metadata: {},
  } as unknown as User;
}

function adminClientSpy(updated: User) {
  const updateUserById = vi.fn(async () => ({ data: { user: updated }, error: null }));
  return {
    client: { auth: { admin: { updateUserById } } } as unknown as UsersAdminClient,
    updateUserById,
  };
}

describe("marca de troca de senha obrigatória", () => {
  it("apaga a chave com null, porque o Supabase faz merge de app_metadata", () => {
    // Omitir a chave deixaria o valor antigo intacto no Auth.
    expect(passwordChangeMetadataPatch(false)).toEqual({
      [PASSWORD_CHANGE_REQUIRED_KEY]: null,
    });
    expect(
      Object.hasOwn(passwordChangeMetadataPatch(false), PASSWORD_CHANGE_REQUIRED_KEY),
    ).toBe(true);
  });

  it("marca a exigência com true", () => {
    expect(passwordChangeMetadataPatch(true)).toEqual({
      [PASSWORD_CHANGE_REQUIRED_KEY]: true,
    });
  });

  it("não envia outras chaves de app_metadata no patch", () => {
    for (const required of [true, false]) {
      expect(Object.keys(passwordChangeMetadataPatch(required))).toEqual([
        PASSWORD_CHANGE_REQUIRED_KEY,
      ]);
    }
  });

  it("lê a exigência do mesmo jeito nos dois módulos", () => {
    const pending = authUser({ [PASSWORD_CHANGE_REQUIRED_KEY]: true, provider: "email" });
    const settled = authUser({ provider: "email" });

    expect(userRequiresPasswordChange(pending)).toBe(true);
    expect(authUserRequiresPasswordChange(pending)).toBe(true);
    expect(userRequiresPasswordChange(settled)).toBe(false);
    expect(authUserRequiresPasswordChange(settled)).toBe(false);
  });

  it("limpa a exigência enviando null ao Auth", async () => {
    const pending = authUser({ [PASSWORD_CHANGE_REQUIRED_KEY]: true, provider: "email" });
    const cleared = authUser({ provider: "email" });
    const { client, updateUserById } = adminClientSpy(cleared);

    const result = await updatePasswordChangeRequirement(client, pending, false);

    expect(updateUserById).toHaveBeenCalledWith(pending.id, {
      app_metadata: { [PASSWORD_CHANGE_REQUIRED_KEY]: null },
    });
    expect(authUserRequiresPasswordChange(result)).toBe(false);
  });

  it("não chama o Auth quando o estado já é o desejado", async () => {
    const settled = authUser({ provider: "email" });
    const { client, updateUserById } = adminClientSpy(settled);

    await updatePasswordChangeRequirement(client, settled, false);

    expect(updateUserById).not.toHaveBeenCalled();
  });
});
