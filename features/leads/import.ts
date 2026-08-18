import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";

import { requireRole } from "@/features/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

import { parseLeadImportRows, type LeadImportIssue } from "./import-core";

export const LEAD_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export type LeadImportResult = {
  duplicatesIgnored: number;
  errors: LeadImportIssue[];
  inserted: number;
  invalidRows: number;
  processingErrors: number;
  totalRows: number;
  updated: number;
  validRows: number;
};

async function fileRows(file: File): Promise<unknown[][]> {
  if (file.size <= 0 || file.size > LEAD_IMPORT_MAX_BYTES) throw new Error("A planilha deve ter no máximo 2 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name)) return await readSheet(bytes) as unknown[][];
  if (/\.csv$/i.test(file.name)) {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseCsv(source, { bom: true, delimiter: [",", ";", "\t"], max_record_size: 20_000, relax_column_count: true, skip_empty_lines: true }) as unknown[][];
  }
  throw new Error("Use um arquivo .xlsx ou .csv.");
}

export async function importLeads(campaignId: string, file: File): Promise<LeadImportResult> {
  const context = await requireRole(["master", "admin"]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(campaignId)) {
    throw new Error("Campanha inválida.");
  }
  const parsed = parseLeadImportRows(await fileRows(file));
  const client = createAdminClient();
  const { data: campaign, error: campaignError } = await client.from("campanhas").select("id").eq("id", campaignId).maybeSingle();
  if (campaignError || !campaign) throw new Error("Campanha não encontrada.");

  let inserted = 0;
  let duplicatesIgnored = parsed.duplicatesInFile;
  let processingErrors = 0;
  const errors = [...parsed.errors];

  for (const row of parsed.rows) {
    const { line, ...lead } = row;
    const { error } = await client.from("assinaturas").insert({
      ...lead,
      campanha_id: campaignId,
      metadata: { import_line: line, imported_by: context.user.id },
      responses: {},
      source: "spreadsheet_import",
    });
    if (!error) {
      inserted += 1;
    } else if (error.code === "23505") {
      duplicatesIgnored += 1;
    } else {
      processingErrors += 1;
      if (errors.length < 100) errors.push({ line, message: "Não foi possível gravar esta linha." });
    }
  }

  return {
    duplicatesIgnored,
    errors,
    inserted,
    invalidRows: parsed.invalidRows,
    processingErrors,
    totalRows: parsed.totalRows,
    updated: 0,
    validRows: parsed.validRows,
  };
}

export function leadImportModelCsv() {
  return "\uFEFFnome,email,telefone,cep,cidade,uf,endereco,numero,complemento\r\n";
}
