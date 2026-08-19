import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import { THEME_REGISTRY, themeContentKeys } from "@/features/themes/registry";
import { createThemePreviewCampaign } from "@/features/themes/theme-preview-data";

const titulo = "Titulo alfa beta gama";
const chamada = "Chamada delta epsilon zeta";

function renderTheme(theme: (typeof THEME_REGISTRY)[number]) {
  const campaign = createThemePreviewCampaign({
    content: { textoContexto: chamada, titulo },
    theme,
  });

  return render(
    <CampaignPublicRenderer campanha={campaign} preview totalAssinaturas={0} />
  );
}

describe("palavras coloridas em todos os temas", () => {
  it.each(THEME_REGISTRY)("aplica a seleção no tema $id · $name", (theme) => {
    const { container } = renderTheme(theme);

    const highlightedWord = container.querySelector("h1 .campaign-headline-custom");
    expect(highlightedWord).toBeInTheDocument();
    expect(highlightedWord).toHaveStyle({ color: "#FACC15" });
  });

  it.each(THEME_REGISTRY)(
    "colore o título principal declarado pelo tema $id · $name",
    (theme) => {
      const { container } = renderTheme(theme);

      // A prévia marca as palavras de índice 1 e 3 do título principal.
      const expected =
        theme.headline.field === "titulo"
          ? ["alfa", "gama"]
          : ["delta", "zeta"];
      const colored = [...container.querySelectorAll("h1 .campaign-headline-custom")].map(
        (element) => element.textContent
      );

      expect(colored).toEqual(expected);
    }
  );

  it("no tema de impacto o título principal é a chamada, não o título da campanha", () => {
    const impactDark = THEME_REGISTRY.find((theme) => theme.key === "impact-dark")!;
    const { container } = renderTheme(impactDark);

    expect(impactDark.headline.field).toBe("texto_contexto");
    expect(container.querySelector("h1")).toHaveTextContent(chamada);
    expect(container.querySelector("h1")).not.toHaveTextContent(titulo);
  });

  it("cada tema declara um título principal que ele mesmo cadastra", () => {
    for (const theme of THEME_REGISTRY) {
      if (theme.headline.field === "titulo") continue;
      expect([...themeContentKeys(theme.key)]).toContain(theme.headline.field);
    }
  });
});
