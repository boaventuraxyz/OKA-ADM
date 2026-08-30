"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  FormInput,
  Globe2,
  LayoutTemplate,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  type LucideIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type CSSProperties,
  type HTMLInputTypeAttribute,
  type KeyboardEvent
} from "react";
import { Badge } from "@/components/ui/Badge";
import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";
import { CampaignVideoCarouselField } from "@/components/CampaignVideoCarouselField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  resolveThemeHeadlineText,
  THEME_REGISTRY,
  themeContentFields,
  themeContentKeys,
  type CampaignThemeContentKey,
  type CampaignThemeField,
} from "@/features/themes/registry";
import { ThemePreview, type PreviewDevice } from "@/features/themes/ThemePreview";
import { createCampaignAction, updateCampaignAction } from "./actions";
import {
  CAMPAIGN_AUTOSAVE_DELAY_MS,
  shouldAutosaveCampaign,
} from "./autosave";
import { normalizeCampaignSlug } from "./domain";
import {
  campaignTitleTokens,
  legacyCampaignTitleHighlights,
  MAX_TITLE_HIGHLIGHT_WORDS,
  parseCampaignTitleHighlights,
  type CampaignTitleHighlight
} from "@/lib/campaign-title-highlights";
import {
  parseCampaignLegalFooter,
  type CampaignLegalFooter,
} from "@/lib/campaign-settings";
import {
  legacyCampaignVideoCarousel,
  parseCampaignVideoCarousel,
  type CampaignVideoItem,
} from "@/lib/campaign-video-carousel";
import type { CampaignRow } from "./types";
import styles from "./CampaignEditor.module.css";

export type CampaignEditorProps = {
  candidates?: readonly CampaignEditorCandidate[];
  initialCampaign?: CampaignRow;
  initialThemeKey?: RegistryTheme["key"];
  mode: "create" | "edit";
};

type EditorTab = "content" | "form" | "theme" | "seo" | "settings" | "preview";
type SaveFeedback = "idle" | "saving" | "saved" | "error";
type FieldErrors = Record<string, string[]>;
type RegistryTheme = (typeof THEME_REGISTRY)[number];
type CampaignEditorCandidate = { id: string; nome: string; numero: string | null };

type CampaignFormFieldType =
  | "text"
  | "email"
  | "phone"
  | "cep"
  | "city"
  | "state"
  | "select"
  | "checkbox"
  | "textarea";

type CampaignFormField = {
  id: string;
  key: string;
  label: string;
  options: string[];
  placeholder: string;
  required: boolean;
  type: CampaignFormFieldType;
};

const emptyLegalFooter: CampaignLegalFooter = {
  candidateCnpj: "",
  committee: "",
  contact: "",
  election: "",
  party: "",
  partyCnpj: "",
};

type EditorSettings = {
  allowSharing: boolean;
  collectAddress: boolean;
  /** Propaganda eleitoral; fica no banco por trazer dado pessoal. */
  legal: CampaignLegalFooter;
  requireConsent: true;
  titleHighlights: CampaignTitleHighlight[];
  videoCarousel: CampaignVideoItem[] | null;
};

type MutableEditorSetting = "allowSharing" | "collectAddress";

type EditorValues = {
  assinaturasMeta: string;
  candidatoId: string;
  corDestaque: string;
  descricao: string;
  fimEm: string;
  idPlanilha: string;
  imagemFundo: string;
  imagemLateral: string;
  inicioEm: string;
  metaDescription: string;
  metaTitle: string;
  ogDescription: string;
  ogImage: string;
  ogTitle: string;
  legendaVideo: string;
  notaCitacao: string;
  notaVideo: string;
  slug: string;
  textoAssinar: string;
  textoCitacao: string;
  textoCompartilhar: string;
  textoConclusao: string;
  textoContexto: string;
  textoDot: string;
  textoFaixa: string;
  textoForm: string;
  textoImpacto: string;
  textoImpactoApoio: string;
  textoProposta: string;
  textoTopicos: string;
  textoTopicosIntro: string;
  textoVideo: string;
  themeKey: RegistryTheme["key"];
  titulo: string;
  tituloAssinar: string;
  tituloCitacao: string;
  tituloTopicos: string;
  tituloVideo: string;
  urlFormulario: string;
  videoUrl: string;
};

type EditorValueKey = Exclude<keyof EditorValues, "themeKey">;

type EditorSnapshot = {
  fields: CampaignFormField[];
  settings: EditorSettings;
  values: EditorValues;
};

type InitialEditorState = {
  formConfigBase: Record<string, unknown>;
  preserveLegacyAddress: boolean;
  settingsBase: Record<string, unknown>;
  snapshot: EditorSnapshot;
};

type ClientValidationError = {
  focusId?: string;
  message: string;
  tab: EditorTab;
};

const emptyCandidates: readonly CampaignEditorCandidate[] = [];
const emptyFieldErrors: FieldErrors = {};
const maxFormFields = 24;

const tabs = [
  { icon: FileText, id: "content", label: "Conteúdo" },
  { icon: FormInput, id: "form", label: "Formulário" },
  { icon: Palette, id: "theme", label: "Tema" },
  { icon: Globe2, id: "seo", label: "SEO" },
  { icon: Settings2, id: "settings", label: "Configurações" },
  { icon: LayoutTemplate, id: "preview", label: "Preview" }
] as const satisfies readonly { icon: LucideIcon; id: EditorTab; label: string }[];

const previewDevices = [
  { icon: Monitor, id: "desktop", label: "Desktop" },
  { icon: Tablet, id: "tablet", label: "Tablet" },
  { icon: Smartphone, id: "mobile", label: "Celular" }
] as const satisfies readonly { icon: LucideIcon; id: PreviewDevice; label: string }[];

const titleHighlightPalette = [
  { color: "#FACC15", label: "Amarelo" },
  { color: "#EF4444", label: "Vermelho" },
  { color: "#22C55E", label: "Verde" },
  { color: "#3B82F6", label: "Azul" },
  { color: "#FFFFFF", label: "Branco" },
  { color: "#000000", label: "Preto" },
  { color: "#6B7280", label: "Cinza" }
] as const;

const formFieldTypeLabels: Record<CampaignFormFieldType, string> = {
  cep: "CEP",
  checkbox: "Checkbox",
  city: "Cidade",
  email: "E-mail",
  phone: "Telefone",
  select: "Lista de opções",
  state: "Estado",
  text: "Texto curto",
  textarea: "Texto longo"
};

const editorValueKeys = [
  "assinaturasMeta",
  "candidatoId",
  "corDestaque",
  "descricao",
  "fimEm",
  "idPlanilha",
  "imagemFundo",
  "imagemLateral",
  "inicioEm",
  "metaDescription",
  "metaTitle",
  "ogDescription",
  "ogImage",
  "ogTitle",
  "legendaVideo",
  "notaCitacao",
  "notaVideo",
  "slug",
  "textoAssinar",
  "textoCitacao",
  "textoCompartilhar",
  "textoConclusao",
  "textoContexto",
  "textoDot",
  "textoFaixa",
  "textoForm",
  "textoImpacto",
  "textoImpactoApoio",
  "textoProposta",
  "textoTopicos",
  "textoTopicosIntro",
  "textoVideo",
  "titulo",
  "tituloAssinar",
  "tituloCitacao",
  "tituloTopicos",
  "tituloVideo",
  "urlFormulario",
  "videoUrl"
] as const satisfies readonly EditorValueKey[];

const actionKeyByEditorValue: Record<EditorValueKey, string> = {
  assinaturasMeta: "assinaturas_meta",
  candidatoId: "candidato_id",
  corDestaque: "cor_destaque",
  descricao: "descricao",
  fimEm: "fim_em",
  idPlanilha: "id_planilha",
  imagemFundo: "imagem_fundo",
  imagemLateral: "imagem_lateral",
  inicioEm: "inicio_em",
  metaDescription: "meta_description",
  metaTitle: "meta_title",
  ogDescription: "og_description",
  ogImage: "og_image",
  ogTitle: "og_title",
  legendaVideo: "legenda_video",
  notaCitacao: "nota_citacao",
  notaVideo: "nota_video",
  slug: "slug",
  textoAssinar: "texto_assinar",
  textoCitacao: "texto_citacao",
  textoCompartilhar: "texto_compartilhar",
  textoConclusao: "texto_conclusao",
  textoContexto: "texto_contexto",
  textoDot: "texto_dot",
  textoFaixa: "texto_faixa",
  textoForm: "texto_form",
  textoImpacto: "texto_impacto",
  textoImpactoApoio: "texto_impacto_apoio",
  textoProposta: "texto_proposta",
  textoTopicos: "texto_topicos",
  textoTopicosIntro: "texto_topicos_intro",
  textoVideo: "texto_video",
  titulo: "titulo",
  tituloAssinar: "titulo_assinar",
  tituloCitacao: "titulo_citacao",
  tituloTopicos: "titulo_topicos",
  tituloVideo: "titulo_video",
  urlFormulario: "url_formulario",
  videoUrl: "video_url"
};

