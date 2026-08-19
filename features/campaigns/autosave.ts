import type { CampaignStatus } from "./domain";

export const CAMPAIGN_AUTOSAVE_DELAY_MS = 1_600;

export type CampaignAutosaveState = {
  dirty: boolean;
  hasValidationError: boolean;
  isPending: boolean;
  mode: "create" | "edit";
  status?: CampaignStatus;
};

/**
 * Autosave applies to persisted editable campaigns. New campaigns still
 * require an explicit first save so an incomplete record is never created.
 */
export function shouldAutosaveCampaign({
  dirty,
  hasValidationError,
  isPending,
  mode,
  status,
}: CampaignAutosaveState) {
  return (
    mode === "edit" &&
    (status === "draft" || status === "published") &&
    dirty &&
    !hasValidationError &&
    !isPending
  );
}
