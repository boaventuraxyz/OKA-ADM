import { describe, expect, it } from "vitest";

import { normalizeCampaignSlug } from "@/features/campaigns/domain";
import {
  campaignCreateSchema,
  campaignEditSchema,
  campaignListQuerySchema,
  sanitizeCampaignSearch,
} from "@/features/campaigns/schemas";

describe("schemas de campanhas", () => {
  it("aplica paginação limitada e ordenação segura", () => {
    expect(campaignListQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: "updated_at",
      sortDirection: "desc",
    });

    expect(
      campaignListQuerySchema.safeParse({ pageSize: 51 }).success,
    ).toBe(false);
    expect(
      campaignListQuerySchema.safeParse({ sortBy: "titulo;drop table" })
        .success,
    ).toBe(false);
  });

  it("remove a gramática de filtro da busca antes do PostgREST", () => {
    expect(sanitizeCampaignSearch('Ação"),status.eq.published')).toBe(
      "Ação status.eq.published",
    );
  });

  it("normaliza slug, tema e objetos JSON na criação", () => {
    const parsed = campaignCreateSchema.parse({
      titulo: "  Uma campanha segura  ",
      slug: "Ação & Cidadania",
      theme_key: "manifesto",
      form_config: '{"fields":["email"]}',
    });

    expect(parsed).toMatchObject({
      titulo: "Uma campanha segura",
      slug: "acao-e-cidadania",
      tema: 3,
      theme_key: "manifesto",
      form_config: { fields: ["email"] },
      settings: {},
    });
  });

  it("não aceita status nem atores fornecidos pelo cliente", () => {
    expect(
      campaignCreateSchema.safeParse({
        titulo: "Tentativa inválida",
        status: "published",
        created_by: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("valida campos obrigatórios definidos pelo tema", () => {
    expect(campaignCreateSchema.safeParse({ titulo: "Capa sem slogan", theme_key: "cover" }).success).toBe(false);
    expect(campaignCreateSchema.safeParse({ titulo: "Capa", theme_key: "cover", destaque_primario: "Uma causa clara" }).success).toBe(true);
  });

  it("exige ao menos um campo e pares de tema coerentes na edição", () => {
    expect(campaignEditSchema.safeParse({}).success).toBe(false);
    expect(
      campaignEditSchema.safeParse({ tema: 2, theme_key: "manifesto" })
        .success,
    ).toBe(false);
    expect(
      campaignEditSchema.safeParse({ tema: 2, theme_key: "editorial" })
        .success,
    ).toBe(true);
  });
});

describe("slug de campanhas", () => {
  it("remove acentos, símbolos e respeita o limite do banco", () => {
    const slug = normalizeCampaignSlug(
      `${"Mobilização democrática ".repeat(12)}!!!`,
    );

    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(slug?.length).toBeLessThanOrEqual(120);
  });

  it("retorna null quando não há conteúdo utilizável", () => {
    expect(normalizeCampaignSlug("  🚀 !!! ")).toBeNull();
  });
});
