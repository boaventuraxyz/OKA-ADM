import { describe, expect, it } from "vitest";

import { THEME_REGISTRY, themeContentFields, themeContentKeys } from "@/features/themes/registry";

describe("registro central de temas", () => {
  it("mantém chaves e campos únicos em cada tema", () => {
    expect(THEME_REGISTRY.map((theme) => theme.key)).toEqual(["cover", "editorial", "manifesto", "impact-dark"]);
    for (const theme of THEME_REGISTRY) {
      const fields = themeContentFields(theme);
      expect(new Set(fields.map((field) => field.key)).size).toBe(fields.length);
      expect(theme.sections.length).toBeGreaterThan(0);
    }
  });

  it("não mistura os campos longos do manifesto com o tema de capa", () => {
    const cover = themeContentKeys("cover");
    expect(cover).toEqual(new Set(["destaque_primario", "destaque_secundario", "descricao", "imagem_fundo"]));
    expect(cover.has("texto_topicos")).toBe(false);
    expect(themeContentKeys("manifesto").has("texto_topicos")).toBe(true);
  });
});

