import { Edit3 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import {
  countAssinaturas,
  countCandidatos,
  listCampanhasDashboard,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [campanhas, candidatos, assinaturas] = await Promise.all([
    listCampanhasDashboard(),
    countCandidatos(),
    countAssinaturas()
  ]);

  const campanhasAtivas = campanhas.filter((campanha) => campanha.ativa).length;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Campanhas ativas</div>
          <div className="stat-value">{campanhasAtivas}</div>
          <div className="stat-note">de {campanhas.length} no total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Candidatos</div>
          <div className="stat-value">{candidatos}</div>
          <div className="stat-note">cadastrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Assinaturas</div>
          <div className="stat-value">{assinaturas}</div>
          <div className="stat-note">respostas coletadas</div>
        </div>
      </div>

      <div className="page-toolbar">
        <div>
          <h1>Campanhas recentes</h1>
          <p className="page-toolbar-subtitle">Acompanhamento rápido das campanhas.</p>
        </div>
        <Link className="button" href="/campanhas">
          Ver todas
        </Link>
      </div>

      <div className="panel">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Início</th>
                <th>Fim</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campanhas.slice(0, 8).map((campanha) => (
                <tr key={campanha.id}>
                  <td>{campanha.titulo || "-"}</td>
                  <td>
                    <span className={`badge ${campanha.ativa ? "ok" : "muted"}`}>
                      {campanha.ativa ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td>{formatDate(campanha.inicio_em)}</td>
                  <td>{formatDate(campanha.fim_em)}</td>
                  <td className="table-actions">
                    <Link className="button" href={`/campanhas/${campanha.id}/editar`}>
                      <Edit3 size={15} />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
