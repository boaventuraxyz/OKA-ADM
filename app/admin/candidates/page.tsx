import { Plus, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateRowActions } from "@/features/candidates/CandidateRowActions";
import { listCandidates } from "@/features/candidates/service";
import { publicCandidateHubHref } from "@/lib/candidate-domain";
import { requireAdmin } from "@/lib/auth";

import styles from "@/features/candidates/candidates-admin.module.css";

export const metadata: Metadata = { title: "Candidatos" };
export const dynamic = "force-dynamic";

export default async function AdminCandidatesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await requireAdmin();
  const { page } = await searchParams;
  const result = await listCandidates(Number(page) || 1);
  const canManage = context.profile.role === "master" || context.profile.role === "admin";

  return (
    <div className={styles.page}>
      <PageHeader
        actions={canManage ? (
          <a className={styles.primaryLink} href="/admin/candidates/new">
            <Plus aria-hidden="true" size={18} /> Novo candidato
          </a>
        ) : null}
        description="Gerencie os responsáveis pelas campanhas e os endereços dos hubs públicos."
        eyebrow="Organização"
        title="Candidatos"
      />

      {result.items.length > 0 ? (
        <section aria-label="Lista de candidatos" className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Número</th>
                  <th>Partido e cargo</th>
                  <th>Local</th>
                  <th>Hub público</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((candidate) => {
                  const hubHref = publicCandidateHubHref(
                    candidate.dominio_formularios,
                    candidate.publicSlug
                  );
                  const location = [candidate.municipio, candidate.estado]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <tr key={candidate.id}>
                      <td>
                        <span className={styles.identity}>
                          <span aria-hidden="true" className={styles.avatar}>
                            {candidate.nome.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <strong>{candidate.nome}</strong>
                            <small>Cadastrado no sistema</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        {candidate.numero ? (
                          <strong className={styles.cellValue}>{candidate.numero}</strong>
                        ) : (
                          <span className={styles.muted}>Não informado</span>
                        )}
                      </td>
                      <td>
                        <strong className={styles.cellValue}>{candidate.partido || "Sem partido"}</strong>
                        <small className={styles.cellSubvalue}>{candidate.cargo || "Cargo não informado"}</small>
                      </td>
                      <td>{location || <span className={styles.muted}>Não informado</span>}</td>
                      <td>
                        {hubHref ? (
                          <a className={styles.hubLink} href={hubHref} rel="noreferrer" target="_blank">
                            {candidate.dominio_formularios || `/c/${candidate.publicSlug}`}
                          </a>
                        ) : <span className={styles.muted}>Não configurado</span>}
                      </td>
                      <td>
                        <CandidateRowActions
                          canManage={canManage}
                          hubHref={hubHref}
                          id={candidate.id}
                          name={candidate.nome}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className={styles.empty}>
          <EmptyState
            action={canManage ? (
              <a className={styles.primaryLink} href="/admin/candidates/new">
                Criar primeiro candidato
              </a>
            ) : undefined}
            description="Cadastre um candidato para organizar campanhas e publicar seu hub."
            icon={<UserRound size={24} />}
            title="Nenhum candidato cadastrado"
          />
        </div>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Paginação de candidatos" className={styles.pagination}>
          <span>Página {result.page} de {result.pageCount} · {result.total} candidatos</span>
          <div>
            <Link
              aria-disabled={result.page <= 1}
              className={styles.pageLink}
              href={`/admin/candidates?page=${Math.max(1, result.page - 1)}`}
            >
              Anterior
            </Link>
            <Link
              aria-disabled={result.page >= result.pageCount}
              className={styles.pageLink}
              href={`/admin/candidates?page=${result.page + 1}`}
            >
              Próxima
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
