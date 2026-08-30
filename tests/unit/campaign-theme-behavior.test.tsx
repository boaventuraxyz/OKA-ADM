import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import { THEME_REGISTRY } from "@/features/themes/registry";
import { createThemePreviewCampaign } from "@/features/themes/theme-preview-data";
import { campaignAllowsSharing } from "@/lib/campaign-settings";

function renderTheme(
  theme: (typeof THEME_REGISTRY)[number],
  content: Parameters<typeof createThemePreviewCampaign>[0]["content"] = {}
) {
  return render(
    <CampaignPublicRenderer
      campanha={createThemePreviewCampaign({ content, theme })}
      preview
      totalAssinaturas={0}
    />
  );
}

const sharingThemes = THEME_REGISTRY.filter((theme) => theme.capabilities.sharing);

describe("compartilhamento por tema", () => {
  it("mantém ligado quando a campanha foi salva sem o ajuste", () => {
    expect(campaignAllowsSharing(null)).toBe(true);
    expect(campaignAllowsSharing({})).toBe(true);
    expect(campaignAllowsSharing({ allow_sharing: false })).toBe(false);
  });

  it.each(sharingThemes)("exibe as chamadas no tema $id · $name", (theme) => {
    const { container } = renderTheme(theme);
    expect(container.querySelector(".campaign-theme3-share")).toBeInTheDocument();
  });

  it.each(sharingThemes)(
    "esconde as chamadas quando o ajuste está desligado no tema $id · $name",
    (theme) => {
      const { container } = renderTheme(theme, {
        settings: { allow_sharing: false, collect_address: false, require_consent: true },
      });
      expect(container.querySelector(".campaign-theme3-share")).not.toBeInTheDocument();
    }
  );

  it.each(THEME_REGISTRY.filter((theme) => !theme.capabilities.sharing))(
    "não oferece compartilhamento no tema $id · $name",
    (theme) => {
      const { container } = renderTheme(theme);
      expect(container.querySelector(".campaign-theme3-share")).not.toBeInTheDocument();
    }
  );
});

describe("número do candidato por tema", () => {
  it.each(THEME_REGISTRY)(
    "usa automaticamente o número cadastrado no tema $id · $name",
    (theme) => {
      const { container } = renderTheme(theme, {
        candidateName: "Miguel Patriota",
        candidateNumber: "20221",
      });

      expect(container).toHaveTextContent("20221");
    },
  );
});

describe("tema 4 · impacto escuro", () => {
  const impactDark = THEME_REGISTRY.find((theme) => theme.key === "impact-dark")!;

  it("não destaca palavras fixas fora do título principal", () => {
    const { container } = renderTheme(impactDark, {
      textoImpacto: "Mobilização hoje. Mudança amanhã.",
      textoImpactoApoio: "Cada assinatura fortalece esta causa.",
      tituloTopicos: "Eu não vou aceitar este retrocesso",
      tituloAssinar: "E você? Não dá para calar agora.",
    });

    for (const heading of container.querySelectorAll(
      ".campaign-theme4-impact h3, .campaign-theme4-manifesto h2, .campaign-theme4-sign h2"
    )) {
      expect(heading.querySelector("span")).toBeNull();
    }
  });

  it("trata todos os blocos do relato como parágrafos comuns", () => {
    const { container } = renderTheme(impactDark, {
      textoTopicos: "Primeiro bloco do relato.\n\nMas normalizar isso seria um erro.",
    });

    expect(container.querySelectorAll(".campaign-theme4-paragraph")).toHaveLength(2);
    expect(container.querySelector(".campaign-theme4-pull")).toBeNull();
  });
});
