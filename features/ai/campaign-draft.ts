import { getThemeByKey } from "@/features/themes/registry";
import type { JsonInput } from "@/features/campaigns/schemas";

import type { CampaignGenerationInput, CampaignGenerationOutput } from "./schemas";

const defaultFormFields = [
  {
    id: "name",
    key: "nome",
    label: "Nome completo",
    options: [],
    placeholder: "Seu nome completo",
    required: true,
    type: "text",
  },
  {
    id: "email",
    key: "email",
    label: "E-mail",
    options: [],
    placeholder: "nome@email.com",
    required: true,
    type: "email",
  },
  {
    id: "phone",
    key: "telefone",
    label: "WhatsApp",
    options: [],
    placeholder: "WhatsApp com DDD",
    required: true,
    type: "phone",
  },
] as const;

function jsonSafe(value: unknown): JsonInput {
  return JSON.parse(JSON.stringify(value ?? null)) as JsonInput;
}

export function mapGeneratedDraftToCampaignInput({
  actorInput,
  draft,
  generatedAt,
  modelId,
  usage,
}: {
  actorInput: CampaignGenerationInput;
  draft: CampaignGenerationOutput;
  generatedAt: string;
  modelId: string;
  usage: unknown;
}) {
  const theme = getThemeByKey(draft.themeKey);
  if (!theme) throw new Error("Tema sugerido pela IA não existe.");

  const topicList = draft.talkingPoints.join("\n\n");
  const modernContent = {
    texto_faixa: draft.slogan,
    texto_contexto: draft.body,
    texto_proposta: draft.talkingPoints.map((point) => `• ${point}`).join("\n"),
    texto_conclusao: draft.confirmation,
    titulo_topicos: draft.headline,
    texto_topicos: topicList,
    texto_impacto: draft.slogan,
    texto_impacto_apoio: draft.subtitle,
    titulo_assinar: draft.formTitle,
    texto_assinar: draft.callToAction,
    texto_compartilhar: draft.shareText,
  };
  const contentByTheme = {
    cover: {},
    editorial: {
      texto_contexto: draft.body,
      texto_proposta: draft.talkingPoints.map((point) => `• ${point}`).join("\n"),
      texto_conclusao: draft.confirmation,
      texto_impacto: draft.slogan,
      texto_impacto_apoio: draft.callToAction,
    },
    manifesto: {
      texto_faixa: `${draft.slogan} • Participe • Compartilhe`,
      titulo_topicos: draft.headline,
      texto_topicos_intro: draft.body,
      texto_topicos: topicList,
      titulo_citacao: draft.slogan,
      texto_citacao: draft.confirmation,
      nota_citacao: "Uma mobilização construída com participação cidadã.",
      titulo_assinar: draft.formTitle,
      texto_assinar: draft.callToAction,
      texto_compartilhar: draft.shareText,
    },
    "impact-dark": {
      texto_faixa: draft.slogan,
      texto_contexto: draft.headline,
      titulo_topicos: draft.title,
      texto_topicos: [draft.body, ...draft.talkingPoints].join("\n\n"),
      texto_impacto: draft.slogan,
      texto_impacto_apoio: draft.subtitle,
      titulo_assinar: draft.formTitle,
      texto_assinar: draft.callToAction,
      texto_compartilhar: draft.shareText,
    },
    "horizon-blue": modernContent,
    "green-community": modernContent,
    "teal-pulse": modernContent,
  }[theme.key] ?? {};

  return {
    titulo: draft.title,
    slug: draft.slug,
    descricao: draft.subtitle,
    candidato_id: actorInput.candidateId ?? null,
    texto_form: draft.formTitle,
    texto_dot: draft.callToAction,
    destaque_primario: draft.headline,
    destaque_secundario: draft.slogan,
    tema: theme.id,
    theme_key: theme.key,
    ...contentByTheme,
    meta_title: draft.metaTitle,
    meta_description: draft.metaDescription,
    og_title: draft.ogTitle,
    og_description: draft.ogDescription,
    form_config: { version: 1, fields: [...defaultFormFields] },
    settings: {
      allow_sharing: true,
      collect_address: false,
      require_consent: true,
      generation: {
        source: "ai",
        generatedAt,
        modelId,
        topic: actorInput.topic,
        tone: actorInput.tone,
        themeRationale: draft.themeRationale,
        copyVariations: [...draft.copyVariations],
        usage: jsonSafe(usage),
      },
    },
  } as const;
}
