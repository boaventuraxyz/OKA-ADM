import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteCandidatoAction } from "@/app/actions";
import { listCandidatos } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CandidatosPage() {
  const candidatos = await listCandidatos();

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Candidatos</h1>
          <p className="page-toolbar-subtitle">Cadastro usado nas campanhas.</p>
        </div>
        <Link className="button primary" href="/candidatos/novo">
          <Plus size={16} />
          Novo candidato
        </Link>
      </div>

      <div className="panel">
        {candidatos.length === 0 ? (
          <div className="empty-state">Nenhum candidato cadastrado.</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Partido</th>
                  <th>Cargo</th>
                  <th>Local</th>
                  <th>Dominio publico</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidatos.map((candidato) => (
                  <tr key={candidato.id}>
                    <td>{candidato.nome || "-"}</td>
                    <td>{candidato.partido || "-"}</td>
                    <td>{candidato.cargo || "-"}</td>
                    <td>
                      {[candidato.municipio, candidato.estado].filter(Boolean).join(" / ") ||
                        "-"}
                    </td>
                    <td>
                      {candidato.dominio_formularios ? (
                        <a
                          className="table-domain-link"
                          href={`https://${candidato.dominio_formularios}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {candidato.dominio_formularios}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="table-actions">
                      <div className="row-actions">
                        <Link
                          className="button icon"
                          href={`/candidatos/${candidato.id}/editar`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </Link>
                        <form action={deleteCandidatoAction}>
                          <input name="id" type="hidden" value={candidato.id} />
                          <button className="button icon danger" title="Excluir" type="submit">
                            <Trash2 size={15} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
