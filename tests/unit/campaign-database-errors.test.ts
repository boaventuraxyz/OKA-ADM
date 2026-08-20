import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  CampaignRepositoryError,
  isCampaignCheckViolation,
  isCampaignUniqueViolation,
} from "@/features/campaigns/repository";

function repositoryError(code: string) {
  const postgrestError = {
    code,
    details: "",
    hint: "",
    message: "recusado pelo banco",
    name: "PostgrestError",
    toJSON: () => ({ code }),
  } as unknown as PostgrestError;

  return new CampaignRepositoryError("insert", postgrestError);
}

describe("classificação dos erros do banco de campanhas", () => {
  it("reconhece a violação de unicidade, que o retry de slug trata", () => {
    expect(isCampaignUniqueViolation(repositoryError("23505"))).toBe(true);
    expect(isCampaignCheckViolation(repositoryError("23505"))).toBe(false);
  });

  it("reconhece a violação de check, o sintoma de migração pendente", () => {
    // campanhas_tema_valido recusa um tema novo enquanto a migração que amplia
    // a restrição não foi aplicada ao banco.
    expect(isCampaignCheckViolation(repositoryError("23514"))).toBe(true);
    expect(isCampaignUniqueViolation(repositoryError("23514"))).toBe(false);
  });

  it("não classifica outros códigos nem valores fora do tipo", () => {
    for (const code of ["23503", "42703", "P0001"]) {
      expect(isCampaignCheckViolation(repositoryError(code))).toBe(false);
      expect(isCampaignUniqueViolation(repositoryError(code))).toBe(false);
    }

    for (const value of [null, undefined, new Error("qualquer"), "23514"]) {
      expect(isCampaignCheckViolation(value)).toBe(false);
      expect(isCampaignUniqueViolation(value)).toBe(false);
    }
  });
});
