import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  LeadCampaignOption,
  LeadExportRow,
  LeadFilters,
  LeadListItem,
  LeadListParams,
} from "./types";

export type LeadDatabaseClient = SupabaseClient<Database>;

const LEAD_LIST_SELECT = `
  id,
  campanha_id,
  nome_assinante,
  email_assinante,
  numero_assinante,
  cep_assinante,
  cidade_assinante,
  estado_assinante,
  assinado_em,
  source,
  campanha:campanhas!assinaturas_campanha_id_fkey(id,titulo)
`;

const LEAD_EXPORT_SELECT = `
  nome_assinante,
  numero_assinante,
  email_assinante,
  cep_assinante,
  cidade_assinante,
  estado_assinante,
  source,
  assinado_em,
  campanha:campanhas!assinaturas_campanha_id_fkey(id,titulo)
`;

export class LeadRepositoryError extends Error {
  readonly databaseCode?: string;

  constructor(error: PostgrestError) {
    super("Não foi possível carregar os registros de apoio.", { cause: error });
    this.name = "LeadRepositoryError";
    this.databaseCode = error.code;
  }
}

/** Search is pre-sanitized by the service before entering PostgREST raw OR syntax. */
function leadSearchFilter(search: string) {
  return [
    `nome_assinante.ilike.*${search}*`,
    `email_assinante.ilike.*${search}*`,
    `numero_assinante.ilike.*${search}*`,
  ].join(",");
}

export async function listLeadRows(
  client: LeadDatabaseClient,
  params: LeadListParams,
): Promise<{ items: LeadListItem[]; total: number }> {
  const fromIndex = (params.page - 1) * params.pageSize;
  const toIndex = fromIndex + params.pageSize - 1;

  let query = client
    .from("assinaturas")
    .select(LEAD_LIST_SELECT, { count: "exact" });

  if (params.search) query = query.or(leadSearchFilter(params.search));
  if (params.campaignId) query = query.eq("campanha_id", params.campaignId);
  if (params.from) query = query.gte("assinado_em", params.from);
  if (params.to) query = query.lte("assinado_em", params.to);

  const { data, error, count } = await query
    .order("assinado_em", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(fromIndex, toIndex);

  if (error) throw new LeadRepositoryError(error);

  return {
    items: (data ?? []) as unknown as LeadListItem[],
    total: count ?? 0,
  };
}

export async function listLeadCampaignOptionRows(
  client: LeadDatabaseClient,
  page: number,
  pageSize: number,
): Promise<{ items: LeadCampaignOption[]; total: number }> {
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;
  const { data, error, count } = await client
    .from("campanhas")
    .select("id,titulo", { count: "exact" })
    .order("titulo", { ascending: true })
    .order("id", { ascending: true })
    .range(fromIndex, toIndex);

  if (error) throw new LeadRepositoryError(error);

  return {
    items: data ?? [],
    total: count ?? 0,
  };
}

/** Retrieves one bounded CSV batch; callers own the global export ceiling. */
export async function listLeadExportRows(
  client: LeadDatabaseClient,
  filters: LeadFilters,
  offset: number,
  limit: number,
): Promise<LeadExportRow[]> {
  let query = client.from("assinaturas").select(LEAD_EXPORT_SELECT);

  if (filters.search) query = query.or(leadSearchFilter(filters.search));
  if (filters.campaignId) query = query.eq("campanha_id", filters.campaignId);
  if (filters.from) query = query.gte("assinado_em", filters.from);
  if (filters.to) query = query.lte("assinado_em", filters.to);

  const { data, error } = await query
    .order("assinado_em", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new LeadRepositoryError(error);
  return (data ?? []) as unknown as LeadExportRow[];
}
