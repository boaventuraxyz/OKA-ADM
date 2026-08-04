import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
import { normalizeCampaignWhatsappUrl } from "@/lib/campaign-redirect";
import type { Campanha, Candidato } from "@/lib/types";
import { isUuid, multiline, singleLine } from "@/lib/validation";

export const CAMPAIGN_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CAMPAIGN_IMPORT_MAX_ROWS = 200;

type Cell = string | number | boolean | Date | null;
type CampaignPayload = Partial<Campanha> & { titulo: string };

export type CampaignImportIssue = {
  line: number;
  message: string;
};

export type CampaignImportPreview = {
  canApply: boolean;
  createCount: number;
  errors: CampaignImportIssue[];
  totalRows: number;
  updateCount: number;
  validRows: number;
};

export type PreparedCampaignImport = {
  payloads: CampaignPayload[];
  preview: CampaignImportPreview;
};

const modelColumns = [
  "id",
  "titulo",
  "descricao",
  "candidato",
  "ativa",
  "inicio_em",
  "fim_em",
  "assinaturas_meta",
  "texto_form",
  "texto_dot",
  "destaque_primario",
  "destaque_secundario",
  "cor_destaque",
  "url_formulario"
] as const;

const headerAliases = new Map<string, string>([
  ["id", "id"],
  ["titulo", "titulo"],
  ["descricao", "descricao"],
  ["candidato", "candidato"],
  ["candidato_nome", "candidato"],
  ["nome_candidato", "candidato"],
  ["candidato_id", "candidato_id"],
  ["ativa", "ativa"],
  ["ativo", "ativa"],
  ["status", "ativa"],
  ["inicio", "inicio_em"],
  ["inicio_em", "inicio_em"],
  ["fim", "fim_em"],
  ["fim_em", "fim_em"],
  ["meta", "assinaturas_meta"],
  ["meta_assinaturas", "assinaturas_meta"],
  ["assinaturas_meta", "assinaturas_meta"],
  ["texto_form", "texto_form"],
  ["titulo_formulario", "texto_form"],
  ["texto_dot", "texto_dot"],
  ["texto_vermelho", "texto_dot"],
  ["destaque_primario", "destaque_primario"],
  ["destaque_cor", "destaque_primario"],
  ["destaque_secundario", "destaque_secundario"],
  ["destaque_amarelo", "destaque_secundario"],
  ["cor", "cor_destaque"],
  ["cor_destaque", "cor_destaque"],
  ["url_formulario", "url_formulario"],
  ["url_whatsapp", "url_formulario"],
  ["link_whatsapp", "url_formulario"]
]);

function normalizedKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cellText(value: Cell | undefined) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return /^'[=+\-@]/.test(text) ? text.slice(1) : text;
}

function isEmptyRow(row: Cell[]) {
  return row.every((cell) => cellText(cell) === "");
}

async function spreadsheetRows(file: File): Promise<Cell[][]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.toLocaleLowerCase("pt-BR").split(".").at(-1);

  if (extension === "xlsx") {
    return (await readSheet(bytes)) as Cell[][];
  }

  if (extension === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseCsv(text, {
      bom: true,
      delimiter: [",", ";", "\t"],
      max_record_size: 10_000,
      relax_column_count: true,
      skip_empty_lines: true
    }) as Cell[][];
  }

  throw new Error("Formato de planilha não aceito.");
}

function addIssue(issues: CampaignImportIssue[], line: number, message: string) {
  issues.push({ line, message });
}

function textValue(
  value: Cell | undefined,
  maxLength: number,
  line: number,
  label: string,
  issues: CampaignImportIssue[],
  allowLines = false
) {
  const raw = cellText(value);
  if (!raw) return null;
  const parsed = allowLines ? multiline(raw, maxLength) : singleLine(raw, maxLength);
  if (parsed === null) addIssue(issues, line, `${label} excede o limite permitido.`);
  return parsed;
}

function numberValue(
  value: Cell | undefined,
  line: number,
  issues: CampaignImportIssue[]
) {
  const raw = cellText(value);
  if (!raw) return null;
  const localizedInteger = /^\d{1,3}(\.\d{3})+$/.test(raw)
    ? raw.replace(/\./g, "")
    : raw;
  const parsed = Number(localizedInteger);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    addIssue(issues, line, "Meta de assinaturas inválida.");
    return null;
  }
  return parsed;
}

