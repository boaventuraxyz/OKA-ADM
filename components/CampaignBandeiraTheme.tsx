import type { CSSProperties } from "react";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

import {
  CampaignCaptureProvider,
  CampaignCaptureTrigger,
} from "@/components/CampaignCaptureModal";
import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignVideoCarousel } from "@/components/CampaignVideoCarousel";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import {
  parseCampaignLegalFooter,
  parseCandidateNumber,
} from "@/lib/campaign-settings";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";
import {
  legacyCampaignVideoCarousel,
  type CampaignVideoItem,
} from "@/lib/campaign-video-carousel";

type BandeiraCampaign = {
  assinaturasMeta: number | null;
  candidato: {
    cargo: string | null;
    estado: string | null;
    municipio: string | null;
    nome: string | null;
    partido: string | null;
  } | null;
  descricao: string | null;
  formConfig: Record<string, unknown> | null;
  id: string;
  imagemFundoUrl?: string | null;
  imagemLateralUrl?: string | null;
  settings: Record<string, unknown> | null;
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
  titleHighlights: CampaignTitleHighlight[] | null;
  titulo: string | null;
  tituloAssinar: string | null;
  tituloCitacao: string | null;
  tituloTopicos: string | null;
  tituloVideo: string | null;
  videoCarousel: CampaignVideoItem[] | null;
  videoUrl: string | null;
};

