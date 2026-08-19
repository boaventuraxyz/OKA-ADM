import type { Tables } from "@/lib/supabase/database.types";

export type LeadCampaignSummary = Pick<Tables<"campanhas">, "id" | "titulo">;

export type LeadRecord = Pick<
  Tables<"assinaturas">,
  | "id"
  | "campanha_id"
  | "nome_assinante"
  | "email_assinante"
  | "numero_assinante"
  | "cep_assinante"
  | "cidade_assinante"
  | "estado_assinante"
  | "assinado_em"
  | "source"
> & {
  campanha: LeadCampaignSummary;
};

export type LeadListItem = LeadRecord & {
  campanhas: LeadCampaignSummary[];
  campaignCount: number;
  signatureCount: number;
};

export type LeadListParams = {
  page: number;
  pageSize: number;
} & LeadFilters;

export type LeadFilters = {
  search?: string;
  campaignId?: string;
  from?: string;
  to?: string;
};

export type LeadPage = {
  items: LeadListItem[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type LeadCampaignOption = Pick<
  Tables<"campanhas">,
  "id" | "titulo"
>;

export type LeadCampaignOptionPage = {
  items: LeadCampaignOption[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type LeadExportRow = Pick<
  Tables<"assinaturas">,
  | "nome_assinante"
  | "numero_assinante"
  | "email_assinante"
  | "cep_assinante"
  | "cidade_assinante"
  | "estado_assinante"
  | "source"
  | "assinado_em"
> & {
  campanha: LeadCampaignSummary;
};
