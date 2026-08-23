import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createProgressiveLeadToken,
  verifyProgressiveLeadToken,
} from "@/lib/progressive-lead-token";

const leadId = "10000000-0000-4000-8000-000000000000";
const campaignId = "20000000-0000-4000-8000-000000000000";

describe("token do lead progressivo", () => {
  const previousSecret = process.env.PROGRESSIVE_LEAD_SECRET;

  beforeEach(() => {
    process.env.PROGRESSIVE_LEAD_SECRET = "segredo-de-teste-com-entropia-suficiente";
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.PROGRESSIVE_LEAD_SECRET;
    else process.env.PROGRESSIVE_LEAD_SECRET = previousSecret;
  });

  it("aceita apenas o mesmo lead e a mesma campanha", () => {
    const token = createProgressiveLeadToken(leadId, campaignId);

    expect(verifyProgressiveLeadToken(token, leadId, campaignId)).toBe(true);
    expect(
      verifyProgressiveLeadToken(
        token,
        "30000000-0000-4000-8000-000000000000",
        campaignId,
      ),
    ).toBe(false);
    expect(
      verifyProgressiveLeadToken(
        token,
        leadId,
        "40000000-0000-4000-8000-000000000000",
      ),
    ).toBe(false);
  });

  it("rejeita token truncado ou adulterado", () => {
    const token = createProgressiveLeadToken(leadId, campaignId);

    expect(verifyProgressiveLeadToken(token.slice(1), leadId, campaignId)).toBe(false);
    expect(verifyProgressiveLeadToken(`${token.slice(0, -1)}x`, leadId, campaignId)).toBe(false);
  });
});
