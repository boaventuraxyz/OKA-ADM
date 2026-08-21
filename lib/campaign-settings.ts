/** Leitura dos ajustes gravados em `campanhas.settings`. */

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * O compartilhamento fica ligado por padrão: campanhas antigas foram salvas sem
 * a chave e continuam exibindo as chamadas de compartilhamento.
 */
export function campaignAllowsSharing(settings: unknown) {
  const value = record(settings)?.allow_sharing;
  return typeof value === "boolean" ? value : true;
}

/**
 * Número do candidato (ex.: "2211"). Fica em `settings` em vez de coluna
 * própria, no mesmo padrão de `title_highlights` e `video_carousel`, porque só
 * o tema Bandeira o exibe.
 */
export function parseCandidateNumber(settings: unknown) {
  const value = record(settings)?.candidate_number;
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits || null;
}
