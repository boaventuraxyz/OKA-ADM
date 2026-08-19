import type { LeadListItem, LeadRecord } from "./types";

function normalizedEmail(value: string | null) {
  const email = value?.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
  return email || null;
}

function normalizedPhone(value: string | null) {
  const phone = value?.replace(/\D/g, "") ?? "";
  return phone || null;
}

function newestFirst(left: LeadRecord, right: LeadRecord) {
  const leftDate = left.assinado_em ? Date.parse(left.assinado_em) : 0;
  const rightDate = right.assinado_em ? Date.parse(right.assinado_em) : 0;
  if (leftDate !== rightDate) return rightDate - leftDate;
  return right.id.localeCompare(left.id);
}

function firstPresent<K extends keyof LeadRecord>(
  rows: readonly LeadRecord[],
  field: K,
): LeadRecord[K] {
  return (rows.find((row) => row[field] !== null && row[field] !== "")?.[
    field
  ] ?? rows[0][field]) as LeadRecord[K];
}

/**
 * Treats equal e-mails or equal phone numbers as the same contact. The union
 * is transitive, so an older record can bridge a changed e-mail and phone.
 */
export function groupLeadRecords(rows: readonly LeadRecord[]): LeadListItem[] {
  const orderedRows = [...rows].sort(newestFirst);
  const parents = orderedRows.map((_, index) => index);
  const ranks = orderedRows.map(() => 0);
  const identities = new Map<string, number>();

  function find(index: number): number {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  }

  function union(left: number, right: number) {
    let leftRoot = find(left);
    let rightRoot = find(right);
    if (leftRoot === rightRoot) return;

    if (ranks[leftRoot] < ranks[rightRoot]) {
      [leftRoot, rightRoot] = [rightRoot, leftRoot];
    }
    parents[rightRoot] = leftRoot;
    if (ranks[leftRoot] === ranks[rightRoot]) ranks[leftRoot] += 1;
  }

  orderedRows.forEach((row, index) => {
    const keys = [
      normalizedEmail(row.email_assinante),
      normalizedPhone(row.numero_assinante),
    ].flatMap((identity, keyIndex) =>
      identity ? [`${keyIndex === 0 ? "email" : "phone"}:${identity}`] : [],
    );

    for (const key of keys) {
      const match = identities.get(key);
      if (match === undefined) identities.set(key, index);
      else union(index, match);
    }
  });

  const groups = new Map<number, LeadRecord[]>();
  orderedRows.forEach((row, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(row);
    groups.set(root, group);
  });

  return [...groups.values()]
    .map((groupRows) => {
      const representative = groupRows[0];
      const campaigns = [...new Map(
        groupRows.map((row) => [row.campanha.id, row.campanha]),
      ).values()];

      return {
        ...representative,
        nome_assinante: firstPresent(groupRows, "nome_assinante"),
        email_assinante: firstPresent(groupRows, "email_assinante"),
        numero_assinante: firstPresent(groupRows, "numero_assinante"),
        cep_assinante: firstPresent(groupRows, "cep_assinante"),
        cidade_assinante: firstPresent(groupRows, "cidade_assinante"),
        estado_assinante: firstPresent(groupRows, "estado_assinante"),
        campanhas: campaigns,
        campaignCount: campaigns.length,
        signatureCount: groupRows.length,
      };
    })
    .sort(newestFirst);
}
