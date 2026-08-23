import { apiError, apiSuccess } from "@/lib/api/response";
import { consumeRateLimit } from "@/lib/rate-limit";

type ViaCepPayload = {
  bairro?: unknown;
  erro?: boolean | string;
  localidade?: unknown;
  logradouro?: unknown;
  uf?: unknown;
};

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  const rateLimit = consumeRateLimit("cep", request.headers, {
    limit: 30,
    windowMs: 60 * 1000
  });
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Muitas consultas de CEP.", 429, {
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
    });
  }

  const { cep } = await params;
  const normalizedCep = cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(normalizedCep)) {
    return apiError("INVALID_CEP", "CEP inválido.", 400);
  }

  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${normalizedCep}/json/`,
      {
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(5_000)
      }
    );
    if (!response.ok) throw new Error("ViaCEP indisponível");

    const payload = (await response.json()) as ViaCepPayload;
    if (payload.erro === true || payload.erro === "true") {
      return apiError("CEP_NOT_FOUND", "CEP não encontrado.", 404);
    }

    return apiSuccess({
      city: safeText(payload.localidade, 100),
      neighborhood: safeText(payload.bairro, 120),
      state: safeText(payload.uf, 2).toUpperCase(),
      street: safeText(payload.logradouro, 160)
    });
  } catch {
    return apiError(
      "CEP_PROVIDER_UNAVAILABLE",
      "Consulta automática indisponível. Preencha o endereço manualmente.",
      502
    );
  }
}
