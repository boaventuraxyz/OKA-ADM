import "server-only";

export const CAMPAIGN_REDIRECT_URL_MAX_LENGTH = 2048;

export function normalizeCampaignWhatsappUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw || raw.length > CAMPAIGN_REDIRECT_URL_MAX_LENGTH) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    const isWhatsappHost =
      hostname === "wa.me" ||
      hostname === "whatsapp.com" ||
      hostname.endsWith(".whatsapp.com");

    if (
      url.protocol !== "https:" ||
      !isWhatsappHost ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
