"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSession, getAdminPassword, requireAdmin } from "@/lib/auth";
import { campaignCacheTag } from "@/lib/public-campaign";
import {
  createCampanha,
  createCandidato,
  deleteAssinatura,
  deleteCampanha,
  deleteCandidato,
  getCampanha,
  updateCampanha,
  updateCandidato
} from "@/lib/supabase";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.trim();
}

function rawText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value.length ? value : null;
}

function nullableNumber(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableDate(formData: FormData, name: string) {
  const value = text(formData, name);
  return value.length ? value : null;
}

export async function loginAction(formData: FormData) {
  const password = getAdminPassword();
  const senha = text(formData, "senha");

  if (!password) {
    redirect("/login?erro=config");
  }

  if (senha !== password) {
    redirect("/login?erro=senha");
  }

  await createAdminSession();
  redirect("/");
}

export async function createCandidatoAction(formData: FormData) {
  await requireAdmin();
  await createCandidato({
    nome: nullableText(formData, "nome"),
    partido: nullableText(formData, "partido"),
    cargo: nullableText(formData, "cargo"),
    estado: nullableText(formData, "estado"),
    municipio: nullableText(formData, "municipio")
  });
  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function updateCandidatoAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await updateCandidato(id, {
    nome: nullableText(formData, "nome"),
    partido: nullableText(formData, "partido"),
    cargo: nullableText(formData, "cargo"),
    estado: nullableText(formData, "estado"),
    municipio: nullableText(formData, "municipio")
  });
  revalidatePath("/candidatos");
  redirect("/candidatos");
}

export async function deleteCandidatoAction(formData: FormData) {
  await requireAdmin();
  await deleteCandidato(text(formData, "id"));
  revalidatePath("/candidatos");
}

export async function createCampanhaAction(formData: FormData) {
  await requireAdmin();
  await createCampanha({
    titulo: nullableText(formData, "titulo"),
    descricao: nullableText(formData, "descricao"),
    candidato_id: nullableText(formData, "candidato_id"),
    ativa: formData.get("ativa") === "on",
    inicio_em: nullableDate(formData, "inicio_em"),
    fim_em: nullableDate(formData, "fim_em"),
    assinaturas_meta: nullableNumber(formData, "assinaturas_meta"),
    texto_form: nullableText(formData, "texto_form")
  });
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function updateCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await updateCampanha(id, {
    titulo: nullableText(formData, "titulo"),
    descricao: nullableText(formData, "descricao"),
    candidato_id: nullableText(formData, "candidato_id"),
    ativa: formData.get("ativa") === "on",
    inicio_em: nullableDate(formData, "inicio_em"),
    fim_em: nullableDate(formData, "fim_em"),
    assinaturas_meta: nullableNumber(formData, "assinaturas_meta"),
    texto_form: nullableText(formData, "texto_form")
  });
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function toggleCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const campanha = await getCampanha(id);
  if (campanha) {
    await updateCampanha(id, { ativa: !(campanha.ativa ?? false) });
    updateTag(campaignCacheTag(id));
    revalidatePath("/campanhas");
  }
}

export async function deleteCampanhaAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await deleteCampanha(id);
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");
}

export async function updateCampanhaHtmlAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const html = rawText(formData, "html");
  const encoded = Buffer.from(html, "utf8").toString("base64");
  await updateCampanha(id, { html: encoded });
  updateTag(campaignCacheTag(id));
  revalidatePath("/campanhas");
  redirect("/campanhas");
}

export async function deleteAssinaturaAction(formData: FormData) {
  await requireAdmin();
  const campanhaId = text(formData, "campanha_id");
  await deleteAssinatura(text(formData, "id"));
  revalidatePath(`/assinaturas?campanhaId=${campanhaId}`);
  redirect(`/assinaturas?campanhaId=${campanhaId}`);
}
