import { describe, expect, it } from "vitest";

import {
  campaignTitleTokens,
  legacyCampaignTitleHighlights,
  parseCampaignTitleHighlights,
} from "@/lib/campaign-title-highlights";

describe("destaques coloridos do título", () => {
  it("mantém espaços e atribui um índice para cada palavra", () => {
    expect(campaignTitleTokens("Uma causa urgente")).toEqual([
      { end: 3, start: 0, text: "Uma", wordIndex: 0 },
      { end: 4, start: 3, text: " ", wordIndex: null },
      { end: 9, start: 4, text: "causa", wordIndex: 1 },
      { end: 10, start: 9, text: " ", wordIndex: null },
      { end: 17, start: 10, text: "urgente", wordIndex: 2 },
    ]);
  });

  it("valida, normaliza e ordena as cores salvas", () => {
    expect(parseCampaignTitleHighlights({
      title_highlights: [
        { color: "#e05a5a", index: 2 },
        { color: "inválida", index: 1 },
        { color: "#123abc", index: 0 },
      ],
    })).toEqual([
      { color: "#123ABC", index: 0 },
      { color: "#E05A5A", index: 2 },
    ]);
    expect(parseCampaignTitleHighlights({})).toBeNull();
  });

  it("converte os trechos antigos em palavras selecionadas", () => {
    expect(legacyCampaignTitleHighlights({
      primary: "causa urgente",
      primaryColor: "#2255aa",
      title: "Uma causa urgente agora",
    })).toEqual([
      { color: "#2255AA", index: 1 },
      { color: "#2255AA", index: 2 },
    ]);
  });
});
