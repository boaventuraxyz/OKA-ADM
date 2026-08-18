import { NextResponse } from "next/server";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import {
  isValidCampaignFormResponse,
  normalizePublicFormConfiguration,
  resolveStandardFormFields,
  type CampaignFormField,
} from "@/features/forms/config";
import {
  candidateDomainMatches,
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";
import { normalizeCampaignWhatsappUrl } from "@/lib/campaign-redirect";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  isSameOrigin,
  readFormDataWithinLimit,
  requestBodyWithinLimit
} from "@/lib/request-security";
import {
  createAssinatura,
  getCampanhaSubmissionConfig,
  getCandidato,
  SupabaseRequestError
} from "@/lib/supabase";
import { formText, isUuid, singleLine } from "@/lib/validation";

const MAX_BODY_BYTES = 32 * 1024;

function jsonError(
  code: string,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
      // Compatibility with public forms deployed before the API contract.
      erro: message,
      sucesso: false,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...extraHeaders
      }
    }
  );
}

function jsonSuccess<T extends Record<string, unknown>>(data: T) {
  return NextResponse.json(
    { success: true, data, ...data, sucesso: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function validPhone(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length < 10 || numbers.length > 11 || /^(\d)\1+$/.test(numbers)) {
    return false;
  }
  const ddd = Number(numbers.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return numbers.length === 11 ? numbers[2] === "9" : /^[1-8]$/.test(numbers[2]);
}

function validConfiguredValue(
  field: CampaignFormField | null,
  value: string | null | undefined,
  validator: (candidate: string) => boolean,
) {
  if (!field) return true;
  if (!value) return !field.required;
  return validator(value);
}

function parseConfiguredResponses(
  rawValue: string,
  fields: CampaignFormField[],
): Record<string, string | boolean> | null {
  let source: Record<string, unknown> = {};

  if (rawValue) {
    if (rawValue.length > 10_000) return null;
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      source = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  const responses: Record<string, string | boolean> = {};
  for (const field of fields) {
    const raw = source[field.key];
    const value =
      field.type === "checkbox"
        ? raw === true
        : typeof raw === "string"
          ? raw.trim().slice(0, field.type === "textarea" ? 2000 : 200)
          : "";

    if (!isValidCampaignFormResponse(field, value)) return null;
    if (value !== "" && value !== false) responses[field.key] = value;
  }

  return responses;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("ORIGIN_NOT_ALLOWED", "Origem da requisicao nao permitida.", 403);
  }

  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.toLowerCase().startsWith("multipart/form-data") ||
    !requestBodyWithinLimit(request, MAX_BODY_BYTES)
  ) {
    return jsonError("INVALID_REQUEST", "Formato ou tamanho de requisicao invalido.", 413);
  }

  const rateLimit = consumeRateLimit("assinatura", request.headers, {
    limit: 10,
    windowMs: 60 * 1000
  });
  if (!rateLimit.allowed) {
    return jsonError("RATE_LIMITED", "Muitas tentativas. Aguarde um minuto.", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
  }

  const formData = await readFormDataWithinLimit(request, MAX_BODY_BYTES);
  if (!formData) {
    return jsonError("INVALID_FORM_DATA", "Dados do formulario invalidos.", 400);
  }

  if (formText(formData, "website")) {
    return jsonSuccess({ accepted: true });
  }

  const campanhaId = singleLine(
    formText(formData, "campanha_id", "CampanhaId"),
    36
  );
  const nome = singleLine(
    formText(formData, "nome_assinante", "NomeAssinante"),
    120
  );
  const telefone = singleLine(
    formText(formData, "numero_assinante", "NumeroAssinante"),
    24
  );
  const email = singleLine(
    formText(formData, "email_assinante", "EmailAssinante"),
    254
  )?.toLowerCase();
  const endereco = singleLine(
    formText(formData, "endereco_assinante", "EnderecoAssinante"),
    160
  );
  const numeroTexto = singleLine(
    formText(formData, "n_assinante", "NAssinante"),
    8
  );
  const complemento = singleLine(
    formText(formData, "complemento_assinante", "ComplementoAssinante"),
    120
  ) || null;
  const cidade = singleLine(
    formText(formData, "cidade_assinante", "CidadeAssinante"),
    100
  );
  const cep = singleLine(
    formText(formData, "cep_assinante", "CepAssinante"),
    9
  );
  const estado = singleLine(
    formText(formData, "estado_assinante", "EstadoAssinante"),
    2
  )?.toUpperCase();
  const consentimento = singleLine(
    formText(formData, "consentimento", "Consentimento"),
    16
  );
  const numero = numeroTexto ? Number(numeroTexto) : null;

  if (!campanhaId || !isUuid(campanhaId) || consentimento !== "sim") {
    return jsonError("VALIDATION_ERROR", "Confira os dados informados.", 400);
  }

  const campanha = await getCampanhaSubmissionConfig(campanhaId);
  if (!campanha || !campaignAcceptsSignatures(campanha)) {
    return jsonError(
      "CAMPAIGN_NOT_ACCEPTING_SIGNATURES",
      "Esta campanha nao esta recebendo assinaturas.",
      409,
    );
  }

  const requestHostname = normalizeRequestHostname(
    request.headers.get("host") ||
      request.headers.get("x-forwarded-host") ||
      new URL(request.url).host
  );
  if (!isPlatformHostname(requestHostname)) {
    const candidato = campanha.candidato_id
      ? await getCandidato(campanha.candidato_id)
      : null;
    if (
      !candidato ||
      !candidateDomainMatches(requestHostname, candidato.dominio_formularios)
    ) {
      return jsonError(
        "CAMPAIGN_NOT_FOUND",
        "Campanha nao encontrada neste dominio.",
        404,
      );
    }
  }

  const configuration = normalizePublicFormConfiguration(
    campanha.form_config,
    campanha.settings
  );
  const fields = resolveStandardFormFields(configuration);
  const responses = parseConfiguredResponses(
    formText(formData, "responses"),
    fields.custom
  );
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cepPattern = /^\d{5}-?\d{3}$/;
  const statePattern = /^[A-Z]{2}$/;
  const validAddress =
    !configuration.collectAddress ||
    (Boolean(endereco && endereco.length >= 3) &&
      Number.isSafeInteger(numero) &&
      numero !== null &&
      numero >= 1 &&
      numero <= 99_999_999 &&
      Boolean(cidade && cidade.length >= 2) &&
      Boolean(cep && cepPattern.test(cep)) &&
      Boolean(estado && statePattern.test(estado)));

  if (
    responses === null ||
    !validConfiguredValue(
      fields.name,
      nome,
      (value) => value.length >= 5 && value.trim().split(/\s+/).length >= 2
    ) ||
    !validConfiguredValue(fields.phone, telefone, validPhone) ||
    !validConfiguredValue(fields.email, email, (value) => emailPattern.test(value)) ||
    !validConfiguredValue(fields.cep, cep, (value) => cepPattern.test(value)) ||
    !validConfiguredValue(fields.city, cidade, (value) => value.length >= 2) ||
    !validConfiguredValue(fields.state, estado, (value) => statePattern.test(value)) ||
    !validAddress
  ) {
    return jsonError("VALIDATION_ERROR", "Confira os dados informados.", 400);
  }

  const redirectUrl = normalizeCampaignWhatsappUrl(campanha.url_formulario);

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");

  try {
    await createAssinatura({
      campanha_id: campanhaId,
      nome_assinante: fields.name ? nome || null : null,
      numero_assinante: fields.phone ? telefone || null : null,
      email_assinante: fields.email ? email || null : null,
      endereco_assinante: configuration.collectAddress ? endereco || null : null,
      n_assinante: configuration.collectAddress ? numero : null,
      complemento_assinante: configuration.collectAddress ? complemento : null,
      cidade_assinante:
        fields.city || configuration.collectAddress ? cidade || null : null,
      cep_assinante: fields.cep || configuration.collectAddress ? cep || null : null,
      estado_assinante:
        fields.state || configuration.collectAddress ? estado || null : null,
      ip_origem: (forwardedFor || realIp || null)?.slice(0, 64) || null,
      assinado_em: new Date().toISOString(),
      consented_at: new Date().toISOString(),
      metadata: {
        form_version: configuration.legacy ? 0 : 1,
        legacy_form: configuration.legacy,
      },
      responses,
      source: "public_form",
      user_agent: singleLine(request.headers.get("user-agent") || "", 512) || null
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.status === 409) {
      return jsonError(
        "DUPLICATE_SIGNATURE",
        "Esta assinatura ja foi registrada.",
        409,
      );
    }
    return jsonError(
      "SUBMISSION_FAILED",
      "Nao foi possivel registrar a assinatura agora.",
      502,
    );
  }
  return jsonSuccess({ redirectUrl });
}
