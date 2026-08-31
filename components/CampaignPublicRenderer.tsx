import type { CSSProperties } from "react";
import Image from "next/image";
import { PenLine } from "lucide-react";

import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignBandeiraTheme } from "@/components/CampaignBandeiraTheme";
import { CampaignModernTheme } from "@/components/CampaignModernTheme";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignTheme3 } from "@/components/CampaignTheme3";
import { CampaignTheme4 } from "@/components/CampaignTheme4";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";
import type { CampaignVideoItem } from "@/lib/campaign-video-carousel";
import { resolveCandidateNumber } from "@/lib/campaign-settings";

export type CampaignRenderData = {
  assinaturasMeta: number | null;
  candidato: {
    cargo: string | null;
    estado: string | null;
    municipio: string | null;
    nome: string | null;
    numero: string | null;
    partido: string | null;
  } | null;
  corDestaque: string | null;
  descricao: string | null;
  formConfig: Record<string, unknown> | null;
  id: string;
  imagemFundoUrl?: string | null;
  imagemFundoVersao: string | null;
  imagemLateralUrl?: string | null;
  imagemLateralVersao: string | null;
  notaCitacao: string | null;
  notaVideo: string | null;
  settings: Record<string, unknown> | null;
  slug: string | null;
  tema: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  textoAssinar: string | null;
  textoCitacao: string | null;
  textoCompartilhar: string | null;
  textoConclusao: string | null;
  textoContexto: string | null;
  textoDot: string | null;
  textoFaixa: string | null;
  textoForm: string | null;
  textoImpacto: string | null;
  textoImpactoApoio: string | null;
  textoProposta: string | null;
  textoTopicos: string | null;
  textoTopicosIntro: string | null;
  textoVideo: string | null;
  titleHighlights: CampaignTitleHighlight[] | null;
  titulo: string | null;
  tituloAssinar: string | null;
  tituloCitacao: string | null;
  tituloTopicos: string | null;
  tituloVideo: string | null;
  videoCarousel: CampaignVideoItem[] | null;
  videoUrl: string | null;
  legendaVideo: string | null;
};

function splitCandidateName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return ["", parts[0] || "Campanha Cidadã"] as const;
  return [parts.slice(0, -1).join(" "), parts.at(-1) || ""] as const;
}

function campaignImageSource({
  campaignId,
  directUrl,
  kind,
  version,
}: {
  campaignId: string;
  directUrl?: string | null;
  kind: "imagem" | "imagem-lateral";
  version: string | null;
}) {
  if (directUrl) return directUrl;
  return version ? `/api/campanhas/${campaignId}/${kind}?v=${version}` : null;
}

