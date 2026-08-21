import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import {
  getThemeByKey,
  themeContentKeys,
  type CampaignThemeContentKey,
} from "@/features/themes/registry";
import { createThemePreviewCampaign } from "@/features/themes/theme-preview-data";

const bandeira = getThemeByKey("bandeira")!;

function renderBandeira(content: Parameters<typeof createThemePreviewCampaign>[0]["content"] = {}) {
  return render(
    <CampaignPublicRenderer
      campanha={createThemePreviewCampaign({ content, theme: bandeira })}
      preview
      totalAssinaturas={0}
    />
  );
}

describe("tema 8 · Bandeira", () => {
  it("está registrado como tema 8 com captação e vídeo", () => {
    expect(bandeira.id).toBe(8);
    expect(bandeira.capabilities.signatureModal).toBe(true);
    expect(bandeira.capabilities.video).toBe(true);
    expect(bandeira.capabilities.sideImage).toBe(true);
    expect(bandeira.headline.field).toBe("titulo");
  });

  it("só cadastra campos que a página realmente usa", () => {
    const keys = themeContentKeys("bandeira");
    const required: CampaignThemeContentKey[] = [
      "texto_faixa",
      "descricao",
      "imagem_lateral",
      "texto_contexto",
      "texto_proposta",
      "texto_citacao",
      "imagem_fundo",
      "video_url",
      "texto_topicos",
      "texto_conclusao",
      "texto_impacto",
    ];
    for (const key of required) {
      expect(keys.has(key)).toBe(true);
    }
    // A página não tem seção de nota de citação nem legenda de vídeo.
    expect(keys.has("nota_citacao")).toBe(false);
    expect(keys.has("legenda_video")).toBe(false);
  });

  it("renderiza as seções da página", () => {
    const { container } = renderBandeira();

    expect(container.querySelector(".campaign-theme-8")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-hero")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-statement")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-mission")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-flags")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-group")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-final")).toBeInTheDocument();
  });

  it("numera as bandeiras e usa a primeira linha como título", () => {
    const { container } = renderBandeira({
      textoTopicos: "Primeira bandeira\nExplicação da primeira.\n\nSegunda bandeira\nExplicação da segunda.",
    });

    const flags = [...container.querySelectorAll(".bandeira-flag")];
    expect(flags).toHaveLength(2);
    expect(flags[0].querySelector("span")).toHaveTextContent("01");
    expect(flags[0].querySelector("h3")).toHaveTextContent("Primeira bandeira");
    expect(flags[1].querySelector("span")).toHaveTextContent("02");
    expect(flags[1].querySelector("h3")).toHaveTextContent("Segunda bandeira");
  });

  it("lista um benefício por linha", () => {
    const { container } = renderBandeira({
      textoConclusao: "Receba materiais\nAcompanhe as agendas\nVeja os bastidores",
    });

    expect(container.querySelectorAll(".bandeira-benefit")).toHaveLength(3);
  });

  it("mostra o número do candidato quando settings o traz", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, candidate_number: "22110", require_consent: true },
    });

    expect(container.querySelector(".bandeira-lockup strong")).toHaveTextContent("22110");
    expect(container.querySelector(".bandeira-wordmark b")).toHaveTextContent("22110");
  });

  it("omite o número quando não foi informado", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, require_consent: true },
    });

    expect(container.querySelector(".bandeira-wordmark b")).toBeNull();
    expect(container.querySelector(".bandeira-lockup strong")).toBeNull();
  });

  it("esconde a seção de vídeo quando não há URL", () => {
    const { container } = renderBandeira({ videoUrl: null });
    expect(container.querySelector(".bandeira-video")).toBeNull();
  });

  it("respeita o ajuste de compartilhamento", () => {
    const desligado = renderBandeira({
      settings: { allow_sharing: false, require_consent: true },
    });
    expect(desligado.container.querySelector(".campaign-theme3-share")).toBeNull();
  });
});

describe("modal de captação", () => {
  it("usa um único diálogo para todos os botões da página", () => {
    const { container } = renderBandeira();

    // Um modal por botão duplicaria o formulário e perderia o preenchimento.
    expect(container.querySelectorAll(".campaign-capture-modal")).toHaveLength(1);
    expect(
      container.querySelectorAll(".campaign-capture-trigger").length,
    ).toBeGreaterThan(1);
    // Em preview o formulario vira div, entao conta pelo container de campos.
    expect(container.querySelectorAll(".form-fields")).toHaveLength(1);
  });
});

describe("rodapé de propaganda eleitoral", () => {
  const legal = {
    candidateCnpj: "68.353.138/0001-08",
    committee: "Rua Exemplo, 3 — São Paulo/SP",
    contact: "contato@exemplo.com — +55 11 99999-0000",
    election: "ELEIÇÃO 2026 — NOME COMPLETO — DEPUTADO ESTADUAL — SÃO PAULO",
    party: "PARTIDO LIBERAL",
    partyCnpj: "08.517.423/0001-95",
  };

  it("mostra os dados quando settings.legal está preenchido", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, legal, require_consent: true },
    });
    const footer = container.querySelector(".bandeira-footer")!;

    expect(footer).toHaveTextContent(legal.election);
    expect(footer).toHaveTextContent("CNPJ do candidato: 68.353.138/0001-08");
    expect(footer).toHaveTextContent("PARTIDO LIBERAL — CNPJ: 08.517.423/0001-95");
    expect(footer).toHaveTextContent(legal.committee);
    expect(footer).toHaveTextContent(legal.contact);
  });

  it("não inventa linhas quando o rodapé não foi preenchido", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, require_consent: true },
    });
    const footer = container.querySelector(".bandeira-footer")!;

    expect(footer).not.toHaveTextContent("CNPJ do candidato");
    expect(footer).not.toHaveTextContent("Contato da campanha");
    // A identificação do candidato continua, vinda do próprio cadastro.
    expect(footer).toHaveTextContent("Propaganda Eleitoral");
  });
});
