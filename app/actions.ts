"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/guards";
import { requireAdmin } from "@/lib/auth";
import { parseCampaignBackground } from "@/lib/campaign-background";
import { normalizeCandidateDomain } from "@/lib/candidate-domain";
import { normalizeCandidateSlug } from "@/lib/candidate-slug";
import { normalizeCampaignWhatsappUrl } from "@/lib/campaign-redirect";
import { normalizeCampaignTheme } from "@/lib/campaign-themes";
import {
  campaignCacheTag,
  publicCandidatesCacheTag
} from "@/lib/public-campaign";
import {
  createCampanha,
  createCandidato,
  deleteAssinatura,
  deleteCampanha,
  deleteCandidato,
  getAssinatura,
  getCampanha,
  SupabaseRequestError,
  updateCampanha,
  updateCandidato
} from "@/lib/supabase";
import { isUuid, multiline, singleLine } from "@/lib/validation";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.trim();
}

function nullableText(formData: FormData, name: string, maxLength: number) {
  const value = text(formData, name);
  if (!value) return null;
  const normalized = singleLine(value, maxLength);
  if (normalized === null) throw new Error("Campo invalido.");
  return normalized || null;
}

function nullableLongText(formData: FormData, name: string, maxLength: number) {
  const value = text(formData, name);
  if (!value) return null;
  const normalized = multiline(value, maxLength);
  if (normalized === null) throw new Error("Campo invalido.");
  return normalized || null;
}

function nullableNumber(formData: FormData, name: string, max: number) {
  const value = text(formData, name);
  if (!value) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > max) {
    throw new Error("Numero invalido.");
  }
  return number;
}

function nullableDate(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  if (value.length > 32 || !Number.isFinite(Date.parse(value))) {
    throw new Error("Data invalida.");
  }
  return value;
}

