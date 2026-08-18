import { describe, expect, it } from "vitest";
import {
  campaignStatusFromLegacy,
  normalizeCampaignSlug
} from "@/features/campaigns/domain";

describe("dominio de campanhas", () => {
  it("gera slug estavel em portugues", () => {
    expect(normalizeCampaignSlug("Contra a doutrinação nas escolas")).toBe(
      "contra-a-doutrinacao-nas-escolas"
    );
  });

  it("mantem status canonico e converte o legado", () => {
    expect(campaignStatusFromLegacy("archived", true)).toBe("archived");
    expect(campaignStatusFromLegacy(null, true)).toBe("published");
    expect(campaignStatusFromLegacy(undefined, false)).toBe("draft");
  });
});
