import { NextResponse, type NextRequest } from "next/server";
import {
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";

const exactRedirects: Record<string, string> = {
  "/Login": "/login",
  "/Login/Index": "/login",
  "/Campanha": "/campanhas",
  "/Campanha/Index": "/campanhas",
  "/Campanha/Create": "/campanhas/novo",
  "/Candidato": "/candidatos",
  "/Candidato/Index": "/candidatos",
  "/Candidato/Create": "/candidatos/novo",
  "/Assinatura": "/assinaturas",
  "/Assinatura/Index": "/assinaturas",
  "/Formulario": "/formulario",
  "/Formulario/Index": "/formulario",
  "/GrupoWpp": "/grupo-wpp",
  "/GrupoWpp/Index": "/grupo-wpp",
  "/GrupoWpp/Tias": "/grupo-wpp/tias"
};

const shortCampaignPath =
  /^\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;

function isCandidatePublicPath(pathname: string) {
  return (
    pathname === "/formulario" ||
    pathname.startsWith("/formulario/") ||
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const exact = exactRedirects[pathname];
  const hostname = normalizeRequestHostname(
    request.headers.get("host") ||
      request.headers.get("x-forwarded-host") ||
      request.nextUrl.host
  );

  if (!isPlatformHostname(hostname)) {
    if (pathname === "/") {
      return NextResponse.rewrite(
        new URL(`/formularios${request.nextUrl.search}`, request.url)
      );
    }

    const shortCampaign = pathname.match(shortCampaignPath);
    if (
      shortCampaign &&
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

  if (request.method === "POST" && pathname === "/Formulario/Create") {
    return NextResponse.rewrite(new URL("/api/assinaturas", request.url));
  }

  if (exact) {
    return NextResponse.redirect(new URL(exact + request.nextUrl.search, request.url));
  }

  if (pathname === "/grupo-wpp" || pathname === "/grupo-wpp/") {
    return NextResponse.rewrite(new URL("/legacy/grupo-wpp.html" + request.nextUrl.search, request.url));
  }

  if (pathname === "/grupo-wpp/tias" || pathname === "/grupo-wpp/tias/") {
    return NextResponse.rewrite(new URL("/legacy/tias-do-zap.html" + request.nextUrl.search, request.url));
  }

  if (pathname === "/Scripts/cidades.js") {
    return NextResponse.rewrite(new URL("/legacy/cidades.js" + request.nextUrl.search, request.url));
  }

  const campanhaEdit = pathname.match(/^\/Campanha\/Edit\/([^/]+)$/);
  if (campanhaEdit) {
    return NextResponse.redirect(new URL(`/campanhas/${campanhaEdit[1]}/editar`, request.url));
  }

  const candidatoEdit = pathname.match(/^\/Candidato\/Edit\/([^/]+)$/);
  if (candidatoEdit) {
    return NextResponse.redirect(new URL(`/candidatos/${candidatoEdit[1]}/editar`, request.url));
  }

  const assinaturaDetails = pathname.match(/^\/Assinatura\/Details\/([^/]+)$/);
  if (assinaturaDetails) {
    return NextResponse.redirect(new URL(`/assinaturas/${assinaturaDetails[1]}`, request.url));
  }

  const formularioId = pathname.match(/^\/Formulario\/([^/]+)$/);
  if (formularioId) {
    return NextResponse.redirect(new URL(`/formulario/${formularioId[1]}`, request.url));
  }

  if (pathname === "/") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  return NextResponse.next();
}
