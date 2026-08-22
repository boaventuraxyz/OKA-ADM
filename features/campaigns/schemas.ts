import { z } from "zod";

import { THEME_REGISTRY, themeContentFields } from "@/features/themes/registry";

import { CAMPAIGN_STATUSES, normalizeCampaignSlug } from "./domain";
import { CAMPAIGN_SORT_FIELDS } from "./types";

const THEME_KEYS = THEME_REGISTRY.map((theme) => theme.key) as [
  (typeof THEME_REGISTRY)[number]["key"],
  ...(typeof THEME_REGISTRY)[number]["key"][],
];

const themeIdSchema = z.coerce
  .number()
  .int()
  .refine((id) => THEME_REGISTRY.some((theme) => theme.id === id), {
    message: "Tema inválido.",
  });

export type JsonInput =
  | string
  | number
  | boolean
  | null
  | JsonInput[]
  | { [key: string]: JsonInput };

export const jsonValueSchema: z.ZodType<JsonInput> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

function emptyStringToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

/** Removes PostgREST raw-OR grammar while preserving useful search text. */
export function sanitizeCampaignSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optionalTrimmedText(maxLength: number) {
  return z
    .preprocess(
      emptyStringToNull,
      z.string().trim().max(maxLength).nullable(),
    )
    .optional();
}

function optionalLongText(maxLength: number) {
  return z
    .preprocess(
      emptyStringToNull,
      z.string().trim().max(maxLength).nullable(),
    )
    .optional();
}

function optionalUuid() {
  return z
    .preprocess(emptyStringToNull, z.string().uuid().nullable())
    .optional();
}

function optionalDateTime() {
  return z
    .preprocess(
      emptyStringToNull,
      z
        .string()
        .trim()
        .max(40)
        .refine((value) => Number.isFinite(Date.parse(value)), {
          message: "Data inválida.",
        })
        .nullable(),
    )
    .optional();
}

function optionalJsonObject(defaultValue?: Record<string, never>) {
  const schema = z.preprocess((value) => {
    if (typeof value !== "string") return value;
    if (!value.trim()) return {};

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }, jsonObjectSchema);

  return defaultValue ? schema.default(defaultValue) : schema.optional();
}

const optionalImageData = z
  .preprocess(
    emptyStringToNull,
    z
      .string()
      .max(7_000_000)
      .regex(/^data:image\/(jpeg|png|webp);base64,/)
      .nullable(),
  )
  .optional();

const optionalWebPath = z
  .preprocess(
    emptyStringToNull,
    z.string().trim().max(2048).regex(/^(https:\/\/|\/)/i).nullable(),
  )
  .optional();

const optionalWhatsappUrl = z
  .preprocess(
    emptyStringToNull,
    z
      .string()
      .trim()
      .max(2048)
      .regex(/^https:\/\/(wa\.me|([a-z0-9-]+\.)*whatsapp\.com)(\/|$)/i)
      .nullable(),
  )
  .optional();

