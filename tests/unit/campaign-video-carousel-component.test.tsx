import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignVideoCarousel } from "@/components/CampaignVideoCarousel";

describe("CampaignVideoCarousel", () => {
  it("navega entre os vídeos e atualiza a legenda", () => {
    const { container } = render(
      <CampaignVideoCarousel
        candidateName="Responsável"
        videos={[
          { caption: "Primeiro relato", url: "https://cdn.example.com/primeiro.mp4" },
          { caption: "Segundo relato", url: "https://cdn.example.com/segundo.mp4" },
        ]}
      />,
    );

    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://cdn.example.com/primeiro.mp4",
    );
    expect(container.querySelector("figcaption")).toHaveTextContent("Primeiro relato");

    fireEvent.click(screen.getByRole("button", { name: "Próximo vídeo" }));

    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://cdn.example.com/segundo.mp4",
    );
    expect(container.querySelector("figcaption")).toHaveTextContent("Segundo relato");
  });
});
