import { describe, expect, it } from "vitest";
import {
  candidateDomainMatches,
  normalizeCandidateDomain,
  normalizeRequestHostname,
  publicCampaignHref
} from "@/lib/candidate-domain";
import { normalizeCandidateSlug } from "@/lib/candidate-slug";

describe("roteamento publico de candidatos", () => {
  it("normaliza slugs com acentos e pontuacao", () => {
    expect(normalizeCandidateSlug("João & Maria — 2026")).toBe("joao-e-maria-2026");
  });

  it("normaliza dominios e remove www", () => {
    expect(normalizeCandidateDomain("https://www.Exemplo.com.br/")).toBe(
      "exemplo.com.br"
    );
    expect(normalizeRequestHostname("www.exemplo.com.br:443")).toBe(
      "exemplo.com.br"
    );
  });

  it("rejeita dominio com caminho, credenciais ou protocolo inseguro desconhecido", () => {
    expect(normalizeCandidateDomain("https://exemplo.com/campanha")).toBeNull();
    expect(normalizeCandidateDomain("https://usuario:senha@exemplo.com")).toBeNull();
    expect(normalizeCandidateDomain("ftp://exemplo.com")).toBeNull();
  });

  it("gera URL publica por dominio ou slug", () => {
    expect(candidateDomainMatches("www.exemplo.com.br", "exemplo.com.br")).toBe(true);
    expect(publicCampaignHref("minha-campanha", "www.exemplo.com.br")).toBe(
      "https://exemplo.com.br/minha-campanha"
    );
    expect(publicCampaignHref("minha-campanha", null)).toBe(
      "/f/minha-campanha"
    );
  });
});
