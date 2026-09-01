import "server-only";

import { randomUUID } from "node:crypto";

import { requireActiveProfile, requireRole } from "@/features/auth/guards";
import { THEME_REGISTRY, themeContentFields, themeContentKeys, type CampaignThemeContentKey } from "@/features/themes/registry";
import { paginationFor } from "@/lib/pagination";
import type { Json } from "@/lib/supabase/database.types";
import { createServerClient } from "@/lib/supabase/server";

import { normalizeCampaignSlug } from "./domain";
import {
  campaignCreateSchema,
  campaignEditSchema,
  campaignIdSchema,
  campaignListQuerySchema,
  type CampaignCreateInput,
  type CampaignEditInput,
} from "./schemas";
import {
  getCampaignRow,
  insertCampaignActivity,
  insertCampaignRow,
  isCampaignUniqueViolation,
  listCampaignRows,
  transitionCampaignRow,
  updateEditableCampaignRow,
  type CampaignDatabaseClient,
} from "./repository";
import type {
  CampaignActivityAction,
  CampaignInsert,
  CampaignMutationResult,
  CampaignPage,
  CampaignRow,
  CampaignUpdate,
} from "./types";

const MANAGER_ROLES = ["master", "admin"] as const;
const ALL_THEME_CONTENT_KEYS = new Set<CampaignThemeContentKey>(
  THEME_REGISTRY.flatMap((theme) => [...themeContentKeys(theme.key)]),
);

function contentForTheme<T extends Record<string, unknown>>(input: T, themeKey: string): T {
  const allowed = themeContentKeys(themeKey);
  return Object.fromEntries(
    Object.entries(input).filter(([key]) =>
      !ALL_THEME_CONTENT_KEYS.has(key as CampaignThemeContentKey) ||
      allowed.has(key as CampaignThemeContentKey),
    ),
  ) as T;
}

export type CampaignServiceErrorCode =
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "SLUG_CONFLICT"
  | "AUDIT_FAILED";

export class CampaignServiceError extends Error {
  readonly code: CampaignServiceErrorCode;

  constructor(
    code: CampaignServiceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CampaignServiceError";
    this.code = code;
  }
}

async function createTypedSessionClient(): Promise<CampaignDatabaseClient> {
  return (await createServerClient()) as unknown as CampaignDatabaseClient;
}

function mutationResult(row: CampaignRow): CampaignMutationResult {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    updated_at: row.updated_at,
  };
}

function slugWithSuffix(base: string, suffix: string) {
  const normalizedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, "");
  const prefixLength = Math.max(1, 120 - normalizedSuffix.length - 1);
  const prefix = base.slice(0, prefixLength).replace(/-+$/g, "") || "campanha";
  return `${prefix}-${normalizedSuffix}`;
}

function campaignSlugCandidates(value: string | null | undefined, id: string) {
  const base = normalizeCampaignSlug(value) ?? "campanha";
  return [
    base,
    slugWithSuffix(base, id.slice(0, 8)),
    slugWithSuffix(base, randomUUID().slice(0, 8)),
  ];
}

async function insertWithUniqueSlug(
  client: CampaignDatabaseClient,
  payload: Omit<CampaignInsert, "slug">,
  requestedSlug: string | null | undefined,
): Promise<CampaignRow> {
  for (const slug of campaignSlugCandidates(requestedSlug, payload.id ?? randomUUID())) {
    try {
      return await insertCampaignRow(client, { ...payload, slug });
    } catch (error) {
      if (!isCampaignUniqueViolation(error)) throw error;
    }
  }

  throw new CampaignServiceError(
    "SLUG_CONFLICT",
    "Não foi possível gerar um endereço único para a campanha.",
  );
}

async function recordActivity(
  client: CampaignDatabaseClient,
  campaignId: string,
  userId: string,
  action: CampaignActivityAction,
  details: Json,
) {
  try {
    await insertCampaignActivity(client, {
      campaign_id: campaignId,
      user_id: userId,
      action,
      details,
    });
  } catch (error) {
    throw new CampaignServiceError(
      "AUDIT_FAILED",
      "A alteração foi salva, mas o histórico não pôde ser registrado. Atualize a página antes de tentar novamente.",
      { cause: error },
    );
  }
}

function createPayload(
  input: CampaignCreateInput,
  id: string,
  userId: string,
): Omit<CampaignInsert, "slug"> {
  const editableValues = contentForTheme({ ...input }, input.theme_key);
  delete editableValues.slug;

  return {
    ...editableValues,
    id,
    status: "draft",
    ativa: false,
    published_at: null,
    archived_at: null,
    created_by: userId,
    updated_by: userId,
  } as Omit<CampaignInsert, "slug">;
}

function editPayload(input: CampaignEditInput, userId: string): CampaignUpdate {
  return {
    ...input,
    updated_by: userId,
  } as CampaignUpdate;
}

