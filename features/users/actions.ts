"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";

import {
  isUserAlreadyRegistered,
  UsersRepositoryError,
} from "./repository";
import {
  inviteManagedUser,
  listManagedUsers,
  resendManagedUserAccess,
  updateManagedUser,
  UsersServiceError,
} from "./service";
import type {
  ManagedUserPage,
  UserAccessDeliveryResult,
  UserActionError,
  UserActionResult,
  UserMutationResult,
} from "./types";

function actionInput(
  value: unknown,
  options: { uncheckedIsFalse?: boolean } = {},
): Record<string, unknown> {
  if (value instanceof FormData) {
    const input: Record<string, unknown> = Object.fromEntries(
      Array.from(value.entries()).filter(
        ([key]) => !key.startsWith("$ACTION_"),
      ),
    );

    if (options.uncheckedIsFalse && !value.has("isActive")) {
      input.isActive = false;
    }

    return input;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }

  return {};
}

function validationError(error: ZodError): UserActionError {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]),
    ),
  );

  return {
    code: "VALIDATION_ERROR",
    message: "Revise os campos informados.",
    ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
  };
}

function safeActionError(error: unknown): UserActionError {
  if (error instanceof ZodError) return validationError(error);

  if (error instanceof AuthenticationRequiredError) {
    return {
      code: "AUTHENTICATION_REQUIRED",
      message: "Sua sessão expirou. Entre novamente.",
    };
  }

  if (error instanceof AuthorizationRequiredError) {
    return {
      code: "AUTHORIZATION_REQUIRED",
      message: "Somente um usuário master pode realizar esta operação.",
    };
  }

  if (error instanceof UsersServiceError) {
    return { code: error.code, message: error.message };
  }

  if (isUserAlreadyRegistered(error)) {
    return {
      code: "USER_EXISTS",
      message: "Já existe uma conta para este e-mail.",
    };
  }

  if (error instanceof UsersRepositoryError) {
    return error.source === "auth"
      ? {
          code: "AUTH_SERVICE_ERROR",
          message: "O serviço de autenticação não concluiu a operação.",
        }
      : {
          code: "DATABASE_ERROR",
          message: "Não foi possível concluir a operação agora.",
        };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Ocorreu um erro inesperado. Tente novamente.",
  };
}

async function runAction<T>(
  operation: () => Promise<T>,
  revalidate = false,
): Promise<UserActionResult<T>> {
  try {
    const data = await operation();
    if (revalidate) revalidatePath("/admin/users");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}

export async function listManagedUsersAction(
  input: unknown = {},
): Promise<UserActionResult<ManagedUserPage>> {
  return runAction(() => listManagedUsers(actionInput(input)));
}

export async function inviteManagedUserAction(
  input: unknown,
): Promise<UserActionResult<UserMutationResult>> {
  return runAction(
    () =>
      inviteManagedUser(
        actionInput(input, { uncheckedIsFalse: true }),
      ),
    true,
  );
}

export async function updateManagedUserAction(
  input: unknown,
): Promise<UserActionResult<UserMutationResult>> {
  return runAction(
    () =>
      updateManagedUser(
        actionInput(input, { uncheckedIsFalse: true }),
      ),
    true,
  );
}

export async function resendManagedUserAccessAction(
  input: unknown,
): Promise<UserActionResult<UserAccessDeliveryResult>> {
  return runAction(
    () => resendManagedUserAccess(actionInput(input)),
    true,
  );
}