function booleanValue(
  value: Cell | undefined,
  line: number,
  issues: CampaignImportIssue[]
) {
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0 || value === null || value === undefined || value === "") return false;

  const normalized = normalizedKey(cellText(value));
  if (["sim", "true", "ativo", "ativa", "1"].includes(normalized)) return true;
  if (["nao", "false", "inativo", "inativa", "0"].includes(normalized)) return false;
  addIssue(issues, line, "O campo ativa deve ser Sim ou Não.");
  return false;
}

function dateValue(
  value: Cell | undefined,
  line: number,
  label: string,
  issues: CampaignImportIssue[]
) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(cellText(value));
  if (!Number.isFinite(parsed.getTime())) {
    addIssue(issues, line, `${label} possui uma data inválida.`);
    return null;
  }
  return parsed.toISOString();
}

function samePhrase(text: string, phrase: string) {
  return text.toLocaleLowerCase("pt-BR").includes(phrase.toLocaleLowerCase("pt-BR"));
}

function candidateLookup(candidates: Candidato[]) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const byName = new Map<string, Candidato[]>();

  for (const candidate of candidates) {
    const key = normalizedKey(candidate.nome || "");
    if (!key) continue;
    byName.set(key, [...(byName.get(key) || []), candidate]);
  }

  return { byId, byName };
}

