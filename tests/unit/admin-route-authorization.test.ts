import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }));

vi.mock("@/features/auth/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/guards")>()),
  requireRole,
}));

vi.mock("@/lib/campaign-download", () => ({
  getCampaignCsvDownload: vi.fn(),
}));

import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import { GET as downloadImportModel } from "@/app/api/admin/leads/import/model/route";
import { GET as downloadCampaignLeads } from "@/app/api/campanhas/[id]/assinaturas/route";

const params = {
  params: Promise.resolve({
    id: "00000000-0000-4000-8000-000000000001",
  }),
};

describe("autorização de downloads administrativos", () => {
  beforeEach(() => {
    requireRole.mockReset();
  });

  it("distingue sessão ausente de papel insuficiente no modelo de importação", async () => {
    requireRole.mockRejectedValueOnce(new AuthenticationRequiredError());
    expect((await downloadImportModel()).status).toBe(401);

    requireRole.mockRejectedValueOnce(new AuthorizationRequiredError());
    expect((await downloadImportModel()).status).toBe(403);
  });

  it("bloqueia o CSV legado de assinaturas para editores", async () => {
    requireRole.mockRejectedValueOnce(new AuthorizationRequiredError());

    const response = await downloadCampaignLeads(
      new Request("https://example.com/api/campanhas/id/assinaturas"),
      params,
    );

    expect(response.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith(["master", "admin"]);
  });
});
