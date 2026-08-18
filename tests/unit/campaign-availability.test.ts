import { describe, expect, it } from "vitest";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";

const now = Date.parse("2026-08-18T12:00:00.000Z");

describe("disponibilidade de campanha", () => {
  it("aceita campanha ativa sem janela de datas", () => {
    expect(
      campaignAcceptsSignatures({ ativa: true, inicio_em: null, fim_em: null }, now)
    ).toBe(true);
  });

  it("bloqueia campanha inativa, futura ou encerrada", () => {
    expect(
      campaignAcceptsSignatures({ ativa: false, inicio_em: null, fim_em: null }, now)
    ).toBe(false);
    expect(
      campaignAcceptsSignatures(
        { ativa: true, inicio_em: "2026-08-19T00:00:00.000Z", fim_em: null },
        now
      )
    ).toBe(false);
    expect(
      campaignAcceptsSignatures(
        { ativa: true, inicio_em: null, fim_em: "2026-08-17T23:59:59.000Z" },
        now
      )
    ).toBe(false);
  });

  it("bloqueia datas invalidas em vez de publicar por engano", () => {
    expect(
      campaignAcceptsSignatures(
        { ativa: true, inicio_em: "invalida", fim_em: null },
        now
      )
    ).toBe(false);
  });
});
