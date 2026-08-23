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

/**
 * Fluxo progressivo compartilhado por todas as campanhas. A configuração da
 * campanha ainda personaliza consentimento e confirmação, mas os dois passos
 * de coleta permanecem consistentes para não perder o contato antes do endereço.
 */
export type CaptureFormStep = {
  /** Chaves dos campos exibidos nesta etapa. */
  fields: string[];
  /** Rótulo curto da etapa, ex.: "SEUS DADOS". */
  label: string;
  /** Observação sob o botão. */
  note: string;
  submitLabel: string;
  subtitle: string;
  title: string;
};

export type CaptureFormConfiguration = {
  /** Texto do consentimento, exibido na última etapa de preenchimento. */
  consentText: string;
  done: {
    buttonLabel: string;
    label: string;
    message: string;
    title: string;
  };
  steps: CaptureFormStep[];
};

export type PublicFormConfiguration = {
  capture: CaptureFormConfiguration | null;
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
    id: "neighborhood",
    key: "bairro",
    label: "Bairro",
    options: [],
    placeholder: "Seu bairro",
    required: true,
    type: "text",
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

const defaultCapture: CaptureFormConfiguration = {
  consentText:
    "Declaro meu apoio a esta iniciativa e autorizo o uso dos meus dados exclusivamente para fins relacionados a esta campanha, conforme a legislação aplicável.",
  done: {
    buttonLabel: "Continuar",
    label: "Pronto",
    message: "Seus dados foram registrados com segurança.",
    title: "Cadastro concluído!",
  },
  steps: [],
};

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

function text(value: unknown, max: number, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function normalizeCaptureStep(value: unknown): CaptureFormStep | null {
  const source = record(value);
  if (!source) return null;
  const title = text(source.title, 160);
  if (!title) return null;

  return {
    fields: Array.isArray(source.fields)
      ? source.fields
          .filter((key): key is string => typeof key === "string")
          .map((key) => key.trim().toLowerCase())
          .filter((key) => keyPattern.test(key))
          .slice(0, 24)
      : [],
    label: text(source.label, 40),
    note: text(source.note, 400),
    submitLabel: text(source.submitLabel, 40, "Continuar"),
    subtitle: text(source.subtitle, 400),
    title,
  };
}

function normalizeCapture(value: unknown): CaptureFormConfiguration | null {
  const source = record(value);
  if (!source) return null;
  const steps = (Array.isArray(source.steps) ? source.steps : [])
    .map(normalizeCaptureStep)
    .filter((step): step is CaptureFormStep => Boolean(step))
    .slice(0, 6);
  if (steps.length === 0) return null;

  const done = record(source.done) ?? {};

  return {
    consentText: text(source.consentText, 1200),
    done: {
      buttonLabel: text(done.buttonLabel, 40, "Continuar"),
      label: text(done.label, 40, "Pronto"),
      message: text(done.message, 400),
      title: text(done.title, 160, "Cadastro confirmado!"),
    },
    steps,
  };
}

function isNameField(field: CampaignFormField) {
  return (
    field.type === "text" &&
    (field.id === "name" || field.key === "nome" || field.key === "name")
  );
}

function matchesStandardField(
  candidate: CampaignFormField,
  standard: CampaignFormField,
) {
  if (standard.id === "name") return isNameField(candidate);
  if (standard.id === "neighborhood") return candidate.key === "bairro";
  return candidate.type === standard.type;
}

function progressiveFields(configuredFields: CampaignFormField[]) {
  const claimed = new Set<CampaignFormField>();
  const standard = legacyFields.map((fallback) => {
    const configured = configuredFields.find(
      (field) => !claimed.has(field) && matchesStandardField(field, fallback),
    );
    if (!configured) return { ...fallback };
    claimed.add(configured);
    return {
      ...configured,
      options: fallback.type === "select" ? configured.options : [],
      required: true,
      type: fallback.type,
    };
  });

  return [
    ...standard,
    ...configuredFields.filter((field) => !claimed.has(field)),
  ];
}

function progressiveCapture(
  configuredCapture: CaptureFormConfiguration | null,
  fields: CampaignFormField[],
): CaptureFormConfiguration {
  const name = fields.find(isNameField);
  const phone = fields.find((field) => field.type === "phone");
  const email = fields.find((field) => field.type === "email");
  const cep = fields.find((field) => field.type === "cep");
  const neighborhood = fields.find((field) => field.key === "bairro");
  const city = fields.find((field) => field.type === "city");
  const state = fields.find((field) => field.type === "state");
  const standard = new Set(
    [name, phone, email, cep, neighborhood, city, state].filter(
      (field): field is CampaignFormField => Boolean(field),
    ),
  );
  const customKeys = fields
    .filter((field) => !standard.has(field))
    .map((field) => field.key);

  return {
    consentText: configuredCapture?.consentText || defaultCapture.consentText,
    done: configuredCapture?.done || defaultCapture.done,
    steps: [
      {
        fields: [name?.key, phone?.key, email?.key].filter(
          (key): key is string => Boolean(key),
        ),
        label: "Seus dados",
        note: "Ao continuar, seus dados de contato já ficam registrados com a campanha.",
        submitLabel: "Continuar",
        subtitle: "É rápido e seus dados ficam protegidos.",
        title: "Conte um pouco sobre você",
      },
      {
        fields: [
          cep?.key,
          neighborhood?.key,
          city?.key,
          state?.key,
          ...customKeys,
        ].filter((key): key is string => Boolean(key)),
        label: "Endereço",
        note: "Os campos de endereço completam seu cadastro no mesmo registro.",
        submitLabel: "Finalizar",
        subtitle: "Use o CEP para preencher o endereço automaticamente.",
        title: "Complete seu endereço",
      },
    ],
  };
}

export function normalizePublicFormConfiguration(
  formConfig: unknown,
  settings: unknown
): PublicFormConfiguration {
  const form = record(formConfig);
  void settings;
  const configuredFields = Array.isArray(form?.fields) ? form.fields : null;

  const seenKeys = new Set<string>();
  const normalizedFields = (configuredFields ?? [])
    .slice(0, 24)
    .map(normalizeField)
    .filter((field): field is CampaignFormField => {
      if (!field || seenKeys.has(field.key)) return false;
      seenKeys.add(field.key);
      return true;
    });
  const fields = progressiveFields(normalizedFields);
  const capture = normalizeCapture(form?.capture);

  return {
    capture: progressiveCapture(capture, fields),
    collectAddress: true,
    fields,
    legacy: !configuredFields,
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