function campaignColor(formData: FormData) {
  const value = text(formData, "cor_destaque") || "#E05A5A";
  if (!/^#[0-9A-F]{6}$/i.test(value)) throw new Error("Cor invalida.");
  return value.toUpperCase();
}

class CampaignBackgroundInputError extends Error {}
class CampaignRedirectInputError extends Error {}
class CandidateDomainInputError extends Error {}
class CandidateSlugInputError extends Error {}

function candidateDomain(formData: FormData) {
  const raw = text(formData, "dominio_formularios");
  if (!raw) return null;
  const value = normalizeCandidateDomain(raw);
  if (!value) throw new CandidateDomainInputError("Dominio invalido.");
  return value;
}

function candidateSlug(formData: FormData, candidateName: string | null) {
  const raw = text(formData, "slug_publico") || candidateName;
  const value = normalizeCandidateSlug(raw);
  if (!value) throw new CandidateSlugInputError("Identificador publico invalido.");
  return value;
}

function candidateSaveErrorPath(error: unknown, path: string) {
  if (error instanceof CandidateDomainInputError) return `${path}?erro=dominio`;
  if (error instanceof CandidateSlugInputError) return `${path}?erro=slug`;
  if (!(error instanceof SupabaseRequestError)) return null;
  if (error.code === "PGRST204") return `${path}?erro=estrutura`;
  if (error.status === 400 || error.status === 409) return `${path}?erro=dados`;
  if (error.status === 401 || error.status === 403) return `${path}?erro=acesso`;
  return null;
}

function candidateAdminBasePath(formData: FormData) {
  return formData.get("candidate_ui") === "admin"
    ? "/admin/candidates"
    : "/candidatos";
}

function candidateEditPath(basePath: string, id: string) {
  return basePath === "/admin/candidates"
    ? `${basePath}/${id}/edit`
    : `${basePath}/${id}/editar`;
}

function campaignImage(formData: FormData, name: "imagem_fundo" | "imagem_lateral") {
  const value = formData.get(name);
  if (typeof value !== "string" || value.length === 0) return null;
  if (!parseCampaignBackground(value)) {
    throw new CampaignBackgroundInputError("Imagem de fundo invalida.");
  }
  return value;
}

function campaignTheme(formData: FormData) {
  const value = text(formData, "tema") || "1";
  const theme = normalizeCampaignTheme(value);
  if (String(theme) !== value) {
    throw new Error("Tema invalido.");
  }
  return theme;
}

class CampaignVideoInputError extends Error {}

function campaignVideoUrl(formData: FormData, name = "video_url") {
  const raw = text(formData, name);
  if (!raw) return null;
  if (raw.length > 2048 || !/^(https:\/\/|\/)/i.test(raw)) {
    throw new CampaignVideoInputError("Link do video invalido.");
  }
  return raw;
}

function campaignTheme4Fields(formData: FormData) {
  return {
    texto_faixa: nullableText(formData, "tema4_marca", 500),
    texto_contexto: nullableLongText(formData, "tema4_titulo_principal", 8000),
    texto_impacto: nullableText(formData, "tema4_impacto", 300),
    texto_impacto_apoio: nullableText(formData, "tema4_impacto_apoio", 500),
    titulo_topicos: nullableText(formData, "tema4_relato_titulo", 200),
    texto_topicos: nullableLongText(formData, "tema4_relato_texto", 8000),
    video_url: campaignVideoUrl(formData, "tema4_video_principal"),
    legenda_video: nullableText(formData, "tema4_video_legenda", 300),
    titulo_assinar: nullableText(formData, "tema4_assinar_titulo", 200),
    texto_assinar: nullableLongText(formData, "tema4_assinar_texto", 2000),
    texto_compartilhar: nullableText(formData, "tema4_compartilhar", 500)
  };
}

function campaignTheme3Fields(formData: FormData) {
  return {
    texto_faixa: nullableText(formData, "texto_faixa", 500),
    titulo_topicos: nullableText(formData, "titulo_topicos", 200),
    texto_topicos_intro: nullableLongText(formData, "texto_topicos_intro", 2000),
    texto_topicos: nullableLongText(formData, "texto_topicos", 8000),
    titulo_citacao: nullableText(formData, "titulo_citacao", 200),
    texto_citacao: nullableLongText(formData, "texto_citacao", 2000),
    nota_citacao: nullableLongText(formData, "nota_citacao", 1000),
    titulo_video: nullableText(formData, "titulo_video", 200),
    video_url: campaignVideoUrl(formData),
    texto_video: nullableLongText(formData, "texto_video", 4000),
    legenda_video: nullableText(formData, "legenda_video", 300),
    nota_video: nullableLongText(formData, "nota_video", 1000),
    titulo_assinar: nullableText(formData, "titulo_assinar", 200),
    texto_assinar: nullableLongText(formData, "texto_assinar", 2000),
    texto_compartilhar: nullableText(formData, "texto_compartilhar", 500)
  };
}

function campaignRedirectUrl(formData: FormData) {
  const raw = text(formData, "url_formulario");
  if (!raw) return null;
  const value = normalizeCampaignWhatsappUrl(raw);
  if (value === null) {
    throw new CampaignRedirectInputError("Link do WhatsApp invalido.");
  }
  return value;
}

function campaignSaveErrorPath(error: unknown, path: string) {
  if (error instanceof CampaignBackgroundInputError) return `${path}?erro=imagem`;
  if (error instanceof CampaignRedirectInputError) return `${path}?erro=whatsapp`;
  if (error instanceof CampaignVideoInputError) return `${path}?erro=video`;
  if (!(error instanceof SupabaseRequestError)) return null;
  if (error.code === "PGRST204") return `${path}?erro=estrutura`;
  if (error.status === 400 || error.status === 409) return `${path}?erro=dados`;
  if (error.status === 401 || error.status === 403) return `${path}?erro=acesso`;
  return null;
}

function requiredUuid(formData: FormData, name = "id") {
  const value = text(formData, name);
  if (!isUuid(value)) throw new Error("Identificador invalido.");
  return value;
}

function nullableUuid(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  if (!isUuid(value)) throw new Error("Identificador invalido.");
  return value;
}

export async function createCandidatoAction(formData: FormData) {
  await requireRole(["master", "admin"]);
  const basePath = candidateAdminBasePath(formData);
  const nome = nullableText(formData, "nome", 120);
  try {
    await createCandidato({
      nome,
      partido: nullableText(formData, "partido", 80),
      cargo: nullableText(formData, "cargo", 100),
      estado: nullableText(formData, "estado", 60),
      municipio: nullableText(formData, "municipio", 120),
      dominio_formularios: candidateDomain(formData),
      slug_publico: candidateSlug(formData, nome)
    });
  } catch (error) {
    const errorPath = candidateSaveErrorPath(
      error,
      basePath === "/admin/candidates" ? `${basePath}/new` : `${basePath}/novo`
    );
    if (errorPath) redirect(errorPath);
    throw error;
  }
  updateTag(publicCandidatesCacheTag);
  revalidatePath("/candidatos");
  revalidatePath("/admin/candidates");
  redirect(basePath);
}

export async function updateCandidatoAction(formData: FormData) {
  await requireRole(["master", "admin"]);
  const basePath = candidateAdminBasePath(formData);
  const id = requiredUuid(formData);
  const nome = nullableText(formData, "nome", 120);
  try {
    await updateCandidato(id, {
      nome,
      partido: nullableText(formData, "partido", 80),
      cargo: nullableText(formData, "cargo", 100),
      estado: nullableText(formData, "estado", 60),
      municipio: nullableText(formData, "municipio", 120),
      dominio_formularios: candidateDomain(formData),
      slug_publico: candidateSlug(formData, nome)
    });
  } catch (error) {
    const errorPath = candidateSaveErrorPath(error, candidateEditPath(basePath, id));
    if (errorPath) redirect(errorPath);
    throw error;
  }
  updateTag(publicCandidatesCacheTag);
  revalidatePath("/candidatos");
  revalidatePath("/admin/candidates");
  redirect(basePath);
}

export async function deleteCandidatoAction(formData: FormData) {
  await requireRole(["master", "admin"]);
  await deleteCandidato(requiredUuid(formData));
  updateTag(publicCandidatesCacheTag);
  revalidatePath("/candidatos");
  revalidatePath("/admin/candidates");
}

export async function createCampanhaAction(formData: FormData) {
  await requireAdmin();
  try {
    const theme = campaignTheme(formData);
    await createCampanha({
      titulo: nullableText(formData, "titulo", 200),
      descricao: nullableLongText(formData, "descricao", 5000),
      candidato_id: nullableUuid(formData, "candidato_id"),
      ativa: formData.get("ativa") === "on",
      inicio_em: nullableDate(formData, "inicio_em"),
      fim_em: nullableDate(formData, "fim_em"),
      assinaturas_meta: nullableNumber(formData, "assinaturas_meta", 1_000_000_000),
      texto_form: nullableText(formData, "texto_form", 200),
      texto_dot: nullableText(formData, "texto_dot", 80),
      destaque_primario: nullableText(formData, "destaque_primario", 160),
      destaque_secundario: nullableText(formData, "destaque_secundario", 160),
      cor_destaque: campaignColor(formData),
      imagem_fundo: campaignImage(formData, "imagem_fundo"),
      imagem_lateral: campaignImage(formData, "imagem_lateral"),
      tema: theme,
      texto_contexto: nullableLongText(formData, "texto_contexto", 8000),
      texto_proposta: nullableLongText(formData, "texto_proposta", 4000),
      texto_conclusao: nullableLongText(formData, "texto_conclusao", 4000),
      texto_impacto: nullableText(formData, "texto_impacto", 300),
      texto_impacto_apoio: nullableText(formData, "texto_impacto_apoio", 500),
      ...(theme === 4 ? campaignTheme4Fields(formData) : campaignTheme3Fields(formData)),
      url_formulario: campaignRedirectUrl(formData)
    });
  } catch (error) {
    const errorPath = campaignSaveErrorPath(error, "/campanhas/novo");
    if (errorPath) redirect(errorPath);
    throw error;
  }
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function updateCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredUuid(formData);
  try {
    const theme = campaignTheme(formData);
    await updateCampanha(id, {
      titulo: nullableText(formData, "titulo", 200),
      descricao: nullableLongText(formData, "descricao", 5000),
      candidato_id: nullableUuid(formData, "candidato_id"),
      ativa: formData.get("ativa") === "on",
      inicio_em: nullableDate(formData, "inicio_em"),
      fim_em: nullableDate(formData, "fim_em"),
      assinaturas_meta: nullableNumber(formData, "assinaturas_meta", 1_000_000_000),
      texto_form: nullableText(formData, "texto_form", 200),
      texto_dot: nullableText(formData, "texto_dot", 80),
      destaque_primario: nullableText(formData, "destaque_primario", 160),
      destaque_secundario: nullableText(formData, "destaque_secundario", 160),
      cor_destaque: campaignColor(formData),
      imagem_fundo: campaignImage(formData, "imagem_fundo"),
      imagem_lateral: campaignImage(formData, "imagem_lateral"),
      tema: theme,
      texto_contexto: nullableLongText(formData, "texto_contexto", 8000),
      texto_proposta: nullableLongText(formData, "texto_proposta", 4000),
      texto_conclusao: nullableLongText(formData, "texto_conclusao", 4000),
      texto_impacto: nullableText(formData, "texto_impacto", 300),
      texto_impacto_apoio: nullableText(formData, "texto_impacto_apoio", 500),
      ...(theme === 4 ? campaignTheme4Fields(formData) : campaignTheme3Fields(formData)),
      url_formulario: campaignRedirectUrl(formData)
    });
  } catch (error) {
    const errorPath = campaignSaveErrorPath(error, `/campanhas/${id}/editar`);
    if (errorPath) redirect(errorPath);
    throw error;
  }
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function toggleCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredUuid(formData);
  const campanha = await getCampanha(id);
  if (campanha) {
    await updateCampanha(id, { ativa: !(campanha.ativa ?? false) });
    updateTag(campaignCacheTag(id));
    revalidatePath("/campanhas");
  }
}

export async function deleteCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredUuid(formData);
  await deleteCampanha(id);
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");
}

export async function deleteAssinaturaAction(formData: FormData) {
  await requireRole(["master", "admin"]);
  const id = requiredUuid(formData);
  const assinatura = await getAssinatura(id);
  if (!assinatura || !isUuid(assinatura.campanha_id)) return;

  await deleteAssinatura(id);
  const campanhaId = assinatura.campanha_id;
  revalidatePath(`/assinaturas?campanhaId=${campanhaId}`);
  redirect(`/assinaturas?campanhaId=${campanhaId}`);
}
