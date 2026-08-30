import { describe, expect, it } from "vitest";

import { parseBandeiraSectionLabels } from "@/lib/campaign-settings";

describe("parseBandeiraSectionLabels", () => {
  it("preserva os rótulos históricos quando a campanha não configura outros", () => {
    expect(parseBandeiraSectionLabels(null)).toEqual({
      group: "Grupo oficial",
      hero: "Movimento oficial",
      support: "Apoio",
      topics: "Bandeiras",
    });
  });

  it("aceita rótulos informativos e normaliza valores inválidos", () => {
    expect(
      parseBandeiraSectionLabels({
        bandeira_labels: {
          group: "  Atualizações  ",
          hero: "Informações oficiais",
          support: 42,
          topics: "Conteúdos",
        },
      }),
    ).toEqual({
      group: "Atualizações",
      hero: "Informações oficiais",
      support: "Apoio",
      topics: "Conteúdos",
    });
  });
});
