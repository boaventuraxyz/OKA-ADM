import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import {
  getThemeByKey,
  themeContentKeys,
  type CampaignThemeContentKey,
} from "@/features/themes/registry";
import { createThemePreviewCampaign } from "@/features/themes/theme-preview-data";
import { normalizeCandidateNumber } from "@/lib/campaign-settings";

const bandeira = getThemeByKey("bandeira")!;

function renderBandeira(
  content: Parameters<typeof createThemePreviewCampaign>[0]["content"] = {},
  preview = true,
) {
  return render(
    <CampaignPublicRenderer
      campanha={createThemePreviewCampaign({ content, theme: bandeira })}
      preview={preview}
      totalAssinaturas={0}
    />
  );
}

describe("tema 8 · Bandeira", () => {
  afterEach(() => vi.useRealTimers());

  it("mantém somente os dígitos do número do candidato", () => {
    expect(normalizeCandidateNumber("22D11 abc 09")).toBe("221109");
    expect(normalizeCandidateNumber("1234567890")).toBe("12345678");
  });

  it("está registrado como tema 8 com captação e vídeo", () => {
    expect(bandeira.id).toBe(8);
    expect(bandeira.capabilities.signatureModal).toBe(true);
    expect(bandeira.capabilities.video).toBe(true);
    expect(bandeira.capabilities.sideImage).toBe(true);
    expect(bandeira.capabilities.backgroundImage).toBe(true);
    expect(bandeira.capabilities.sharing).toBe(false);
    expect(bandeira.headline.field).toBe("titulo");
  });

  it("só cadastra campos que a página realmente usa", () => {
    const keys = themeContentKeys("bandeira");
    const required: CampaignThemeContentKey[] = [
      "descricao",
      "imagem_fundo",
      "imagem_lateral",
      "titulo_topicos",
      "texto_contexto",
      "video_url",
      "legenda_video",
      "titulo_assinar",
      "texto_topicos_intro",
      "texto_topicos",
      "texto_conclusao",
      "texto_impacto",
      "texto_impacto_apoio",
    ];
    for (const key of required) {
      expect(keys.has(key)).toBe(true);
    }
    // O novo layout não usa a antiga seção de missão nem notas auxiliares.
    expect(keys.has("nota_citacao")).toBe(false);
    expect(keys.has("texto_proposta")).toBe(false);
  });

  it("renderiza as seções da página", () => {
    const { container } = renderBandeira();

    expect(container.querySelector(".campaign-theme-8")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-hero")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-support")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-flags")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-group")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-final")).not.toBeInTheDocument();
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

  it("mostra o número cadastrado no candidato", () => {
    const { container } = renderBandeira({
      candidateNumber: "22110",
    });

    expect(container.querySelector(".bandeira-wordmark b")).toHaveTextContent("22110");
    expect(container.querySelector(".bandeira-footer-brand")).toHaveTextContent("22110");
  });

  it("omite o número quando não foi informado", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, require_consent: true },
    });

    expect(container.querySelector(".bandeira-wordmark b")).toBeNull();
  });

  it("usa a imagem de fundo como logo e a lateral como foto principal", () => {
    const { container } = renderBandeira({
      imagemFundoUrl: "/campaigns/felipe/logo.png",
      imagemLateralUrl: "/campaigns/felipe/hero.png",
    });

    expect(container.querySelector(".bandeira-brand-logo")).toHaveAttribute(
      "src",
      "/campaigns/felipe/logo.png",
    );
    expect(container.querySelector(".bandeira-hero-media")).toHaveAttribute(
      "src",
      "/campaigns/felipe/hero.png",
    );
  });

  it("usa as artes configuradas como reserva", () => {
    const { container } = renderBandeira({
      settings: {
        bandeira_assets: {
          heroUrl: "/campaigns/felipe/hero.png",
          logoUrl: "/campaigns/felipe/logo.png",
        },
      },
    });

    expect(container.querySelector(".bandeira-brand-logo")).toBeInTheDocument();
    expect(container.querySelector(".bandeira-hero-media")).toBeInTheDocument();
  });

  it("mantém as artes oficiais do Felipe mesmo enquanto o banco ainda tem imagens antigas", () => {
    const { container } = renderBandeira({
      imagemFundoUrl: "/imagem-antiga.png",
      imagemLateralUrl: "/foto-antiga.png",
      slug: "felipe-sertanejo",
    });

    expect(container.querySelector(".bandeira-brand-logo")).toHaveAttribute(
      "src",
      "/campaigns/felipe-sertanejo/logo.png",
    );
    expect(container.querySelector(".bandeira-hero-media")).toHaveAttribute(
      "src",
      "/campaigns/felipe-sertanejo/hero.png",
    );
    expect(container.querySelector(".campaign-headline-custom")).toBeNull();
  });

  it("prioriza o número vinculado ao candidato", () => {
    const { container } = renderBandeira({
      candidateNumber: "20221",
      settings: { allow_sharing: true, candidate_number: "22110", require_consent: true },
    });

    expect(container.querySelector(".bandeira-wordmark b")).toHaveTextContent("20221");
  });

  it("esconde o player quando não há vídeos", () => {
    const { container } = renderBandeira({ videoCarousel: null, videoUrl: null });
    expect(container.querySelector(".bandeira-support-video")).toBeNull();
  });

  it("renderiza o carrossel e seus controles quando há vários vídeos", () => {
    const { container } = renderBandeira({
      videoCarousel: [
        { caption: "Primeiro ato", url: "https://cdn.example.com/ato-1.mp4" },
        { caption: "Segundo ato", url: "https://cdn.example.com/ato-2.mp4" },
      ],
    });

    expect(container.querySelector(".bandeira-support-video video")).toHaveAttribute(
      "src",
      "https://cdn.example.com/ato-1.mp4",
    );
    expect(container.querySelectorAll(".campaign-theme4-video-arrows button")).toHaveLength(2);
    expect(container.querySelectorAll(".campaign-theme4-video-pagination button")).toHaveLength(2);
  });
});

