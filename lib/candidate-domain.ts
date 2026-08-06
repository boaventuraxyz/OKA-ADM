import { normalizeCandidateSlug } from "@/lib/candidate-slug";

const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$/;

function canonicalHostname(hostname: string) {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized;
}

export function normalizeRequestHostname(value: string | null | undefined) {
  const candidate = value?.split(",")[0]?.trim();
  if (!candidate) return null;

  try {
    return canonicalHostname(new URL(`http://${candidate}`).hostname);
  } catch {
    return null;
  }
}

export function requestHostnameUsesWww(value: string | null | undefined) {
  const candidate = value?.split(",")[0]?.trim();
  if (!candidate) return false;

  try {
    return new URL(`http://${candidate}`).hostname.toLowerCase().startsWith("www.");
  } catch {
    return false;
  }
}

export function normalizeCandidateDomain(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.port ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const hostname = canonicalHostname(url.hostname);
    return hostname.length <= 253 && DOMAIN_PATTERN.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function isPlatformHostname(hostname: string | null | undefined) {
  if (!hostname) return true;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".vercel.app")
  );
}

export function candidateDomainMatches(
  requestHostname: string | null | undefined,
  configuredDomain: string | null | undefined
) {
  const requestDomain = requestHostname
    ? canonicalHostname(requestHostname)
    : null;
  const candidateDomain = normalizeCandidateDomain(configuredDomain);
  return Boolean(requestDomain && candidateDomain && requestDomain === candidateDomain);
}

export function publicCampaignHref(
  campaignId: string,
  configuredDomain: string | null | undefined
) {
  const domain = normalizeCandidateDomain(configuredDomain);
  const encodedId = encodeURIComponent(campaignId);
  return domain
    ? `https://${domain}/${encodedId}`
    : `/formulario/${encodedId}`;
}

export function publicCandidateHubHref(
  configuredDomain: string | null | undefined,
  publicSlug: string | null | undefined
) {
  const domain = normalizeCandidateDomain(configuredDomain);
  if (domain) return `https://${domain}`;

  const slug = normalizeCandidateSlug(publicSlug);
  return slug ? `/c/${encodeURIComponent(slug)}` : null;
}
