"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z, ZodError } from "zod";

import { getSupabaseServerEnv } from "@/config/env";
import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
  requireActiveProfile,
} from "@/features/auth/guards";
import {
  CAMPAIGN_VIDEO_BUCKET,
  CAMPAIGN_VIDEO_MIME_TYPES,
  campaignVideoBucketNeedsUpdate,
  MAX_CAMPAIGN_VIDEO_BYTES,
  MAX_CAMPAIGN_VIDEOS,
} from "@/lib/campaign-video-carousel";
import { campaignCacheTag } from "@/lib/public-campaign";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  CampaignRepositoryError,
  isCampaignCheckViolation,
} from "./repository";
import {
  archiveCampaign,
  CampaignServiceError,
  createCampaign,
  duplicateCampaign,
  publishCampaign,
  unpublishCampaign,
  updateCampaign,
} from "./service";
import type {
  ActionResult,
  CampaignActionError,
  CampaignMutationResult,
} from "./types";

const campaignVideoUploadFileSchema = z.object({
  contentType: z.enum(CAMPAIGN_VIDEO_MIME_TYPES),
  size: z.number().int().positive().max(MAX_CAMPAIGN_VIDEO_BYTES),
});

const campaignVideoUploadSchema = z.object({
  files: z.array(campaignVideoUploadFileSchema).min(1).max(MAX_CAMPAIGN_VIDEOS),
});

export type CampaignVideoUploadTicket = {
  bucket: string;
  path: string;
  publicUrl: string;
  publishableKey: string;
  supabaseUrl: string;
  token: string;
};

class CampaignVideoStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CampaignVideoStorageError";
  }
}

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

  if (isCampaignCheckViolation(error)) {
    return {
      code: "CONSTRAINT_REJECTED",
      message:
        "O banco recusou um valor da campanha por restrição. Se o tema escolhido é um dos mais recentes, as migrações pendentes do banco ainda não foram aplicadas.",
    };
  }

  if (error instanceof CampaignRepositoryError) {
    return {
      code: "DATABASE_ERROR",
      message: "Não foi possível concluir a operação agora.",
    };
  }

  if (error instanceof CampaignVideoStorageError) {
    return {
      code: "VIDEO_STORAGE_ERROR",
      message: error.message,
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
  if (result.slug) {
    revalidatePath(`/f/${result.slug}`);
    revalidatePath(`/formulario/${result.slug}`);
  }
}

function storageResourceMissing(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { message?: unknown; status?: unknown; statusCode?: unknown };
  return value.status === 404 || value.statusCode === "404" ||
    (typeof value.message === "string" && /not found/i.test(value.message));
}

async function ensureCampaignVideoBucket() {
  const admin = createAdminClient();
  const { data: bucket, error: bucketError } = await admin.storage.getBucket(
    CAMPAIGN_VIDEO_BUCKET,
  );
  const bucketOptions = {
    allowedMimeTypes: [...CAMPAIGN_VIDEO_MIME_TYPES],
    fileSizeLimit: MAX_CAMPAIGN_VIDEO_BYTES,
    public: true,
  };

  if (bucketError) {
    if (!storageResourceMissing(bucketError)) {
      throw new CampaignVideoStorageError(
        "Não foi possível acessar o armazenamento de vídeos.",
        { cause: bucketError },
      );
    }
    const { error: createError } = await admin.storage.createBucket(
      CAMPAIGN_VIDEO_BUCKET,
      bucketOptions,
    );
    if (createError) {
      throw new CampaignVideoStorageError(
        "Não foi possível preparar o armazenamento de vídeos.",
        { cause: createError },
      );
    }
  } else if (campaignVideoBucketNeedsUpdate(bucket)) {
    const { error: updateError } = await admin.storage.updateBucket(
      CAMPAIGN_VIDEO_BUCKET,
      bucketOptions,
    );
    if (updateError) {
      throw new CampaignVideoStorageError(
        "Não foi possível atualizar o armazenamento de vídeos.",
        { cause: updateError },
      );
    }
  }

  return admin;
}

export async function createCampaignVideoUploadTicketsAction(
  input: unknown,
): Promise<ActionResult<CampaignVideoUploadTicket[]>> {
  try {
    const context = await requireActiveProfile();
    const parsed = campaignVideoUploadSchema.parse(input);
    const admin = await ensureCampaignVideoBucket();
    const env = getSupabaseServerEnv();
    const tickets = await Promise.all(
      parsed.files.map(async (file): Promise<CampaignVideoUploadTicket> => {
        const extension = {
          "video/mp4": "mp4",
          "video/quicktime": "mov",
          "video/webm": "webm",
        }[file.contentType];
        const path = `${context.user.id}/${crypto.randomUUID()}.${extension}`;
        const { data, error } = await admin.storage
          .from(CAMPAIGN_VIDEO_BUCKET)
          .createSignedUploadUrl(path);
        if (error || !data?.token) {
          throw new CampaignVideoStorageError(
            "Não foi possível preparar o envio dos vídeos.",
            { cause: error || undefined },
          );
        }

        const { data: publicData } = admin.storage
          .from(CAMPAIGN_VIDEO_BUCKET)
          .getPublicUrl(path);

        return {
          bucket: CAMPAIGN_VIDEO_BUCKET,
          path,
          publicUrl: publicData.publicUrl,
          publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
          supabaseUrl: env.SUPABASE_URL,
          token: data.token,
        };
      }),
    );

    return {
      ok: true,
      data: tickets,
    };
  } catch (error) {
    return { ok: false, error: safeActionError(error) };
  }
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
    updateCampaign(
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
