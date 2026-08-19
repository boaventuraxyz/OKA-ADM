import { Bot, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { CampaignRowActions } from "@/features/campaigns/CampaignRowActions";
import { listCandidateOptions } from "@/features/candidates/service";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUSES,
  type CampaignStatus,
} from "@/features/campaigns/domain";
import { listCampaigns } from "@/features/campaigns/service";
import { THEME_REGISTRY, getThemeByKey } from "@/features/themes/registry";
import { requireAdmin } from "@/lib/auth";
import styles from "@/features/campaigns/campaign-admin.module.css";

export const metadata: Metadata = { title: "Campanhas" };
export const dynamic = "force-dynamic";

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short"
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statusVariant: Record<CampaignStatus, BadgeVariant> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

function value(params: Awaited<SearchParams>, key: string) {
  const candidate = params[key];
  return Array.isArray(candidate) ? candidate[0] : candidate;
}

function pageHref(
  current: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();
  for (const [key, candidate] of Object.entries({ ...current, page: String(page) })) {
    if (candidate) params.set(key, candidate);
  }
  return `/admin/campaigns?${params}`;
}

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = {
    page: value(params, "page"),
    pageSize: 20,
    search: value(params, "search") || undefined,
    status: value(params, "status") || undefined,
    theme: value(params, "theme") || undefined,
    candidateId: value(params, "candidateId") || undefined,
    sortBy: value(params, "sortBy") || undefined,
    sortDirection: value(params, "sortDirection") || undefined,
  };
  const [result, candidates] = await Promise.all([
    listCampaigns(query),
    listCandidateOptions()
  ]);
  const currentQuery = {
    search: query.search,
    status: query.status,
    theme: query.theme,
    candidateId: query.candidateId,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.secondaryLink} href="/admin/campaigns/ai">
              <Bot aria-hidden="true" size={18} /> Criar com IA
            </Link>
            <Link className={styles.primaryLink} href="/admin/campaigns/new">
              <Plus aria-hidden="true" size={18} /> Nova campanha
            </Link>
          </div>
        }
        description="Busque, filtre e acompanhe o ciclo de vida sem apagar o histórico."
        eyebrow="Conteúdo"
        title="Campanhas"
      />

      <form action="/admin/campaigns" className={styles.filters} method="get">
        <div className={styles.field}>
          <label htmlFor="campaign-search">Buscar</label>
          <Input
            defaultValue={query.search}
            id="campaign-search"
            maxLength={120}
            name="search"
            placeholder="Nome ou slug"
            type="search"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-status">Status</label>
          <Select defaultValue={query.status || ""} id="campaign-status" name="status">
            <option value="">Todos</option>
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>{CAMPAIGN_STATUS_LABELS[status]}</option>
            ))}
          </Select>
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-theme">Tema</label>
          <Select defaultValue={query.theme || ""} id="campaign-theme" name="theme">
            <option value="">Todos</option>
            {THEME_REGISTRY.map((theme) => (
              <option key={theme.key} value={theme.key}>{theme.name}</option>
            ))}
          </Select>
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-candidate">Candidato</label>
          <Select
            defaultValue={query.candidateId || ""}
            id="campaign-candidate"
            name="candidateId"
          >
            <option value="">Todos</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.nome}{candidate.partido ? ` · ${candidate.partido}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.field}>
          <label htmlFor="campaign-sort">Ordenar</label>
          <Select defaultValue={query.sortBy || "updated_at"} id="campaign-sort" name="sortBy">
            <option value="updated_at">Última edição</option>
            <option value="created_at">Criação</option>
            <option value="titulo">Nome</option>
            <option value="status">Status</option>
          </Select>
        </div>
        <input name="sortDirection" type="hidden" value="desc" />
        <div className={styles.filterActions}>
          <button className={styles.filterButton} type="submit">
            <Search aria-hidden="true" size={17} /> Filtrar
          </button>
          <Link className={styles.secondaryLink} href="/admin/campaigns">Limpar</Link>
        </div>
      </form>

      <section aria-label="Lista de campanhas" className={styles.tableCard}>
        {result.items.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <th>Status</th>
                    <th>Tema</th>
                    <th>Candidato</th>
                    <th>Leads</th>
                    <th>Última edição</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>
                        <span className={styles.campaignIdentity}>
                          <strong>{campaign.titulo}</strong>
                          <code>/{campaign.slug || "sem-slug"}</code>
                        </span>
                      </td>
                      <td>
                        <Badge variant={statusVariant[campaign.status]}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </td>
                      <td>{getThemeByKey(campaign.theme_key || "")?.name || `Tema ${campaign.tema}`}</td>
                      <td>{campaign.candidato?.nome || <span className={styles.muted}>Sem candidato</span>}</td>
                      <td>
                        {campaign.leadCount === null ? (
                          <span className={styles.muted}>Restrito</span>
                        ) : (
                          new Intl.NumberFormat("pt-BR").format(campaign.leadCount)
                        )}
                      </td>
                      <td>
                        <time dateTime={campaign.updated_at}>
                          {shortDateFormatter.format(new Date(campaign.updated_at))}
                        </time>
                      </td>
                      <td>
                        <CampaignRowActions
                          id={campaign.id}
                          slug={campaign.slug}
                          status={campaign.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="Paginação de campanhas" className={styles.pagination}>
              <span>{result.total} campanha{result.total === 1 ? "" : "s"} · página {result.page} de {Math.max(1, result.pageCount)}</span>
              <div className={styles.paginationLinks}>
                <Link
                  aria-disabled={result.page <= 1}
                  className={styles.pageLink}
                  href={pageHref(currentQuery, Math.max(1, result.page - 1))}
                >
                  Anterior
                </Link>
                <Link
                  aria-disabled={result.page >= result.pageCount}
                  className={styles.pageLink}
                  href={pageHref(currentQuery, result.page + 1)}
                >
                  Próxima
                </Link>
              </div>
            </nav>
          </>
        ) : (
          <div className={styles.empty}>
            <EmptyState
              action={<Link className={styles.primaryLink} href="/admin/campaigns/new">Criar campanha</Link>}
              description="Ajuste os filtros ou crie o primeiro rascunho."
              title="Nenhuma campanha encontrada"
            />
          </div>
        )}
      </section>
    </div>
  );
}
