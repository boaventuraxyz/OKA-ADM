import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignRichText } from "@/components/CampaignRichText";

describe("CampaignRichText", () => {
  it("preserva somente a formatação inline permitida", () => {
    const { container } = render(
      <CampaignRichText
        className="copy"
        text={"Texto <strong>forte</strong>, <em>ênfase</em> e <u>sublinhado</u>."}
      />
    );

    expect(screen.getByText("forte").tagName).toBe("STRONG");
    expect(screen.getByText("ênfase").tagName).toBe("EM");
    expect(screen.getByText("sublinhado").tagName).toBe("U");
    expect(container.querySelectorAll("p.copy")).toHaveLength(1);
  });

  it("descarta tags perigosas e seu conteúdo sem usar HTML injetado", () => {
    const { container } = render(
      <CampaignRichText
        className="copy"
        text={'Seguro<script>alert("x")</script><img src=x onerror=alert(1)> final'}
      />
    );

    expect(screen.getByText("Seguro final")).toBeInTheDocument();
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("mantém quebras de linha e entidades comuns", () => {
    const { container } = render(
      <CampaignRichText className="copy" text={"A &amp; B\nsegunda linha"} />
    );

    expect(screen.getByText(/A & B/)).toBeInTheDocument();
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });
});
