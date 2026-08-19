import { NextResponse, type NextRequest } from "next/server";
import {
  isPlatformHostname,
  normalizeRequestHostname,
  requestHostnameUsesWww
} from "@/lib/candidate-domain";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const exactRedirects: Record<string, string> = {
  "/Login": "/login",
  "/Login/Index": "/login",
  "/Campanha": "/admin/campaigns",
  "/Campanha/Index": "/admin/campaigns",
  "/Campanha/Create": "/admin/campaigns/new",
  "/Candidato": "/admin/candidates",
  "/Candidato/Index": "/admin/candidates",
  "/Candidato/Create": "/admin/candidates/new",
  "/Assinatura": "/admin/leads",
  "/Assinatura/Index": "/admin/leads",
  "/Formulario": "/formulario",
  "/Formulario/Index": "/formulario",
  "/GrupoWpp": "/grupo-wpp",
  "/GrupoWpp/Index": "/grupo-wpp",
  "/GrupoWpp/Tias": "/grupo-wpp/tias",
  "/campanhas": "/admin/campaigns",
  "/campanhas/novo": "/admin/campaigns/new",
  "/assinaturas": "/admin/leads",
  "/temas": "/admin/themes"
};

const shortCampaignSlugPath = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;
const reservedCandidateShortSlugs = new Set([
  "admin",
  "api",
  "assinaturas",
  "auth",
  "c",
  "campanhas",
  "candidatos",
  "formulario",
  "formularios",
  "grupo-wpp",
  "login",
  "p",
  "temas",
  "theme-library"
]);

function isCandidatePublicPath(pathname: string) {
  return (
    pathname === "/formulario" ||
    pathname.startsWith("/formulario/") ||
    pathname.startsWith("/p/") ||
    pathname === "/formularios" ||
    pathname === "/Formulario" ||
    pathname.startsWith("/Formulario/") ||
    pathname === "/api/assinaturas" ||
    /^\/api\/campanhas\/[^/]+\/imagem(?:-lateral)?$/.test(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function configuredPlatformHostname() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return null;

  try {
    return normalizeRequestHostname(new URL(appUrl).host);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const exact = exactRedirects[pathname];
  const forwardedHost =
    request.headers.get("host") ||
    request.headers.get("x-forwarded-host") ||
    request.nextUrl.host;
  const hostname = normalizeRequestHostname(
    forwardedHost
  );
  const protocol = (
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "")
  ).toLowerCase();
  const configuredHostname = configuredPlatformHostname();
  const platformRequest =
    isPlatformHostname(hostname) ||
    Boolean(configuredHostname && hostname === configuredHostname);

  if (
    hostname &&
    !platformRequest &&
    (protocol !== "https" || requestHostnameUsesWww(forwardedHost))
  ) {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    secureUrl.hostname = hostname;
    secureUrl.port = "";
    return NextResponse.redirect(secureUrl, 308);
  }

  if (!platformRequest) {
    if (pathname === "/") {
      return NextResponse.rewrite(
        new URL(`/formularios${request.nextUrl.search}`, request.url)
      );
    }

    const shortCampaign = pathname.match(shortCampaignSlugPath);
    if (
      shortCampaign &&
      !isCandidatePublicPath(pathname) &&
      !reservedCandidateShortSlugs.has(shortCampaign[1]) &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return NextResponse.rewrite(
        new URL(
          `/formulario/${shortCampaign[1]}${request.nextUrl.search}`,
          request.url
        )
      );
    }

    if (!isCandidatePublicPath(pathname)) {
      return new NextResponse("Pagina nao encontrada.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow"
        }
      });
    }
  }

  const refreshedSession = platformRequest
    ? await refreshSupabaseSession(request)
    : null;
  const applySession = (response: NextResponse) =>
    refreshedSession?.apply(response) ?? response;
  const nextResponse = () =>
    applySession(
      refreshedSession
        ? NextResponse.next({
            request: { headers: refreshedSession.requestHeaders }
          })
        : NextResponse.next()
    );
  const rewriteResponse = (url: URL) =>
    applySession(
      refreshedSession
        ? NextResponse.rewrite(url, {
            request: { headers: refreshedSession.requestHeaders }
          })
        : NextResponse.rewrite(url)
    );

  if (request.method === "POST" && pathname === "/Formulario/Create") {
    return rewriteResponse(new URL("/api/assinaturas", request.url));
  }

  if (exact) {
    return applySession(
      NextResponse.redirect(new URL(exact + request.nextUrl.search, request.url))
    );
  }

  if (pathname === "/grupo-wpp" || pathname === "/grupo-wpp/") {
    return rewriteResponse(
      new URL("/legacy/grupo-wpp.html" + request.nextUrl.search, request.url)
    );
  }

  if (pathname === "/grupo-wpp/tias" || pathname === "/grupo-wpp/tias/") {
    return rewriteResponse(
      new URL("/legacy/tias-do-zap.html" + request.nextUrl.search, request.url)
    );
  }

  if (pathname === "/Scripts/cidades.js") {
    return rewriteResponse(
      new URL("/legacy/cidades.js" + request.nextUrl.search, request.url)
    );
  }

  const campanhaEdit = pathname.match(/^\/Campanha\/Edit\/([^/]+)$/);
  if (campanhaEdit) {
    return applySession(
      NextResponse.redirect(
        new URL(`/admin/campaigns/${campanhaEdit[1]}/edit`, request.url)
      )
    );
  }

  const legacyCampaignEdit = pathname.match(/^\/campanhas\/([^/]+)\/editar$/);
  if (legacyCampaignEdit) {
    return applySession(
      NextResponse.redirect(
        new URL(`/admin/campaigns/${legacyCampaignEdit[1]}/edit`, request.url),
        308
      )
    );
  }

  const candidatoEdit = pathname.match(/^\/Candidato\/Edit\/([^/]+)$/);
  if (candidatoEdit) {
    return applySession(
      NextResponse.redirect(
        new URL(`/admin/candidates/${candidatoEdit[1]}/edit`, request.url)
      )
    );
  }

  const assinaturaDetails = pathname.match(/^\/Assinatura\/Details\/([^/]+)$/);
  if (assinaturaDetails) {
    return applySession(
      NextResponse.redirect(
        new URL(`/admin/leads?lead=${assinaturaDetails[1]}`, request.url)
      )
    );
  }

  const formularioId = pathname.match(/^\/Formulario\/([^/]+)$/);
  if (formularioId) {
    return applySession(
      NextResponse.redirect(
        new URL(`/formulario/${formularioId[1]}`, request.url)
      )
    );
  }

  if (pathname === "/") {
    const response = applySession(
      NextResponse.redirect(new URL("/admin", request.url), 308)
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  return nextResponse();
}
