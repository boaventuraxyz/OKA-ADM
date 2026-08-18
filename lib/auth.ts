import "server-only";

import { redirect } from "next/navigation";

import { hasMinimumRole } from "@/features/auth/guards";
import { getCurrentAuthContext } from "@/features/auth/service";
import type { ActiveAuthContext } from "@/features/auth/types";

function isAuthorized(
  context: Awaited<ReturnType<typeof getCurrentAuthContext>>,
): context is ActiveAuthContext {
  return Boolean(
    context?.profile?.isActive &&
      !context.user.passwordChangeRequired &&
      hasMinimumRole(context.profile.role, "editor"),
  );
}

/** Compatibility adapter used by the existing admin routes and actions. */
export async function isAuthenticated(): Promise<boolean> {
  try {
    return isAuthorized(await getCurrentAuthContext());
  } catch {
    return false;
  }
}

/**
 * Keeps the existing guard contract while delegating identity and RBAC to
 * Supabase Auth and public.profiles.
 */
export async function requireAdmin(): Promise<ActiveAuthContext> {
  let context: Awaited<ReturnType<typeof getCurrentAuthContext>>;

  try {
    context = await getCurrentAuthContext();
  } catch {
    redirect("/login?erro=indisponivel");
  }

  if (!context) {
    redirect("/login");
  }

  if (context.user.passwordChangeRequired) {
    redirect("/auth/set-password");
  }

  if (!isAuthorized(context)) {
    redirect("/login?erro=acesso");
  }

  return context;
}
