import { ArrowLeft, Download, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import {
  AuthenticationRequiredError,
  AuthorizationRequiredError,
} from "@/features/auth/guards";
import {
  listLeadCampaignOptions,
  listLeads,
} from "@/features/leads/service";
import { requireAdmin } from "@/lib/auth";

import styles from "./leads-admin.module.css";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function value(params: Awaited<SearchParams>, key: string) {
  const candidate = params[key];
  return Array.isArray(candidate) ? candidate[0] : candidate;
}

function safePage(valueToParse: string | undefined) {
  const parsed = Number(valueToParse);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function safeSearch(valueToParse: string | undefined) {
  const parsed = valueToParse?.trim();
  return parsed ? parsed.slice(0, 120) : undefined;
}

function safeUuid(valueToParse: string | undefined) {
  return valueToParse &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      valueToParse,
    )
    ? valueToParse
    : undefined;
}

function safeDate(valueToParse: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valueToParse ?? "");
  if (!match) return undefined;

  const [, year, month, day] = match;
  const probe = new Date(`${year}-${month}-${day}T12:00:00.000Z`);
  return probe.getUTCFullYear() === Number(year) &&
    probe.getUTCMonth() + 1 === Number(month) &&
    probe.getUTCDate() === Number(day)
    ? valueToParse
    : undefined;
}

function formatCep(valueToFormat: string | null) {
  const digits = valueToFormat?.replace(/\D/g, "") ?? "";
  return digits.length === 8
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : valueToFormat || "—";
}

function formatDate(valueToFormat: string | null) {
  if (!valueToFormat) return "Data não informada";
  const date = new Date(valueToFormat);
  return Number.isFinite(date.getTime())
    ? dateTimeFormatter.format(date)
    : "Data não informada";
}

function originLabel(source: string) {
  return source === "public_form" ? "Formulário público" : source;
}

function hrefWithPage(
  filters: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, filterValue] of Object.entries({
    ...filters,
    page: String(page),
  })) {
    if (filterValue) params.set(key, filterValue);
  }
  return `/admin/leads?${params}`;
}

