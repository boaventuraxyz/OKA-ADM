import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createCandidatoAction } from "@/app/actions";
import { CandidateSaveAlert } from "@/components/CandidateSaveAlert";

const estados = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO"
];

export default async function NovoCandidatoPage({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Novo candidato</h1>
          <p className="page-toolbar-subtitle">Preencha os dados básicos.</p>
        </div>
        <Link className="button" href="/candidatos">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <form action={createCandidatoAction} className="panel panel-padding form-grid">
        <CandidateSaveAlert error={erro} />
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input className="input" id="nome" name="nome" required />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="partido">Partido</label>
            <input className="input" id="partido" name="partido" />
          </div>
          <div className="field">
            <label htmlFor="cargo">Cargo</label>
            <input className="input" id="cargo" name="cargo" />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="estado">Estado</label>
            <select className="select" id="estado" name="estado">
              <option value="">Selecione</option>
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="municipio">Município</label>
            <input className="input" id="municipio" name="municipio" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="dominio_formularios">
            Dominio dos formularios publicos (sem https://)
          </label>
          <input
            className="input"
            id="dominio_formularios"
            inputMode="url"
            maxLength={253}
            name="dominio_formularios"
            placeholder="tieminevoeiro.com"
          />
        </div>
        <div className="page-actions">
          <button className="button primary" type="submit">
            <Save size={16} />
            Salvar
          </button>
          <Link className="button" href="/candidatos">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
