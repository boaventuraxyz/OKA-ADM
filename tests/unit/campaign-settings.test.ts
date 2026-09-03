import { describe, expect, it } from "vitest";

import {
  campaignHidesBandeiraLogo,
  parseBandeiraAssets,
  parseBandeiraWallpapers,
  parseBandeiraSectionLabels,
  resolveCandidateNumber,
} from "@/lib/campaign-settings";

describe("parseBandeiraAssets", () => {
  it("aceita caminhos internos e URLs HTTPS", () => {
    expect(
      parseBandeiraAssets({
        bandeira_assets: {
          heroUrl: "/campaigns/felipe/hero.png",
          logoUrl: "https://cdn.example.com/logo.png",
        },
      }),
    ).toEqual({
      heroUrl: "/campaigns/felipe/hero.png",
      logoUrl: "https://cdn.example.com/logo.png",
    });
  });

  it("rejeita protocolos não seguros", () => {
    expect(
      parseBandeiraAssets({
        bandeira_assets: {
          heroUrl: "javascript:alert(1)",
          logoUrl: "http://example.com/logo.png",
        },
      }),
    ).toEqual({ heroUrl: null, logoUrl: null });
  });
});

describe("parseBandeiraWallpapers", () => {
  it("aceita apenas caminhos internos e URLs HTTPS", () => {
    expect(
      parseBandeiraWallpapers({
        bandeira_wallpapers: {
          desktopUrl: "/campaigns/gauchos-com-flavio-bolsonaro-rs/hero-desktop.png",
          mobileUrl: "https://cdn.example.com/hero-mobile.webp",
        },
      }),
    ).toEqual({
      desktopUrl: "/campaigns/gauchos-com-flavio-bolsonaro-rs/hero-desktop.png",
      mobileUrl: "https://cdn.example.com/hero-mobile.webp",
    });

    expect(
      parseBandeiraWallpapers({
        bandeira_wallpapers: {
          desktopUrl: "javascript:alert(1)",
          mobileUrl: "//example.com/hero.webp",
        },
      }),
    ).toEqual({ desktopUrl: null, mobileUrl: null });
  });
});

describe("campaignHidesBandeiraLogo", () => {
  it("só oculta a logo quando a remoção foi gravada explicitamente", () => {
    expect(campaignHidesBandeiraLogo({ bandeira_hide_logo: true })).toBe(true);
    expect(campaignHidesBandeiraLogo({ bandeira_hide_logo: false })).toBe(false);
    expect(campaignHidesBandeiraLogo({ bandeira_hide_logo: "true" })).toBe(false);
    expect(campaignHidesBandeiraLogo(null)).toBe(false);
  });
});

describe("resolveCandidateNumber", () => {
  it("prioriza o número cadastrado no candidato", () => {
    expect(
      resolveCandidateNumber("20221", { candidate_number: "22110" }),
    ).toBe("20221");
  });

  it("mantém compatibilidade com campanhas antigas", () => {
    expect(resolveCandidateNumber(undefined, { candidate_number: "22110" })).toBe(
      "22110",
    );
  });

  it("não herda o número antigo quando o candidato vinculado está sem número", () => {
    expect(resolveCandidateNumber(null, { candidate_number: "22110" })).toBeNull();
  });
});

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