function exportHref(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, filterValue] of Object.entries(filters)) {
    if (filterValue) params.set(key, filterValue);
  }
  return `/api/admin/leads/export${params.size ? `?${params}` : ""}`;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAdmin();
  if (context.profile.role === "editor") redirect("/admin");

  const params = await searchParams;
  const filters = {
    search: safeSearch(value(params, "search")),
    campaignId: safeUuid(value(params, "campaignId")),
    from: safeDate(value(params, "from")),
    to: safeDate(value(params, "to")),
  };
  const page = safePage(value(params, "page"));

  let leads;
  let campaignOptions;
  try {
    [leads, campaignOptions] = await Promise.all([
      listLeads({ ...filters, page, pageSize: 25 }),
      listLeadCampaignOptions({ page: 1, pageSize: 50 }),
    ]);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    if (error instanceof AuthorizationRequiredError) redirect("/admin");
    throw error;
  }

  const selectedCampaignExists = campaignOptions.items.some(
    (campaign) => campaign.id === filters.campaignId,
  );
  const selectedCampaignTitle = leads.items.find(
    (lead) => lead.campanha_id === filters.campaignId,
  )?.campanha.titulo;

  return (
    <div className={styles.page}>
      <PageHeader
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.secondaryLink} href="/admin">
              <ArrowLeft aria-hidden="true" size={17} /> Painel
            </Link>
            <a className={styles.primaryLink} href={exportHref(filters)}>
              <Download aria-hidden="true" size={17} /> Exportar CSV
            </a>
          </div>
        }
        description="Consulte registros com acesso restrito e exporte apenas o recorte filtrado. O CSV é limitado a 5.000 linhas."
        eyebrow="Dados protegidos"
        title="Leads"
      />

      <form action="/admin/leads" className={styles.filters} method="get">
        <div className={styles.searchField}>
          <label htmlFor="lead-search">Buscar</label>
          <Input
            defaultValue={filters.search}
            id="lead-search"
            maxLength={120}
            name="search"
            placeholder="Nome, telefone ou e-mail"
            type="search"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="lead-campaign">Campanha</label>
          <Select
            defaultValue={filters.campaignId || ""}
            id="lead-campaign"
            name="campaignId"
          >
            <option value="">Todas</option>
            {filters.campaignId && !selectedCampaignExists ? (
              <option value={filters.campaignId}>
                {selectedCampaignTitle || "Campanha selecionada"}
              </option>
            ) : null}
            {campaignOptions.items.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.titulo}
              </option>
            ))}
          </Select>
        </div>

        <div className={styles.field}>
          <label htmlFor="lead-from">De</label>
          <Input
            defaultValue={filters.from}
            id="lead-from"
            name="from"
            type="date"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="lead-to">Até</label>
          <Input
            defaultValue={filters.to}
            id="lead-to"
            name="to"
            type="date"
          />
        </div>

        <div className={styles.filterActions}>
          <button className={styles.filterButton} type="submit">
            <Search aria-hidden="true" size={17} /> Filtrar
          </button>
          <Link className={styles.secondaryLink} href="/admin/leads">
            Limpar
          </Link>
        </div>
      </form>

      {campaignOptions.pageCount > 1 ? (
        <p className={styles.optionNotice}>
          O seletor mostra as primeiras 50 campanhas em ordem alfabética.
        </p>
      ) : null}

      <section aria-label="Lista de leads" className={styles.tableCard}>
        {leads.items.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>
                  Leads filtrados com dados de contato e origem
                </caption>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>CEP</th>
                    <th>Cidade</th>
                    <th>UF</th>
                    <th>Campanha</th>
                    <th>Origem</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.items.map((lead) => (
                    <tr key={lead.id}>
                      <td data-label="Nome"><strong>{lead.nome_assinante}</strong></td>
                      <td data-label="Telefone">{lead.numero_assinante || "—"}</td>
                      <td data-label="E-mail">{lead.email_assinante || "—"}</td>
                      <td data-label="CEP">{formatCep(lead.cep_assinante)}</td>
                      <td data-label="Cidade">{lead.cidade_assinante || "—"}</td>
                      <td data-label="UF">{lead.estado_assinante || "—"}</td>
                      <td data-label="Campanha">{lead.campanha.titulo}</td>
                      <td data-label="Origem">{originLabel(lead.source)}</td>
                      <td data-label="Data">
                        {lead.assinado_em ? (
                          <time dateTime={lead.assinado_em}>
                            {formatDate(lead.assinado_em)}
                          </time>
                        ) : (
                          "Data não informada"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav aria-label="Paginação de leads" className={styles.pagination}>
              <span>
                {leads.total} lead{leads.total === 1 ? "" : "s"} · página{" "}
                {leads.page} de {Math.max(1, leads.pageCount)}
              </span>
              <div className={styles.paginationLinks}>
                {leads.page > 1 ? (
                  <Link
                    className={styles.pageLink}
                    href={hrefWithPage(filters, leads.page - 1)}
                  >
                    Anterior
                  </Link>
                ) : (
                  <span aria-disabled="true" className={styles.pageLinkDisabled}>
                    Anterior
                  </span>
                )}
                {leads.page < leads.pageCount ? (
                  <Link
                    className={styles.pageLink}
                    href={hrefWithPage(filters, leads.page + 1)}
                  >
                    Próxima
                  </Link>
                ) : (
                  <span aria-disabled="true" className={styles.pageLinkDisabled}>
                    Próxima
                  </span>
                )}
              </div>
            </nav>
          </>
        ) : (
          <EmptyState
            action={
              <Link className={styles.primaryLink} href="/admin/leads">
                Limpar filtros
              </Link>
            }
            description="Nenhum registro corresponde aos filtros selecionados."
            icon={<Users size={24} />}
            title="Nenhum lead encontrado"
          />
        )}
      </section>
    </div>
  );
}
