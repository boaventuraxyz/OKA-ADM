import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";

describe("CampaignBackgroundField", () => {
  it("expõe a remoção da logo mesmo quando a arte vem de uma reserva do tema", () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <CampaignBackgroundField
        label="Logo da campanha"
        onChange={onChange}
        onRemove={onRemove}
        removeLabel="Remover logo"
        showRemoveWhenEmpty
        value=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover logo" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
