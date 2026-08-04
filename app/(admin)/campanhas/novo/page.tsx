import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createCampanhaAction } from "@/app/actions";
import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";
import { CampaignSaveAlert } from "@/components/CampaignSaveAlert";
import { listCandidatosForSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function NovaCampanhaPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const candidatos = await listCandidatosForSelect();

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Nova campanha</h1>
          <p className="page-toolbar-subtitle">Defina os dados exibidos no formulário público.</p>
        </div>
        <Link className="button" href="/campanhas">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <form action={createCampanhaAction} className="panel panel-padding form-grid">
        <CampaignSaveAlert error={erro} />
        <div className="field">
          <label htmlFor="titulo">Título principal (texto grande)</label>
          <input className="input" id="titulo" maxLength={200} name="titulo" required />
        </div>
        <div className="field">
          <label htmlFor="descricao">Descrição (texto abaixo do título)</label>
          <textarea
            className="textarea"
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
              id="destaque_primario"
              maxLength={160}
              name="destaque_primario"
            />
          </div>
          <div className="field">
            <label htmlFor="destaque_secundario">Trecho do título em amarelo</label>
            <input
              className="input"
              id="destaque_secundario"
              maxLength={160}
              name="destaque_secundario"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="candidato_id">Candidato</label>
            <select className="select" id="candidato_id" name="candidato_id">
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
            <input className="input" id="assinaturas_meta" min="0" name="assinaturas_meta" type="number" />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="texto_form">Título do formulário</label>
            <input
              className="input"
              id="texto_form"
              maxLength={200}
              name="texto_form"
              placeholder="Ex.: Contra a máfia dos flanelinhas"
            />
          </div>
          <div className="field">
            <label htmlFor="texto_dot">Texto vermelho pulsante</label>
            <input
              className="input"
              defaultValue="Assine agora"
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
            defaultValue="#E05A5A"
            id="cor_destaque"
            name="cor_destaque"
            type="color"
          />
        </div>
        <CampaignBackgroundField />
        <div className="field">
          <label htmlFor="url_formulario">Link do WhatsApp após a assinatura (opcional)</label>
          <input
            autoComplete="url"
            className="input"
            id="url_formulario"
            maxLength={2048}
            name="url_formulario"
            placeholder="https://wa.me/5511999999999"
            type="url"
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="inicio_em">Início</label>
            <input className="input" id="inicio_em" name="inicio_em" type="datetime-local" />
          </div>
          <div className="field">
            <label htmlFor="fim_em">Fim</label>
            <input className="input" id="fim_em" name="fim_em" type="datetime-local" />
          </div>
        </div>
        <label className="checkbox-row">
          <input defaultChecked name="ativa" type="checkbox" />
          Campanha ativa
        </label>
        <div className="page-actions">
          <button className="button primary" type="submit">
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
