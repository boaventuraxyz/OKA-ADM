import { ArrowLeft, Save } from "lucide-react";
import { notFound } from "next/navigation";
import { PendingLink } from "@/components/PendingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { decodeCampaignHtml } from "@/lib/format";
import { getCampanha } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditarHtmlCampanhaPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campanha = await getCampanha(id);

  if (!campanha) notFound();

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Editar HTML</h1>
          <p className="page-toolbar-subtitle">{campanha.titulo || "Campanha sem título"}</p>
        </div>
        <PendingLink className="button" href="/campanhas" pendingLabel="Voltando...">
          <ArrowLeft size={16} />
          Voltar
        </PendingLink>
      </div>

      <form
        action={`/api/campanhas/${campanha.id}/html`}
        className="panel panel-padding form-grid"
        encType="multipart/form-data"
        method="post"
      >
        <input name="id" type="hidden" value={campanha.id} />
        <div className="field">
          <label htmlFor="html">HTML do formulário</label>
          <textarea
            className="textarea code campaign-html-textarea"
            defaultValue={decodeCampaignHtml(campanha.html)}
            id="html"
            name="html"
          />
        </div>
        <div className="page-actions">
          <PendingSubmitButton className="button primary" pendingLabel="Salvando...">
            <Save size={16} />
            Salvar HTML
          </PendingSubmitButton>
          <PendingLink className="button" href="/campanhas" pendingLabel="Voltando...">
            Cancelar
          </PendingLink>
        </div>
      </form>
    </>
  );
}
