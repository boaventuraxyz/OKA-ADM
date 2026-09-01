import "server-only";

import { findCandidateByPublicSlug } from "@/lib/candidate-slug";
import type { Assinatura, Campanha, Candidato } from "@/lib/types";

type AssinaturaExport = Pick<
  Assinatura,
  | "nome_assinante"
  | "numero_assinante"
  | "email_assinante"
  | "endereco_assinante"
  | "n_assinante"
  | "complemento_assinante"
  | "cidade_assinante"
  | "cep_assinante"
  | "estado_assinante"
  | "ip_origem"
  | "assinado_em"
>;

type SupabaseInit = RequestInit & {
  preferRepresentation?: boolean;
};

export class SupabaseRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string
  ) {
    super(`Falha na comunicacao com o Supabase (${status}).`);
    this.name = "SupabaseRequestError";
  }
}

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!baseUrl || !key) {
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SECRET_KEY nas variaveis de ambiente."
    );
  }

  const legacyRole = (() => {
    if (key.startsWith("sb_")) return null;
    try {
      return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"))
        .role as string | undefined;
    } catch {
      return null;
    }
  })();

  if (
    !key.startsWith("sb_secret_") &&
    legacyRole !== "service_role"
  ) {
    throw new Error(
      "SUPABASE_SECRET_KEY deve ser uma Secret key ou uma chave service_role."
    );
  }

  return { baseUrl, key };
}

