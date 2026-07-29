import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const exact = exactRedirects[pathname];

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

  return NextResponse.next();
}
