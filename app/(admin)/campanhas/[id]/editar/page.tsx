import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { updateCampanhaAction } from "@/app/actions";
import { CampaignSaveAlert } from "@/components/CampaignSaveAlert";
import { toDateTimeLocal } from "@/lib/format";
import { getCampanha, listCandidatosForSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditarCampanhaPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const [campanha, candidatos] = await Promise.all([
    getCampanha(id),
    listCandidatosForSelect()
  ]);

  if (!campanha) notFound();
  const templateColumnsReady = [
    "texto_form",
    "texto_dot",
    "destaque_primario",
    "destaque_secundario",
    "cor_destaque"
  ].every((column) => Object.prototype.hasOwnProperty.call(campanha, column));

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Editar campanha</h1>
          <p className="page-toolbar-subtitle">{campanha.titulo}</p>
        </div>
        <Link className="button" href="/campanhas">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <form action={updateCampanhaAction} className="panel panel-padding form-grid">
        <CampaignSaveAlert error={erro || (!templateColumnsReady ? "estrutura" : undefined)} />
        <input name="id" type="hidden" value={campanha.id} />
        <div className="field">
          <label htmlFor="titulo">Título principal (texto grande)</label>
          <input
            className="input"
            defaultValue={campanha.titulo ?? ""}
            id="titulo"
            maxLength={200}
            name="titulo"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="descricao">Descrição (texto abaixo do título)</label>
          <textarea
            className="textarea"
            defaultValue={campanha.descricao ?? ""}
            id="descricao"
            maxLength={5000}
            name="descricao"
            rows={4}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="destaque_primario">Trecho do título em destaque</label>
            <input
              className="input"
              defaultValue={campanha.destaque_primario ?? ""}
              id="destaque_primario"
              maxLength={160}
              name="destaque_primario"
            />
          </div>
          <div className="field">
            <label htmlFor="destaque_secundario">Trecho do título em amarelo</label>
            <input
              className="input"
              defaultValue={campanha.destaque_secundario ?? ""}
              id="destaque_secundario"
              maxLength={160}
              name="destaque_secundario"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="candidato_id">Candidato</label>
            <select
              className="select"
              defaultValue={campanha.candidato_id ?? ""}
              id="candidato_id"
              name="candidato_id"
            >
              <option value="">Selecione</option>
              {candidatos.map((candidato) => (
                <option key={candidato.id} value={candidato.id}>
                  {candidato.nome} {candidato.partido ? `(${candidato.partido})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assinaturas_meta">Meta de assinaturas</label>
            <input
              className="input"
              defaultValue={campanha.assinaturas_meta ?? ""}
              id="assinaturas_meta"
              min="0"
              name="assinaturas_meta"
              type="number"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="texto_form">Título do formulário</label>
            <input
              className="input"
              defaultValue={campanha.texto_form ?? ""}
              id="texto_form"
              maxLength={200}
              name="texto_form"
            />
          </div>
          <div className="field">
            <label htmlFor="texto_dot">Texto vermelho pulsante</label>
            <input
              className="input"
              defaultValue={campanha.texto_dot ?? "Assine agora"}
              id="texto_dot"
              maxLength={80}
              name="texto_dot"
            />
          </div>
        </div>
        <div className="field campaign-color-field">
          <label htmlFor="cor_destaque">Cor do destaque principal</label>
          <input
            className="campaign-color-input"
            defaultValue={campanha.cor_destaque ?? "#E05A5A"}
            id="cor_destaque"
            name="cor_destaque"
            type="color"
          />
        </div>
        <div className="field">
          <label htmlFor="url_formulario">URL do formulário</label>
          <input
            className="input"
            id="url_formulario"
            readOnly
            value={`/formulario?idCampanha=${campanha.id}`}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="inicio_em">Início</label>
            <input
              className="input"
              defaultValue={toDateTimeLocal(campanha.inicio_em)}
              id="inicio_em"
              name="inicio_em"
              type="datetime-local"
            />
          </div>
          <div className="field">
            <label htmlFor="fim_em">Fim</label>
            <input
              className="input"
              defaultValue={toDateTimeLocal(campanha.fim_em)}
              id="fim_em"
              name="fim_em"
              type="datetime-local"
            />
          </div>
        </div>
        <label className="checkbox-row">
          <input defaultChecked={campanha.ativa ?? false} name="ativa" type="checkbox" />
          Campanha ativa
        </label>
        <div className="page-actions">
          <button className="button primary" disabled={!templateColumnsReady} type="submit">
            <Save size={16} />
            Salvar
          </button>
          <Link className="button" href="/campanhas">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