export async function prepareCampaignImport(
  file: File,
  campaigns: Campanha[],
  candidates: Candidato[]
): Promise<PreparedCampaignImport> {
  if (file.size <= 0 || file.size > CAMPAIGN_IMPORT_MAX_BYTES) {
    throw new Error("A planilha deve ter no máximo 2 MB.");
  }

  const rows = (await spreadsheetRows(file)).filter((row) => !isEmptyRow(row));
  if (rows.length < 2) throw new Error("A planilha não possui linhas para importar.");

  const dataRows = rows.slice(1);
  if (dataRows.length > CAMPAIGN_IMPORT_MAX_ROWS) {
    throw new Error(`A planilha deve ter no máximo ${CAMPAIGN_IMPORT_MAX_ROWS} linhas.`);
  }

  const issues: CampaignImportIssue[] = [];
  const columns = new Map<string, number>();
  const unknownHeaders: string[] = [];

  rows[0].forEach((cell, index) => {
    const original = cellText(cell);
    if (!original) return;
    const canonical = headerAliases.get(normalizedKey(original));
    if (!canonical) {
      unknownHeaders.push(original.slice(0, 60));
      return;
    }
    if (columns.has(canonical)) {
      addIssue(issues, 1, `A coluna ${original} está repetida.`);
      return;
    }
    columns.set(canonical, index);
  });

  if (unknownHeaders.length > 0) {
    addIssue(issues, 1, `Colunas desconhecidas: ${unknownHeaders.join(", ")}.`);
  }
  if (!columns.has("titulo")) addIssue(issues, 1, "A coluna titulo é obrigatória.");

  const existingIds = new Set(campaigns.map((campaign) => campaign.id));
  const seenIds = new Set<string>();
  const { byId: candidatesById, byName: candidatesByName } = candidateLookup(candidates);
  const payloads: CampaignPayload[] = [];
  let createCount = 0;
  let updateCount = 0;

  dataRows.forEach((row, index) => {
    const line = index + 2;
    const issueStart = issues.length;
    const value = (column: string) => {
      const columnIndex = columns.get(column);
      return columnIndex === undefined ? undefined : row[columnIndex];
    };

    const id = cellText(value("id"));
    if (id) {
      if (!isUuid(id) || !existingIds.has(id)) {
        addIssue(issues, line, "ID de campanha inexistente ou inválido.");
      } else if (seenIds.has(id)) {
        addIssue(issues, line, "ID de campanha repetido na planilha.");
      } else {
        seenIds.add(id);
      }
    }

    const title = textValue(value("titulo"), 200, line, "Título", issues);
    if (!title) addIssue(issues, line, "Título é obrigatório.");

    const payload: Partial<Campanha> = id ? { id } : {};
    if (title) payload.titulo = title;

    if (columns.has("descricao")) {
      payload.descricao = textValue(
        value("descricao"),
        5000,
        line,
        "Descrição",
        issues,
        true
      );
    }

    if (columns.has("candidato") || columns.has("candidato_id")) {
      const candidateId = cellText(value("candidato_id"));
      const candidateName = cellText(value("candidato"));
      let resolvedCandidate: Candidato | undefined;

      if (candidateId) {
        resolvedCandidate = candidatesById.get(candidateId);
        if (!isUuid(candidateId) || !resolvedCandidate) {
          addIssue(issues, line, "candidato_id inexistente ou inválido.");
        }
      } else if (candidateName) {
        const matches = candidatesByName.get(normalizedKey(candidateName)) || [];
        if (matches.length === 1) resolvedCandidate = matches[0];
        else if (matches.length === 0) addIssue(issues, line, "Candidato não encontrado.");
        else addIssue(issues, line, "Nome de candidato duplicado; use candidato_id.");
      }

      if (candidateId && candidateName && resolvedCandidate) {
        if (normalizedKey(resolvedCandidate.nome || "") !== normalizedKey(candidateName)) {
          addIssue(issues, line, "candidato e candidato_id apontam para pessoas diferentes.");
        }
      }

      payload.candidato_id = resolvedCandidate?.id || null;
    }

    if (columns.has("ativa")) payload.ativa = booleanValue(value("ativa"), line, issues);
    if (columns.has("inicio_em")) {
      payload.inicio_em = dateValue(value("inicio_em"), line, "Início", issues);
    }
    if (columns.has("fim_em")) {
      payload.fim_em = dateValue(value("fim_em"), line, "Fim", issues);
    }
    if (columns.has("assinaturas_meta")) {
      payload.assinaturas_meta = numberValue(value("assinaturas_meta"), line, issues);
    }

    const textFields = [
      ["texto_form", 200, "Título do formulário"],
      ["texto_dot", 80, "Texto vermelho"],
      ["destaque_primario", 160, "Destaque principal"],
      ["destaque_secundario", 160, "Destaque amarelo"]
    ] as const;

    for (const [field, maxLength, label] of textFields) {
      if (columns.has(field)) {
        payload[field] = textValue(value(field), maxLength, line, label, issues);
      }
    }

    if (columns.has("cor_destaque")) {
      const color = cellText(value("cor_destaque")) || "#E05A5A";
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        addIssue(issues, line, "Cor de destaque inválida; use o formato #RRGGBB.");
      } else {
        payload.cor_destaque = color.toUpperCase();
      }
    }

    if (columns.has("url_formulario")) {
      const rawRedirectUrl = cellText(value("url_formulario"));
      const redirectUrl = normalizeCampaignWhatsappUrl(rawRedirectUrl);
      if (rawRedirectUrl && !redirectUrl) {
        addIssue(issues, line, "Link do WhatsApp inválido; use uma URL HTTPS do WhatsApp.");
      } else {
        payload.url_formulario = redirectUrl;
      }
    }

    if (title) {
      for (const field of ["destaque_primario", "destaque_secundario"] as const) {
        const phrase = payload[field];
        if (phrase && !samePhrase(title, phrase)) {
          addIssue(issues, line, `${field} não aparece no título.`);
        }
      }
    }

    if (issues.length === issueStart && title) {
      payloads.push(payload as CampaignPayload);
      if (id) updateCount += 1;
      else createCount += 1;
    }
  });

  return {
    payloads,
    preview: {
      canApply: issues.length === 0 && payloads.length > 0,
      createCount,
      errors: issues.slice(0, 50),
      totalRows: dataRows.length,
      updateCount,
      validRows: payloads.length
    }
  };
}

function safeCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function campaignImportModelCsv(campaigns: Campanha[], candidates: Candidato[]) {
  const candidateNames = new Map(candidates.map((candidate) => [candidate.id, candidate.nome]));
  const lines = [modelColumns.map(safeCsvCell).join(",")];

  for (const campaign of campaigns) {
    const values = [
      campaign.id,
      campaign.titulo,
      campaign.descricao,
      campaign.candidato_id ? candidateNames.get(campaign.candidato_id) : "",
      campaign.ativa ? "Sim" : "Não",
      campaign.inicio_em,
      campaign.fim_em,
      campaign.assinaturas_meta,
      campaign.texto_form,
      campaign.texto_dot,
      campaign.destaque_primario,
      campaign.destaque_secundario,
      campaign.cor_destaque || "#E05A5A",
      campaign.url_formulario
    ];
    lines.push(values.map(safeCsvCell).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
