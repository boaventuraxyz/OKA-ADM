import { ArrowRight, PenLine } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import {
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";
import { getPublicCandidateIndex } from "@/lib/public-campaign";

export const dynamic = "force-dynamic";

function IndexUnavailable({ title }: { title: string }) {
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

export default async function FormulariosPage() {
  const requestHeaders = await headers();
  const hostname = normalizeRequestHostname(
    requestHeaders.get("host") || requestHeaders.get("x-forwarded-host")
  );

  if (!hostname || isPlatformHostname(hostname)) {
    return <IndexUnavailable title="Domínio público não configurado" />;
  }

  const result = await getPublicCandidateIndex(hostname);
  if (!result) {
    return <IndexUnavailable title="Domínio público não encontrado" />;
  }

  const { campanhas, candidato } = result;
  const candidateMeta = [candidato.cargo, candidato.partido]
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
              <Link href={`/formulario/${campanha.id}`} key={campanha.id}>
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
        <PoliticasRodape />
      </footer>
    </main>
  );
}