const editorKeyByThemeContentKey: Record<CampaignThemeContentKey, EditorValueKey> = {
  descricao: "descricao",
  imagem_fundo: "imagemFundo",
  imagem_lateral: "imagemLateral",
  legenda_video: "legendaVideo",
  nota_citacao: "notaCitacao",
  nota_video: "notaVideo",
  texto_assinar: "textoAssinar",
  texto_citacao: "textoCitacao",
  texto_compartilhar: "textoCompartilhar",
  texto_conclusao: "textoConclusao",
  texto_contexto: "textoContexto",
  texto_faixa: "textoFaixa",
  texto_impacto: "textoImpacto",
  texto_impacto_apoio: "textoImpactoApoio",
  texto_proposta: "textoProposta",
  texto_topicos: "textoTopicos",
  texto_topicos_intro: "textoTopicosIntro",
  texto_video: "textoVideo",
  titulo_assinar: "tituloAssinar",
  titulo_citacao: "tituloCitacao",
  titulo_topicos: "tituloTopicos",
  titulo_video: "tituloVideo",
  video_url: "videoUrl",
};

const themeContentEditorKeys = new Set(Object.values(editorKeyByThemeContentKey));

const defaultFormFields: CampaignFormField[] = [
  {
    id: "name",
    key: "nome",
    label: "Nome completo",
    options: [],
    placeholder: "Digite seu nome",
    required: true,
    type: "text"
  },
  {
    id: "email",
    key: "email",
    label: "E-mail",
    options: [],
    placeholder: "voce@exemplo.com",
    required: true,
    type: "email"
  }
];

const legacyAddressFormFields: CampaignFormField[] = [
  {
    id: "name",
    key: "nome",
    label: "Nome completo",
    options: [],
    placeholder: "Seu nome completo",
    required: true,
    type: "text"
  },
  {
    id: "phone",
    key: "telefone",
    label: "WhatsApp",
    options: [],
    placeholder: "WhatsApp com DDD",
    required: true,
    type: "phone"
  },
  {
    id: "email",
    key: "email",
    label: "E-mail",
    options: [],
    placeholder: "Seu melhor e-mail",
    required: true,
    type: "email"
  },
  {
    id: "cep",
    key: "cep",
    label: "CEP",
    options: [],
    placeholder: "00000-000",
    required: true,
    type: "cep"
  },
  {
    id: "city",
    key: "cidade",
    label: "Cidade",
    options: [],
    placeholder: "Cidade",
    required: true,
    type: "city"
  },
  {
    id: "state",
    key: "estado",
    label: "UF",
    options: [],
    placeholder: "UF",
    required: true,
    type: "state"
  }
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function dateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function actionValue(key: EditorValueKey, value: string): string | number {
  if (key === "assinaturasMeta") return value ? Number(value) : "";
  if ((key === "inicioEm" || key === "fimEm") && value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : value;
  }
  return value;
}

function isFormFieldType(value: unknown): value is CampaignFormFieldType {
  return typeof value === "string" && value in formFieldTypeLabels;
}

function fieldKey(value: string) {
  return normalizeCampaignSlug(value)?.replace(/-/g, "_").slice(0, 64) || "campo";
}

function fieldKeyInput(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+/g, "")
    .slice(0, 64);
}

function safeDomPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function parseFormFields(
  formConfig: Record<string, unknown>,
  preserveLegacyAddress: boolean
) {
  if (!Array.isArray(formConfig.fields)) {
    const fields = preserveLegacyAddress
      ? legacyAddressFormFields
      : defaultFormFields;
    return fields.map((field) => ({ ...field, options: [...field.options] }));
  }

  const parsed = formConfig.fields.flatMap((value, index): CampaignFormField[] => {
    const record = asRecord(value);
    const label = stringValue(record.label).trim();
    const type = isFormFieldType(record.type) ? record.type : "text";
    if (!label) return [];
    const key = fieldKey(stringValue(record.key) || label);
    const options = Array.isArray(record.options)
      ? record.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter(Boolean)
      : [];

    return [{
      id: stringValue(record.id) || `field-${index + 1}`,
      key,
      label,
      options,
      placeholder: stringValue(record.placeholder),
      required: record.required === true,
      type
    }];
  });

  return parsed.length > 0 ? parsed : defaultFormFields.map((field) => ({ ...field }));
}

function resolveTheme(campaign?: CampaignRow, initialThemeKey?: RegistryTheme["key"]) {
  return (
    THEME_REGISTRY.find((theme) => theme.key === campaign?.theme_key) ||
    THEME_REGISTRY.find((theme) => theme.id === campaign?.tema) ||
    THEME_REGISTRY.find((theme) => theme.key === initialThemeKey) ||
    THEME_REGISTRY[0]
  );
}

function createInitialState(
  campaign?: CampaignRow,
  initialThemeKey?: RegistryTheme["key"],
): InitialEditorState {
  const theme = resolveTheme(campaign, initialThemeKey);
  const formConfigBase = asRecord(campaign?.form_config);
  const settingsBase = asRecord(campaign?.settings);
  const preserveLegacyAddress = Boolean(campaign) && !Array.isArray(formConfigBase.fields);
  const values: EditorValues = {
    assinaturasMeta: campaign?.assinaturas_meta === null || campaign?.assinaturas_meta === undefined
      ? ""
      : String(campaign.assinaturas_meta),
    candidatoId: campaign?.candidato_id || "",
    corDestaque: campaign?.cor_destaque || theme.palette.accent,
    descricao: campaign?.descricao || "",
    fimEm: dateTimeLocalValue(campaign?.fim_em),
    idPlanilha: campaign?.id_planilha || "",
    imagemFundo: campaign?.imagem_fundo || "",
    imagemLateral: campaign?.imagem_lateral || "",
    inicioEm: dateTimeLocalValue(campaign?.inicio_em),
    metaDescription: campaign?.meta_description || "",
    metaTitle: campaign?.meta_title || "",
    ogDescription: campaign?.og_description || "",
    ogImage: campaign?.og_image || "",
    ogTitle: campaign?.og_title || "",
    legendaVideo: campaign?.legenda_video || "",
    notaCitacao: campaign?.nota_citacao || "",
    notaVideo: campaign?.nota_video || "",
    slug: campaign?.slug || "",
    textoAssinar: campaign?.texto_assinar || "",
    textoCitacao: campaign?.texto_citacao || "",
    textoCompartilhar: campaign?.texto_compartilhar || "",
    textoConclusao: campaign?.texto_conclusao || "",
    textoContexto: campaign?.texto_contexto || "",
    textoDot: campaign?.texto_dot || "",
    textoFaixa: campaign?.texto_faixa || "",
    textoForm: campaign?.texto_form || "",
    textoImpacto: campaign?.texto_impacto || "",
    textoImpactoApoio: campaign?.texto_impacto_apoio || "",
    textoProposta: campaign?.texto_proposta || "",
    textoTopicos: campaign?.texto_topicos || "",
    textoTopicosIntro: campaign?.texto_topicos_intro || "",
    textoVideo: campaign?.texto_video || "",
    themeKey: theme.key,
    titulo: campaign?.titulo || "",
    tituloAssinar: campaign?.titulo_assinar || "",
    tituloCitacao: campaign?.titulo_citacao || "",
    tituloTopicos: campaign?.titulo_topicos || "",
    tituloVideo: campaign?.titulo_video || "",
    urlFormulario: campaign?.url_formulario || "",
    videoUrl: campaign?.video_url || ""
  };

  return {
    formConfigBase,
    preserveLegacyAddress,
    settingsBase,
    snapshot: {
      fields: parseFormFields(formConfigBase, preserveLegacyAddress),
      settings: {
        allowSharing: booleanValue(settingsBase.allow_sharing, true),
        legal: parseCampaignLegalFooter(settingsBase) ?? { ...emptyLegalFooter },
        collectAddress: preserveLegacyAddress
          ? true
          : booleanValue(settingsBase.collect_address, false),
        requireConsent: true,
        titleHighlights:
          parseCampaignTitleHighlights(settingsBase) ??
          legacyCampaignTitleHighlights({
            primary: campaign?.destaque_primario,
            primaryColor: campaign?.cor_destaque || theme.palette.accent,
            secondary: campaign?.destaque_secundario,
            title: resolveThemeHeadlineText(theme.key, campaign ?? {})
          }),
        videoCarousel: parseCampaignVideoCarousel(settingsBase)
      },
      values
    }
  };
}

function formConfigPayload(base: Record<string, unknown>, fields: CampaignFormField[]) {
  return {
    ...base,
    fields: fields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label.trim(),
      options: field.type === "select"
        ? field.options.map((option) => option.trim()).filter(Boolean)
        : [],
      placeholder: field.placeholder.trim(),
      required: field.required,
      type: field.type
    })),
    version: 1
  };
}