export function CampaignPublicRenderer({
  campanha,
  preview = false,
  totalAssinaturas,
}: {
  campanha: CampaignRenderData;
  preview?: boolean;
  totalAssinaturas: number;
}) {
  const candidateName = campanha.candidato?.nome || "Campanha Cidadã";
  const candidateNumber = resolveCandidateNumber(
    campanha.candidato?.numero,
    campanha.settings,
  );
  const [candidateFirstLine, candidateSecondLine] = splitCandidateName(candidateName);
  const accent = /^#[0-9A-F]{6}$/i.test(campanha.corDestaque || "")
    ? campanha.corDestaque || "#E05A5A"
    : "#E05A5A";
  const title = campanha.titulo || "Participe deste abaixo-assinado";
  const description = campanha.descricao;
  const candidateMeta = [
    campanha.candidato?.cargo,
    campanha.candidato?.partido,
    candidateNumber ? `Nº ${candidateNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const location = [campanha.candidato?.municipio, campanha.candidato?.estado]
    .filter(Boolean)
    .join(" / ");

  if (campanha.tema === 8) {
    const heroPhoto = campaignImageSource({
      campaignId: campanha.id,
      directUrl: campanha.imagemLateralUrl,
      kind: "imagem-lateral",
      version: campanha.imagemLateralVersao,
    });
    const missionPhoto = campaignImageSource({
      campaignId: campanha.id,
      directUrl: campanha.imagemFundoUrl,
      kind: "imagem",
      version: campanha.imagemFundoVersao,
    });

    return (
      <CampaignBandeiraTheme
        accent={accent || "#1EC65B"}
        campanha={{ ...campanha, imagemFundoUrl: missionPhoto, imagemLateralUrl: heroPhoto }}
        preview={preview}
        totalAssinaturas={totalAssinaturas}
      />
    );
  }

  if (campanha.tema === 5 || campanha.tema === 6 || campanha.tema === 7) {
    return (
      <CampaignModernTheme
        accent={accent}
        campanha={campanha}
        preview={preview}
        themeId={campanha.tema}
        totalAssinaturas={totalAssinaturas}
      />
    );
  }

  if (campanha.tema === 4) {
    return (
      <CampaignTheme4
        accent={accent || "#D81F26"}
        campanha={campanha}
        preview={preview}
        totalAssinaturas={totalAssinaturas}
      />
    );
  }

  if (campanha.tema === 3) {
    return (
      <CampaignTheme3
        accent={accent || "#E2382B"}
        campanha={campanha}
        preview={preview}
        totalAssinaturas={totalAssinaturas}
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
    const sideImage = campaignImageSource({
      campaignId: campanha.id,
      directUrl: campanha.imagemLateralUrl,
      kind: "imagem-lateral",
      version: campanha.imagemLateralVersao,
    });

    return (
      <main
        className="campaign-public-page campaign-theme-2"
        style={{ "--campaign-accent": accent } as CSSProperties}
      >
        <header className="campaign-theme2-topbar">
          <div className="campaign-theme2-mark">
            {candidateFirstLine ? <span>{candidateFirstLine} </span> : null}
            <strong>{candidateSecondLine}</strong>
            <small>— {candidateNumber ? `${candidateNumber} · ` : ""}Abaixo-assinado</small>
          </div>
          <a className="campaign-theme2-mini-cta" href="#assinar">🚨 Assinar agora</a>
        </header>

        <section className={`campaign-theme2-hero ${sideImage ? "has-image" : "without-image"}`}>
          <div className="campaign-theme2-hero-inner">
            <div className="campaign-theme2-hero-copy">
              <span className="campaign-theme2-eyebrow">
                {campanha.textoDot || "Mobilização cidadã"}
              </span>
              <h1>
                <CampaignHeadline
                  highlights={campanha.titleHighlights}
                  text={title}
                />
              </h1>
              {description ? (
                <CampaignRichText className="campaign-theme2-subhead" text={description} />
              ) : null}
              <a className="campaign-theme2-primary-cta" href="#assinar">
                🚨 Quero assinar agora <span aria-hidden="true">→</span>
              </a>
            </div>

            {sideImage ? (
              <figure className="campaign-theme2-visual">
                <Image
                  alt={`Imagem da campanha ${title}`}
                  fill
                  priority={!preview}
                  sizes="(max-width: 820px) 100vw, 44vw"
                  src={sideImage}
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
              {context ? <CampaignRichText className="campaign-theme2-context-text" text={context} /> : null}
              {proposal ? (
                <div className="campaign-theme2-proposal">
                  <CampaignRichText className="campaign-theme2-proposal-text" text={proposal} />
                </div>
              ) : null}
              {conclusion ? <CampaignRichText className="campaign-theme2-conclusion" text={conclusion} /> : null}
            </div>
          </section>
        ) : null}

        <section className="campaign-theme2-impact">
          <div className="campaign-theme2-wrap">
            <h2>{impactTitle}</h2>
            <p>{impactSupport}</p>
            <a href="#assinar">🚨 Assinar o abaixo-assinado</a>
          </div>
        </section>

        <section className="campaign-theme2-form-section" id="assinar">
          <div className="campaign-theme2-form-wrap">
            <PublicSignatureForm
              campanhaId={campanha.id}
              formConfig={campanha.formConfig}
              meta={campanha.assinaturasMeta}
              preview={preview}
              settings={campanha.settings}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || campanha.descricao || campanha.titulo}
              totalAssinaturas={totalAssinaturas}
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

  const backgroundImage = campaignImageSource({
    campaignId: campanha.id,
    directUrl: campanha.imagemFundoUrl,
    kind: "imagem",
    version: campanha.imagemFundoVersao,
  });

  return (
    <main
      className="campaign-public-page"
      style={{ "--campaign-accent": accent } as CSSProperties}
    >
      <section className="campaign-hero">
        {backgroundImage ? (
          <>
            <Image
              alt=""
              className="campaign-hero-image"
              fill
              priority={!preview}
              sizes="100vw"
              src={backgroundImage}
              unoptimized
            />
            <div className="campaign-hero-overlay" />
          </>
        ) : null}

        <nav aria-label="Campanha" className="campaign-nav">
          <div className="campaign-candidate-name">
            <span>{candidateFirstLine}</span>
            <strong>
              {candidateSecondLine}
              {candidateNumber ? <small> · {candidateNumber}</small> : null}
            </strong>
          </div>
          <a className="campaign-nav-cta" href="#assinar">
            <PenLine aria-hidden="true" size={17} /> Assinar
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
                highlights={campanha.titleHighlights}
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
              formConfig={campanha.formConfig}
              meta={campanha.assinaturasMeta}
              preview={preview}
              settings={campanha.settings}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || campanha.titulo}
              totalAssinaturas={totalAssinaturas}
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
