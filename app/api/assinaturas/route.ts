import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { campaignSignaturesCacheTag } from "@/lib/campaign-download";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
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

function jsonError(message: string, status: number, extraHeaders?: HeadersInit) {
  return NextResponse.json(
    { erro: message, sucesso: false },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...extraHeaders
      }
    }
  );
}

function validPhone(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length < 10 || numbers.length > 11 || /^(\d)\1+$/.test(numbers)) {
    return false;
  }
  const ddd = Number(numbers.slice(0, 2));
  return ddd >= 11 && ddd <= 99 && (numbers.length === 10 || numbers[2] === "9");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisicao nao permitida.", 403);
  }

  const contentType = request.headers.get("content-type") || "";
  if (
    !contentType.toLowerCase().startsWith("multipart/form-data") ||
    !requestBodyWithinLimit(request, MAX_BODY_BYTES)
  ) {
    return jsonError("Formato ou tamanho de requisicao invalido.", 413);
  }

  const rateLimit = consumeRateLimit("assinatura", request.headers, {
    limit: 10,
    windowMs: 60 * 1000
  });
  if (!rateLimit.allowed) {
    return jsonError("Muitas tentativas. Aguarde um minuto.", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
  }

  const formData = await readFormDataWithinLimit(request, MAX_BODY_BYTES);
  if (!formData) {
    return jsonError("Dados do formulario invalidos.", 400);
  }

  if (formText(formData, "website")) {
    return NextResponse.json({ sucesso: true }, { headers: { "Cache-Control": "no-store" } });
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
  );
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
  const numero = Number(numeroTexto);

  if (
    !campanhaId ||
    !isUuid(campanhaId) ||
    !nome ||
    nome.length < 5 ||
    nome.split(" ").length < 2 ||
    !telefone ||
    !validPhone(telefone) ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !endereco ||
    endereco.length < 3 ||
    !Number.isSafeInteger(numero) ||
    numero < 1 ||
    numero > 99_999_999 ||
    !complemento ||
    !cidade ||
    cidade.length < 2 ||
    !cep ||
    !/^\d{5}-?\d{3}$/.test(cep) ||
    !estado ||
    !/^[A-Z]{2}$/.test(estado)
  ) {
    return jsonError("Confira os dados informados.", 400);
  }

  const campanha = await getCampanhaSubmissionConfig(campanhaId);
  if (!campanha || !campaignAcceptsSignatures(campanha)) {
    return jsonError("Esta campanha nao esta recebendo assinaturas.", 409);
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
      return jsonError("Campanha nao encontrada neste dominio.", 404);
    }
  }
  const redirectUrl = normalizeCampaignWhatsappUrl(campanha.url_formulario);

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");

  try {
    await createAssinatura({
      campanha_id: campanhaId,
      nome_assinante: nome,
      numero_assinante: telefone,
      email_assinante: email,
      endereco_assinante: endereco,
      n_assinante: numero,
      complemento_assinante: complemento,
      cidade_assinante: cidade,
      cep_assinante: cep,
      estado_assinante: estado,
      ip_origem: (forwardedFor || realIp || null)?.slice(0, 64) || null,
      assinado_em: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.status === 409) {
      return jsonError("Esta assinatura ja foi registrada.", 409);
    }
    throw error;
  }
  revalidateTag(campaignSignaturesCacheTag(campanhaId), { expire: 0 });

  return NextResponse.json(
    { redirectUrl, sucesso: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