function blocks(value?: string | null) {
  return (value ?? "")
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function lines(value?: string | null) {
  return (value ?? "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Cada bloco vira uma bandeira; a primeira linha é o título. */
function flags(value?: string | null) {
  return blocks(value).map((block) => {
    const [title, ...body] = block.split(/\r?\n/).map((line) => line.trim());
    return { body: body.join("\n"), title };
  });
}

export function CampaignBandeiraTheme({
  accent,
  campanha,
  preview = false,
  totalAssinaturas,
}: {
  accent: string;
  campanha: BandeiraCampaign;
  preview?: boolean;
  totalAssinaturas: number;
}) {
  const candidateName = campanha.candidato?.nome?.trim() || "Candidatura";
  const number = parseCandidateNumber(campanha.settings);
  const office = campanha.candidato?.cargo?.trim() || "";
  const title = campanha.titulo || "O futuro é nosso";
  const heroBlocks = blocks(campanha.descricao);
  const heroSupport = heroBlocks.length > 1 ? heroBlocks.at(-1) : null;
  const heroLead = heroSupport ? heroBlocks.slice(0, -1) : heroBlocks;
  const campaignFlags = flags(campanha.textoTopicos);
  const benefits = lines(campanha.textoConclusao);
  const groupLabel = campanha.textoDot?.trim() || "Entrar no grupo";
  const heroPhoto = campanha.imagemLateralUrl || null;
  const legal = parseCampaignLegalFooter(campanha.settings);
  const videos = campanha.videoCarousel ?? legacyCampaignVideoCarousel({
    caption: campanha.tituloVideo,
    url: campanha.videoUrl,
  });
  const supportTitle =
    campanha.tituloTopicos?.trim() ||
    campanha.tituloCitacao?.trim() ||
    "Uma luta que precisa de todos nós.";
  const supportBlocks = blocks(campanha.textoContexto || campanha.textoProposta);
  const groupTitle =
    campanha.textoImpacto?.trim() ||
    "Se una a quem está lutando pelo futuro de São Paulo";
  const groupSupport =
    campanha.textoImpactoApoio?.trim() ||
    campanha.textoAssinar?.trim() ||
    "Ao se inscrever, você recebe acesso exclusivo à campanha.";

  const signatureForm = (
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
  );

  return (
    <CampaignCaptureProvider
      form={signatureForm}
      title={campanha.textoForm || "Entre para o movimento"}
    >
    <main
      className="campaign-public-page campaign-theme-8"
      style={
        {
          "--campaign-accent": accent,
          "--bandeira-number": number ? `"${number}"` : '""',
        } as CSSProperties
      }
    >
      <header className="bandeira-hero" id="inicio">
        <div className="bandeira-topbar">
          <a
            aria-label={`${candidateName}${number ? ` ${number}` : ""}, início`}
            className="bandeira-wordmark"
            href="#inicio"
          >
            <span>{candidateName}</span>
            {number ? <b>{number}</b> : null}
          </a>
        </div>

        <div className={`bandeira-hero-stage ${heroPhoto ? "has-media" : "without-media"}`}>
          {heroPhoto ? (
            <Image
              alt={`Banner da campanha de ${candidateName}`}
              className="bandeira-hero-media"
              fill
              priority={!preview}
              sizes="100vw"
              src={heroPhoto}
              unoptimized
            />
          ) : null}
          <div aria-hidden="true" className="bandeira-hero-overlay" />
          <div className="bandeira-shell bandeira-hero-copy">
            <span className="bandeira-eyebrow">Movimento oficial</span>
            <h1>
              <CampaignHeadline highlights={campanha.titleHighlights} text={title} />
            </h1>
            {heroLead.map((block, index) => (
              <CampaignRichText
                className="bandeira-hero-text"
                key={`${index}-${block.slice(0, 20)}`}
                text={block}
              />
            ))}
            {heroSupport ? (
              <CampaignRichText className="bandeira-hero-support" text={heroSupport} />
            ) : null}
            <CampaignCaptureTrigger>
              <MessageCircle aria-hidden="true" size={20} />
              {groupLabel}
            </CampaignCaptureTrigger>
          </div>
        </div>
      </header>

      {supportTitle || supportBlocks.length > 0 || videos.length > 0 ? (
        <section className="bandeira-support">
          <div aria-hidden="true" className="bandeira-support-glow" />
          <div className="bandeira-shell bandeira-support-grid">
            <div className="bandeira-support-copy">
              <span className="bandeira-index light">Apoio</span>
              <h2>{supportTitle}</h2>
              {supportBlocks.map((block, index) => (
                <CampaignRichText
                  className="bandeira-paragraph"
                  key={`${index}-${block.slice(0, 20)}`}
                  text={block}
                />
              ))}
              <CampaignCaptureTrigger>
                <MessageCircle aria-hidden="true" size={20} />
                {groupLabel}
              </CampaignCaptureTrigger>
            </div>
            {videos.length > 0 ? (
              <div className="bandeira-support-video">
                <CampaignVideoCarousel
                  autoPlay
                  candidateName={candidateName}
                  className="bandeira-video-carousel"
                  videos={videos}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {campanha.tituloAssinar || campaignFlags.length > 0 ? (
        <section className="bandeira-flags" id="bandeiras">
          <div className="bandeira-shell">
            <div className="bandeira-flags-heading">
              <div className="bandeira-flags-heading-copy">
                <span className="bandeira-index light">Bandeiras</span>
                {campanha.tituloAssinar ? <h2>{campanha.tituloAssinar}</h2> : null}
                {campanha.textoTopicosIntro ? (
                  <p>{campanha.textoTopicosIntro}</p>
                ) : null}
              </div>
            </div>
            <div className="bandeira-flags-list">
              {campaignFlags.map((flag, index) => (
                <article className="bandeira-flag" key={`${index}-${flag.title}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{flag.title}</h3>
                    {flag.body ? (
                      <CampaignRichText className="bandeira-flag-text" text={flag.body} />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <CampaignCaptureTrigger className="bandeira-section-cta">
              <MessageCircle aria-hidden="true" size={20} />
              {groupLabel}
            </CampaignCaptureTrigger>
          </div>
        </section>
      ) : null}

      <section className="bandeira-group" id="assinar">
        <div className="bandeira-shell bandeira-group-grid">
          <div className="bandeira-group-intro">
            <span className="bandeira-index">Grupo oficial</span>
            <h2>{groupTitle}</h2>
            <p>{groupSupport}</p>
          </div>
          {benefits.length > 0 ? (
            <div className="bandeira-benefits">
              {benefits.map((benefit, index) => (
                <div className="bandeira-benefit" key={`${index}-${benefit.slice(0, 16)}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{benefit}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <CampaignCaptureTrigger className="bandeira-section-cta">
            <MessageCircle aria-hidden="true" size={20} />
            {groupLabel}
          </CampaignCaptureTrigger>
        </div>
      </section>

      <footer className="bandeira-footer">
        <div className="bandeira-shell bandeira-footer-grid">
          <div className="bandeira-footer-brand">
            <strong>{candidateName}</strong>
            <span>
              {office}
              {number ? ` · ${number}` : ""}
            </span>
          </div>
          <div>
            <strong>Propaganda Eleitoral</strong>
            {legal?.election ? <p>{legal.election}</p> : null}
            {legal?.candidateCnpj ? <p>CNPJ do candidato: {legal.candidateCnpj}</p> : null}
            {legal?.party || campanha.candidato?.partido ? (
              <p>
                {legal?.party || campanha.candidato?.partido}
                {legal?.partyCnpj ? ` — CNPJ: ${legal.partyCnpj}` : ""}
              </p>
            ) : null}
            {legal?.committee ? <p>{legal.committee}</p> : null}
          </div>
          {legal?.contact ? (
            <div>
              <strong>Contato da campanha</strong>
              <p>{legal.contact}</p>
            </div>
          ) : null}
        </div>
        <PoliticasRodape
          candidateName={campanha.candidato?.nome}
          partyName={legal?.party || campanha.candidato?.partido}
        />
      </footer>

      <CampaignCaptureTrigger className="bandeira-fab">
        <MessageCircle aria-hidden="true" size={25} />
        <span>{groupLabel}</span>
      </CampaignCaptureTrigger>
    </main>
    </CampaignCaptureProvider>
  );
}
