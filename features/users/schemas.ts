import { z } from "zod";

import { APP_ROLES, type AppRole } from "@/features/auth/types";

function booleanInput(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0" || value === "off") return false;
  return value;
}

export const managedUserIdSchema = z.string().uuid();

export const managedUserListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const normalizedEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

const displayNameSchema = z.string().trim().min(2).max(160);
const roleSchema = z.enum(APP_ROLES);
const isActiveSchema = z.preprocess(booleanInput, z.boolean());

export const inviteManagedUserSchema = z.strictObject({
  email: normalizedEmailSchema,
  displayName: displayNameSchema,
  role: roleSchema,
  isActive: isActiveSchema.default(false),
});

export const updateManagedUserSchema = z.strictObject({
  id: managedUserIdSchema,
  displayName: displayNameSchema,
  role: roleSchema,
  isActive: isActiveSchema,
});

export const resendUserAccessSchema = z.strictObject({
  id: managedUserIdSchema,
  mode: z.enum(["invite", "recovery"]),
});

export type ManagedUserListInput = z.infer<typeof managedUserListSchema>;
export type InviteManagedUserInput = z.infer<
  typeof inviteManagedUserSchema
>;
export type UpdateManagedUserInput = z.infer<
  typeof updateManagedUserSchema
>;
export type ResendUserAccessInput = z.infer<typeof resendUserAccessSchema>;

const applicationUrlSchema = z
  .string()
  .trim()
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    if (url.protocol !== "https:" && !localHttp) {
      context.addIssue({
        code: "custom",
        message: "A URL da aplicação deve usar HTTPS.",
      });
      return z.NEVER;
    }

    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    ) {
      context.addIssue({
        code: "custom",
        message: "A URL da aplicação deve conter somente a origem.",
      });
      return z.NEVER;
    }

    return url.origin;
  });

/** Builds the only redirect accepted by user invitation/recovery operations. */
export function buildManagedUserAuthRedirect(appUrl: unknown): string {
  const origin = applicationUrlSchema.parse(appUrl);
  return `${origin}/auth/callback?next=/auth/set-password`;
}

export type ProfileTransitionRuleInput = {
  actorId: string;
  targetId: string;
  currentRole: AppRole;
  currentIsActive: boolean;
  nextRole: AppRole;
  nextIsActive: boolean;
  activeMasterCount: number;
};

export type ProfileTransitionViolation =
  | "LAST_ACTIVE_MASTER"
  | "SELF_DEACTIVATION";

/**
 * Pure policy used before a profile update. A post-update master count in the
 * service complements this check to close ordinary concurrent-update races.
 */
export function profileTransitionViolation(
  input: ProfileTransitionRuleInput,
): ProfileTransitionViolation | null {
  if (input.actorId === input.targetId && !input.nextIsActive) {
    return "SELF_DEACTIVATION";
  }

  const removesActiveMaster =
    input.currentRole === "master" &&
    input.currentIsActive &&
    (input.nextRole !== "master" || !input.nextIsActive);

  if (removesActiveMaster && input.activeMasterCount <= 1) {
    return "LAST_ACTIVE_MASTER";
  }

  return null;
}
