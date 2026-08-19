import { describe, expect, it } from "vitest";

import { shouldAutosaveCampaign } from "@/features/campaigns/autosave";

describe("campaign draft autosave", () => {
  it.each(["draft", "published"] as const)(
    "saves a valid, dirty, persisted %s campaign",
    (status) => {
      expect(shouldAutosaveCampaign({
        dirty: true,
        hasValidationError: false,
        isPending: false,
        mode: "edit",
        status,
      })).toBe(true);
    },
  );

  it.each([
    { dirty: false, hasValidationError: false, isPending: false, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: true, isPending: false, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: true, mode: "edit", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: false, mode: "create", status: "draft" },
    { dirty: true, hasValidationError: false, isPending: false, mode: "edit", status: "archived" },
  ] as const)("does not autosave an ineligible state: %o", (state) => {
    expect(shouldAutosaveCampaign(state)).toBe(false);
  });
});
