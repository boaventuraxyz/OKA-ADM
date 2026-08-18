import { describe, expect, it } from "vitest";

import { normalizeLeadEmail, normalizeLeadPhone, parseLeadImportRows } from "@/features/leads/import-core";

describe("importação de leads", () => {
  it("normaliza identidade e contabiliza duplicados somente dentro do arquivo", () => {
    const parsed = parseLeadImportRows([
      ["Nome", "E-mail", "WhatsApp", "UF"],
      ["Ana", " ANA@EXAMPLE.COM ", "(11) 99999-9999", "sp"],
      ["Ana repetida", "ana@example.com", "", "SP"],
      ["Bruno", "bruno@example.com", "", "RJ"],
    ]);

    expect(parsed).toMatchObject({ totalRows: 3, validRows: 3, invalidRows: 0, duplicatesInFile: 1 });
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ email_assinante: "ana@example.com", numero_assinante: "11999999999", estado_assinante: "SP" });
  });

  it("separa linhas inválidas sem impedir as válidas", () => {
    const parsed = parseLeadImportRows([
      ["email", "telefone"],
      ["invalido", "123"],
      ["valido@example.com", ""],
    ]);
    expect(parsed).toMatchObject({ totalRows: 2, validRows: 1, invalidRows: 1 });
    expect(parsed.errors[0].line).toBe(2);
    expect(parsed.rows).toHaveLength(1);
  });

  it("normaliza e-mail e telefone de forma determinística", () => {
    expect(normalizeLeadEmail(" PESSOA@EXAMPLE.COM ")).toBe("pessoa@example.com");
    expect(normalizeLeadPhone("+55 (11) 98888-7777")).toBe("5511988887777");
  });
});

