import { z } from "zod";
import { THEME_REGISTRY, type CampaignThemeDefinition } from "@/features/themes/registry";

export const AI_TONES = [
  "institucional",
  "mobilizador",
  "editorial",
  "urgente"
] as const;

const themeKeys = THEME_REGISTRY.map((theme) => theme.key) as [
  CampaignThemeDefinition["key"],
  ...CampaignThemeDefinition["key"][]
];

export const campaignGenerationInputSchema = z
  .object({
    topic: z.string().trim().min(3).max(160),
    brief: z.string().trim().min(20).max(6_000),
    tone: z.enum(AI_TONES).default("mobilizador"),
    candidateId: z.string().uuid().nullable().optional(),
    preferredThemeKey: z.enum(themeKeys).nullable().optional()
  })
  .strict();

export const campaignGenerationOutputSchema = z
  .object({
    internalName: z.string().trim().min(3).max(120),
    title: z.string().trim().min(5).max(200),
    headline: z.string().trim().min(5).max(200),
    subtitle: z.string().trim().min(5).max(300),
    slogan: z.string().trim().min(3).max(160),
    body: z.string().trim().min(80).max(5_000),
    callToAction: z.string().trim().min(2).max(80),
    formTitle: z.string().trim().min(3).max(200),
    confirmation: z.string().trim().min(5).max(300),
    shareText: z.string().trim().min(5).max(500),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    metaTitle: z.string().trim().min(3).max(120),
    metaDescription: z.string().trim().min(20).max(320),
    ogTitle: z.string().trim().min(3).max(120),
    ogDescription: z.string().trim().min(20).max(320),
    themeKey: z.enum(themeKeys),
    themeRationale: z.string().trim().min(10).max(300),
    talkingPoints: z.array(z.string().trim().min(5).max(240)).min(2).max(6),
    copyVariations: z.array(z.string().trim().min(5).max(220)).min(2).max(3)
  })
  .strict();

export type CampaignGenerationInput = z.infer<typeof campaignGenerationInputSchema>;
export type CampaignGenerationOutput = z.infer<typeof campaignGenerationOutputSchema>;
