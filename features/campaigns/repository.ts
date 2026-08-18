import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  CampaignActivityInsert,
  CampaignInsert,
  CampaignListItem,
  CampaignListParams,
  CampaignRow,
  CampaignUpdate,
} from "./types";

export type CampaignDatabaseClient = SupabaseClient<Database>;

const CAMPAIGN_LIST_SELECT = `
  id,
  titulo,
  slug,
  status,
  theme_key,
  tema,
  updated_at,
  created_at,
  published_at,
  candidato_id,
  candidato:candidatos!campanhas_candidato_id_fkey(id,nome,partido)
`;

const CAMPAIGN_LIST_WITH_LEAD_COUNT_SELECT = `
  ${CAMPAIGN_LIST_SELECT},
  lead_totals:assinaturas!assinaturas_campanha_id_fkey(count)
`;

type CampaignListDatabaseRow = Omit<CampaignListItem, "leadCount"> & {
  lead_totals?: Array<{ count: number }>;
};

export class CampaignRepositoryError extends Error {
  readonly databaseCode?: string;
  readonly operation: string;

  constructor(operation: string, error: PostgrestError) {
    super("Não foi possível acessar os dados da campanha.", { cause: error });
    this.name = "CampaignRepositoryError";
    this.databaseCode = error.code;
    this.operation = operation;
  }
}

function assertNoError(
  operation: string,
  error: PostgrestError | null,
): asserts error is null {
  if (error) throw new CampaignRepositoryError(operation, error);
}

function campaignSearchFilter(value: string) {
  return [
    `titulo.ilike.*${value}*`,
    `slug.ilike.*${value}*`,
  ].join(",");
}

export function isCampaignUniqueViolation(error: unknown): boolean {
  return (
    error instanceof CampaignRepositoryError && error.databaseCode === "23505"
  );
}

export async function listCampaignRows(
  client: CampaignDatabaseClient,
  params: CampaignListParams,
  includeLeadCount: boolean,
): Promise<{ items: CampaignListItem[]; total: number }> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = client
    .from("campanhas")
    .select(
      includeLeadCount
        ? CAMPAIGN_LIST_WITH_LEAD_COUNT_SELECT
        : CAMPAIGN_LIST_SELECT,
      { count: "exact" },
    );

  if (params.search) {
    query = query.or(campaignSearchFilter(params.search));
  }

  if (params.status) query = query.eq("status", params.status);
  if (params.theme) query = query.eq("theme_key", params.theme);

  query = query
    .order(params.sortBy, { ascending: params.sortDirection === "asc" })
    .order("id", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  assertNoError("list", error);

  const items = (data ?? []).map((databaseRow) => {
    const { lead_totals: leadTotals, ...row } =
      databaseRow as unknown as CampaignListDatabaseRow;

    return {
      ...row,
      leadCount: includeLeadCount ? (leadTotals?.[0]?.count ?? 0) : null,
    };
  });

  return {
    items,
    total: count ?? 0,
  };
}

export async function getCampaignRow(
  client: CampaignDatabaseClient,
  id: string,
): Promise<CampaignRow | null> {
  const { data, error } = await client
    .from("campanhas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoError("get", error);
  return data;
}

export async function insertCampaignRow(
  client: CampaignDatabaseClient,
  payload: CampaignInsert,
): Promise<CampaignRow> {
  const { data, error } = await client
    .from("campanhas")
    .insert(payload)
    .select("*")
    .single();

  assertNoError("insert", error);
  return data;
}

/** The status predicate makes draft-only editing race safe. */
export async function updateDraftCampaignRow(
  client: CampaignDatabaseClient,
  id: string,
  payload: CampaignUpdate,
  expectedUpdatedAt?: string,
): Promise<CampaignRow | null> {
  let query = client
    .from("campanhas")
    .update(payload)
    .eq("id", id)
    .eq("status", "draft");

  if (expectedUpdatedAt) {
    query = query.eq("updated_at", expectedUpdatedAt);
  }

  const { data, error } = await query
    .select("*")
    .maybeSingle();

  assertNoError("update-draft", error);
  return data;
}

export async function transitionCampaignRow(
  client: CampaignDatabaseClient,
  id: string,
  expectedStatuses: CampaignRow["status"][],
  payload: CampaignUpdate,
): Promise<CampaignRow | null> {
  const { data, error } = await client
    .from("campanhas")
    .update(payload)
    .eq("id", id)
    .in("status", expectedStatuses)
    .select("*")
    .maybeSingle();

  assertNoError("transition", error);
  return data;
}

export async function insertCampaignActivity(
  client: CampaignDatabaseClient,
  payload: CampaignActivityInsert,
): Promise<void> {
  const { error } = await client.from("campaign_activity").insert(payload);
  assertNoError("activity", error);
}
