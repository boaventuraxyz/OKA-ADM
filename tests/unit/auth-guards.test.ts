import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentAuthContext } from "@/features/auth/service";
import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
  requireActiveProfile,
  requireRole,
} from "@/features/auth/guards";
import type { AppRole, AuthContext } from "@/features/auth/types";

vi.mock("@/features/auth/service", () => ({
  getCurrentAuthContext: vi.fn(),
}));

const mockedGetCurrentAuthContext = vi.mocked(getCurrentAuthContext);

function authContext({
  active = true,
  passwordChangeRequired = false,
  role = "editor",
}: {
  active?: boolean;
  passwordChangeRequired?: boolean;
  role?: AppRole;
} = {}): AuthContext {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "pessoa@example.com",
      passwordChangeRequired,
      phone: null,
    },
    profile: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "pessoa@example.com",
      displayName: "Pessoa",
      role,
      isActive: active,
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
    },
  };
}

describe("guards de autenticação", () => {
  beforeEach(() => {
    mockedGetCurrentAuthContext.mockReset();
  });

  it("rejeita sessão ausente", async () => {
    mockedGetCurrentAuthContext.mockResolvedValue(null);

    await expect(requireActiveProfile()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
  });

  it("rejeita perfil inativo e troca obrigatória de senha", async () => {
    mockedGetCurrentAuthContext.mockResolvedValueOnce(
      authContext({ active: false }),
    );
    await expect(requireActiveProfile()).rejects.toBeInstanceOf(
      AuthorizationRequiredError,
    );

    mockedGetCurrentAuthContext.mockResolvedValueOnce(
      authContext({ passwordChangeRequired: true }),
    );
    await expect(requireActiveProfile()).rejects.toBeInstanceOf(
      AuthorizationRequiredError,
    );
  });

  it("aplica papel somente depois de validar o contexto ativo", async () => {
    mockedGetCurrentAuthContext.mockResolvedValueOnce(
      authContext({ role: "admin" }),
    );
    await expect(requireRole(["master", "admin"])).resolves.toMatchObject({
      profile: { role: "admin" },
    });

    mockedGetCurrentAuthContext.mockResolvedValueOnce(
      authContext({ role: "editor" }),
    );
    await expect(requireRole(["master", "admin"])).rejects.toBeInstanceOf(
      AuthorizationRequiredError,
    );
  });
});
