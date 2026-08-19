import "@fontsource/sora/400.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";

import type { CSSProperties } from "react";
import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignShareButtons } from "@/components/CampaignShareButtons";
import { CampaignTheme4SignatureModal } from "@/components/CampaignTheme4SignatureModal";
import { CampaignVideoCarousel } from "@/components/CampaignVideoCarousel";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { campaignAllowsSharing } from "@/lib/campaign-settings";
import {
  legacyCampaignVideoCarousel,
  type CampaignVideoItem,
} from "@/lib/campaign-video-carousel";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";

type Theme4Campaign = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  textoContexto: string | null;
  textoDot: string | null;
  textoForm: string | null;
  assinaturasMeta: number | null;
  textoFaixa: string | null;
  tituloTopicos: string | null;
  textoTopicos: string | null;
  textoImpacto: string | null;
  textoImpactoApoio: string | null;
  videoUrl: string | null;
  videoCarousel: CampaignVideoItem[] | null;
  legendaVideo: string | null;
  tituloAssinar: string | null;
  textoAssinar: string | null;
  textoCompartilhar: string | null;
  formConfig: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  titleHighlights: CampaignTitleHighlight[] | null;
  candidato: {
    nome: string | null;
  } | null;
};

function splitBlocks(value?: string | null) {
  return (value ?? "")
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function CampaignTheme4({
  accent,
  campanha,
  preview = false,
  totalAssinaturas
}: {
  accent: string;
  campanha: Theme4Campaign;
  preview?: boolean;
  totalAssinaturas: number;
}) {
  const brand = campanha.textoFaixa?.trim() || "MOBILIZAÇÃO CIDADÃ";
  const heroTitle = campanha.textoContexto?.trim() || campanha.titulo || "Participe deste abaixo-assinado";
  const manifestoTitle = campanha.tituloTopicos?.trim() || "Nossa voz merece ser ouvida.";
  const manifestoBlocks = splitBlocks(campanha.textoTopicos);
  const candidateName = campanha.candidato?.nome?.trim() || "Responsável pela campanha";
  const videos = campanha.videoCarousel ?? legacyCampaignVideoCarousel({
    caption: campanha.legendaVideo,
    url: campanha.videoUrl,
  });
  const signTitle = campanha.tituloAssinar?.trim() || "Junte sua voz a esta mobilização.";
  const shareText =
    campanha.textoCompartilhar?.trim() ||
    `Eu apoiei a campanha “${campanha.titulo || "Participe deste abaixo-assinado"}”. Apoie também:`;
  const currentYear = new Date().getFullYear();
  const allowSharing = campaignAllowsSharing(campanha.settings);

  return (
    <main
      className="campaign-public-page campaign-theme-4"
      style={{ "--campaign-accent": accent } as CSSProperties}
    >
      <header className="campaign-theme4-topbar">
        <a className="campaign-theme4-brand" href="#topo">
          <span>01</span>
          {brand}
        </a>
        <a className="campaign-theme4-button campaign-theme4-button-small" href="#assinar">
          Assinar agora
        </a>
      </header>

      <section className="campaign-theme4-hero" id="topo">
        <div className="campaign-theme4-wrap">
          <div className="campaign-theme4-hero-copy">
            <div className="campaign-theme4-tag">
              <span aria-hidden="true" />
              {campanha.textoDot || "Caso em andamento"}
            </div>
            <h1><CampaignHeadline highlights={campanha.titleHighlights} text={heroTitle} /></h1>
            {campanha.descricao ? (
              <CampaignRichText className="campaign-theme4-hero-sub" text={campanha.descricao} />
            ) : null}
            <div className="campaign-theme4-actions">
              <a className="campaign-theme4-button" href="#assinar">
                Assinar agora
              </a>
              {videos.length > 0 ? (
                <a className="campaign-theme4-text-link" href="#video">
                  Ver o caso completo
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {videos.length > 0 ? (
        <section className="campaign-theme4-video-section" id="video">
          <div className="campaign-theme4-wrap campaign-theme4-video-stack">
            <CampaignVideoCarousel candidateName={candidateName} videos={videos} />
          </div>
        </section>
      ) : null}

      <section className="campaign-theme4-manifesto" id="caso">
        <div className="campaign-theme4-wrap campaign-theme4-manifesto-grid">
          <aside className="campaign-theme4-manifesto-side">
            <div className="campaign-theme4-section-label">O relato</div>
            <h2>{manifestoTitle}</h2>
            <a className="campaign-theme4-button" href="#assinar">Assinar agora</a>
          </aside>
          <article className="campaign-theme4-manifesto-copy">
            {manifestoBlocks.map((block, index) => (
              <CampaignRichText
                className="campaign-theme4-paragraph"
                key={`${index}-${block.slice(0, 20)}`}
                text={block}
              />
            ))}
          </article>
        </div>
      </section>

      <section className="campaign-theme4-impact">
        <div className="campaign-theme4-impact-item">
          <h3>{campanha.textoImpacto || "Mobilização hoje. Mudança amanhã."}</h3>
        </div>
        <div className="campaign-theme4-impact-item">
          <h3>{campanha.textoImpactoApoio || "Cada assinatura fortalece esta causa."}</h3>
        </div>
      </section>

      <section className="campaign-theme4-sign" id="assinar">
        <div className="campaign-theme4-wrap campaign-theme4-sign-grid">
          <div className="campaign-theme4-sign-copy">
            <div className="campaign-theme4-section-label">
              Última chamada
            </div>
            <h2>{signTitle}</h2>
            {campanha.textoAssinar ? (
              <CampaignRichText className="campaign-theme4-sign-text" text={campanha.textoAssinar} />
            ) : null}
            <CampaignTheme4SignatureModal>
              <PublicSignatureForm
                campanhaId={campanha.id}
                formConfig={campanha.formConfig}
                meta={campanha.assinaturasMeta}
                preview={preview}
                textoDot={campanha.textoDot}
                textoForm={campanha.textoForm || campanha.titulo}
                totalAssinaturas={totalAssinaturas}
                settings={campanha.settings}
              />
              <PoliticasRodape candidateName={campanha.candidato?.nome} />
            </CampaignTheme4SignatureModal>
            {allowSharing ? <CampaignShareButtons shareText={shareText} /> : null}
          </div>
        </div>
      </section>

      <footer className="campaign-theme4-footer">
        <div className="campaign-theme4-wrap">
          <div className="campaign-theme4-footer-mark">
            {brand} — MOBILIZAÇÃO CIVIL · {currentYear}
          </div>
        </div>
      </footer>
    </main>
  );
}
