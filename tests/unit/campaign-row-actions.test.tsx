import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

vi.mock("@/features/campaigns/actions", () => ({
  archiveCampaignAction: vi.fn(),
  duplicateCampaignAction: vi.fn(),
  publishCampaignAction: vi.fn(),
  unpublishCampaignAction: vi.fn(),
}));

import { CampaignRowActions } from "@/features/campaigns/CampaignRowActions";

describe("ações da linha de campanha", () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  it("não oferece transições de publicação para editores", () => {
    render(
      <CampaignRowActions
        canManage={false}
        id="00000000-0000-4000-8000-000000000001"
        slug="campanha"
        status="draft"
      />,
    );

    expect(screen.getByRole("link", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publicar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /arquivar/i })).not.toBeInTheDocument();
  });

  it("oferece as transições permitidas para administradores", () => {
    render(
      <CampaignRowActions
        canManage
        id="00000000-0000-4000-8000-000000000001"
        slug="campanha"
        status="draft"
      />,
    );

    expect(screen.getByRole("button", { name: /publicar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /arquivar/i })).toBeInTheDocument();
  });
});
