import "@fontsource/anton/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";

import type { CSSProperties } from "react";
import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignShareButtons } from "@/components/CampaignShareButtons";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { campaignAllowsSharing } from "@/lib/campaign-settings";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";

type Theme3Campaign = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  textoDot: string | null;
  textoForm: string | null;
  assinaturasMeta: number | null;
  textoFaixa: string | null;
  tituloTopicos: string | null;
  textoTopicosIntro: string | null;
  textoTopicos: string | null;
  tituloCitacao: string | null;
  textoCitacao: string | null;
  notaCitacao: string | null;
  tituloVideo: string | null;
  videoUrl: string | null;
  textoVideo: string | null;
  legendaVideo: string | null;
  notaVideo: string | null;
  tituloAssinar: string | null;
  textoAssinar: string | null;
  textoCompartilhar: string | null;
  formConfig: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  titleHighlights: CampaignTitleHighlight[] | null;
  candidato: {
    cargo: string | null;
    estado: string | null;
    municipio: string | null;
    nome: string | null;
    partido: string | null;
  } | null;
};

function splitBlocks(value?: string | null) {
  return (value ?? "")
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseTopics(value?: string | null) {
  return splitBlocks(value).map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    return { body: lines.slice(1).join("\n"), title: lines[0] };
  });
}

export function CampaignTheme3({
  accent,
  campanha,
  preview = false,
  totalAssinaturas
}: {
  accent: string;
  campanha: Theme3Campaign;
  preview?: boolean;
  totalAssinaturas: number;
}) {
  const title = campanha.titulo || "Participe deste abaixo-assinado";
  const location = [campanha.candidato?.municipio, campanha.candidato?.estado]
    .filter(Boolean)
    .join(" / ");
  const strip = campanha.textoFaixa?.trim();
  const topics = parseTopics(campanha.textoTopicos);
  const quote = campanha.textoCitacao?.trim();
  const videoBlocks = splitBlocks(campanha.textoVideo);
  const [videoPull, ...videoParagraphs] = videoBlocks;
  const signTitle = campanha.tituloAssinar?.trim() || "Assine este abaixo-assinado.";
  const allowSharing = campaignAllowsSharing(campanha.settings);
  const shareText =
    campanha.textoCompartilhar?.trim() ||
    `Eu assinei: ${title}. Assine você também:`;

  return (
    <main
      className="campaign-public-page campaign-theme-3"
      style={{ "--campaign-accent": accent } as CSSProperties}
    >
      {strip ? (
        <div className="campaign-theme3-strip">
          <span>{`${strip} • ${strip} •`}</span>
        </div>
      ) : null}

      <header className="campaign-theme3-hero">
        <div className="campaign-theme3-wrap">
          <div className="campaign-theme3-eyebrow">
            <span>■ Abaixo-assinado</span>
            {location ? <b>{location}</b> : null}
            {campanha.textoDot ? <span>{campanha.textoDot}</span> : null}
          </div>
          <h1>
            <CampaignHeadline
              highlights={campanha.titleHighlights}
              text={title}
            />
          </h1>
          {campanha.descricao ? (
            <CampaignRichText className="campaign-theme3-lede" text={campanha.descricao} />
          ) : null}
          <a className="campaign-theme3-cta" href="#assinar">
            ✍️ Quero assinar
          </a>
        </div>
      </header>

      {campanha.tituloTopicos || campanha.textoTopicosIntro || topics.length > 0 ? (
        <section className="campaign-theme3-section">
          <div className="campaign-theme3-wrap">
            {campanha.tituloTopicos ? <h2>{campanha.tituloTopicos}</h2> : null}
            {campanha.textoTopicosIntro ? (
              <CampaignRichText
                className="campaign-theme3-lede"
                text={campanha.textoTopicosIntro}
              />
            ) : null}
            {topics.length > 0 ? (
              <ul className="campaign-theme3-claims">
                {topics.map((topic, index) => (
                  <li data-n={String(index + 1).padStart(2, "0")} key={`${index}-${topic.title}`}>
                    <h3>{topic.title}</h3>
                    {topic.body ? (
                      <CampaignRichText className="campaign-theme3-claim-text" text={topic.body} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {campanha.tituloCitacao || quote || campanha.notaCitacao ? (
        <section className="campaign-theme3-section">
          <div className="campaign-theme3-wrap">
            {campanha.tituloCitacao ? <h2>{campanha.tituloCitacao}</h2> : null}
            {quote ? (
              <blockquote className="campaign-theme3-quote">
                <CampaignRichText className="campaign-theme3-quote-text" text={quote} />
              </blockquote>
            ) : null}
            {campanha.notaCitacao ? (
              <CampaignRichText className="campaign-theme3-note" text={campanha.notaCitacao} />
            ) : null}
          </div>
        </section>
      ) : null}

      {campanha.videoUrl ? (
        <section className="campaign-theme3-section campaign-theme3-video-section">
          <div className="campaign-theme3-wrap">
            {campanha.tituloVideo ? <h2>{campanha.tituloVideo}</h2> : null}
            <div className="campaign-theme3-vid-grid">
              <div>
                <div className="campaign-theme3-vid-frame">
                  <span className="campaign-theme3-vid-tag">● Depoimento</span>
                  <video controls playsInline preload="metadata" src={campanha.videoUrl} />
                </div>
                {campanha.legendaVideo ? (
                  <div className="campaign-theme3-vid-cap">{campanha.legendaVideo}</div>
                ) : null}
              </div>
              <div>
                {videoPull ? (
                  <CampaignRichText className="campaign-theme3-pull" text={videoPull} />
                ) : null}
                {videoParagraphs.length > 0 ? (
                  <CampaignRichText
                    className="campaign-theme3-vid-text"
                    text={videoParagraphs.join("\n\n")}
                  />
                ) : null}
                {campanha.notaVideo ? (
                  <CampaignRichText className="campaign-theme3-note" text={campanha.notaVideo} />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="campaign-theme3-section campaign-theme3-sign" id="assinar">
        <div className="campaign-theme3-wrap">
          <h2>{signTitle}</h2>
          {campanha.textoAssinar ? (
            <CampaignRichText className="campaign-theme3-lede" text={campanha.textoAssinar} />
          ) : null}
          <div className="campaign-theme3-form">
            <PublicSignatureForm
              campanhaId={campanha.id}
              formConfig={campanha.formConfig}
              meta={campanha.assinaturasMeta}
              preview={preview}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || title}
              totalAssinaturas={totalAssinaturas}
              settings={campanha.settings}
            />
          </div>
          {allowSharing ? <CampaignShareButtons shareText={shareText} /> : null}
        </div>
      </section>

      <footer className="campaign-footer campaign-theme3-footer">
        {location ? (
          <div className="campaign-theme3-wrap">
            <strong>📍 {location} — essa mudança também depende de você.</strong>
          </div>
        ) : null}
        <PoliticasRodape candidateName={campanha.candidato?.nome} />
      </footer>
    </main>
  );
}
