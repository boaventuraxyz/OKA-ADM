import { describe, expect, it } from "vitest";

import {
  buildManagedUserAuthRedirect,
  inviteManagedUserSchema,
  managedUserListSchema,
  profileTransitionViolation,
  updateManagedUserSchema,
} from "@/features/users/schemas";

const MASTER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

describe("schemas de usuários gerenciados", () => {
  it("normaliza o convite, limita paginação e não aceita senha", () => {
    expect(
      inviteManagedUserSchema.parse({
        email: "  ADMIN@EXAMPLE.COM ",
        displayName: "  Pessoa Administradora  ",
        role: "admin",
      }),
    ).toEqual({
      email: "admin@example.com",
      displayName: "Pessoa Administradora",
      role: "admin",
      isActive: false,
    });

    expect(
      inviteManagedUserSchema.safeParse({
        email: "admin@example.com",
        displayName: "Pessoa Administradora",
        role: "admin",
        password: "não deve ser aceito",
      }).success,
    ).toBe(false);
    expect(
      managedUserListSchema.safeParse({ pageSize: 51 }).success,
    ).toBe(false);
  });

  it("aceita checkbox explícito, mas rejeita campos de autorização extras", () => {
    expect(
      updateManagedUserSchema.parse({
        id: OTHER_ID,
        displayName: "Pessoa Editora",
        role: "editor",
        isActive: "on",
      }).isActive,
    ).toBe(true);

    expect(
      updateManagedUserSchema.safeParse({
        id: OTHER_ID,
        displayName: "Pessoa Editora",
        role: "editor",
        isActive: true,
        app_metadata: { role: "master" },
      }).success,
    ).toBe(false);
  });
});

describe("regras críticas de usuários", () => {
  it("impede auto-desativação", () => {
    expect(
      profileTransitionViolation({
        actorId: MASTER_ID,
        targetId: MASTER_ID,
        currentRole: "master",
        currentIsActive: true,
        nextRole: "master",
        nextIsActive: false,
        activeMasterCount: 2,
      }),
    ).toBe("SELF_DEACTIVATION");
  });

  it("impede rebaixar o último master ativo e permite quando há outro", () => {
    const transition = {
      actorId: MASTER_ID,
      targetId: MASTER_ID,
      currentRole: "master" as const,
      currentIsActive: true,
      nextRole: "admin" as const,
      nextIsActive: true,
    };

    expect(
      profileTransitionViolation({
        ...transition,
        activeMasterCount: 1,
      }),
    ).toBe("LAST_ACTIVE_MASTER");
    expect(
      profileTransitionViolation({
        ...transition,
        activeMasterCount: 2,
      }),
    ).toBeNull();
  });

  it("constrói somente o callback seguro na origem configurada", () => {
    expect(buildManagedUserAuthRedirect("https://admin.example.com/"))
      .toBe(
        "https://admin.example.com/auth/callback?next=/auth/set-password",
      );
    expect(buildManagedUserAuthRedirect("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/callback?next=/auth/set-password",
    );
    expect(() =>
      buildManagedUserAuthRedirect("http://admin.example.com"),
    ).toThrow();
    expect(() =>
      buildManagedUserAuthRedirect("https://admin.example.com/tenant"),
    ).toThrow();
    expect(() =>
      buildManagedUserAuthRedirect("https://user:secret@admin.example.com"),
    ).toThrow();
  });
});
