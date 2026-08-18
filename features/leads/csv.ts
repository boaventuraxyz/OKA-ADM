import type { LeadExportRow } from "./types";

export const LEAD_CSV_BOM = "\uFEFF";
export const LEAD_CSV_HEADER = [
  "Nome",
  "Telefone",
  "E-mail",
  "CEP",
  "Cidade",
  "UF",
  "Campanha",
  "Origem",
  "Data",
].join(";");

/** Escapes delimiters and neutralizes spreadsheet formula injection. */
export function escapeLeadCsvCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  text = text.replace(/\u0000/g, "").replace(/\r\n?/g, "\n");

  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function leadRowsToCsv(rows: readonly LeadExportRow[]) {
  return rows
    .map((row) =>
      [
        row.nome_assinante,
        row.numero_assinante,
        row.email_assinante,
        row.cep_assinante,
        row.cidade_assinante,
        row.estado_assinante,
        row.campanha.titulo,
        row.source,
        row.assinado_em,
      ]
        .map(escapeLeadCsvCell)
        .join(";"),
    )
    .join("\r\n");
}
