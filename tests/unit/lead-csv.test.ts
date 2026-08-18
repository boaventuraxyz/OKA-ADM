import { describe, expect, it } from "vitest";

import {
  escapeLeadCsvCell,
  LEAD_CSV_BOM,
  LEAD_CSV_HEADER,
  leadRowsToCsv,
} from "@/features/leads/csv";

describe("exportação CSV de leads", () => {
  it("usa BOM e o delimitador brasileiro", () => {
    expect(LEAD_CSV_BOM).toBe("\uFEFF");
    expect(LEAD_CSV_HEADER.split(";")).toHaveLength(9);
  });

  it("escapa delimitadores, aspas e fórmulas de planilha", () => {
    expect(escapeLeadCsvCell('Ana; "Teste"')).toBe('"Ana; ""Teste"""');
    expect(escapeLeadCsvCell("=HYPERLINK(\"x\")")).toBe(
      '"\'=HYPERLINK(""x"")"',
    );
    expect(escapeLeadCsvCell("+55 11 99999-9999")).toBe(
      "'+55 11 99999-9999",
    );
  });

  it("não inclui metadata nem user_agent nas colunas exportadas", () => {
    const csv = leadRowsToCsv([
      {
        nome_assinante: "Pessoa",
        numero_assinante: "11999999999",
        email_assinante: "pessoa@example.com",
        cep_assinante: "01001000",
        cidade_assinante: "São Paulo",
        estado_assinante: "SP",
        source: "public_form",
        assinado_em: "2026-08-18T12:00:00.000Z",
        campanha: {
          id: "00000000-0000-0000-0000-000000000001",
          titulo: "Campanha",
        },
      },
    ]);

    expect(csv.split(";")).toHaveLength(9);
    expect(csv).not.toContain("user_agent");
    expect(csv).not.toContain("metadata");
  });
});