async function supabaseFetch<T>(path: string, init: SupabaseInit = {}): Promise<T> {
  const response = await supabaseRequest(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function supabaseRequest(path: string, init: SupabaseInit = {}) {
  const { baseUrl, key } = getSupabaseConfig();
  const { preferRepresentation, headers, ...rest } = init;

  const response = await fetch(`${baseUrl}/rest/v1${path}`, {
    ...rest,
    cache: "no-store",
    signal: rest.signal || AbortSignal.timeout(15_000),
    headers: {
      apikey: key,
      Accept: "application/json",
      ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(preferRepresentation ? { Prefer: "return=representation" } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let code: string | undefined;

    if (contentType.includes("application/json")) {
      try {
        const payload = (await response.json()) as { code?: unknown };
        if (typeof payload.code === "string" && payload.code.length <= 32) {
          code = payload.code;
        }
      } catch {
        // Keep database details private and fall back to the HTTP status.
      }
    }

    throw new SupabaseRequestError(response.status, code);
  }

  return response;
}

const qs = (value: string) => encodeURIComponent(value);

async function supabaseCount(path: string) {
  const response = await supabaseRequest(path, {
    method: "HEAD",
    headers: { Prefer: "count=exact" }
  });
  const total = response.headers.get("content-range")?.split("/").at(-1);
  return total && total !== "*" ? Number(total) : 0;
}

export function listCampanhas() {
  return supabaseFetch<Campanha[]>(
    "/campanhas?select=id,titulo,candidato_id,ativa,criado_em&order=criado_em.desc"
  );
}

export function listCampanhasDashboard() {
  return supabaseFetch<Campanha[]>(
    "/campanhas?select=id,titulo,ativa,inicio_em,fim_em,criado_em&order=criado_em.desc"
  );
}

export function listCampanhasForImport() {
  return supabaseFetch<Campanha[]>(
    "/campanhas?select=id,titulo,descricao,candidato_id,ativa,inicio_em,fim_em,assinaturas_meta,texto_form,texto_dot,destaque_primario,destaque_secundario,cor_destaque,url_formulario,tema,texto_contexto,texto_proposta,texto_conclusao,texto_impacto,texto_impacto_apoio&order=criado_em.desc"
  );
}

export async function getCampanha(id: string) {
  const rows = await supabaseFetch<Campanha[]>(`/campanhas?id=eq.${qs(id)}&select=*`);
  return rows[0] ?? null;
}

export async function getPublishedCampaignIdBySlug(slug: string) {
  const rows = await supabaseFetch<Array<{ id: string; slug: string }>>(
    `/campanhas?slug=eq.${qs(slug)}&status=eq.published&select=id,slug&limit=1`
  );
  return rows[0] ?? null;
}

export function listPublishedCampaignSitemap() {
  return supabaseFetch<Array<{ slug: string; updated_at: string }>>(
    "/campanhas?status=eq.published&slug=not.is.null&select=slug,updated_at&order=updated_at.desc&limit=5000"
  );
}

export async function getCampanhaBackground(id: string) {
  const rows = await supabaseFetch<
    Pick<Campanha, "ativa" | "fim_em" | "id" | "imagem_fundo" | "inicio_em">[]
  >(
    `/campanhas?id=eq.${qs(id)}&select=id,imagem_fundo,ativa,inicio_em,fim_em`
  );
  return rows[0] ?? null;
}

export async function getCampanhaDesktopImage(id: string) {
  const rows = await supabaseFetch<
    Pick<Campanha, "ativa" | "fim_em" | "id" | "imagem_desktop" | "inicio_em">[]
  >(
    `/campanhas?id=eq.${qs(id)}&select=id,imagem_desktop,ativa,inicio_em,fim_em`
  );
  return rows[0] ?? null;
}

export async function getCampanhaSideImage(id: string) {
  const rows = await supabaseFetch<
    Pick<Campanha, "ativa" | "fim_em" | "id" | "imagem_lateral" | "inicio_em">[]
  >(
    `/campanhas?id=eq.${qs(id)}&select=id,imagem_lateral,ativa,inicio_em,fim_em`
  );
  return rows[0] ?? null;
}

export async function getCampanhaTitle(id: string) {
  const rows = await supabaseFetch<Pick<Campanha, "id" | "titulo">[]>(
    `/campanhas?id=eq.${qs(id)}&select=id,titulo`
  );
  return rows[0] ?? null;
}

export async function getCampanhaSubmissionConfig(id: string) {
  const rows = await supabaseFetch<
    Pick<
      Campanha,
      | "ativa"
      | "candidato_id"
      | "fim_em"
      | "form_config"
      | "id"
      | "inicio_em"
      | "settings"
      | "url_formulario"
    >[]
  >(
    `/campanhas?id=eq.${qs(id)}&select=id,candidato_id,ativa,inicio_em,fim_em,url_formulario,form_config,settings`
  );
  return rows[0] ?? null;
}

export async function createCampanha(payload: Partial<Campanha>) {
  await supabaseFetch<Campanha[]>("/campanhas", {
    method: "POST",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
}

export async function updateCampanha(id: string, payload: Partial<Campanha>) {
  await supabaseFetch<Campanha[]>(`/campanhas?id=eq.${qs(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
}

export async function deleteCampanha(id: string) {
  await supabaseFetch<void>(`/campanhas?id=eq.${qs(id)}`, { method: "DELETE" });
}

export function listCandidatos() {
  return supabaseFetch<Candidato[]>("/candidatos?select=*&order=criado_em.desc");
}

export function upsertCampanhas(payloads: Array<Partial<Campanha>>) {
  return supabaseFetch<Campanha[]>("/campanhas?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(payloads),
    headers: {
      Prefer: "resolution=merge-duplicates,missing=default,return=representation"
    }
  });
}

export function countCandidatos() {
  return supabaseCount("/candidatos?select=id");
}

export function listCandidatosForSelect() {
  return supabaseFetch<Candidato[]>(
    "/candidatos?select=id,nome,partido,dominio_formularios&order=nome.asc"
  );
}

export async function getCandidatoByDomain(domain: string) {
  const rows = await supabaseFetch<Candidato[]>(
    `/candidatos?dominio_formularios=eq.${qs(domain)}&select=*&limit=1`
  );
  return rows[0] ?? null;
}

export async function getCandidatoByPublicSlug(slug: string) {
  const candidatos = await listCandidatos();
  return findCandidateByPublicSlug(candidatos, slug);
}

export function listPublicCampanhasByCandidate(candidateId: string) {
  return supabaseFetch<Array<Campanha & { slug: string }>>(
    `/campanhas?candidato_id=eq.${qs(candidateId)}&ativa=eq.true&slug=not.is.null&select=id,titulo,descricao,slug,candidato_id,ativa,inicio_em,fim_em,criado_em&order=criado_em.desc`
  );
}

export async function getCandidato(id: string) {
  const rows = await supabaseFetch<Candidato[]>(`/candidatos?id=eq.${qs(id)}&select=*`);
  return rows[0] ?? null;
}

function withoutCandidateSlug(payload: Partial<Candidato>) {
  const compatiblePayload = { ...payload };
  delete compatiblePayload.slug_publico;
  return compatiblePayload;
}

function isMissingCandidateSlugColumn(error: unknown) {
  return (
    error instanceof SupabaseRequestError &&
    error.status === 400 &&
    (error.code === "42703" || error.code === "PGRST204")
  );
}

export async function createCandidato(payload: Partial<Candidato>) {
  try {
    await supabaseFetch<Candidato[]>("/candidatos", {
      method: "POST",
      body: JSON.stringify(payload),
      preferRepresentation: true
    });
  } catch (error) {
    if (!("slug_publico" in payload) || !isMissingCandidateSlugColumn(error)) {
      throw error;
    }
    await supabaseFetch<Candidato[]>("/candidatos", {
      method: "POST",
      body: JSON.stringify(withoutCandidateSlug(payload)),
      preferRepresentation: true
    });
  }
}

export async function updateCandidato(id: string, payload: Partial<Candidato>) {
  try {
    await supabaseFetch<Candidato[]>(`/candidatos?id=eq.${qs(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      preferRepresentation: true
    });
  } catch (error) {
    if (!("slug_publico" in payload) || !isMissingCandidateSlugColumn(error)) {
      throw error;
    }
    await supabaseFetch<Candidato[]>(`/candidatos?id=eq.${qs(id)}`, {
      method: "PATCH",
      body: JSON.stringify(withoutCandidateSlug(payload)),
      preferRepresentation: true
    });
  }
}

export async function deleteCandidato(id: string) {
  await supabaseFetch<void>(`/candidatos?id=eq.${qs(id)}`, { method: "DELETE" });
}

export function countAssinaturas() {
  return supabaseCount("/assinaturas?select=id");
}

export function listAssinaturasByCampanha(campanhaId: string) {
  return supabaseFetch<Assinatura[]>(
    `/assinaturas?campanha_id=eq.${qs(campanhaId)}&select=*&order=assinado_em.desc`
  );
}

export function listAssinaturasExportByCampanha(campanhaId: string) {
  return supabaseFetch<AssinaturaExport[]>(
    `/assinaturas?campanha_id=eq.${qs(campanhaId)}&select=nome_assinante,numero_assinante,email_assinante,endereco_assinante,n_assinante,complemento_assinante,cidade_assinante,cep_assinante,estado_assinante,ip_origem,assinado_em&order=assinado_em.desc`
  );
}

export async function countAssinaturasByCampanha(campanhaId: string) {
  return supabaseCount(
    `/assinaturas?campanha_id=eq.${qs(campanhaId)}&select=id`
  );
}

export async function getAssinatura(id: string) {
  const rows = await supabaseFetch<Assinatura[]>(`/assinaturas?id=eq.${qs(id)}&select=*`);
  return rows[0] ?? null;
}

export async function createAssinatura(payload: Partial<Assinatura>) {
  const rows = await supabaseFetch<Assinatura[]>("/assinaturas", {
    method: "POST",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
  return rows[0] ?? null;
}

export async function updateAssinatura(
  id: string,
  campanhaId: string,
  payload: Partial<Assinatura>,
) {
  const rows = await supabaseFetch<Assinatura[]>(
    `/assinaturas?id=eq.${qs(id)}&campanha_id=eq.${qs(campanhaId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      preferRepresentation: true,
    },
  );
  return rows[0] ?? null;
}

export async function deleteAssinatura(id: string) {
  await supabaseFetch<void>(`/assinaturas?id=eq.${qs(id)}`, { method: "DELETE" });
}
