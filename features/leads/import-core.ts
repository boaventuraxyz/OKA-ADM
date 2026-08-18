export const LEAD_IMPORT_MAX_ROWS = 1_000;

export type LeadImportIssue = { line: number; message: string };

export type LeadImportRow = {
  cep_assinante: string | null;
  cidade_assinante: string | null;
  complemento_assinante: string | null;
  email_assinante: string | null;
  endereco_assinante: string | null;
  estado_assinante: string | null;
  line: number;
  n_assinante: number | null;
  nome_assinante: string | null;
  numero_assinante: string | null;
};

export type ParsedLeadImport = {
  duplicatesInFile: number;
  errors: LeadImportIssue[];
  invalidRows: number;
  rows: LeadImportRow[];
  totalRows: number;
  validRows: number;
};

const aliases = new Map([
  ["nome", "nome"], ["nome_assinante", "nome"],
  ["email", "email"], ["e_mail", "email"], ["email_assinante", "email"],
  ["telefone", "telefone"], ["celular", "telefone"], ["whatsapp", "telefone"], ["numero_assinante", "telefone"],
  ["cep", "cep"], ["cep_assinante", "cep"],
  ["cidade", "cidade"], ["cidade_assinante", "cidade"],
  ["uf", "estado"], ["estado", "estado"], ["estado_assinante", "estado"],
  ["endereco", "endereco"], ["endereco_assinante", "endereco"],
  ["numero", "numero"], ["n_assinante", "numero"],
  ["complemento", "complemento"], ["complemento_assinante", "complemento"],
]);

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").trim();
}

function key(value: unknown) {
  return text(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function bounded(value: unknown, max: number) {
  const parsed = text(value);
  return parsed && parsed.length <= max ? parsed : parsed ? null : "";
}

export function normalizeLeadEmail(value: unknown) {
  const parsed = text(value).toLowerCase();
  if (!parsed) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed) && parsed.length <= 320 ? parsed : null;
}

export function normalizeLeadPhone(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function parseLeadImportRows(inputRows: unknown[][]): ParsedLeadImport {
  const rows = inputRows.filter((row) => row.some((cell) => text(cell)));
  if (rows.length < 2) throw new Error("A planilha não possui linhas para importar.");
  const dataRows = rows.slice(1);
  if (dataRows.length > LEAD_IMPORT_MAX_ROWS) throw new Error(`A planilha deve ter no máximo ${LEAD_IMPORT_MAX_ROWS} linhas.`);

  const columns = new Map<string, number>();
  const errors: LeadImportIssue[] = [];
  rows[0].forEach((cell, index) => {
    const normalized = key(cell);
    if (!normalized) return;
    const canonical = aliases.get(normalized);
    if (!canonical) {
      errors.push({ line: 1, message: `Coluna desconhecida: ${text(cell).slice(0, 60)}.` });
    } else if (columns.has(canonical)) {
      errors.push({ line: 1, message: `Coluna repetida: ${text(cell).slice(0, 60)}.` });
    } else columns.set(canonical, index);
  });
  if (!columns.has("email") && !columns.has("telefone")) {
    throw new Error("Inclua ao menos a coluna e-mail ou telefone.");
  }

  const parsedRows: LeadImportRow[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  let duplicatesInFile = 0;
  let invalidRows = 0;

  dataRows.forEach((row, index) => {
    const line = index + 2;
    const get = (name: string) => columns.has(name) ? row[columns.get(name)!] : undefined;
    const rawEmail = text(get("email"));
    const rawPhone = text(get("telefone"));
    const email = normalizeLeadEmail(rawEmail);
    const phone = normalizeLeadPhone(rawPhone);
    const rowErrors: string[] = [];
    if (rawEmail && !email) rowErrors.push("e-mail inválido");
    if (rawPhone && !phone) rowErrors.push("telefone inválido");
    if (!email && !phone) rowErrors.push("informe e-mail ou telefone");

    const name = bounded(get("nome"), 200);
    const city = bounded(get("cidade"), 160);
    const address = bounded(get("endereco"), 300);
    const complement = bounded(get("complemento"), 200);
    if (name === null) rowErrors.push("nome excede 200 caracteres");
    if (city === null) rowErrors.push("cidade excede 160 caracteres");
    if (address === null) rowErrors.push("endereço excede 300 caracteres");
    if (complement === null) rowErrors.push("complemento excede 200 caracteres");

    const cepRaw = text(get("cep"));
    const cep = cepRaw.replace(/\D/g, "");
    if (cepRaw && cep.length !== 8) rowErrors.push("CEP inválido");
    const state = text(get("estado")).toUpperCase();
    if (state && !/^[A-Z]{2}$/.test(state)) rowErrors.push("UF inválida");
    const numberRaw = text(get("numero"));
    const number = numberRaw ? Number(numberRaw.replace(/\D/g, "")) : null;
    if (numberRaw && (!Number.isSafeInteger(number) || number! < 0)) rowErrors.push("número do endereço inválido");

    if (rowErrors.length) {
      invalidRows += 1;
      errors.push({ line, message: rowErrors.join("; ") + "." });
      return;
    }
    if ((email && seenEmails.has(email)) || (phone && seenPhones.has(phone))) {
      duplicatesInFile += 1;
      return;
    }
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);

    parsedRows.push({
      cep_assinante: cep || null,
      cidade_assinante: city || null,
      complemento_assinante: complement || null,
      email_assinante: email,
      endereco_assinante: address || null,
      estado_assinante: state || null,
      line,
      n_assinante: number,
      nome_assinante: name || null,
      numero_assinante: phone,
    });
  });

  return {
    duplicatesInFile,
    errors: errors.slice(0, 100),
    invalidRows,
    rows: parsedRows,
    totalRows: dataRows.length,
    validRows: dataRows.length - invalidRows,
  };
}

