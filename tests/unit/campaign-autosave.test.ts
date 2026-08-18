import { describe, expect, it } from "vitest";

import { shouldAutosaveCampaignDraft } from "@/features/campaigns/autosave";

describe("campaign draft autosave", () => {
  it("saves only a valid, dirty, persisted draft", () => {
    expect(
      shouldAutosaveCampaignDraft({
        dirty: true,
        hasValidationError: false,
        isPending: false,
        mode: "edit",
        status: "draft",
      }),
    ).toBe(true);
  });

  it.each([
    { dirty: false, hasValidationError: false, isPending: false, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: true, isPending: false, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: true, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: false, mode: "create", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: false, mode: "edit", status: "published" },
    { dirty: true, hasValidationError: false, isPending: false, mode: "edit", status: "archived" },
  ] as const)("does not autosave an ineligible state: %o", (state) => {
    expect(shouldAutosaveCampaignDraft(state)).toBe(false);
  });
});
