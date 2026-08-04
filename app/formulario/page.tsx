import type { CSSProperties } from "react";
import { PenLine } from "lucide-react";
import Image from "next/image";
import {
  CampaignHeadline,
  splitCandidateName
} from "@/components/CampaignHeadline";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { getPublicCampaignView } from "@/lib/public-campaign";
import { countAssinaturasByCampanha } from "@/lib/supabase";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

function CampaignUnavailable({ description, title }: { description: string; title: string }) {
  return (
    <main className="campaign-public-page">
      <section className="campaign-unavailable">
        <span>Abaixo-assinado</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </main>
  );
}

export default async function FormularioPage({
  searchParams
}: {
  searchParams: Promise<{ idCampanha?: string }>;
}) {
  const { idCampanha } = await searchParams;

  if (!idCampanha) {
    return <CampaignUnavailable description="Confira o endereço recebido." title="Formulário indisponível" />;
  }

  return <FormularioContent idCampanha={idCampanha} />;
}

export async function FormularioContent({ idCampanha }: { idCampanha: string }) {
  if (!isUuid(idCampanha)) {
    return <CampaignUnavailable description="Confira o link e tente novamente." title="Campanha não encontrada" />;
  }

  const [campanha, assinaturas] = await Promise.all([
    getPublicCampaignView(idCampanha),
    countAssinaturasByCampanha(idCampanha)
  ]);

  if (!campanha) {
    return <CampaignUnavailable description="Confira o link e tente novamente." title="Campanha não encontrada" />;
  }

  const candidateName = campanha.candidato?.nome || "Campanha Cidadã";
  const [candidateFirstLine, candidateSecondLine] = splitCandidateName(candidateName);
  const accent = /^#[0-9A-F]{6}$/i.test(campanha.corDestaque || "")
    ? campanha.corDestaque
    : "#E05A5A";
  const title = campanha.titulo || "Participe deste abaixo-assinado";
  const description = campanha.descricao;
  const candidateMeta = [campanha.candidato?.cargo, campanha.candidato?.partido]
    .filter(Boolean)
    .join(" · ");
  const location = [campanha.candidato?.municipio, campanha.candidato?.estado]
    .filter(Boolean)
    .join(" / ");

  return (
    <main
      className="campaign-public-page"
      style={{ "--campaign-accent": accent } as CSSProperties}
    >
      <section className="campaign-hero">
        {campanha.imagemFundoVersao ? (
          <>
            <Image
              alt=""
              className="campaign-hero-image"
              fill
              priority
              sizes="100vw"
              src={`/api/campanhas/${campanha.id}/imagem?v=${campanha.imagemFundoVersao}`}
              unoptimized
            />
            <div className="campaign-hero-overlay" />
          </>
        ) : null}

        <nav className="campaign-nav" aria-label="Campanha">
          <div className="campaign-candidate-name">
            <span>{candidateFirstLine}</span>
            <strong>{candidateSecondLine}</strong>
          </div>
          <a className="campaign-nav-cta" href="#assinar">
            <PenLine aria-hidden="true" size={17} />
            Assinar
          </a>
        </nav>

        <div className="campaign-hero-content">
          <article className="campaign-copy">
            <div className="campaign-badge">
              <span aria-hidden="true" className="campaign-badge-dot" />
              <span>{campanha.textoDot || "Assine agora"}</span>
            </div>

            <h1 className="campaign-headline">
              <CampaignHeadline
                primary={campanha.destaquePrimario}
                secondary={campanha.destaqueSecundario}
                text={title}
              />
            </h1>

            {description && description !== title ? (
              <p className="campaign-subtext">{description}</p>
            ) : null}

            {candidateMeta || location ? (
              <div className="campaign-candidate-meta">
                {candidateMeta ? <strong>{candidateMeta}</strong> : null}
                {location ? <span>{location}</span> : null}
              </div>
            ) : null}
          </article>

          <aside className="campaign-form-column" id="assinar">
            <PublicSignatureForm
              campanhaId={campanha.id}
              meta={campanha.assinaturasMeta}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || campanha.titulo}
              totalAssinaturas={assinaturas}
            />
          </aside>
        </div>
      </section>

      <footer className="campaign-footer">
        <PoliticasRodape />
      </footer>
    </main>
  );
}
