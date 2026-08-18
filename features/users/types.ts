import type { AppRole } from "@/features/auth/types";
import type { Database } from "@/lib/supabase/database.types";

export type UserProfileRow =
  Database["public"]["Tables"]["profiles"]["Row"];

export type ManagedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: AppRole | null;
  isActive: boolean;
  profileExists: boolean;
  passwordChangeRequired: boolean;
  invitedAt: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  profileUpdatedAt: string | null;
};

export type ManagedUserPage = {
  items: ManagedUser[];
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type UserMutationResult = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: AppRole;
  isActive: boolean;
  updatedAt: string;
};

export type UserAccessDeliveryResult = {
  id: string;
  delivery: "invite" | "recovery";
};

export type UserActionErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_REQUIRED"
  | "AUTH_SERVICE_ERROR"
  | "CONFIGURATION_ERROR"
  | "DATABASE_ERROR"
  | "DELIVERY_MODE_MISMATCH"
  | "INTERNAL_ERROR"
  | "LAST_ACTIVE_MASTER"
  | "NOT_FOUND"
  | "PROFILE_MISSING"
  | "SELF_DEACTIVATION"
  | "STATE_CONFLICT"
  | "USER_EXISTS"
  | "VALIDATION_ERROR";

export type UserActionError = {
  code: UserActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type UserActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: UserActionError };