function settingsPayload(
  base: Record<string, unknown>,
  settings: EditorSettings,
  preserveLegacyAddress: boolean
) {
  return {
    ...base,
    allow_sharing: settings.allowSharing,
    legal: settings.legal,
    collect_address: preserveLegacyAddress ? true : settings.collectAddress,
    require_consent: true,
    title_highlights: settings.titleHighlights,
    ...(settings.videoCarousel === null
      ? {}
      : { video_carousel: settings.videoCarousel })
  };
}

function createPayload(snapshot: EditorSnapshot, initial: InitialEditorState) {
  const payload: Record<string, unknown> = {};
  const allowedContentKeys = themeContentKeys(snapshot.values.themeKey);
  for (const key of editorValueKeys) {
    if (themeContentEditorKeys.has(key)) {
      const actionKey = actionKeyByEditorValue[key] as CampaignThemeContentKey;
      if (!allowedContentKeys.has(actionKey)) continue;
    }
    payload[actionKeyByEditorValue[key]] = actionValue(key, snapshot.values[key]);
  }
  const theme = THEME_REGISTRY.find((candidate) => candidate.key === snapshot.values.themeKey) || THEME_REGISTRY[0];
  payload.tema = theme.id;
  payload.theme_key = theme.key;
  payload.form_config = formConfigPayload(initial.formConfigBase, snapshot.fields);
  payload.settings = settingsPayload(
    initial.settingsBase,
    snapshot.settings,
    initial.preserveLegacyAddress
  );
  return payload;
}

function editPayload(current: EditorSnapshot, baseline: EditorSnapshot, initial: InitialEditorState) {
  const payload: Record<string, unknown> = {};
  const allowedContentKeys = themeContentKeys(current.values.themeKey);
  for (const key of editorValueKeys) {
    if (current.values[key] !== baseline.values[key]) {
      if (themeContentEditorKeys.has(key)) {
        const actionKey = actionKeyByEditorValue[key] as CampaignThemeContentKey;
        if (!allowedContentKeys.has(actionKey)) continue;
      }
      payload[actionKeyByEditorValue[key]] = actionValue(key, current.values[key]);
    }
  }

  if (current.values.themeKey !== baseline.values.themeKey) {
    const theme = THEME_REGISTRY.find((candidate) => candidate.key === current.values.themeKey) || THEME_REGISTRY[0];
    payload.tema = theme.id;
    payload.theme_key = theme.key;
  }

  if (JSON.stringify(current.fields) !== JSON.stringify(baseline.fields)) {
    payload.form_config = formConfigPayload(initial.formConfigBase, current.fields);
  }
  const mustPersistInvariants =
    initial.settingsBase.require_consent !== true ||
    (initial.preserveLegacyAddress && initial.settingsBase.collect_address !== true);
  if (
    JSON.stringify(current.settings) !== JSON.stringify(baseline.settings) ||
    mustPersistInvariants
  ) {
    payload.settings = settingsPayload(
      initial.settingsBase,
      current.settings,
      initial.preserveLegacyAddress
    );
  }
  return payload;
}

function snapshotsMatch(current: EditorSnapshot, baseline: EditorSnapshot) {
  if (current.values.themeKey !== baseline.values.themeKey) return false;
  if (editorValueKeys.some((key) => current.values[key] !== baseline.values[key])) return false;
  return (
    JSON.stringify(current.fields) === JSON.stringify(baseline.fields) &&
    JSON.stringify(current.settings) === JSON.stringify(baseline.settings)
  );
}

function firstFieldError(errors: FieldErrors, name: string) {
  return errors[name]?.[0];
}

function controlId(prefix: string, actionField: string) {
  return `${prefix}-${actionField.replace(/_/g, "-")}`;
}

function focusControl(id: string) {
  const control = document.getElementById(id);
  const details = control?.closest("details");
  if (details instanceof HTMLDetailsElement) details.open = true;
  control?.focus();
}

function focusAfterPanelChange(id: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => focusControl(id));
  });
}

function tabForActionField(field: string): EditorTab {
  if (field === "form_config" || field === "texto_form" || field === "texto_dot") return "form";
  if (field === "tema" || field === "theme_key") return "theme";
  if (field.startsWith("meta_") || field.startsWith("og_")) return "seo";
  if (
    field === "settings" ||
    field === "inicio_em" ||
    field === "fim_em" ||
    field === "assinaturas_meta" ||
    field === "cor_destaque" ||
    field === "id_planilha" ||
    field === "url_formulario"
  ) return "settings";
  return "content";
}

function validateSnapshot(snapshot: EditorSnapshot, prefix: string): ClientValidationError | null {
  if (!snapshot.values.titulo.trim()) {
    return { focusId: controlId(prefix, "titulo"), message: "Informe o título da campanha.", tab: "content" };
  }
  if (snapshot.values.slug && normalizeCampaignSlug(snapshot.values.slug) !== snapshot.values.slug) {
    return {
      focusId: controlId(prefix, "slug"),
      message: "Use apenas letras minúsculas, números e hífens no slug.",
      tab: "content"
    };
  }
  if (
    snapshot.values.inicioEm &&
    snapshot.values.fimEm &&
    Date.parse(snapshot.values.fimEm) < Date.parse(snapshot.values.inicioEm)
  ) {
    return {
      focusId: controlId(prefix, "fim_em"),
      message: "A data final deve ser posterior à data inicial.",
      tab: "settings"
    };
  }

  const theme = THEME_REGISTRY.find((candidate) => candidate.key === snapshot.values.themeKey) || THEME_REGISTRY[0];
  for (const field of themeContentFields(theme)) {
    const editorKey = editorKeyByThemeContentKey[field.key];
    if (field.required && !snapshot.values[editorKey].trim()) {
      return {
        focusId: controlId(prefix, field.key),
        message: `Informe ${field.label.toLocaleLowerCase("pt-BR")}.`,
        tab: "content",
      };
    }
  }

  const keys = new Set<string>();
  for (const field of snapshot.fields) {
    const rowPrefix = `${prefix}-field-${safeDomPart(field.id)}`;
    if (!field.label.trim()) {
      return { focusId: `${rowPrefix}-label`, message: "Todos os campos precisam de um rótulo.", tab: "form" };
    }
    if (!field.key.trim()) {
      return { focusId: `${rowPrefix}-key`, message: "Todos os campos precisam de uma chave.", tab: "form" };
    }
    if (!/^[a-z][a-z0-9_]*$/.test(field.key)) {
      return {
        focusId: `${rowPrefix}-key`,
        message: `A chave “${field.key}” deve começar com uma letra e usar somente letras, números ou _.`,
        tab: "form"
      };
    }
    if (keys.has(field.key)) {
      return { focusId: `${rowPrefix}-key`, message: `A chave “${field.key}” está repetida.`, tab: "form" };
    }
    keys.add(field.key);
    if (field.type === "select" && !field.options.some((option) => option.trim())) {
      return {
        focusId: `${rowPrefix}-options`,
        message: `Adicione ao menos uma opção ao campo “${field.label}”.`,
        tab: "form"
      };
    }
  }
  return null;
}

function EditorInputField({
  description,
  error,
  id,
  label,
  maxLength,
  min,
  name,
  onChange,
  pattern,
  placeholder,
  required = false,
  step,
  type = "text",
  value
}: {
  description?: string;
  error?: string;
  id: string;
  label: string;
  maxLength?: number;
  min?: number;
  name: string;
  onChange: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  required?: boolean;
  step?: number;
  type?: HTMLInputTypeAttribute;
  value: string;
}) {
  return (
    <FormField description={description} error={error} id={id} label={label} required={required}>
      {(controlProps) => (
        <Input
          {...controlProps}
          maxLength={maxLength}
          min={min}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          pattern={pattern}
          placeholder={placeholder}
          required={required}
          step={step}
          type={type}
          value={value}
        />
      )}
    </FormField>
  );
}

function EditorTextareaField({
  description,
  error,
  id,
  label,
  maxLength,
  name,
  onChange,
  placeholder,
  required = false,
  value
}: {
  description?: string;
  error?: string;
  id: string;
  label: string;
  maxLength: number;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <FormField
      description={description || `${value.length}/${maxLength} caracteres`}
      error={error}
      id={id}
      label={label}
      required={required}
    >
      {(controlProps) => (
        <Textarea
          {...controlProps}
          maxLength={maxLength}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          value={value}
        />
      )}
    </FormField>
  );
}

