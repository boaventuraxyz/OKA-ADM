import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CampaignPublicRenderer } from "@/components/CampaignPublicRenderer";
import { THEME_REGISTRY } from "@/features/themes/registry";
import { createThemePreviewCampaign } from "@/features/themes/theme-preview-data";

describe("palavras coloridas em todos os temas", () => {
  it.each(THEME_REGISTRY)("aplica a seleção no tema $id · $name", (theme) => {
    const campaign = createThemePreviewCampaign({ theme });
    const { container } = render(
      <CampaignPublicRenderer campanha={campaign} preview totalAssinaturas={0} />
    );

    const highlightedWord = container.querySelector("h1 .campaign-headline-custom");
    expect(highlightedWord).toBeInTheDocument();
    expect(highlightedWord).toHaveStyle({ color: "#FACC15" });
  });
});
