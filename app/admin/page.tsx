import type { Metadata } from "next";

import {
  DashboardView,
  type DashboardCampaign,
  type DashboardLead,
} from "@/features/dashboard/DashboardView";
import { getDashboardOverview } from "@/features/dashboard/service";
import { THEME_REGISTRY, getThemeByKey } from "@/features/themes/registry";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const overview = await getDashboardOverview();
  const campaigns: DashboardCampaign[] = overview.recentCampaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.titulo,
    status: campaign.status,
    themeName: campaign.theme_key
      ? getThemeByKey(campaign.theme_key)?.name
      : undefined,
    updatedAtIso: campaign.updated_at,
    updatedAtLabel: formatDate(campaign.updated_at),
    href: `/admin/campaigns/${campaign.id}/edit`,
  }));
  const leads: DashboardLead[] = overview.leads.visible
    ? overview.leads.recentLeads.map((lead) => ({
        id: lead.id,
        name: lead.nome_assinante || "Nome não coletado",
        campaignTitle: lead.campanha.titulo,
        createdAtIso: lead.assinado_em ?? undefined,
        createdAtLabel: lead.assinado_em
          ? formatDate(lead.assinado_em)
          : "Data não informada",
        href: `/admin/leads?lead=${lead.id}`,
      }))
    : [];

  return (
    <DashboardView
      campaigns={campaigns}
      canViewLeads={overview.leads.visible}
      leads={leads}
      links={{
        campaigns: "/admin/campaigns",
        createCampaign: "/admin/campaigns/new",
        createWithAi: "/admin/campaigns/ai",
        leads: "/admin/leads",
        themes: "/admin/themes",
      }}
      totals={{
        archivedCampaigns: overview.campaignCounts.archived,
        draftCampaigns: overview.campaignCounts.draft,
        leads: overview.leads.metrics?.total ?? 0,
        leadsLast7Days: overview.leads.metrics?.lastSevenDays ?? 0,
        leadsToday: overview.leads.metrics?.today ?? 0,
        publishedCampaigns: overview.campaignCounts.published,
        themes: THEME_REGISTRY.length,
      }}
    />
  );
}
