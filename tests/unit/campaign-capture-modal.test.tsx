import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CampaignCaptureProvider,
  CampaignCaptureTrigger,
} from "@/components/CampaignCaptureModal";

describe("pop-up de captação", () => {
  afterEach(() => vi.useRealTimers());

  it("pode abrir automaticamente depois do tempo configurado", () => {
    vi.useFakeTimers();
    render(
      <CampaignCaptureProvider
        autoOpen
        autoOpenDelayMs={5_000}
        form={<p>Formulário</p>}
        title="Participe"
      >
        <CampaignCaptureTrigger>Abrir formulário</CampaignCaptureTrigger>
      </CampaignCaptureProvider>,
    );

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    act(() => vi.advanceTimersByTime(4_999));
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("não reabre pelo temporizador depois de uma interação manual", () => {
    vi.useFakeTimers();
    render(
      <CampaignCaptureProvider
        autoOpen
        autoOpenDelayMs={5_000}
        form={<p>Formulário</p>}
        title="Participe"
      >
        <CampaignCaptureTrigger>Abrir formulário</CampaignCaptureTrigger>
      </CampaignCaptureProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir formulário" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar formulário" }));
    act(() => vi.advanceTimersByTime(5_000));

    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
  });

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
