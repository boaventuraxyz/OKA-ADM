import type { CSSProperties } from "react";
import { PenLine } from "lucide-react";
import Image from "next/image";
import { headers } from "next/headers";
import {
  CampaignHeadline,
  splitCandidateName
} from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignTheme3 } from "@/components/CampaignTheme3";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { campaignAcceptsSignatures } from "@/lib/campaign-availability";
import {
  candidateDomainMatches,
  isPlatformHostname,
  normalizeRequestHostname
} from "@/lib/candidate-domain";
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

  const [campanha, assinaturas, requestHeaders] = await Promise.all([
    getPublicCampaignView(idCampanha),
    countAssinaturasByCampanha(idCampanha),
    headers()
  ]);

  if (!campanha) {
    return <CampaignUnavailable description="Confira o link e tente novamente." title="Campanha não encontrada" />;
  }

  if (
    !campaignAcceptsSignatures({
      ativa: campanha.ativa,
      fim_em: campanha.fimEm,
      inicio_em: campanha.inicioEm
    })
  ) {
    return (
      <CampaignUnavailable
        description="Este abaixo-assinado não está recebendo assinaturas no momento."
        title="Campanha indisponível"
      />
    );
  }

  const requestHostname = normalizeRequestHostname(
    requestHeaders.get("host") || requestHeaders.get("x-forwarded-host")
  );
  if (
    !isPlatformHostname(requestHostname) &&
    !candidateDomainMatches(
      requestHostname,
      campanha.candidato?.dominioFormularios
    )
  ) {
    return (
      <CampaignUnavailable
        description="Esta campanha não pertence a este endereço."
        title="Campanha não encontrada"
      />
    );
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

  if (campanha.tema === 3) {
    return (
      <CampaignTheme3
        accent={accent || "#E2382B"}
        campanha={campanha}
        totalAssinaturas={assinaturas}
      />
    );
  }

  if (campanha.tema === 2) {
    const context = campanha.textoContexto?.trim();
    const proposal = campanha.textoProposta?.trim();
    const conclusion = campanha.textoConclusao?.trim();
    const impactTitle =
      campanha.textoImpacto?.trim() || "Sua assinatura transforma indignação em ação.";
    const impactSupport =
      campanha.textoImpactoApoio?.trim() || "Manifeste seu apoio a esta iniciativa.";

    return (
      <main
        className="campaign-public-page campaign-theme-2"
        style={{ "--campaign-accent": accent } as CSSProperties}
      >
        <header className="campaign-theme2-topbar">
          <div className="campaign-theme2-mark">
            {candidateFirstLine ? <span>{candidateFirstLine} </span> : null}
            <strong>{candidateSecondLine}</strong>
            <small>— Abaixo-assinado</small>
          </div>
          <a className="campaign-theme2-mini-cta" href="#assinar">
           🚨 Assinar agora
          </a>
        </header>

        <section
          className={`campaign-theme2-hero ${campanha.imagemLateralVersao ? "has-image" : "without-image"}`}
        >
          <div className="campaign-theme2-hero-inner">
            <div className="campaign-theme2-hero-copy">
              <span className="campaign-theme2-eyebrow">
                {campanha.textoDot || "Mobilização cidadã"}
              </span>
              <h1>
                <CampaignHeadline
                  primary={campanha.destaquePrimario}
                  secondary={campanha.destaqueSecundario}
                  text={title}
                />
              </h1>
              {description ? (
                <CampaignRichText className="campaign-theme2-subhead" text={description} />
              ) : null}
              <a className="campaign-theme2-primary-cta" href="#assinar">
               🚨 Quero assinar agora
                <span aria-hidden="true">→</span>
              </a>
            </div>

            {campanha.imagemLateralVersao ? (
              <figure className="campaign-theme2-visual">
                <Image
                  alt={`Imagem da campanha ${title}`}
                  fill
                  priority
                  sizes="(max-width: 820px) 100vw, 44vw"
                  src={`/api/campanhas/${campanha.id}/imagem-lateral?v=${campanha.imagemLateralVersao}`}
                  unoptimized
                />
              </figure>
            ) : null}
          </div>
        </section>

        {context || proposal || conclusion ? (
          <section className="campaign-theme2-context">
            <div className="campaign-theme2-wrap">
              <div className="campaign-theme2-kicker">O caso e a proposta</div>
              {context ? (
                <CampaignRichText className="campaign-theme2-context-text" text={context} />
              ) : null}
              {proposal ? (
                <div className="campaign-theme2-proposal">
                  <CampaignRichText className="campaign-theme2-proposal-text" text={proposal} />
                </div>
              ) : null}
              {conclusion ? (
                <CampaignRichText className="campaign-theme2-conclusion" text={conclusion} />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="campaign-theme2-impact">
          <div className="campaign-theme2-wrap">
            <h2>{impactTitle}</h2>
            <p>{impactSupport}</p>
            <a href="#assinar">🚨Assinar o abaixo-assinado</a>
          </div>
        </section>

        <section className="campaign-theme2-form-section" id="assinar">
          <div className="campaign-theme2-form-wrap">
            <PublicSignatureForm
              campanhaId={campanha.id}
              meta={campanha.assinaturasMeta}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || campanha.descricao || campanha.titulo}
              totalAssinaturas={assinaturas}
              variant="editorial"
            />
          </div>
        </section>

        <footer className="campaign-footer">
          <PoliticasRodape candidateName={campanha.candidato?.nome} />
        </footer>
      </main>
    );
  }

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
              <CampaignRichText className="campaign-subtext" text={description} />
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
        <PoliticasRodape candidateName={campanha.candidato?.nome} />
      </footer>
    </main>
  );
}
