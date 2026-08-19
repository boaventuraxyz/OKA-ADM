import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

import type { CampaignStatus } from "./domain";

export type CampaignRow = Tables<"campanhas">;
export type CampaignInsert = TablesInsert<"campanhas">;
export type CampaignUpdate = TablesUpdate<"campanhas">;

export type CampaignCandidateSummary = Pick<
  Tables<"candidatos">,
  "id" | "nome" | "partido"
>;

export type CampaignListItem = Pick<
  CampaignRow,
  | "id"
  | "titulo"
  | "slug"
  | "status"
  | "theme_key"
  | "tema"
  | "updated_at"
  | "created_at"
  | "published_at"
  | "candidato_id"
> & {
  candidato: CampaignCandidateSummary | null;
  /** Hidden from editors because lead rows contain protected personal data. */
  leadCount: number | null;
};

export const CAMPAIGN_SORT_FIELDS = [
  "updated_at",
  "created_at",
  "titulo",
  "status",
] as const;

export type CampaignSortField = (typeof CAMPAIGN_SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

export type CampaignListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: CampaignStatus;
  theme?: string;
  candidateId?: string;
  sortBy: CampaignSortField;
  sortDirection: SortDirection;
};

export type CampaignPage = {
  items: CampaignListItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export const CAMPAIGN_ACTIVITY_ACTIONS = [
  "created",
  "edited",
  "published",
  "unpublished",
  "duplicated",
  "archived",
] as const;

export type CampaignActivityAction =
  (typeof CAMPAIGN_ACTIVITY_ACTIONS)[number];

export type CampaignActivityInsert = {
  campaign_id: string;
  user_id: string;
  action: CampaignActivityAction;
  details: Json;
};

export type CampaignMutationResult = Pick<
  CampaignRow,
  "id" | "slug" | "status" | "updated_at"
>;

export type CampaignActionErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_REQUIRED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "STATE_CONFLICT"
  | "SLUG_CONFLICT"
  | "AUDIT_FAILED"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type CampaignActionError = {
  code: CampaignActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

/** A plain-data result that can safely cross a Server Action boundary. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CampaignActionError };