export async function listCampaigns(input: unknown = {}): Promise<CampaignPage> {
  const context = await requireActiveProfile();
  const params = campaignListQuerySchema.parse(input);
  const client = await createTypedSessionClient();
  let result = await listCampaignRows(
    client,
    params,
    context.profile.role === "master" || context.profile.role === "admin",
  );
  let pagination = paginationFor(result.total, params.page, params.pageSize);

  if (pagination.page !== params.page) {
    result = await listCampaignRows(
      client,
      { ...params, page: pagination.page },
      context.profile.role === "master" || context.profile.role === "admin",
    );
    pagination = paginationFor(result.total, pagination.page, params.pageSize);
  }

  return {
    ...result,
    page: pagination.page,
    pageSize: pagination.pageSize,
    pageCount: pagination.pageCount,
  };
}

export async function getCampaign(idInput: unknown): Promise<CampaignRow | null> {
  await requireActiveProfile();
  const id = campaignIdSchema.parse(idInput);
  const client = await createTypedSessionClient();
  return getCampaignRow(client, id);
}

export async function createCampaign(
  input: unknown,
): Promise<CampaignMutationResult> {
  const context = await requireActiveProfile();
  const parsed = campaignCreateSchema.parse(input);
  const client = await createTypedSessionClient();
  const id = randomUUID();
  const row = await insertWithUniqueSlug(
    client,
    createPayload(parsed, id, context.user.id),
    parsed.slug ?? parsed.titulo,
  );

  await recordActivity(client, row.id, context.user.id, "created", {
    status: "draft",
  });

  return mutationResult(row);
}

export async function updateCampaign(
  idInput: unknown,
  input: unknown,
  expectedUpdatedAt?: unknown,
): Promise<CampaignMutationResult> {
  const context = await requireActiveProfile();
  const id = campaignIdSchema.parse(idInput);
  const parsed = campaignEditSchema.parse(input);
  const client = await createTypedSessionClient();
  const current = await getCampaignRow(client, id);

  if (!current) {
    throw new CampaignServiceError("NOT_FOUND", "Campanha não encontrada.");
  }
  const effectiveTheme = parsed.theme_key ?? current.theme_key;
  const themeScopedParsed = contentForTheme(parsed, effectiveTheme);
  const themeDefinition = THEME_REGISTRY.find((theme) => theme.key === effectiveTheme) ?? THEME_REGISTRY[0];
  for (const field of themeContentFields(themeDefinition)) {
    const nextValue = field.key in themeScopedParsed
      ? themeScopedParsed[field.key as keyof typeof themeScopedParsed]
      : current[field.key];
    if (field.required && (typeof nextValue !== "string" || !nextValue.trim())) {
      throw new CampaignServiceError(
        "STATE_CONFLICT",
        `${field.label} é obrigatório no tema selecionado.`,
      );
    }
  }
  if (current.status !== "draft" && current.status !== "published") {
    throw new CampaignServiceError(
      "STATE_CONFLICT",
      "Campanhas arquivadas não podem ser editadas.",
    );
  }
  if (
    expectedUpdatedAt !== undefined &&
    (typeof expectedUpdatedAt !== "string" ||
      !Number.isFinite(Date.parse(expectedUpdatedAt)) ||
      current.updated_at !== expectedUpdatedAt)
  ) {
    throw new CampaignServiceError(
      "STATE_CONFLICT",
      "Esta campanha foi alterada em outra sessão. Recarregue a página antes de salvar novamente.",
    );
  }

  // An explicitly cleared slug falls back to a normalized, non-null value;
  // existing slugs remain untouched when the field is omitted.
  if ("slug" in themeScopedParsed && themeScopedParsed.slug === null) {
    themeScopedParsed.slug =
      normalizeCampaignSlug(themeScopedParsed.titulo ?? current.titulo) ??
      slugWithSuffix("campanha", id.slice(0, 8));
  }

  let row: CampaignRow | null;
  try {
    row = await updateEditableCampaignRow(
      client,
      id,
      editPayload(themeScopedParsed, context.user.id),
      typeof expectedUpdatedAt === "string" ? expectedUpdatedAt : undefined,
    );
  } catch (error) {
    if (isCampaignUniqueViolation(error)) {
      throw new CampaignServiceError(
        "SLUG_CONFLICT",
        "Já existe uma campanha com esse endereço.",
        { cause: error },
      );
    }
    throw error;
  }

  if (!row) {
    throw new CampaignServiceError(
      "STATE_CONFLICT",
      "A campanha mudou de estado enquanto era editada.",
    );
  }

  await recordActivity(client, row.id, context.user.id, "edited", {
    fields: Object.keys(themeScopedParsed).sort(),
  });

  return mutationResult(row);
}

