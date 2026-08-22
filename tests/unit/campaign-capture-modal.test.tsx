import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CampaignCaptureProvider,
  CampaignCaptureTrigger,
} from "@/components/CampaignCaptureModal";

describe("pop-up de captação", () => {
  it("abre e fecha mesmo quando a API nativa de dialog não está disponível", () => {
    render(
      <CampaignCaptureProvider form={<p>Formulário</p>} title="Participe">
        <CampaignCaptureTrigger>Abrir formulário</CampaignCaptureTrigger>
      </CampaignCaptureProvider>,
    );

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).not.toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Abrir formulário" }));
    expect(dialog).toHaveAttribute("open");

    fireEvent.click(screen.getByRole("button", { name: "Fechar formulário" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
