import {
  Archive,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Megaphone,
  Palette,
  Plus,
  Sparkles,
  Users,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import styles from "./DashboardView.module.css";

export type DashboardTotals = {
  archivedCampaigns: number;
  draftCampaigns: number;
  leads: number;
  leadsLast7Days: number;
  leadsToday: number;
  publishedCampaigns: number;
  themes: number;
};

export type DashboardCampaignStatus = "published" | "draft" | "archived";

export type DashboardCampaign = {
  href?: string;
  id: string;
  status: DashboardCampaignStatus;
  themeName?: string;
  title: string;
  updatedAtIso?: string;
  updatedAtLabel: string;
};

export type DashboardLead = {
  campaignTitle: string;
  createdAtIso?: string;
  createdAtLabel: string;
  email?: string;
  href?: string;
  id: string;
  name: string;
};

export type DashboardLinks = {
  campaigns: string;
  createCampaign: string;
  createWithAi: string;
  leads: string;
  themes: string;
};

export type DashboardViewProps = {
  canViewLeads?: boolean;
  campaigns: readonly DashboardCampaign[];
  leads: readonly DashboardLead[];
  links?: Partial<DashboardLinks>;
  totals: DashboardTotals;
};

type MetricKey = keyof DashboardTotals;
type MetricTone = "brand" | "neutral" | "muted" | "info" | "success" | "warm";

type MetricDefinition = {
  icon: LucideIcon;
  key: MetricKey;
  label: string;
  note: string;
  tone: MetricTone;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

const defaultLinks: DashboardLinks = {
  campaigns: "/campanhas",
  createCampaign: "/campanhas/novo",
  createWithAi: "/campanhas/novo?modo=ia",
  leads: "/leads",
  themes: "/temas"
};

const metrics = [
  {
    icon: CheckCircle2,
    key: "publishedCampaigns",
    label: "Publicadas",
    note: "campanhas disponíveis",
    tone: "success"
  },
  {
    icon: FilePenLine,
    key: "draftCampaigns",
    label: "Rascunhos",
    note: "em preparação",
    tone: "warm"
  },
  {
    icon: Archive,
    key: "archivedCampaigns",
    label: "Arquivadas",
    note: "fora de circulação",
    tone: "muted"
  },
  {
    icon: Palette,
    key: "themes",
    label: "Temas",
    note: "modelos disponíveis",
    tone: "brand"
  },
  {
    icon: Users,
    key: "leads",
    label: "Leads",
    note: "registros no total",
    tone: "info"
  },
  {
    icon: Clock3,
    key: "leadsToday",
    label: "Hoje",
    note: "novos leads",
    tone: "brand"
  },
  {
    icon: CalendarDays,
    key: "leadsLast7Days",
    label: "Últimos 7 dias",
    note: "novos leads",
    tone: "neutral"
  }
] as const satisfies readonly MetricDefinition[];

const toneClass: Record<MetricTone, string> = {
  brand: styles.metricBrand,
  info: styles.metricInfo,
  muted: styles.metricMuted,
  neutral: styles.metricNeutral,
  success: styles.metricSuccess,
  warm: styles.metricWarm
};

const campaignStatus: Record<
  DashboardCampaignStatus,
  { label: string; variant: BadgeVariant }
> = {
  archived: { label: "Arquivada", variant: "neutral" },
  draft: { label: "Rascunho", variant: "warning" },
  published: { label: "Publicada", variant: "success" }
};

function OptionalRowLink({
  children,
  href
}: {
  children: ReactNode;
  href?: string;
}) {
  if (href) {
    return (
      <Link className={styles.listRow} href={href}>
        {children}
      </Link>
    );
  }

  return <div className={styles.listRow}>{children}</div>;
}

function CampaignRow({ campaign }: { campaign: DashboardCampaign }) {
  const status = campaignStatus[campaign.status];

  return (
    <li>
      <OptionalRowLink href={campaign.href}>
        <span aria-hidden="true" className={styles.rowIcon}>
          <Megaphone size={17} />
        </span>
        <span className={styles.rowMain}>
          <strong>{campaign.title}</strong>
          <span>
            {campaign.themeName ? `${campaign.themeName} · ` : ""}
            Atualizada <time dateTime={campaign.updatedAtIso}>{campaign.updatedAtLabel}</time>
          </span>
        </span>
        <span className={styles.rowStatus}>
          <Badge variant={status.variant}>{status.label}</Badge>
        </span>
        {campaign.href ? <ArrowRight aria-hidden="true" className={styles.rowArrow} size={17} /> : null}
      </OptionalRowLink>
    </li>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LD";
}

function LeadRow({ lead }: { lead: DashboardLead }) {
  return (
    <li>
      <OptionalRowLink href={lead.href}>
        <span aria-hidden="true" className={styles.leadAvatar}>{getInitials(lead.name)}</span>
        <span className={styles.rowMain}>
          <strong>{lead.name}</strong>
          <span>{lead.email || lead.campaignTitle}</span>
        </span>
        <span className={styles.leadMeta}>
          <strong>{lead.campaignTitle}</strong>
          <time dateTime={lead.createdAtIso}>{lead.createdAtLabel}</time>
        </span>
        {lead.href ? <ArrowRight aria-hidden="true" className={styles.rowArrow} size={17} /> : null}
      </OptionalRowLink>
    </li>
  );
}

export function DashboardView({
  campaigns,
  canViewLeads = true,
  leads,
  links,
  totals
}: DashboardViewProps) {
  const resolvedLinks = { ...defaultLinks, ...links };
  const quickActions = [
    {
      description: "Configure uma nova página de mobilização.",
      href: resolvedLinks.createCampaign,
      icon: Plus,
      label: "Nova campanha",
      primary: true
    },
    {
      description: "Comece com uma estrutura assistida por IA.",
      href: resolvedLinks.createWithAi,
      icon: Bot,
      label: "Criar com IA",
      primary: true
    },
    {
      description: "Gerencie publicações e rascunhos.",
      href: resolvedLinks.campaigns,
      icon: Megaphone,
      label: "Ver campanhas",
      primary: false
    },
    {
      description: "Compare as opções visuais disponíveis.",
      href: resolvedLinks.themes,
      icon: Palette,
      label: "Ver temas",
      primary: false
    },
    {
      description: "Acompanhe os contatos recebidos.",
      href: resolvedLinks.leads,
      icon: Users,
      label: "Ver leads",
      primary: false
    }
  ] as const;
  const visibleMetrics = canViewLeads
    ? metrics
    : metrics.filter(
        (metric) =>
          metric.key !== "leads" &&
          metric.key !== "leadsToday" &&
          metric.key !== "leadsLast7Days"
      );
  const visibleQuickActions = canViewLeads
    ? quickActions
    : quickActions.filter((action) => action.href !== resolvedLinks.leads);

  return (
    <div className={styles.dashboard}>
      <PageHeader
        actions={
          <Link className={styles.primaryAction} href={resolvedLinks.createCampaign}>
            <Plus aria-hidden="true" size={18} />
            Nova campanha
          </Link>
        }
        description="Acompanhe o conteúdo publicado e os leads recentes sem perder tempo com indicadores decorativos."
        eyebrow="Visão operacional"
        title="Dashboard"
      />

      <section aria-labelledby="dashboard-metrics-title" className={styles.metricsSection}>
        <h2 className={styles.srOnly} id="dashboard-metrics-title">Indicadores principais</h2>
        <div className={styles.metricsGrid}>
          {visibleMetrics.map((metric) => {
            const MetricIcon = metric.icon;
            return (
              <Card className={`${styles.metricCard} ${toneClass[metric.tone]}`} key={metric.key}>
                <CardContent className={styles.metricContent}>
                  <span aria-hidden="true" className={styles.metricIcon}>
                    <MetricIcon size={19} strokeWidth={1.9} />
                  </span>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  <strong className={styles.metricValue}>{numberFormatter.format(totals[metric.key])}</strong>
                  <span className={styles.metricNote}>{metric.note}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dashboard-actions-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>Ações rápidas</p>
            <h2 id="dashboard-actions-title">Continue de onde precisa</h2>
          </div>
        </div>
        <div className={styles.quickGrid}>
          {visibleQuickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Link
                className={`${styles.quickAction} ${action.primary ? styles.quickActionPrimary : ""}`}
                href={action.href}
                key={action.label}
              >
                <span aria-hidden="true" className={styles.quickIcon}>
                  <ActionIcon size={19} />
                </span>
                <span className={styles.quickCopy}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </span>
                <ArrowRight aria-hidden="true" className={styles.quickArrow} size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <div className={`${styles.recentGrid} ${!canViewLeads ? styles.recentGridSingle : ""}`}>
        <section aria-labelledby="recent-campaigns-title">
          <Card className={styles.listCard}>
            <CardHeader className={styles.listHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Conteúdo</p>
                <h2 id="recent-campaigns-title">Últimas campanhas</h2>
              </div>
              <Link className={styles.sectionLink} href={resolvedLinks.campaigns}>
                Ver todas <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </CardHeader>
            <CardContent className={styles.listContent}>
              {campaigns.length > 0 ? (
                <ul className={styles.dataList}>
                  {campaigns.map((campaign) => <CampaignRow campaign={campaign} key={campaign.id} />)}
                </ul>
              ) : (
                <EmptyState
                  action={
                    <Link className={styles.secondaryAction} href={resolvedLinks.createCampaign}>
                      Criar campanha
                    </Link>
                  }
                  description="Quando uma campanha for criada, ela aparecerá aqui para acesso rápido."
                  icon={<Megaphone size={22} />}
                  title="Nenhuma campanha ainda"
                />
              )}
            </CardContent>
          </Card>
        </section>

        {canViewLeads ? <section aria-labelledby="recent-leads-title">
          <Card className={styles.listCard}>
            <CardHeader className={styles.listHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Relacionamento</p>
                <h2 id="recent-leads-title">Leads recentes</h2>
              </div>
              <Link className={styles.sectionLink} href={resolvedLinks.leads}>
                Ver todos <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </CardHeader>
            <CardContent className={styles.listContent}>
              {leads.length > 0 ? (
                <ul className={styles.dataList}>
                  {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
                </ul>
              ) : (
                <EmptyState
                  action={
                    <Link className={styles.secondaryAction} href={resolvedLinks.campaigns}>
                      Ver campanhas
                    </Link>
                  }
                  description="Os novos contatos captados pelas campanhas aparecerão nesta lista."
                  icon={<Sparkles size={22} />}
                  title="Nenhum lead recebido"
                />
              )}
            </CardContent>
          </Card>
        </section> : null}
      </div>
    </div>
  );
}
