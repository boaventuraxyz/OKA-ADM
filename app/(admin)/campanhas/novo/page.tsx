import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createCampanhaAction } from "@/app/actions";
import { listCandidatosForSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function NovaCampanhaPage() {
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
        <div className="field">
          <label htmlFor="titulo">Título</label>
          <input className="input" id="titulo" name="titulo" required />
        </div>
        <div className="field">
          <label htmlFor="descricao">Descrição</label>
          <textarea className="textarea" id="descricao" name="descricao" rows={3} />
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
        <div className="field">
          <label htmlFor="texto_form">Texto do botão do formulário</label>
          <input className="input" defaultValue="Assinar agora" id="texto_form" name="texto_form" />
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
