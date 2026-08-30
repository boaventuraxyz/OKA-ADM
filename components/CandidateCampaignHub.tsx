import { ArrowRight, PenLine } from "lucide-react";
import Link from "next/link";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { publicCampaignHref } from "@/lib/candidate-domain";
import type { Campanha, Candidato } from "@/lib/types";

export function CandidateHubUnavailable({ title }: { title: string }) {
  return (
    <main className="candidate-index-page">
      <section className="candidate-index-unavailable">
        <span>Abaixo-assinados</span>
        <h1>{title}</h1>
        <p>Confira o endereço informado e tente novamente.</p>
      </section>
    </main>
  );
}

export function CandidateCampaignHub({
  campanhas,
  candidato
}: {
  campanhas: Array<Campanha & { slug: string }>;
  candidato: Candidato;
}) {
  const candidateMeta = [
    candidato.cargo,
    candidato.partido,
    candidato.numero ? `Nº ${candidato.numero}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const location = [candidato.municipio, candidato.estado]
    .filter(Boolean)
    .join(" / ");

  return (
    <main className="candidate-index-page">
      <nav className="candidate-index-nav" aria-label="Campanhas públicas">
        <strong>{candidato.nome || "Mobilização cidadã"}</strong>
        <span>Abaixo-assinados</span>
      </nav>

      <header className="candidate-index-header">
        <div className="candidate-index-eyebrow">
          <span aria-hidden="true" />
          Mobilização cidadã
        </div>
        <h1>{candidato.nome || "Campanhas públicas"}</h1>
        <p>Escolha uma campanha e registre seu apoio.</p>
        {candidateMeta || location ? (
          <div className="candidate-index-meta">
            {candidateMeta ? <strong>{candidateMeta}</strong> : null}
            {location ? <span>{location}</span> : null}
          </div>
        ) : null}
      </header>

      <section className="candidate-index-campaigns" aria-labelledby="campaign-list-title">
        <div className="candidate-index-section-title">
          <PenLine aria-hidden="true" size={18} />
          <h2 id="campaign-list-title">Campanhas abertas</h2>
          <span>{campanhas.length}</span>
        </div>

        {campanhas.length ? (
          <div className="candidate-index-list">
            {campanhas.map((campanha) => (
              <Link
                href={publicCampaignHref(
                  campanha.slug,
                  candidato.dominio_formularios
                )}
                key={campanha.id}
              >
                <div>
                  <span>Abaixo-assinado</span>
                  <h3>{campanha.titulo || "Campanha sem título"}</h3>
                </div>
                <ArrowRight aria-hidden="true" size={22} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="candidate-index-empty">
            Não há campanhas recebendo assinaturas no momento.
          </p>
        )}
      </section>

      <footer className="candidate-index-footer">
        <PoliticasRodape candidateName={candidato.nome} />
      </footer>
    </main>
  );
}
