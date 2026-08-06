import type { Candidato } from "@/lib/types";

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeCandidateSlug(value: string | null | undefined) {
  if (!value?.trim()) return null;

  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug && PUBLIC_SLUG_PATTERN.test(slug) ? slug : null;
}

function candidateBaseSlug(candidate: Candidato) {
  return (
    normalizeCandidateSlug(candidate.slug_publico) ||
    normalizeCandidateSlug(candidate.nome) ||
    `candidato-${candidate.id.slice(0, 8).toLowerCase()}`
  );
}

export function candidatePublicSlug(
  candidate: Candidato,
  candidates: Candidato[] = [candidate]
) {
  const baseSlug = candidateBaseSlug(candidate);
  const hasDuplicate =
    candidates.filter((item) => candidateBaseSlug(item) === baseSlug).length > 1;

  return hasDuplicate
    ? `${baseSlug.slice(0, 71).replace(/-+$/g, "")}-${candidate.id
        .slice(0, 8)
        .toLowerCase()}`
    : baseSlug;
}

export function findCandidateByPublicSlug(
  candidates: Candidato[],
  requestedSlug: string
) {
  const normalized = normalizeCandidateSlug(requestedSlug);
  if (!normalized) return null;

  const exact = candidates.find(
    (candidate) => candidatePublicSlug(candidate, candidates) === normalized
  );
  if (exact) return exact;

  const compact = normalized.replace(/-/g, "");
  return (
    candidates.find((candidate) => {
      const baseSlug = candidateBaseSlug(candidate);
      const baseIsUnique =
        candidates.filter((item) => candidateBaseSlug(item) === baseSlug).length === 1;
      return baseIsUnique && baseSlug.replace(/-/g, "") === compact;
    }) ?? null
  );
}
