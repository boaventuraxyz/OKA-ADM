import "server-only";

import { getCurrentAuthContext } from "./service";
import type {
  ActiveAuthContext,
  AppRole,
  AuthContext,
} from "./types";

const ROLE_LEVEL: Readonly<Record<AppRole, number>> = {
  editor: 10,
  admin: 20,
  master: 30,
};

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";
  readonly status = 401;

  constructor() {
    super("Autenticação necessária.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationRequiredError extends Error {
  readonly code = "AUTHORIZATION_REQUIRED";
  readonly status = 403;

  constructor() {
    super("Usuário sem permissão para esta operação.");
    this.name = "AuthorizationRequiredError";
  }
}

export function hasMinimumRole(role: AppRole, minimumRole: AppRole): boolean {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}

export async function requireAuthenticated(): Promise<AuthContext> {
  const context = await getCurrentAuthContext();

  if (!context) {
    throw new AuthenticationRequiredError();
  }

  return context;
}

export async function requireActiveProfile(): Promise<ActiveAuthContext> {
  const context = await requireAuthenticated();

  if (!context.profile?.isActive || context.user.passwordChangeRequired) {
    throw new AuthorizationRequiredError();
  }

  return context as ActiveAuthContext;
}

export async function requireRole(
  allowedRoles: readonly AppRole[],
): Promise<ActiveAuthContext> {
  const context = await requireActiveProfile();

  if (!allowedRoles.includes(context.profile.role)) {
    throw new AuthorizationRequiredError();
  }

  return context;
}

export async function requireMinimumRole(
  minimumRole: AppRole,
): Promise<ActiveAuthContext> {
  const context = await requireActiveProfile();

  if (!hasMinimumRole(context.profile.role, minimumRole)) {
    throw new AuthorizationRequiredError();
  }

  return context;
}
