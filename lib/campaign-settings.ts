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
