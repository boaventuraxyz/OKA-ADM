import "server-only";

import type { Assinatura, Campanha, Candidato } from "@/lib/types";

type SupabaseInit = RequestInit & {
  preferRepresentation?: boolean;
};

function getSupabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_KEY;

  if (!baseUrl || !key) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_KEY nas variaveis de ambiente.");
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
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(preferRepresentation ? { Prefer: "return=representation" } : {}),
      ...headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
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

export async function getCampanha(id: string) {
  const rows = await supabaseFetch<Campanha[]>(`/campanhas?id=eq.${qs(id)}&select=*`);
  return rows[0] ?? null;
}

export async function getCampanhaHtml(id: string) {
  const rows = await supabaseFetch<Pick<Campanha, "html">[]>(
    `/campanhas?id=eq.${qs(id)}&select=html`
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

export function countCandidatos() {
  return supabaseCount("/candidatos?select=id");
}

export function listCandidatosForSelect() {
  return supabaseFetch<Candidato[]>("/candidatos?select=id,nome,partido&order=nome.asc");
}

export async function getCandidato(id: string) {
  const rows = await supabaseFetch<Candidato[]>(`/candidatos?id=eq.${qs(id)}&select=*`);
  return rows[0] ?? null;
}

export async function createCandidato(payload: Partial<Candidato>) {
  await supabaseFetch<Candidato[]>("/candidatos", {
    method: "POST",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
}

export async function updateCandidato(id: string, payload: Partial<Candidato>) {
  await supabaseFetch<Candidato[]>(`/candidatos?id=eq.${qs(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
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
  await supabaseFetch<Assinatura[]>("/assinaturas", {
    method: "POST",
    body: JSON.stringify(payload),
    preferRepresentation: true
  });
}

export async function deleteAssinatura(id: string) {
  await supabaseFetch<void>(`/assinaturas?id=eq.${qs(id)}`, { method: "DELETE" });
}
