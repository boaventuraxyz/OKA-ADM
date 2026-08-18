import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  CampaignStatusCounts,
  DashboardCampaign,
  DashboardLead,
  LeadMetrics,
} from "./types";

export type DashboardDatabaseClient = SupabaseClient<Database>;

export class DashboardRepositoryError extends Error {
  readonly databaseCode?: string;
  readonly operation: string;

  constructor(operation: string, error: PostgrestError) {
    super("Não foi possível carregar os indicadores do painel.", {
      cause: error,
    });
    this.name = "DashboardRepositoryError";
    this.databaseCode = error.code;
    this.operation = operation;
  }
}

function countOrThrow(
  operation: string,
  result: { count: number | null; error: PostgrestError | null },
) {
  if (result.error) throw new DashboardRepositoryError(operation, result.error);
  return result.count ?? 0;
}

export async function getCampaignStatusCounts(
  client: DashboardDatabaseClient,
): Promise<CampaignStatusCounts> {
  const [draftResult, publishedResult, archivedResult] = await Promise.all([
    client
      .from("campanhas")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    client
      .from("campanhas")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    client
      .from("campanhas")
      .select("id", { count: "exact", head: true })
      .eq("status", "archived"),
  ]);

  const draft = countOrThrow("count-draft", draftResult);
  const published = countOrThrow("count-published", publishedResult);
  const archived = countOrThrow("count-archived", archivedResult);

  return {
    draft,
    published,
    archived,
    total: draft + published + archived,
  };
}

export async function getRecentCampaignRows(
  client: DashboardDatabaseClient,
  limit: number,
): Promise<DashboardCampaign[]> {
  const { data, error } = await client
    .from("campanhas")
    .select("id,titulo,slug,status,theme_key,updated_at")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new DashboardRepositoryError("recent-campaigns", error);
  return data ?? [];
}

export async function getLeadMetrics(
  client: DashboardDatabaseClient,
  todayStart: string,
  sevenDaysAgo: string,
): Promise<LeadMetrics> {
  const [totalResult, todayResult, sevenDaysResult] = await Promise.all([
    client.from("assinaturas").select("id", { count: "exact", head: true }),
    client
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .gte("assinado_em", todayStart),
    client
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .gte("assinado_em", sevenDaysAgo),
  ]);

  return {
    total: countOrThrow("count-leads", totalResult),
    today: countOrThrow("count-leads-today", todayResult),
    lastSevenDays: countOrThrow("count-leads-seven-days", sevenDaysResult),
  };
}

export async function getRecentLeadRows(
  client: DashboardDatabaseClient,
  limit: number,
): Promise<DashboardLead[]> {
  const { data, error } = await client
    .from("assinaturas")
    .select(
      `
        id,
        campanha_id,
        nome_assinante,
        assinado_em,
        campanha:campanhas!assinaturas_campanha_id_fkey(id,titulo)
      `,
    )
    .order("assinado_em", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new DashboardRepositoryError("recent-leads", error);
  return (data ?? []) as unknown as DashboardLead[];
}
