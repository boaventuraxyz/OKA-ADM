import { describe, expect, it } from "vitest";

import { groupLeadRecords } from "@/features/leads/grouping";
import type { LeadRecord } from "@/features/leads/types";

function lead(overrides: Partial<LeadRecord> & Pick<LeadRecord, "id">): LeadRecord {
  return {
    assinado_em: "2026-08-19T12:00:00.000Z",
    campanha: { id: "campaign-a", titulo: "Campanha A" },
    campanha_id: "campaign-a",
    cep_assinante: null,
    cidade_assinante: null,
    email_assinante: null,
    estado_assinante: null,
    nome_assinante: "Pessoa",
    numero_assinante: null,
    source: "public_form",
    ...overrides,
  };
}

describe("agrupamento de leads", () => {
  it("remove duplicidades por e-mail ou telefone e lista campanhas distintas", () => {
    const grouped = groupLeadRecords([
      lead({ id: "a", email_assinante: "PESSOA@EXEMPLO.COM " }),
      lead({
        id: "b",
        assinado_em: "2026-08-18T12:00:00.000Z",
        campanha: { id: "campaign-b", titulo: "Campanha B" },
        campanha_id: "campaign-b",
        email_assinante: "pessoa@exemplo.com",
        numero_assinante: "(11) 99999-9999",
      }),
      lead({
        id: "c",
        assinado_em: "2026-08-17T12:00:00.000Z",
        campanha: { id: "campaign-b", titulo: "Campanha B" },
        campanha_id: "campaign-b",
        numero_assinante: "11 99999 9999",
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      campaignCount: 2,
      signatureCount: 3,
      email_assinante: "PESSOA@EXEMPLO.COM ",
      numero_assinante: "(11) 99999-9999",
    });
    expect(grouped[0].campanhas.map((campaign) => campaign.titulo)).toEqual([
      "Campanha A",
      "Campanha B",
    ]);
  });

  it("não combina registros sem telefone e sem e-mail", () => {
    expect(groupLeadRecords([lead({ id: "a" }), lead({ id: "b" })])).toHaveLength(2);
  });
});
