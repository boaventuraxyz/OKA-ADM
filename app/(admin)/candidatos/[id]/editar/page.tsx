import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { updateCandidatoAction } from "@/app/actions";
import { getCandidato } from "@/lib/supabase";

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

export default async function EditarCandidatoPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidato = await getCandidato(id);
  if (!candidato) notFound();

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Editar candidato</h1>
          <p className="page-toolbar-subtitle">{candidato.nome}</p>
        </div>
        <Link className="button" href="/candidatos">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <form action={updateCandidatoAction} className="panel panel-padding form-grid">
        <input name="id" type="hidden" value={candidato.id} />
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input
            className="input"
            defaultValue={candidato.nome ?? ""}
            id="nome"
            name="nome"
            required
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="partido">Partido</label>
            <input
              className="input"
              defaultValue={candidato.partido ?? ""}
              id="partido"
              name="partido"
            />
          </div>
          <div className="field">
            <label htmlFor="cargo">Cargo</label>
            <input
              className="input"
              defaultValue={candidato.cargo ?? ""}
              id="cargo"
              name="cargo"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="estado">Estado</label>
            <select
              className="select"
              defaultValue={candidato.estado ?? ""}
              id="estado"
              name="estado"
            >
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
            <input
              className="input"
              defaultValue={candidato.municipio ?? ""}
              id="municipio"
              name="municipio"
            />
          </div>
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
