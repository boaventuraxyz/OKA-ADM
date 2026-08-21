import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 4000;

export type TurnstileOutcome = "disabled" | "invalid" | "unavailable" | "valid";

/**
 * O widget do Turnstile só barra bot se o token for conferido no servidor. Sem
 * a chave secreta a verificação fica desligada, e o formulário segue aceitando
 * envios como antes.
 */
export function turnstileIsEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileOutcome> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return "disabled";
  if (!token) return "invalid";

  const body = new URLSearchParams({ response: token, secret });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      body,
      cache: "no-store",
      method: "POST",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return "unavailable";

    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? "valid" : "invalid";
  } catch {
    // Rede fora do ar não deve ser tratada como token falso: quem chama decide
    // se prefere recusar ou deixar passar.
    return "unavailable";
  }
}