const campaignEditableShape = {
  titulo: z.string().trim().min(1).max(200),
  slug: z
    .preprocess(emptyStringToNull, z.string().trim().max(240).nullable())
    .transform((value) => normalizeCampaignSlug(value))
    .optional(),
  descricao: optionalLongText(5_000),
  candidato_id: optionalUuid(),
  url_formulario: optionalWhatsappUrl,
  inicio_em: optionalDateTime(),
  fim_em: optionalDateTime(),
  id_planilha: optionalTrimmedText(200),
  assinaturas_meta: z
    .preprocess(
      (value) => {
        if (value === "" || value === null) return null;
        return typeof value === "string" ? Number(value) : value;
      },
      z.number().int().min(0).max(1_000_000_000).nullable(),
    )
    .optional(),
  texto_form: optionalTrimmedText(200),
  texto_dot: optionalTrimmedText(80),
  destaque_primario: optionalTrimmedText(160),
  destaque_secundario: optionalTrimmedText(160),
  cor_destaque: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i)
    .transform((value) => value.toUpperCase())
    .optional(),
  imagem_fundo: optionalImageData,
  imagem_lateral: optionalImageData,
  tema: themeIdSchema.optional(),
  theme_key: z.enum(THEME_KEYS).optional(),
  texto_contexto: optionalLongText(8_000),
  texto_proposta: optionalLongText(4_000),
  texto_conclusao: optionalLongText(4_000),
  texto_impacto: optionalTrimmedText(300),
  texto_impacto_apoio: optionalTrimmedText(500),
  texto_faixa: optionalTrimmedText(500),
  titulo_topicos: optionalTrimmedText(200),
  texto_topicos_intro: optionalLongText(2_000),
  texto_topicos: optionalLongText(8_000),
  titulo_citacao: optionalTrimmedText(200),
  texto_citacao: optionalLongText(2_000),
  nota_citacao: optionalLongText(1_000),
  titulo_video: optionalTrimmedText(200),
  video_url: optionalWebPath,
  texto_video: optionalLongText(4_000),
  legenda_video: optionalTrimmedText(300),
  nota_video: optionalLongText(1_000),
  titulo_assinar: optionalTrimmedText(200),
  texto_assinar: optionalLongText(2_000),
  texto_compartilhar: optionalTrimmedText(500),
  meta_title: optionalTrimmedText(120),
  meta_description: optionalTrimmedText(320),
  og_title: optionalTrimmedText(120),
  og_description: optionalTrimmedText(320),
  og_image: optionalWebPath,
  form_config: optionalJsonObject(),
  settings: optionalJsonObject(),
};

function validateThemePair(
  value: { tema?: number; theme_key?: string },
  context: z.RefinementCtx,
) {
  if (value.tema === undefined || value.theme_key === undefined) return;

  const theme = THEME_REGISTRY.find((candidate) => candidate.id === value.tema);
  if (theme?.key !== value.theme_key) {
    context.addIssue({
      code: "custom",
      path: ["theme_key"],
      message: "Tema e identificador visual não correspondem.",
    });
  }
}

function validateRequiredThemeContent(
  value: { tema?: number; theme_key?: string } & Record<string, unknown>,
  context: z.RefinementCtx,
) {
  const theme =
    THEME_REGISTRY.find((candidate) => candidate.key === value.theme_key) ??
    THEME_REGISTRY.find((candidate) => candidate.id === value.tema) ??
    THEME_REGISTRY[0];

  for (const field of themeContentFields(theme)) {
    const fieldValue = value[field.key];
    if (field.required && (typeof fieldValue !== "string" || !fieldValue.trim())) {
      context.addIssue({
        code: "custom",
        path: [field.key],
        message: `${field.label} é obrigatório neste tema.`,
      });
    }
  }
}

export const campaignCreateSchema = z
  .object({
    ...campaignEditableShape,
    titulo: campaignEditableShape.titulo,
    form_config: optionalJsonObject({}),
    settings: optionalJsonObject({}),
  })
  .strict()
  .superRefine((value, context) => {
    validateThemePair(value, context);
    validateRequiredThemeContent(value, context);
  })
  .transform((value) => {
    const selectedTheme =
      THEME_REGISTRY.find((theme) => theme.key === value.theme_key) ??
      THEME_REGISTRY.find((theme) => theme.id === value.tema) ??
      THEME_REGISTRY[0];

    return {
      ...value,
      tema: selectedTheme.id,
      theme_key: selectedTheme.key,
    };
  });

export const campaignEditSchema = z
  .object(campaignEditableShape)
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "Informe ao menos um campo para atualizar.",
      });
    }

    validateThemePair(value, context);
  });

export const campaignListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z
      .preprocess(
        (value) => (typeof value === "string" ? value.trim() : value),
        z
          .string()
          .min(1)
          .max(120)
          .transform(sanitizeCampaignSearch)
          .refine((value) => value.length > 0, {
            message: "Busca inválida.",
          })
          .optional(),
      )
      .optional(),
    status: z.enum(CAMPAIGN_STATUSES).optional(),
    theme: z.enum(THEME_KEYS).optional(),
    candidateId: z.string().uuid().optional(),
    sortBy: z.enum(CAMPAIGN_SORT_FIELDS).default("updated_at"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const campaignIdSchema = z.string().uuid();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignEditInput = z.infer<typeof campaignEditSchema>;
export type CampaignListQueryInput = z.input<typeof campaignListQuerySchema>;
