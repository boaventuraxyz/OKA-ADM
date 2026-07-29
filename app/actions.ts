"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { campaignSignaturesCacheTag } from "@/lib/campaign-download";
import { campaignCacheTag } from "@/lib/public-campaign";
import {
  createCampanha,
  createCandidato,
  deleteAssinatura,
  deleteCampanha,
  deleteCandidato,
  getAssinatura,
  getCampanha,
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
  await requireAdmin();
  await createCandidato({
    nome: nullableText(formData, "nome", 120),
    partido: nullableText(formData, "partido", 80),
    cargo: nullableText(formData, "cargo", 100),
    estado: nullableText(formData, "estado", 60),
    municipio: nullableText(formData, "municipio", 120)
  });
  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidatoAction(formData: FormData) {
  await requireAdmin();
  const id = requiredUuid(formData);
  await updateCandidato(id, {
    nome: nullableText(formData, "nome", 120),
    partido: nullableText(formData, "partido", 80),
    cargo: nullableText(formData, "cargo", 100),
    estado: nullableText(formData, "estado", 60),
    municipio: nullableText(formData, "municipio", 120)
  });
  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function deleteCandidatoAction(formData: FormData) {
  await requireAdmin();
  await deleteCandidato(requiredUuid(formData));
  revalidatePath("/candidatos");
}

export async function createCampanhaAction(formData: FormData) {
  await requireAdmin();
  await createCampanha({
    titulo: nullableText(formData, "titulo", 200),
    descricao: nullableLongText(formData, "descricao", 5000),
    candidato_id: nullableUuid(formData, "candidato_id"),
    ativa: formData.get("ativa") === "on",
    inicio_em: nullableDate(formData, "inicio_em"),
    fim_em: nullableDate(formData, "fim_em"),
    assinaturas_meta: nullableNumber(formData, "assinaturas_meta", 1_000_000_000),
    texto_form: nullableText(formData, "texto_form", 200)
  });
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function updateCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredUuid(formData);
  await updateCampanha(id, {
    titulo: nullableText(formData, "titulo", 200),
    descricao: nullableLongText(formData, "descricao", 5000),
    candidato_id: nullableUuid(formData, "candidato_id"),
    ativa: formData.get("ativa") === "on",
    inicio_em: nullableDate(formData, "inicio_em"),
    fim_em: nullableDate(formData, "fim_em"),
    assinaturas_meta: nullableNumber(formData, "assinaturas_meta", 1_000_000_000),
    texto_form: nullableText(formData, "texto_form", 200)
  });
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
  await requireAdmin();
  const id = requiredUuid(formData);
  const assinatura = await getAssinatura(id);
  if (!assinatura || !isUuid(assinatura.campanha_id)) return;

  await deleteAssinatura(id);
  const campanhaId = assinatura.campanha_id;
  updateTag(campaignSignaturesCacheTag(campanhaId));
  revalidatePath(`/assinaturas?campanhaId=${campanhaId}`);
  redirect(`/assinaturas?campanhaId=${campanhaId}`);
}
