import {
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  Trash2,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { deleteCampanhaAction, toggleCampanhaAction } from "@/app/actions";
import { DownloadLink } from "@/components/DownloadLink";
import { PendingLink } from "@/components/PendingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
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
        <PendingLink
          className="button primary"
          href="/campanhas/novo"
          pendingLabel="Abrindo..."
        >
          <Plus size={16} />
          Nova campanha
        </PendingLink>
      </div>

      <div className="panel">
        {campanhas.length === 0 ? (
          <div className="empty-state">Nenhuma campanha cadastrada.</div>
        ) : (
          <div className="campaign-list">
            {campanhas.map((campanha) => {
              const candidato = campanha.candidato_id
                ? candidatoPorId.get(campanha.candidato_id)
                : null;

              return (
                <div className="campaign-row" key={campanha.id}>
                  <div className="campaign-summary">
                    <strong>{campanha.titulo || "Campanha sem título"}</strong>
                    <span>{candidato?.nome || "Sem candidato"}</span>
                  </div>

                  <div className="row-actions campaign-actions">
                    <PendingLink
                      aria-label="Editar campanha"
                      className="button icon"
                      href={`/campanhas/${campanha.id}/editar`}
                      title="Editar campanha"
                    >
                      <Pencil size={15} />
                    </PendingLink>
                    <PendingLink
                      aria-label="Ver assinaturas"
                      className="button icon"
                      href={`/assinaturas?campanhaId=${campanha.id}`}
                      title="Ver assinaturas"
                    >
                      <UsersRound size={15} />
                    </PendingLink>
                    <Link
                      aria-label="Abrir formulário público"
                      className="button icon"
                      href={`/formulario?idCampanha=${campanha.id}`}
                      target="_blank"
                      title="Abrir formulário público"
                    >
                      <ExternalLink size={15} />
                    </Link>
                    <DownloadLink
                      ariaLabel="Baixar assinaturas em CSV"
                      className="button icon"
                      fallbackFilename={`assinaturas-${campanha.id}.csv`}
                      href={`/api/campanhas/${campanha.id}/assinaturas`}
                      title="Baixar assinaturas em CSV"
                    >
                      <Download size={15} />
                    </DownloadLink>
                    <form action={toggleCampanhaAction}>
                      <input name="id" type="hidden" value={campanha.id} />
                      <PendingSubmitButton
                        aria-label={campanha.ativa ? "Desativar campanha" : "Ativar campanha"}
                        className={`button icon ${campanha.ativa ? "status-active" : ""}`}
                        title={campanha.ativa ? "Desativar campanha" : "Ativar campanha"}
                      >
                        <Power size={15} />
                      </PendingSubmitButton>
                    </form>
                    <form action={deleteCampanhaAction}>
                      <input name="id" type="hidden" value={campanha.id} />
                      <PendingSubmitButton
                        aria-label="Excluir campanha"
                        className="button icon danger"
                        confirmMessage="Excluir esta campanha? Esta ação não pode ser desfeita."
                        title="Excluir campanha"
                      >
                        <Trash2 size={15} />
                      </PendingSubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
