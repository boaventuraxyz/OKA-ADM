import "server-only";

import { requireActiveProfile } from "@/features/auth/guards";
import { candidatePublicSlug } from "@/lib/candidate-slug";
import { paginationFor, positiveInteger } from "@/lib/pagination";
import { listCandidatos } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase/server";
import type { Candidato } from "@/lib/types";

export type CandidateAdminRow = Candidato;
export type CandidateListItem = Omit<Candidato, "nome"> & {
  nome: string;
  publicSlug: string;
};

export type CandidateOption = {
  id: string;
  nome: string;
  numero: string | null;
  partido: string | null;
};

export async function listCandidates(page = 1, pageSize = 20) {
  await requireActiveProfile();
  const safePage = positiveInteger(page, 1);
  const safePageSize = positiveInteger(pageSize, 20, 50);
  const candidates = (await listCandidatos()).sort((left, right) =>
    (left.nome ?? "").localeCompare(right.nome ?? "", "pt-BR")
  );
  const total = candidates.length;
  const pagination = paginationFor(total, safePage, safePageSize);
  const currentPage = pagination.page;
  const from = (currentPage - 1) * safePageSize;
  const items: CandidateListItem[] = candidates
    .slice(from, from + safePageSize)
    .map((candidate) => ({
      ...candidate,
      nome: candidate.nome?.trim() || "Candidato sem nome",
      publicSlug: candidatePublicSlug(candidate, candidates)
    }));

  return {
    items,
    page: currentPage,
    pageSize: pagination.pageSize,
    total: pagination.total,
    pageCount: pagination.pageCount,
  };
}

export async function getCandidate(id: string): Promise<CandidateAdminRow | null> {
  await requireActiveProfile();
  const candidates = await listCandidatos();
  const candidate = candidates.find((item) => item.id === id);

  return candidate
    ? {
        ...candidate,
        slug_publico: candidatePublicSlug(candidate, candidates)
      }
    : null;
}

export async function listCandidateOptions(): Promise<CandidateOption[]> {
  await requireActiveProfile();
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("candidatos")
    .select("id, nome, numero, partido")
    .order("nome", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error("Não foi possível carregar os candidatos.", { cause: error });
  }

  return (data ?? [])
    .filter((candidate): candidate is typeof candidate & { nome: string } =>
      Boolean(candidate.nome?.trim())
    )
    .map((candidate) => ({
      id: candidate.id,
      nome: candidate.nome,
      numero: candidate.numero,
      partido: candidate.partido,
    }));
}
