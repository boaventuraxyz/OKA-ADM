import { Eye, FilePenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CAMPAIGN_STATUS_LABELS } from "@/features/campaigns/domain";
import { listCampaignForms } from "@/features/forms/service";
import { requireAdmin } from "@/lib/auth";

import styles from "./forms.module.css";

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short"
});

export const metadata: Metadata = { title: "Formulários" };
export const dynamic = "force-dynamic";

const badgeVariant = {
  draft: "warning",
  published: "success",
  archived: "neutral",
} as const;

export default async function AdminFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const result = await listCampaignForms(Number(page) || 1);

  return (
    <div className={styles.page}>
      <PageHeader
        description="Cada campanha possui um formulário enxuto e configurável, sem a complexidade de um page builder."
        eyebrow="Captação"
        title="Formulários"
      />

      {result.items.length > 0 ? (
        <div className={styles.grid}>
          {result.items.map((campaign) => (
            <article className={styles.card} key={campaign.id}>
              <div className={styles.cardHeader}>
                <h2>{campaign.title}</h2>
                <Badge variant={badgeVariant[campaign.status]}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </Badge>
              </div>
              <div className={styles.meta}>
                <span>{campaign.fieldCount || 8} campos ativos</span>
                <span aria-hidden="true">·</span>
                <time dateTime={campaign.updatedAt}>
                  Editado {shortDateFormatter.format(new Date(campaign.updatedAt))}
                </time>
              </div>
              <div className={styles.actions}>
                <Link className={styles.editLink} href={`/admin/campaigns/${campaign.id}/edit?tab=form`} prefetch={false}>
                  <FilePenLine aria-hidden="true" size={16} /> Configurar
                </Link>
                {campaign.status === "published" && campaign.slug ? (
                  <Link className={styles.previewLink} href={`/f/${encodeURIComponent(campaign.slug)}`} prefetch={false} target="_blank">
                    <Eye aria-hidden="true" size={16} /> Ver página
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <EmptyState
            action={<Link className={styles.editLink} href="/admin/campaigns/new">Criar campanha</Link>}
            description="Crie uma campanha para configurar seus campos de captação."
            title="Nenhum formulário disponível"
          />
        </div>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Paginação de formulários" className={styles.pagination}>
          <span>Página {result.page} de {result.pageCount}</span>
          <div className={styles.actions}>
            <Link aria-disabled={result.page <= 1} className={styles.pageLink} href={`/admin/forms?page=${Math.max(1, result.page - 1)}`}>Anterior</Link>
            <Link aria-disabled={result.page >= result.pageCount} className={styles.pageLink} href={`/admin/forms?page=${result.page + 1}`}>Próxima</Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
