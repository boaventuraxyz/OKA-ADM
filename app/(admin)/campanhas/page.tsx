import {
  Download,
  ExternalLink,
  FileCode2,
  Pencil,
  Plus,
  Power,
  Trash2,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import {
  deleteCampanhaAction,
  toggleCampanhaAction,
  updateCampanhaHtmlAction
} from "@/app/actions";
import { decodeCampaignHtml, formatDate } from "@/lib/format";
import { listCampanhas, listCandidatosForSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const [campanhas, candidatos] = await Promise.all([
    listCampanhas(),
    listCandidatosForSelect()
  ]);

  const candidatoPorId = new Map(candidatos.map((candidato) => [candidato.id, candidato]));

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Campanhas</h1>
          <p className="page-toolbar-subtitle">Gerencie abaixo-assinados e formulários públicos.</p>
        </div>
        <Link className="button primary" href="/campanhas/novo">
          <Plus size={16} />
          Nova campanha
        </Link>
      </div>

      <div className="panel">
        {campanhas.length === 0 ? (
          <div className="empty-state">Nenhuma campanha cadastrada.</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Candidato</th>
                  <th>Status</th>
                  <th>Período</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campanhas.map((campanha) => {
                  const candidato = campanha.candidato_id
                    ? candidatoPorId.get(campanha.candidato_id)
                    : null;
                  const html = decodeCampaignHtml(campanha.html);

                  return (
                    <tr key={campanha.id}>
                      <td>{campanha.titulo || "-"}</td>
                      <td>{candidato?.nome || "-"}</td>
                      <td>
                        <span className={`badge ${campanha.ativa ? "ok" : "muted"}`}>
                          {campanha.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td>
                        {formatDate(campanha.inicio_em)} até {formatDate(campanha.fim_em)}
                      </td>
                      <td className="table-actions">
                        <div className="row-actions">
                          <Link
                            className="button icon"
                            href={`/campanhas/${campanha.id}/editar`}
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </Link>
                          <Link
                            className="button icon"
                            href={`/assinaturas?campanhaId=${campanha.id}`}
                            title="Assinaturas"
                          >
                            <UsersRound size={15} />
                          </Link>
                          <Link
                            className="button icon"
                            href={`/formulario?idCampanha=${campanha.id}`}
                            target="_blank"
                            title="Abrir formulário"
                          >
                            <ExternalLink size={15} />
                          </Link>
                          <Link
                            className="button icon"
                            href={`/api/campanhas/${campanha.id}/assinaturas`}
                            title="Baixar CSV"
                          >
                            <Download size={15} />
                          </Link>
                          <details>
                            <summary className="button icon" title="Editar HTML">
                              <FileCode2 size={15} />
                            </summary>
                            <form action={updateCampanhaHtmlAction} className="panel panel-padding form-grid">
                              <input name="id" type="hidden" value={campanha.id} />
                              <div className="field">
                                <label htmlFor={`html-${campanha.id}`}>HTML do formulário</label>
                                <textarea
                                  className="textarea code"
                                  defaultValue={html}
                                  id={`html-${campanha.id}`}
                                  name="html"
                                />
                              </div>
                              <button className="button primary" type="submit">
                                Salvar HTML
                              </button>
                            </form>
                          </details>
                          <form action={toggleCampanhaAction}>
                            <input name="id" type="hidden" value={campanha.id} />
                            <button className="button icon" title="Alternar status" type="submit">
                              <Power size={15} />
                            </button>
                          </form>
                          <form action={deleteCampanhaAction}>
                            <input name="id" type="hidden" value={campanha.id} />
                            <button className="button icon danger" title="Excluir" type="submit">
                              <Trash2 size={15} />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
