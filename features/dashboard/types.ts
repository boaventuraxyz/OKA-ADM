import type { AppRole } from "@/features/auth/types";
import type { Tables } from "@/lib/supabase/database.types";

export type CampaignStatusCounts = {
  draft: number;
  published: number;
  archived: number;
  total: number;
};

export type DashboardCampaign = Pick<
  Tables<"campanhas">,
  "id" | "titulo" | "slug" | "status" | "theme_key" | "updated_at"
>;

export type DashboardLead = Pick<
  Tables<"assinaturas">,
  "id" | "campanha_id" | "nome_assinante" | "assinado_em"
> & {
  campanha: Pick<Tables<"campanhas">, "id" | "titulo">;
};

export type LeadMetrics = {
  total: number;
  today: number;
  lastSevenDays: number;
};

export type DashboardLeadInsights =
  | {
      visible: true;
      metrics: LeadMetrics;
      recentLeads: DashboardLead[];
    }
  | {
      visible: false;
      metrics: null;
      recentLeads: [];
    };

export type DashboardOverview = {
  viewerRole: AppRole;
  campaignCounts: CampaignStatusCounts;
  recentCampaigns: DashboardCampaign[];
  leads: DashboardLeadInsights;
};