type StatusTransition = {
  action: Extract<
    CampaignActivityAction,
    "published" | "unpublished" | "archived"
  >;
  expected: CampaignRow["status"][];
  next: CampaignRow["status"];
};

async function transitionCampaign(
  idInput: unknown,
  transition: StatusTransition,
): Promise<CampaignMutationResult> {
  const context = await requireRole(MANAGER_ROLES);
  const id = campaignIdSchema.parse(idInput);
  const client = await createTypedSessionClient();
  const current = await getCampaignRow(client, id);

  if (!current) {
    throw new CampaignServiceError("NOT_FOUND", "Campanha não encontrada.");
  }
  if (!transition.expected.includes(current.status)) {
    throw new CampaignServiceError(
      "STATE_CONFLICT",
      "A campanha não está em um estado compatível com esta operação.",
    );
  }

  const row = await transitionCampaignRow(client, id, transition.expected, {
    status: transition.next,
    updated_by: context.user.id,
  });

  if (!row) {
    throw new CampaignServiceError(
      "STATE_CONFLICT",
      "A campanha mudou de estado durante a operação.",
    );
  }

  await recordActivity(client, row.id, context.user.id, transition.action, {
    from: current.status,
    to: transition.next,
  });

  return mutationResult(row);
}

export function publishCampaign(id: unknown) {
  return transitionCampaign(id, {
    action: "published",
    expected: ["draft"],
    next: "published",
  });
}

export function unpublishCampaign(id: unknown) {
  return transitionCampaign(id, {
    action: "unpublished",
    expected: ["published"],
    next: "draft",
  });
}

export function archiveCampaign(id: unknown) {
  return transitionCampaign(id, {
    action: "archived",
    expected: ["draft", "published"],
    next: "archived",
  });
}

function duplicateTitle(title: string) {
  const suffix = " (cópia)";
  return `${title.slice(0, 200 - suffix.length).trimEnd()}${suffix}`;
}

function duplicatePayload(
  source: CampaignRow,
  id: string,
  userId: string,
): Omit<CampaignInsert, "slug"> {
  return {
    id,
    titulo: duplicateTitle(source.titulo),
    descricao: source.descricao,
    candidato_id: source.candidato_id,
    url_formulario: source.url_formulario,
    inicio_em: source.inicio_em,
    fim_em: source.fim_em,
    assinaturas_meta: source.assinaturas_meta,
    texto_form: source.texto_form,
    texto_dot: source.texto_dot,
    destaque_primario: source.destaque_primario,
    destaque_secundario: source.destaque_secundario,
    cor_destaque: source.cor_destaque,
    imagem_desktop: source.imagem_desktop,
    imagem_fundo: source.imagem_fundo,
    imagem_lateral: source.imagem_lateral,
    tema: source.tema,
    theme_key: source.theme_key,
    texto_contexto: source.texto_contexto,
    texto_proposta: source.texto_proposta,
    texto_conclusao: source.texto_conclusao,
    texto_impacto: source.texto_impacto,
    texto_impacto_apoio: source.texto_impacto_apoio,
    texto_faixa: source.texto_faixa,
    titulo_topicos: source.titulo_topicos,
    texto_topicos_intro: source.texto_topicos_intro,
    texto_topicos: source.texto_topicos,
    titulo_citacao: source.titulo_citacao,
    texto_citacao: source.texto_citacao,
    nota_citacao: source.nota_citacao,
    titulo_video: source.titulo_video,
    video_url: source.video_url,
    texto_video: source.texto_video,
    legenda_video: source.legenda_video,
    nota_video: source.nota_video,
    titulo_assinar: source.titulo_assinar,
    texto_assinar: source.texto_assinar,
    texto_compartilhar: source.texto_compartilhar,
    meta_title: source.meta_title,
    meta_description: source.meta_description,
    og_title: source.og_title,
    og_description: source.og_description,
    og_image: source.og_image,
    form_config: source.form_config,
    settings: source.settings,
    status: "draft",
    ativa: false,
    published_at: null,
    archived_at: null,
    created_by: userId,
    updated_by: userId,
  };
}

export async function duplicateCampaign(
  idInput: unknown,
): Promise<CampaignMutationResult> {
  const context = await requireActiveProfile();
  const sourceId = campaignIdSchema.parse(idInput);
  const client = await createTypedSessionClient();
  const source = await getCampaignRow(client, sourceId);

  if (!source) {
    throw new CampaignServiceError("NOT_FOUND", "Campanha não encontrada.");
  }

  const id = randomUUID();
  const row = await insertWithUniqueSlug(
    client,
    duplicatePayload(source, id, context.user.id),
    `${source.slug ?? source.titulo}-copia`,
  );

  await recordActivity(client, row.id, context.user.id, "duplicated", {
    source_campaign_id: source.id,
  });

  return mutationResult(row);
}