function EditorTabList({
  activeTab,
  onChange,
  prefix
}: {
  activeTab: EditorTab;
  onChange: (tab: EditorTab) => void;
  prefix: string;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div aria-label="Seções do editor" className={styles.tabList} role="tablist">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            aria-controls={`${prefix}-${tab.id}-panel`}
            aria-selected={selected}
            className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
            id={`${prefix}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            <Icon aria-hidden="true" size={17} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type ValueChange = <Key extends keyof EditorValues>(key: Key, value: EditorValues[Key]) => void;

function ThemeContentFieldControl({ errors, field, onValueChange, prefix, values }: {
  errors: FieldErrors;
  field: CampaignThemeField;
  onValueChange: ValueChange;
  prefix: string;
  values: EditorValues;
}) {
  const editorKey = editorKeyByThemeContentKey[field.key];
  const value = values[editorKey];
  const id = controlId(prefix, field.key);
  const change = (nextValue: string) => onValueChange(editorKey, nextValue);

  if (field.type === "image") {
    return (
      <div className={styles.imageField}>
        <CampaignBackgroundField inputId={`${id}-file`} label={field.label} name={field.key} onChange={change} value={value} />
        {firstFieldError(errors, field.key) ? <p className={styles.inlineError} role="alert">{firstFieldError(errors, field.key)}</p> : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return <EditorTextareaField description={field.help} error={firstFieldError(errors, field.key)} id={id} label={field.label} maxLength={field.maxLength} name={field.key} onChange={change} placeholder={field.placeholder} required={field.required} value={value} />;
  }

  return <EditorInputField description={field.help} error={firstFieldError(errors, field.key)} id={id} label={field.label} maxLength={field.maxLength} name={field.key} onChange={change} pattern={field.type === "url" ? "(?:https://.*|/.*)" : undefined} placeholder={field.placeholder} required={field.required} type={field.type === "url" ? "url" : "text"} value={value} />;
}

function HeadlineHighlightEditor({
  fallbackNote,
  fieldLabel,
  highlights,
  onChange,
  text
}: {
  fallbackNote?: string;
  fieldLabel: string;
  highlights: CampaignTitleHighlight[];
  onChange: (highlights: CampaignTitleHighlight[]) => void;
  text: string;
}) {
  const [selectionColor, setSelectionColor] = useState<string>(
    titleHighlightPalette[1].color
  );
  const highlightByWord = new Map(
    highlights.map((highlight) => [highlight.index, highlight])
  );
  const words = campaignTitleTokens(text)
    .filter((token): token is typeof token & { wordIndex: number } => token.wordIndex !== null)
    .slice(0, MAX_TITLE_HIGHLIGHT_WORDS);

  function updateWord(index: number) {
    const current = highlightByWord.get(index);
    const next = highlights.filter((highlight) => highlight.index !== index);
    if (current?.color !== selectionColor) {
      next.push({ color: selectionColor, index });
    }
    onChange(next.sort((left, right) => left.index - right.index));
  }

  function applyColorToSelection() {
    onChange(highlights.map((highlight) => ({
      ...highlight,
      color: selectionColor
    })));
  }

  return (
    <section className={styles.titleHighlightEditor}>
      <header className={styles.titleHighlightHeader}>
        <div>
          <h3>Palavras coloridas do título principal</h3>
          <p>
            Escolha uma das cores padronizadas e clique nas palavras de “{fieldLabel}” que devem recebê-la.
            {fallbackNote ? ` ${fallbackNote}` : ""}
          </p>
        </div>
        <span>{highlights.length} selecionada{highlights.length === 1 ? "" : "s"}</span>
      </header>

      <div className={styles.titleHighlightControls}>
        <div aria-label="Cor das palavras" className={styles.titleHighlightPalette} role="group">
          {titleHighlightPalette.map((option) => (
            <button
              aria-label={`Selecionar ${option.label}`}
              aria-pressed={selectionColor === option.color}
              className={`${styles.titleHighlightPaletteButton} ${selectionColor === option.color ? styles.titleHighlightPaletteButtonSelected : ""}`}
              key={option.color}
              onClick={() => setSelectionColor(option.color)}
              style={{ "--title-highlight-color": option.color } as CSSProperties}
              type="button"
            >
              <span aria-hidden="true" className={styles.titleHighlightSwatch} />
              {option.label}
            </button>
          ))}
        </div>
        <button disabled={highlights.length === 0} onClick={applyColorToSelection} type="button">
          Aplicar às selecionadas
        </button>
        <button disabled={highlights.length === 0} onClick={() => onChange([])} type="button">
          Limpar seleção
        </button>
      </div>

      {words.length > 0 ? (
        <div aria-label="Palavras do título" className={styles.titleWords}>
          {words.map((word) => {
            const highlight = highlightByWord.get(word.wordIndex);
            return (
              <button
                aria-label={`${highlight ? "Remover ou trocar" : "Destacar"} a palavra ${word.text}`}
                aria-pressed={Boolean(highlight)}
                className={`${styles.titleWord} ${highlight ? styles.titleWordSelected : ""}`}
                key={`${word.start}-${word.end}`}
                onClick={() => updateWord(word.wordIndex)}
                style={{
                  "--title-highlight-color": highlight?.color || selectionColor
                } as CSSProperties}
                type="button"
              >
                {word.text}
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.titleHighlightEmpty}>Preencha “{fieldLabel}” para selecionar as palavras.</p>
      )}
    </section>
  );
}

/** Chave de EditorValues que alimenta o <h1> do tema. */
function headlineEditorKey(theme: RegistryTheme): EditorValueKey {
  return theme.headline.field === "titulo"
    ? "titulo"
    : editorKeyByThemeContentKey[theme.headline.field];
}

/** Texto realmente exibido como <h1>, considerando a reserva para o título da campanha. */
function headlineText(theme: RegistryTheme, values: EditorValues) {
  return values[headlineEditorKey(theme)].trim() || values.titulo;
}

function headlineWordCount(theme: RegistryTheme, values: EditorValues) {
  return campaignTitleTokens(headlineText(theme, values)).filter(
    (token) => token.wordIndex !== null
  ).length;
}

function ContentPanel({
  candidates,
  errors,
  onRegenerateSlug,
  onSlugChange,
  onTitleHighlightsChange,
  onTitleChange,
  onValueChange,
  onVideoCarouselChange,
  prefix,
  settings,
  values
}: {
  candidates: readonly CampaignEditorCandidate[];
  errors: FieldErrors;
  onRegenerateSlug: () => void;
  onSlugChange: (value: string) => void;
  onTitleHighlightsChange: (highlights: CampaignTitleHighlight[]) => void;
  onTitleChange: (value: string) => void;
  onValueChange: ValueChange;
  onVideoCarouselChange: (items: CampaignVideoItem[]) => void;
  prefix: string;
  settings: EditorSettings;
  values: EditorValues;
}) {
  const theme = THEME_REGISTRY.find((candidate) => candidate.key === values.themeKey) || THEME_REGISTRY[0];
  const selectedCandidate = candidates.find((candidate) => candidate.id === values.candidatoId);
  const titleIsHeadline = theme.headline.field === "titulo";
  const headlineFallback = !titleIsHeadline && !values[headlineEditorKey(theme)].trim();

  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Mensagem principal</p>
          <h2>Conteúdo da campanha</h2>
        </div>
        <span>Escreva para leitura rápida, com uma chamada clara para ação.</span>
      </div>

      <div className={styles.twoColumns}>
        <EditorInputField
          description={theme.tituloUsage}
          error={firstFieldError(errors, "titulo")}
          id={controlId(prefix, "titulo")}
          label="Título da campanha"
          maxLength={200}
          name="titulo"
          onChange={onTitleChange}
          placeholder="Ex.: Mobilidade segura para todos"
          required
          value={values.titulo}
        />
        <div className={styles.slugField}>
          <EditorInputField
            description="Endereço público; você pode ajustar a sugestão."
            error={firstFieldError(errors, "slug")}
            id={controlId(prefix, "slug")}
            label="Slug"
            maxLength={120}
            name="slug"
            onChange={onSlugChange}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="mobilidade-segura"
            value={values.slug}
          />
          <Button className={styles.regenerateButton} onClick={onRegenerateSlug} size="small" variant="ghost">
            <RotateCcw aria-hidden="true" size={15} />
            Gerar novamente
          </Button>
        </div>
      </div>

      {titleIsHeadline ? (
        <HeadlineHighlightEditor
          fieldLabel={theme.headline.label}
          highlights={settings.titleHighlights}
          onChange={onTitleHighlightsChange}
          text={values.titulo}
        />
      ) : null}

      <div className={styles.identityGrid}>
        <FormField
          error={firstFieldError(errors, "candidato_id")}
          id={controlId(prefix, "candidato_id")}
          label="Candidato ou responsável"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              name="candidato_id"
              onChange={(event) => onValueChange("candidatoId", event.target.value)}
              value={values.candidatoId}
            >
              <option value="">Sem vínculo</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.nome}</option>
              ))}
            </Select>
          )}
        </FormField>
        <div className={styles.selectedThemeNote}>
          <small>Tema selecionado</small>
          <strong>Tema {theme.id} · {theme.name}</strong>
          <span>{theme.description}</span>
          <span>
            {selectedCandidate?.numero
              ? `Número ${selectedCandidate.numero} vinculado automaticamente.`
              : "O número será usado quando estiver preenchido no cadastro do candidato."}
          </span>
        </div>
      </div>

      <div className={styles.themeSections}>
        {theme.sections.map((section) => (
          <section className={styles.themeSection} key={section.id}>
            <header>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </header>
            <div className={styles.themeSectionFields}>
              {(theme.key === "impact-dark" || theme.key === "bandeira") && section.id === "video" ? (
                <div className={styles.fullWidthField}>
                  <CampaignVideoCarouselField
                    inputId={controlId(prefix, "video_carousel")}
                    items={settings.videoCarousel ?? legacyCampaignVideoCarousel({
                      caption: values.legendaVideo,
                      url: values.videoUrl,
                    })}
                    onChange={onVideoCarouselChange}
                  />
                </div>
              ) : null}
              {section.fields.filter((field) => (
                (theme.key !== "impact-dark" && theme.key !== "bandeira") ||
                (field.key !== "video_url" && field.key !== "legenda_video")
              )).map((field) => (
                <Fragment key={field.key}>
                  <ThemeContentFieldControl errors={errors} field={field} onValueChange={onValueChange} prefix={prefix} values={values} />
                  {!titleIsHeadline && field.key === theme.headline.field ? (
                    <div className={styles.fullWidthField}>
                      <HeadlineHighlightEditor
                        fallbackNote={
                          headlineFallback
                            ? "Como este campo está vazio, a página mostra o título da campanha e as cores seguem esse texto."
                            : undefined
                        }
                        fieldLabel={theme.headline.label}
                        highlights={settings.titleHighlights}
                        onChange={onTitleHighlightsChange}
                        text={headlineText(theme, values)}
                      />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FormPanel({
  errors,
  fields,
  onAdd,
  onMove,
  onRemove,
  onUpdate,
  onValueChange,
  prefix,
  values
}: {
  errors: FieldErrors;
  fields: CampaignFormField[];
  onAdd: () => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CampaignFormField>) => void;
  onValueChange: ValueChange;
  prefix: string;
  values: EditorValues;
}) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Coleta objetiva</p>
          <h2>Formulário da campanha</h2>
        </div>
        <span>Uma lista simples de campos, sem construtor de páginas.</span>
      </div>

      <div className={styles.twoColumns}>
        <EditorInputField
          error={firstFieldError(errors, "texto_form")}
          id={controlId(prefix, "texto_form")}
          label="Título do formulário"
          maxLength={200}
          name="texto_form"
          onChange={(value) => onValueChange("textoForm", value)}
          placeholder="Assine esta causa"
          value={values.textoForm}
        />
        <EditorInputField
          error={firstFieldError(errors, "texto_dot")}
          id={controlId(prefix, "texto_dot")}
          label="Texto do contador"
          maxLength={80}
          name="texto_dot"
          onChange={(value) => onValueChange("textoDot", value)}
          placeholder="pessoas já apoiaram"
          value={values.textoDot}
        />
      </div>

      {firstFieldError(errors, "form_config") ? (
        <p className={styles.inlineError} role="alert">{firstFieldError(errors, "form_config")}</p>
      ) : null}

      <div className={styles.builderHeader} id={controlId(prefix, "form_config")} tabIndex={-1}>
        <div>
          <strong>Campos</strong>
          <span>{fields.length} de {maxFormFields}</span>
        </div>
        <Button disabled={fields.length >= maxFormFields} onClick={onAdd} variant="secondary">
          <Plus aria-hidden="true" size={17} />
          Adicionar campo
        </Button>
      </div>

      <div className={styles.fieldBuilder}>
        {fields.map((field, index) => {
          const rowPrefix = `${prefix}-field-${safeDomPart(field.id)}`;
          return (
            <fieldset className={styles.builderRow} key={field.id}>
              <legend>Campo {index + 1}: {field.label || "sem rótulo"}</legend>
              <div className={styles.builderToolbar}>
                <Badge variant="neutral">{formFieldTypeLabels[field.type]}</Badge>
                <div>
                  <IconButton aria-label={`Mover ${field.label || "campo"} para cima`} disabled={index === 0} onClick={() => onMove(field.id, -1)} variant="ghost">
                    <ArrowUp aria-hidden="true" size={17} />
                  </IconButton>
                  <IconButton aria-label={`Mover ${field.label || "campo"} para baixo`} disabled={index === fields.length - 1} onClick={() => onMove(field.id, 1)} variant="ghost">
                    <ArrowDown aria-hidden="true" size={17} />
                  </IconButton>
                  <IconButton aria-label={`Remover ${field.label || "campo"}`} disabled={fields.length === 1} onClick={() => onRemove(field.id)} variant="danger">
                    <Trash2 aria-hidden="true" size={17} />
                  </IconButton>
                </div>
              </div>

              <div className={styles.threeColumns}>
                <FormField id={`${rowPrefix}-label`} label="Rótulo" required>
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      maxLength={120}
                      onChange={(event) => {
                        const nextLabel = event.target.value;
                        const autoKey = !field.key || field.key === fieldKey(field.label);
                        onUpdate(field.id, {
                          ...(autoKey ? { key: fieldKey(nextLabel) } : {}),
                          label: nextLabel
                        });
                      }}
                      required
                      value={field.label}
                    />
                  )}
                </FormField>
                <FormField id={`${rowPrefix}-type`} label="Tipo">
                  {(controlProps) => (
                    <Select
                      {...controlProps}
                      onChange={(event) => {
                        const type = event.target.value as CampaignFormFieldType;
                        onUpdate(field.id, {
                          ...(type === "select" && field.options.length === 0
                            ? { options: ["Opção 1", "Opção 2"] }
                            : {}),
                          type
                        });
                      }}
                      value={field.type}
                    >
                      {Object.entries(formFieldTypeLabels).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </Select>
                  )}
                </FormField>
                <Checkbox
                  checked={field.required}
                  className={styles.builderCheckbox}
                  label="Campo obrigatório"
                  onChange={(event) => onUpdate(field.id, { required: event.target.checked })}
                />
              </div>

              <details className={styles.fieldAdvanced}>
                <summary>Configurações do campo</summary>
                <div className={styles.twoColumns}>
                  <FormField description="Usada para identificar a resposta." id={`${rowPrefix}-key`} label="Chave técnica" required>
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        maxLength={64}
                        onChange={(event) => onUpdate(field.id, { key: fieldKeyInput(event.target.value) })}
                        pattern="[a-z][a-z0-9_]*"
                        required
                        value={field.key}
                      />
                    )}
                  </FormField>
                  <FormField id={`${rowPrefix}-placeholder`} label="Placeholder">
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        maxLength={160}
                        onChange={(event) => onUpdate(field.id, { placeholder: event.target.value })}
                        value={field.placeholder}
                      />
                    )}
                  </FormField>
                </div>
                {field.type === "select" ? (
                  <FormField description="Uma opção por linha." id={`${rowPrefix}-options`} label="Opções" required>
                    {(controlProps) => (
                      <Textarea
                        {...controlProps}
                        onChange={(event) => onUpdate(field.id, {
                          options: event.target.value.split("\n")
                        })}
                        required
                        value={field.options.join("\n")}
                      />
                    )}
                  </FormField>
                ) : null}
              </details>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

function ThemePanel({
  errors,
  onContinue,
  onThemeChange,
  prefix,
  selectedKey
}: {
  errors: FieldErrors;
  onContinue: () => void;
  onThemeChange: (key: RegistryTheme["key"]) => void;
  prefix: string;
  selectedKey: RegistryTheme["key"];
}) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Direção visual</p>
          <h2>Escolha um tema</h2>
        </div>
        <span>IDs legados e keys estáveis são salvos juntos.</span>
      </div>
      {firstFieldError(errors, "theme_key") || firstFieldError(errors, "tema") ? (
        <p className={styles.inlineError} role="alert">
          {firstFieldError(errors, "theme_key") || firstFieldError(errors, "tema")}
        </p>
      ) : null}
      <fieldset className={styles.themeFieldset} id={controlId(prefix, "theme_key")} tabIndex={-1}>
        <legend className={styles.srOnly}>Tema da campanha</legend>
        <div className={styles.themeGrid}>
          {THEME_REGISTRY.map((theme) => {
            const selected = selectedKey === theme.key;
            return (
              <label className={`${styles.themeOption} ${selected ? styles.themeOptionSelected : ""}`} key={theme.key}>
                <input
                  checked={selected}
                  name="theme_key"
                  onChange={() => onThemeChange(theme.key)}
                  type="radio"
                  value={theme.key}
                />
                <span className={styles.themeOptionHeader}>
                  <span>
                    <small>Tema {theme.id}</small>
                    <strong>{theme.name}</strong>
                    <code>{theme.key}</code>
                  </span>
                  {selected ? <CheckCircle2 aria-hidden="true" size={21} /> : null}
                </span>
                <span className={styles.themeDescription}>{theme.description}</span>
                <span aria-label={`Paleta de ${theme.name}`} className={styles.themePalette} role="group">
                  {Object.entries(theme.palette).map(([name, color]) => (
                    <span aria-label={`${name}: ${color}`} key={name} role="img" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className={styles.themeTags}>
                  {theme.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className={styles.themeContinue}>
        <Button onClick={onContinue} variant="primary">Editar conteúdo deste tema</Button>
      </div>
    </div>
  );
}

function SeoPanel({ errors, onValueChange, prefix, values }: {
  errors: FieldErrors;
  onValueChange: ValueChange;
  prefix: string;
  values: EditorValues;
}) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Descoberta e compartilhamento</p>
          <h2>SEO</h2>
        </div>
        <span>Se estiverem vazios, o título e o resumo da campanha podem ser usados como fallback.</span>
      </div>
      <EditorInputField description={`${values.metaTitle.length}/120 caracteres`} error={firstFieldError(errors, "meta_title")} id={controlId(prefix, "meta_title")} label="Título para busca" maxLength={120} name="meta_title" onChange={(value) => onValueChange("metaTitle", value)} placeholder={values.titulo || "Título exibido nos buscadores"} value={values.metaTitle} />
      <EditorTextareaField error={firstFieldError(errors, "meta_description")} id={controlId(prefix, "meta_description")} label="Descrição para busca" maxLength={320} name="meta_description" onChange={(value) => onValueChange("metaDescription", value)} placeholder="Resumo que ajuda a entender a página antes do clique." value={values.metaDescription} />
      <div className={styles.searchSnippet} aria-label="Exemplo de resultado de busca">
        <small>exemplo.org/f/{values.slug || "sua-campanha"}</small>
        <strong>{values.metaTitle || values.titulo || "Título da campanha"}</strong>
        <span>{values.metaDescription || values.descricao || "A descrição da campanha será exibida aqui."}</span>
      </div>
      <details className={styles.advanced}>
        <summary>Open Graph e redes sociais</summary>
        <div className={styles.advancedGrid}>
          <EditorInputField description={`${values.ogTitle.length}/120 caracteres`} error={firstFieldError(errors, "og_title")} id={controlId(prefix, "og_title")} label="Título social" maxLength={120} name="og_title" onChange={(value) => onValueChange("ogTitle", value)} value={values.ogTitle} />
          <EditorTextareaField error={firstFieldError(errors, "og_description")} id={controlId(prefix, "og_description")} label="Descrição social" maxLength={320} name="og_description" onChange={(value) => onValueChange("ogDescription", value)} value={values.ogDescription} />
          <EditorInputField description="URL HTTPS ou caminho interno iniciado por /." error={firstFieldError(errors, "og_image")} id={controlId(prefix, "og_image")} label="Imagem social" maxLength={2048} name="og_image" onChange={(value) => onValueChange("ogImage", value)} pattern="(?:https://.*|/.*)" value={values.ogImage} />
        </div>
      </details>
    </div>
  );
}

function SettingsPanel({
  errors,
  mode,
  onLegalChange,
  onSettingChange,
  onValueChange,
  prefix,
  preserveLegacyAddress,
  settings,
  status,
  values
}: {
  errors: FieldErrors;
  mode: CampaignEditorProps["mode"];
  onLegalChange: (field: keyof CampaignLegalFooter, value: string) => void;
  onSettingChange: (key: MutableEditorSetting, value: boolean) => void;
  onValueChange: ValueChange;
  prefix: string;
  preserveLegacyAddress: boolean;
  settings: EditorSettings;
  status?: CampaignRow["status"];
  values: EditorValues;
}) {
  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Operação</p>
          <h2>Configurações</h2>
        </div>
        <Badge variant={status === "draft" || mode === "create" ? "warning" : "neutral"}>
          {mode === "create" ? "Novo rascunho" : status === "draft" ? "Rascunho" : status || "Sem status"}
        </Badge>
      </div>

      <section className={styles.themeSection}>
        <header>
          <h3>Propaganda eleitoral</h3>
          <p>
            Aparece no rodapé da página pública. Fica somente no banco, por trazer
            endereço e contato do candidato.
          </p>
        </header>
        <div className={styles.themeSectionFields}>
          <EditorInputField
            description="Ex.: ELEIÇÃO 2026 — NOME COMPLETO — CARGO — ESTADO"
            id={controlId(prefix, "legal_election")}
            name="legal_election"
            label="Identificação da eleição"
            maxLength={300}
            onChange={(value) => onLegalChange("election", value)}
            value={settings.legal.election}
          />
          <EditorInputField
            id={controlId(prefix, "legal_candidate_cnpj")}
            name="legal_candidate_cnpj"
            label="CNPJ do candidato"
            maxLength={40}
            onChange={(value) => onLegalChange("candidateCnpj", value)}
            placeholder="00.000.000/0000-00"
            value={settings.legal.candidateCnpj}
          />
          <EditorInputField
            id={controlId(prefix, "legal_party")}
            name="legal_party"
            label="Partido"
            maxLength={160}
            onChange={(value) => onLegalChange("party", value)}
            value={settings.legal.party}
          />
          <EditorInputField
            id={controlId(prefix, "legal_party_cnpj")}
            name="legal_party_cnpj"
            label="CNPJ do partido"
            maxLength={40}
            onChange={(value) => onLegalChange("partyCnpj", value)}
            placeholder="00.000.000/0000-00"
            value={settings.legal.partyCnpj}
          />
          <div className={styles.fullWidthField}>
            <EditorTextareaField
              description="Endereço do comitê ou da correspondência."
              id={controlId(prefix, "legal_committee")}
            name="legal_committee"
              label="Endereço do comitê"
              maxLength={400}
              onChange={(value) => onLegalChange("committee", value)}
              value={settings.legal.committee}
            />
          </div>
          <div className={styles.fullWidthField}>
            <EditorInputField
              description="E-mail e telefone divulgados na página."
              id={controlId(prefix, "legal_contact")}
            name="legal_contact"
              label="Contato da campanha"
              maxLength={200}
              onChange={(value) => onLegalChange("contact", value)}
              value={settings.legal.contact}
            />
          </div>
        </div>
      </section>

      <div className={styles.threeColumns}>
        <EditorInputField error={firstFieldError(errors, "inicio_em")} id={controlId(prefix, "inicio_em")} label="Início" name="inicio_em" onChange={(value) => onValueChange("inicioEm", value)} type="datetime-local" value={values.inicioEm} />
        <EditorInputField error={firstFieldError(errors, "fim_em")} id={controlId(prefix, "fim_em")} label="Fim" name="fim_em" onChange={(value) => onValueChange("fimEm", value)} type="datetime-local" value={values.fimEm} />
        <EditorInputField error={firstFieldError(errors, "assinaturas_meta")} id={controlId(prefix, "assinaturas_meta")} label="Meta de assinaturas" min={0} name="assinaturas_meta" onChange={(value) => onValueChange("assinaturasMeta", value)} step={1} type="number" value={values.assinaturasMeta} />
      </div>

      <div className={styles.twoColumns}>
        <FormField error={firstFieldError(errors, "cor_destaque")} id={controlId(prefix, "cor_destaque")} label="Cor de destaque">
          {(controlProps) => (
            <div className={styles.colorControl}>
              <Input {...controlProps} name="cor_destaque" onChange={(event) => onValueChange("corDestaque", event.target.value)} type="color" value={values.corDestaque} />
              <code>{values.corDestaque.toUpperCase()}</code>
            </div>
          )}
        </FormField>
        <EditorInputField description="Opcional; somente links oficiais do WhatsApp." error={firstFieldError(errors, "url_formulario")} id={controlId(prefix, "url_formulario")} label="Redirecionamento após envio" maxLength={2048} name="url_formulario" onChange={(value) => onValueChange("urlFormulario", value)} pattern="https://(?:wa\.me|(?:[a-z0-9-]+\.)*whatsapp\.com)(?:/.*)?" placeholder="https://wa.me/55..." type="url" value={values.urlFormulario} />
      </div>

      {firstFieldError(errors, "settings") ? (
        <p className={styles.inlineError} role="alert">{firstFieldError(errors, "settings")}</p>
      ) : null}
      <div className={styles.checkboxGrid} id={controlId(prefix, "settings")} tabIndex={-1}>
        <Checkbox checked={settings.requireConsent} description="Obrigatório em todas as campanhas e protegido contra desativação." disabled label="Consentimento obrigatório" />
        <Checkbox checked={settings.allowSharing} description="Disponibiliza chamadas de compartilhamento quando o tema suportar." label="Permitir compartilhamento" onChange={(event) => onSettingChange("allowSharing", event.target.checked)} />
        <Checkbox
          checked={settings.collectAddress}
          description={preserveLegacyAddress
            ? "Esta campanha legada mantém seus campos de endereço para evitar perda de dados."
            : "Desativado por padrão em novas campanhas; ative apenas quando a finalidade exigir."}
          disabled={preserveLegacyAddress}
          label="Coletar endereço completo"
          onChange={(event) => onSettingChange("collectAddress", event.target.checked)}
        />
      </div>

      <details className={styles.advanced}>
        <summary>Integrações avançadas</summary>
        <div className={styles.advancedGrid}>
          <EditorInputField description="Identificador opcional para integrações legadas." error={firstFieldError(errors, "id_planilha")} id={controlId(prefix, "id_planilha")} label="ID da planilha" maxLength={200} name="id_planilha" onChange={(value) => onValueChange("idPlanilha", value)} value={values.idPlanilha} />
        </div>
      </details>
    </div>
  );
}

function PreviewPanel({
  candidates,
  device,
  fields,
  onDeviceChange,
  settings,
  theme,
  values
}: {
  candidates: readonly CampaignEditorCandidate[];
  device: PreviewDevice;
  fields: CampaignFormField[];
  onDeviceChange: (device: PreviewDevice) => void;
  settings: EditorSettings;
  theme: RegistryTheme;
  values: EditorValues;
}) {
  const selectedCandidate = candidates.find((candidate) => candidate.id === values.candidatoId);

  return (
    <div className={styles.panelStack}>
      <div className={styles.panelIntro}>
        <div>
          <p>Conferência visual</p>
          <h2>Preview</h2>
        </div>
        <span>Tema, cor, textos e campos acompanham as alterações ainda não salvas.</span>
      </div>
      <div aria-label="Dispositivo da prévia" className={styles.deviceControls} role="group">
        {previewDevices.map((option) => {
          const Icon = option.icon;
          const selected = device === option.id;
          return (
            <Button aria-pressed={selected} key={option.id} onClick={() => onDeviceChange(option.id)} variant={selected ? "primary" : "secondary"}>
              <Icon aria-hidden="true" size={17} />
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className={styles.previewFrame}>
        <ThemePreview
          accent={values.corDestaque}
          content={{
            assinaturasMeta: Number(values.assinaturasMeta) || 0,
            candidateName: selectedCandidate?.nome,
            candidateNumber: selectedCandidate?.numero ?? undefined,
            descricao: values.descricao || null,
            formConfig: formConfigPayload({}, fields),
            imagemFundoUrl: values.imagemFundo || null,
            imagemFundoVersao: null,
            imagemLateralUrl: values.imagemLateral || null,
            imagemLateralVersao: null,
            legendaVideo: values.legendaVideo || null,
            notaCitacao: values.notaCitacao || null,
            notaVideo: values.notaVideo || null,
            settings: {
              allow_sharing: settings.allowSharing,
              collect_address: settings.collectAddress,
              legal: settings.legal,
              require_consent: true,
            },
            textoAssinar: values.textoAssinar || null,
            textoCitacao: values.textoCitacao || null,
            textoCompartilhar: values.textoCompartilhar || null,
            textoConclusao: values.textoConclusao || null,
            textoContexto: values.textoContexto || null,
            textoDot: values.textoDot || null,
            textoFaixa: values.textoFaixa || null,
            textoForm: values.textoForm || null,
            textoImpacto: values.textoImpacto || null,
            textoImpactoApoio: values.textoImpactoApoio || null,
            textoProposta: values.textoProposta || null,
            textoTopicos: values.textoTopicos || null,
            textoTopicosIntro: values.textoTopicosIntro || null,
            textoVideo: values.textoVideo || null,
            titleHighlights: settings.titleHighlights,
            titulo: values.titulo || null,
            tituloAssinar: values.tituloAssinar || null,
            tituloCitacao: values.tituloCitacao || null,
            tituloTopicos: values.tituloTopicos || null,
            tituloVideo: values.tituloVideo || null,
            videoCarousel: settings.videoCarousel,
            videoUrl: values.videoUrl || null,
          }}
          device={device}
          theme={theme}
        />
      </div>
      <Card>
        <CardHeader className={styles.previewSummaryHeader}>
          <div>
            <small>Tema {theme.id}</small>
            <h3>{values.titulo || "Campanha sem título"}</h3>
            <code>/f/{values.slug || "slug-gerado-ao-salvar"}</code>
          </div>
          <Badge variant="info">{theme.name}</Badge>
        </CardHeader>
        <CardContent className={styles.previewSummary}>
          <p>{values.descricao || "Adicione um resumo para apresentar a causa com clareza."}</p>
          <span>{fields.length} {fields.length === 1 ? "campo configurado" : "campos configurados"}</span>
        </CardContent>
      </Card>
    </div>
  );
}

export function CampaignEditor({
  candidates = emptyCandidates,
  initialCampaign,
  initialThemeKey,
  mode
}: CampaignEditorProps) {
  const router = useRouter();
  const generatedId = useId().replace(/:/g, "");
  const prefix = `campaign-editor-${generatedId}`;
  const [initial] = useState(() => createInitialState(initialCampaign, initialThemeKey));
  const [values, setValues] = useState(initial.snapshot.values);
  const [fields, setFields] = useState(initial.snapshot.fields);
  const [settings, setSettings] = useState(initial.snapshot.settings);
  const [baseline, setBaseline] = useState(initial.snapshot);
  const [campaignVersion, setCampaignVersion] = useState(initialCampaign?.updated_at);
  const [activeTab, setActiveTab] = useState<EditorTab>(mode === "create" ? "theme" : "content");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialCampaign?.slug));
  const [feedback, setFeedback] = useState<SaveFeedback>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors);
  const [isPending, startTransition] = useTransition();
  const currentSnapshot: EditorSnapshot = { fields, settings, values };
  const dirty = !snapshotsMatch(currentSnapshot, baseline);
  const selectedTheme = THEME_REGISTRY.find((theme) => theme.key === values.themeKey) || THEME_REGISTRY[0];
  const missingCampaign = mode === "edit" && !initialCampaign;
  const editableCampaign =
    mode === "create" ||
    initialCampaign?.status === "draft" ||
    initialCampaign?.status === "published";
  const statusBadgeVariant =
    mode === "create" || initialCampaign?.status === "draft"
      ? "warning"
      : initialCampaign?.status === "published"
        ? "success"
        : "neutral";

  function markDirty() {
    setFeedback("idle");
    setActionError(null);
    setFieldErrors(emptyFieldErrors);
  }

  /** Descarta seleções de cor que caíram fora do título principal depois da mudança. */
  function pruneTitleHighlights(nextValues: EditorValues) {
    const theme =
      THEME_REGISTRY.find((candidate) => candidate.key === nextValues.themeKey) ||
      THEME_REGISTRY[0];
    const wordCount = headlineWordCount(theme, nextValues);
    setSettings((current) => {
      const titleHighlights = current.titleHighlights.filter(
        (highlight) => highlight.index < wordCount
      );
      return titleHighlights.length === current.titleHighlights.length
        ? current
        : { ...current, titleHighlights };
    });
  }

  function changeValue<Key extends keyof EditorValues>(key: Key, value: EditorValues[Key]) {
    markDirty();
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "titulo" || key === headlineEditorKey(selectedTheme)) {
      pruneTitleHighlights({ ...values, [key]: value });
    }
  }

  function changeTitle(title: string) {
    markDirty();
    setValues((current) => ({
      ...current,
      slug: slugManuallyEdited ? current.slug : normalizeCampaignSlug(title) || "",
      titulo: title
    }));
    pruneTitleHighlights({ ...values, titulo: title });
  }

  function changeTitleHighlights(titleHighlights: CampaignTitleHighlight[]) {
    markDirty();
    setSettings((current) => ({ ...current, titleHighlights }));
  }

  function changeLegalField(field: keyof CampaignLegalFooter, value: string) {
    markDirty();
    setSettings((current) => ({
      ...current,
      legal: { ...current.legal, [field]: value }
    }));
  }

  function changeVideoCarousel(videoCarousel: CampaignVideoItem[]) {
    markDirty();
    setSettings((current) => ({ ...current, videoCarousel }));
  }

  function changeTheme(themeKey: RegistryTheme["key"]) {
    const theme = THEME_REGISTRY.find((candidate) => candidate.key === themeKey);
    if (!theme) return;
    markDirty();
    setValues((current) => ({
      ...current,
      corDestaque: theme.palette.accent.toUpperCase(),
      themeKey,
    }));
    // O título principal muda de campo entre temas; as palavras coloridas seguem o novo texto.
    pruneTitleHighlights({ ...values, themeKey });
  }

  function changeSlug(slug: string) {
    setSlugManuallyEdited(true);
    changeValue("slug", slug.toLowerCase());
  }

  function regenerateSlug() {
    setSlugManuallyEdited(false);
    changeValue("slug", normalizeCampaignSlug(values.titulo) || "");
  }

  function changeSetting(key: MutableEditorSetting, value: boolean) {
    markDirty();
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function addField() {
    if (fields.length >= maxFormFields) return;
    markDirty();
    let sequence = fields.length + 1;
    let id = `custom-${sequence}`;
    while (fields.some((field) => field.id === id)) {
      sequence += 1;
      id = `custom-${sequence}`;
    }
    const label = `Novo campo ${sequence}`;
    setFields((current) => [
      ...current,
      {
        id,
        key: fieldKey(label),
        label,
        options: [],
        placeholder: "",
        required: false,
        type: "text"
      }
    ]);
  }

  function updateField(id: string, patch: Partial<CampaignFormField>) {
    markDirty();
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  }

  function removeField(id: string) {
    if (fields.length === 1) return;
    markDirty();
    setFields((current) => current.filter((field) => field.id !== id));
  }

  function moveField(id: string, direction: -1 | 1) {
    const index = fields.findIndex((field) => field.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    markDirty();
    setFields((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function focusValidationError(error: ClientValidationError) {
    setActionError(error.message);
    setFeedback("error");
    setActiveTab(error.tab);
    if (error.focusId) focusAfterPanelChange(error.focusId);
  }

  function focusFirstActionError(errors: FieldErrors) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    setActiveTab(tabForActionField(firstField));
    focusAfterPanelChange(controlId(prefix, firstField));
  }

  useEffect(() => {
    const snapshot: EditorSnapshot = { fields, settings, values };
    const validationError = validateSnapshot(snapshot, prefix);

    if (
      !shouldAutosaveCampaign({
        dirty,
        hasValidationError: Boolean(validationError),
        isPending,
        mode,
        status: initialCampaign?.status,
      })
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const payload = editPayload(snapshot, baseline, initial);
      if (Object.keys(payload).length === 0) return;

      setFeedback("saving");
      setActionError(null);
      setFieldErrors(emptyFieldErrors);

      startTransition(async () => {
        try {
          const result = await updateCampaignAction({
            id: initialCampaign?.id,
            expected_updated_at: campaignVersion,
            ...payload,
          });

          if (!result.ok) {
            setFeedback("error");
            setActionError(result.error.message);
            setFieldErrors(result.error.fieldErrors || emptyFieldErrors);
            return;
          }

          const savedValues =
            result.data.slug && result.data.slug !== snapshot.values.slug
              ? { ...snapshot.values, slug: result.data.slug }
              : snapshot.values;

          if (savedValues !== snapshot.values) {
            setValues((current) =>
              current.slug === snapshot.values.slug
                ? { ...current, slug: result.data.slug || current.slug }
                : current,
            );
          }

          setBaseline({ ...snapshot, values: savedValues });
          setCampaignVersion(result.data.updated_at);
          setFeedback("saved");
        } catch {
          setFeedback("error");
          setActionError(
            "O salvamento automático falhou. Use Salvar alterações para tentar novamente.",
          );
        }
      });
    }, CAMPAIGN_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [
    baseline,
    campaignVersion,
    dirty,
    fields,
    initial,
    initialCampaign?.id,
    initialCampaign?.status,
    isPending,
    mode,
    prefix,
    settings,
    startTransition,
    values,
  ]);

  useEffect(() => {
    if (!dirty) return;

    function preventAccidentalExit(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
  }, [dirty]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !editableCampaign || missingCampaign) return;
    if (!event.currentTarget.reportValidity()) return;
    const snapshot: EditorSnapshot = { fields, settings, values };
    const validationError = validateSnapshot(snapshot, prefix);
    if (validationError) {
      focusValidationError(validationError);
      return;
    }

    const payload = mode === "create"
      ? createPayload(snapshot, initial)
      : editPayload(snapshot, baseline, initial);

    if (mode === "edit" && Object.keys(payload).length === 0) {
      setFeedback("saved");
      setActionError(null);
      return;
    }

    setFeedback("saving");
    setActionError(null);
    setFieldErrors(emptyFieldErrors);

    startTransition(async () => {
      try {
        const result = mode === "create"
          ? await createCampaignAction(payload)
          : await updateCampaignAction({
              id: initialCampaign?.id,
              expected_updated_at: campaignVersion,
              ...payload,
            });

        if (!result.ok) {
          setFeedback("error");
          setActionError(result.error.message);
          const nextFieldErrors = result.error.fieldErrors || emptyFieldErrors;
          setFieldErrors(nextFieldErrors);
          focusFirstActionError(nextFieldErrors);
          return;
        }

        if (mode === "create") {
          router.push(`/admin/campaigns/${result.data.id}/edit`);
          return;
        }

        const savedValues = result.data.slug && result.data.slug !== snapshot.values.slug
          ? { ...snapshot.values, slug: result.data.slug }
          : snapshot.values;
        if (savedValues !== snapshot.values) setValues(savedValues);
        setBaseline({ ...snapshot, values: savedValues });
        setCampaignVersion(result.data.updated_at);
        setFeedback("saved");
      } catch {
        setFeedback("error");
        setActionError("Não foi possível salvar agora. Verifique sua conexão e tente novamente.");
      }
    });
  }

  const activePanel = (() => {
    switch (activeTab) {
      case "content":
        return <ContentPanel candidates={candidates} errors={fieldErrors} onRegenerateSlug={regenerateSlug} onSlugChange={changeSlug} onTitleChange={changeTitle} onTitleHighlightsChange={changeTitleHighlights} onValueChange={changeValue} onVideoCarouselChange={changeVideoCarousel} prefix={prefix} settings={settings} values={values} />;
      case "form":
        return <FormPanel errors={fieldErrors} fields={fields} onAdd={addField} onMove={moveField} onRemove={removeField} onUpdate={updateField} onValueChange={changeValue} prefix={prefix} values={values} />;
      case "theme":
        return <ThemePanel errors={fieldErrors} onContinue={() => setActiveTab("content")} onThemeChange={changeTheme} prefix={prefix} selectedKey={values.themeKey} />;
      case "seo":
        return <SeoPanel errors={fieldErrors} onValueChange={changeValue} prefix={prefix} values={values} />;
      case "settings":
        return <SettingsPanel errors={fieldErrors} onLegalChange={changeLegalField} mode={mode} onSettingChange={changeSetting} onValueChange={changeValue} prefix={prefix} preserveLegacyAddress={initial.preserveLegacyAddress} settings={settings} status={initialCampaign?.status} values={values} />;
      case "preview":
        return <PreviewPanel candidates={candidates} device={previewDevice} fields={fields} onDeviceChange={setPreviewDevice} settings={settings} theme={selectedTheme} values={values} />;
    }
  })();

  const feedbackLabel = feedback === "saving" || isPending
    ? "Salvando…"
    : feedback === "saved"
      ? dirty ? "Alterações pendentes" : "Salvo"
        : feedback === "error"
        ? "Erro ao salvar"
        : dirty
          ? mode === "edit" && editableCampaign
            ? "Salvamento automático pendente"
            : "Alterações não salvas"
          : mode === "edit"
            ? "Sem alterações"
            : "Novo rascunho";

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <div className={styles.editorHeader}>
        <div>
          <p>{mode === "create" ? "Nova campanha" : "Editor de campanha"}</p>
          <h1>{values.titulo || (mode === "create" ? "Campanha sem título" : "Editar campanha")}</h1>
          <span>
            {mode === "create"
              ? "A criação será salva como rascunho."
              : initialCampaign?.status === "published"
                ? "Alterações válidas são salvas automaticamente e atualizam a página publicada."
                : "Alterações válidas deste rascunho são salvas automaticamente."}
          </span>
        </div>
        <Badge variant={statusBadgeVariant}>
          {mode === "create" ? "Rascunho novo" : initialCampaign?.status || "Indisponível"}
        </Badge>
      </div>

      {missingCampaign ? (
        <div className={styles.alert} role="alert">
          <CircleAlert aria-hidden="true" size={19} />
          A campanha não foi fornecida para edição.
        </div>
      ) : !editableCampaign ? (
        <div className={styles.alert} role="status">
          <CircleAlert aria-hidden="true" size={19} />
          Campanhas arquivadas não podem ser alteradas por este editor.
        </div>
      ) : null}

      {actionError ? (
        <div className={styles.alertError} role="alert">
          <CircleAlert aria-hidden="true" size={19} />
          <span>{actionError}</span>
        </div>
      ) : null}

      <Card className={styles.editorCard}>
        <EditorTabList activeTab={activeTab} onChange={setActiveTab} prefix={prefix} />
        <CardContent className={styles.panelContent}>
          <section
            aria-labelledby={`${prefix}-${activeTab}-tab`}
            id={`${prefix}-${activeTab}-panel`}
            role="tabpanel"
            tabIndex={0}
          >
            {activePanel}
          </section>
        </CardContent>
      </Card>

      <div className={styles.saveBar}>
        <div aria-live="polite" className={styles.saveStatus} role="status">
          {feedback === "saved" && !dirty ? (
            <Check aria-hidden="true" size={17} />
          ) : feedback === "error" ? (
            <CircleAlert aria-hidden="true" size={17} />
          ) : (
            <Save aria-hidden="true" size={17} />
          )}
          <span>
            <strong>{feedbackLabel}</strong>
            <small>
              {mode === "edit" && editableCampaign
                ? "Autosave ativo; o botão manual continua disponível"
                : "Primeiro salvamento manual e seguro"}
            </small>
          </span>
        </div>
        <Button disabled={!editableCampaign || missingCampaign} loading={isPending} size="large" type="submit" variant="primary">
          <Save aria-hidden="true" size={18} />
          {mode === "create" ? "Salvar rascunho" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
