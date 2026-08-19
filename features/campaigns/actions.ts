"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ZodError } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import { campaignCacheTag } from "@/lib/public-campaign";

import { CampaignRepositoryError } from "./repository";
import {
  archiveCampaign,
  CampaignServiceError,
  createCampaign,
  duplicateCampaign,
  publishCampaign,
  unpublishCampaign,
  updateCampaignDraft,
} from "./service";
import type {
  ActionResult,
  CampaignActionError,
  CampaignMutationResult,
} from "./types";

function actionInput(value: unknown): Record<string, unknown> {
  if (value instanceof FormData) {
    return Object.fromEntries(
      Array.from(value.entries()).filter(
        ([key]) => !key.startsWith("$ACTION_"),
      ),
    );
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }

  return {};
}

function idFromActionInput(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof FormData) return value.get("id");
  if (typeof value === "object" && value !== null && "id" in value) {
    return (value as { id?: unknown }).id;
  }
  return undefined;
}

function mutationInputWithoutId(value: unknown) {
  const input = actionInput(value);
  delete input.id;
  delete input.expected_updated_at;
  return input;
}

function expectedUpdatedAtFromActionInput(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "expected_updated_at" in value
  ) {
    return (value as { expected_updated_at?: unknown }).expected_updated_at;
  }

  if (value instanceof FormData) return value.get("expected_updated_at");
  return undefined;
}

function validationError(error: ZodError): CampaignActionError {
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

function safeActionError(error: unknown): CampaignActionError {
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
      message: "Você não tem permissão para esta operação.",
    };
  }

  if (error instanceof CampaignServiceError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof CampaignRepositoryError) {
    return {
      code: "DATABASE_ERROR",
      message: "Não foi possível concluir a operação agora.",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Ocorreu um erro inesperado. Tente novamente.",
  };
}

function revalidateCampaign(result: CampaignMutationResult) {
  updateTag(campaignCacheTag(result.id));
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/campaigns");
  revalidatePath(`/admin/campaigns/${result.id}/edit`);
  revalidatePath("/campanhas");
  revalidatePath(`/campanhas/${result.id}/editar`);
  if (result.slug) revalidatePath(`/formulario/${result.slug}`);
}

async function runCampaignAction(
  operation: () => Promise<CampaignMutationResult>,
): Promise<ActionResult<CampaignMutationResult>> {
  try {
    const data = await operation();
    revalidateCampaign(data);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
}

export async function createCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() => createCampaign(actionInput(input)));
}

export async function updateCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() =>
    updateCampaignDraft(
      idFromActionInput(input),
      mutationInputWithoutId(input),
      expectedUpdatedAtFromActionInput(input),
    ),
  );
}

export async function publishCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() => publishCampaign(idFromActionInput(input)));
}

export async function unpublishCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() => unpublishCampaign(idFromActionInput(input)));
}

export async function archiveCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() => archiveCampaign(idFromActionInput(input)));
}

export async function duplicateCampaignAction(
  input: unknown,
): Promise<ActionResult<CampaignMutationResult>> {
  return runCampaignAction(() => duplicateCampaign(idFromActionInput(input)));
}
