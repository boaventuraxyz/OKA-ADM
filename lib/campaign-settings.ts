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

export function normalizeCandidateNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

/**
 * Número do candidato (ex.: "2211"). Fica em `settings` em vez de coluna
 * própria, no mesmo padrão de `title_highlights` e `video_carousel`, porque só
 * o tema Bandeira o exibe.
 */
export function parseCandidateNumber(settings: unknown) {
  const value = record(settings)?.candidate_number;
  if (typeof value !== "string") return null;
  const digits = normalizeCandidateNumber(value);
  return digits || null;
}

export type BandeiraSectionLabels = {
  group: string;
  hero: string;
  support: string;
  topics: string;
};

const DEFAULT_BANDEIRA_LABELS: BandeiraSectionLabels = {
  group: "Grupo oficial",
  hero: "Movimento oficial",
  support: "Apoio",
  topics: "Bandeiras",
};

function sectionLabel(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 60)
    : fallback;
}

/**
 * Rótulos editoriais opcionais do tema Bandeira. Campanhas existentes mantêm
 * a linguagem original; páginas informativas podem descrever cada seção sem
 * herdar chamadas de mobilização que não correspondem ao seu conteúdo.
 */
export function parseBandeiraSectionLabels(settings: unknown): BandeiraSectionLabels {
  const source = record(record(settings)?.bandeira_labels);

  return {
    group: sectionLabel(source?.group, DEFAULT_BANDEIRA_LABELS.group),
    hero: sectionLabel(source?.hero, DEFAULT_BANDEIRA_LABELS.hero),
    support: sectionLabel(source?.support, DEFAULT_BANDEIRA_LABELS.support),
    topics: sectionLabel(source?.topics, DEFAULT_BANDEIRA_LABELS.topics),
  };
}

export type CampaignLegalFooter = {
  candidateCnpj: string;
  committee: string;
  contact: string;
  election: string;
  party: string;
  partyCnpj: string;
};

const LEGAL_FIELDS = [
  "candidateCnpj",
  "committee",
  "contact",
  "election",
  "party",
  "partyCnpj",
] as const;

function legalText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Rodapé de propaganda eleitoral. Fica em `settings` e não no repositório
 * porque traz dado pessoal do candidato (endereço e contato): assim a
 * informação vive só no banco e é editável pelo painel.
 */
export function parseCampaignLegalFooter(settings: unknown): CampaignLegalFooter | null {
  const source = record(record(settings)?.legal);
  if (!source) return null;

  const footer: CampaignLegalFooter = {
    candidateCnpj: legalText(source.candidateCnpj, 40),
    committee: legalText(source.committee, 400),
    contact: legalText(source.contact, 200),
    election: legalText(source.election, 300),
    party: legalText(source.party, 160),
    partyCnpj: legalText(source.partyCnpj, 40),
  };

  return LEGAL_FIELDS.some((field) => footer[field]) ? footer : null;
}
