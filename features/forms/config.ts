export const CAMPAIGN_FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "cep",
  "city",
  "state",
  "select",
  "checkbox",
  "textarea",
] as const;

export type CampaignFormFieldType = (typeof CAMPAIGN_FORM_FIELD_TYPES)[number];

export type CampaignFormField = {
  id: string;
  key: string;
  label: string;
  options: string[];
  placeholder: string;
  required: boolean;
  type: CampaignFormFieldType;
};

export type PublicFormConfiguration = {
  collectAddress: boolean;
  fields: CampaignFormField[];
  legacy: boolean;
  requireConsent: true;
};

const keyPattern = /^[a-z][a-z0-9_]{0,63}$/;

const legacyFields: CampaignFormField[] = [
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
    id: "phone",
    key: "telefone",
    label: "WhatsApp",
    options: [],
    placeholder: "WhatsApp com DDD",
    required: true,
    type: "phone",
  },
  {
    id: "email",
    key: "email",
    label: "E-mail",
    options: [],
    placeholder: "Seu melhor e-mail",
    required: true,
    type: "email",
  },
  {
    id: "cep",
    key: "cep",
    label: "CEP",
    options: [],
    placeholder: "00000-000",
    required: true,
    type: "cep",
  },
  {
    id: "city",
    key: "cidade",
    label: "Cidade",
    options: [],
    placeholder: "Cidade",
    required: true,
    type: "city",
  },
  {
    id: "state",
    key: "estado",
    label: "UF",
    options: [],
    placeholder: "UF",
    required: true,
    type: "state",
  },
];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isFieldType(value: unknown): value is CampaignFormFieldType {
  return (
    typeof value === "string" &&
    CAMPAIGN_FORM_FIELD_TYPES.includes(value as CampaignFormFieldType)
  );
}

function normalizeField(value: unknown, index: number): CampaignFormField | null {
  const source = record(value);
  if (!source) return null;
  const label = typeof source.label === "string" ? source.label.trim().slice(0, 120) : "";
  const key = typeof source.key === "string" ? source.key.trim().toLowerCase() : "";
  if (!label || !keyPattern.test(key) || !isFieldType(source.type)) return null;
  const options = source.type === "select" && Array.isArray(source.options)
    ? source.options
        .filter((option): option is string => typeof option === "string")
        .map((option) => option.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  if (source.type === "select" && options.length === 0) return null;

  return {
    id:
      typeof source.id === "string" && source.id.trim()
        ? source.id.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)
        : `field-${index + 1}`,
    key,
    label,
    options,
    placeholder:
      typeof source.placeholder === "string"
        ? source.placeholder.trim().slice(0, 160)
        : "",
    required: source.required === true,
    type: source.type,
  };
}

export function normalizePublicFormConfiguration(
  formConfig: unknown,
  settings: unknown
): PublicFormConfiguration {
  const form = record(formConfig);
  const appSettings = record(settings);
  const configuredFields = Array.isArray(form?.fields) ? form.fields : null;

  if (!configuredFields) {
    return {
      collectAddress: true,
      fields: legacyFields.map((field) => ({ ...field })),
      legacy: true,
      requireConsent: true,
    };
  }

  const seenKeys = new Set<string>();
  const fields = configuredFields
    .slice(0, 24)
    .map(normalizeField)
    .filter((field): field is CampaignFormField => {
      if (!field || seenKeys.has(field.key)) return false;
      seenKeys.add(field.key);
      return true;
    });

  return {
    collectAddress: appSettings?.collect_address === true,
    fields,
    legacy: false,
    // Consent is a legal/security invariant and cannot be disabled by JSON.
    requireConsent: true,
  };
}

export function firstFieldOfType(
  configuration: PublicFormConfiguration,
  type: CampaignFormFieldType
) {
  return configuration.fields.find((field) => field.type === type) ?? null;
}

export function resolveStandardFormFields(configuration: PublicFormConfiguration) {
  const name =
    configuration.fields.find(
      (field) =>
        field.type === "text" &&
        (field.id === "name" || field.key === "nome" || field.key === "name")
    ) ?? null;
  const phone = firstFieldOfType(configuration, "phone");
  const email = firstFieldOfType(configuration, "email");
  const cep = firstFieldOfType(configuration, "cep");
  const city = firstFieldOfType(configuration, "city");
  const state = firstFieldOfType(configuration, "state");
  const standard = new Set(
    [name, phone, email, cep, city, state].filter(
      (field): field is CampaignFormField => Boolean(field)
    )
  );

  return {
    name,
    phone,
    email,
    cep,
    city,
    state,
    custom: configuration.fields.filter((field) => !standard.has(field)),
  };
}

export function isValidCampaignFormResponse(
  field: CampaignFormField,
  value: string | boolean | null | undefined
) {
  const empty = typeof value === "boolean" ? !value : !String(value ?? "").trim();
  if (empty) return !field.required;
  const text = String(value).trim();

  if (field.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  if (field.type === "phone") {
    const digits = text.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11 || /^(\d)\1+$/.test(digits)) return false;
    const ddd = Number(digits.slice(0, 2));
    return ddd >= 11 && ddd <= 99 &&
      (digits.length === 11 ? digits[2] === "9" : /^[1-8]$/.test(digits[2]));
  }
  if (field.type === "cep") return /^\d{5}-?\d{3}$/.test(text);
  if (field.type === "state") return /^[A-Z]{2}$/.test(text.toUpperCase());
  if (field.type === "city") return text.length >= 2;
  if (field.type === "select") return field.options.includes(text);
  return text.length <= (field.type === "textarea" ? 2000 : 200);
}