describe("modal de captação", () => {
  afterEach(() => vi.useRealTimers());

  it("abre após cinco segundos na página pública, mas não bloqueia o preview do editor", () => {
    vi.useFakeTimers();
    const publicPage = renderBandeira({}, false);
    expect(publicPage.container.querySelector(".campaign-capture-modal")).not.toHaveAttribute(
      "open",
    );
    act(() => vi.advanceTimersByTime(5_000));
    expect(publicPage.container.querySelector(".campaign-capture-modal")).toHaveAttribute(
      "open",
    );
    publicPage.unmount();

    const previewPage = renderBandeira();
    expect(previewPage.container.querySelector(".campaign-capture-modal")).not.toHaveAttribute(
      "open",
    );
  });

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

  it("inclui as ações e o aviso de privacidade do rodapé mobile", () => {
    const { container } = renderBandeira({
      settings: { allow_sharing: true, legal, require_consent: true },
    });
    const footer = container.querySelector(".bandeira-footer")!;

    expect(footer.querySelector(".pol-toggle-campaign")).toHaveTextContent(
      "Política de Privacidade",
    );
    expect(footer.querySelector(".pol-terms > summary")).toHaveTextContent("Termos de Uso");
    expect(footer.querySelector(".pol-optout > summary")).toHaveTextContent("Sair da lista");
    expect(footer.querySelector(".pol-campaign-summary")).toHaveTextContent(
      "Os dados informados são tratados com base no seu consentimento",
    );
    expect(footer.querySelector(".pol-campaign-summary")).toHaveTextContent(
      "Partido Liberal (PL)",
    );
    expect(footer.querySelector(".pol-copyright")).toHaveTextContent(
      "© 2026. Todos os direitos reservados.",
    );
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
