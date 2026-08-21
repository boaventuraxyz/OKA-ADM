import type { CSSProperties } from "react";
import Image from "next/image";

import {
  CampaignCaptureProvider,
  CampaignCaptureTrigger,
} from "@/components/CampaignCaptureModal";
import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignShareButtons } from "@/components/CampaignShareButtons";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import {
  campaignAllowsSharing,
  parseCampaignLegalFooter,
  parseCandidateNumber,
} from "@/lib/campaign-settings";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";

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
  const allowSharing = campaignAllowsSharing(campanha.settings);
  const shareText =
    campanha.textoCompartilhar?.trim() || `Eu apoio ${candidateName}. Participe também:`;
  const groupLabel = campanha.textoDot?.trim() || "Entrar no grupo";
  const heroPhoto = campanha.imagemLateralUrl || null;
  const missionPhoto = campanha.imagemFundoUrl || null;
  const legal = parseCampaignLegalFooter(campanha.settings);

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
        <nav aria-label="Navegação principal" className="bandeira-shell bandeira-nav">
          <a className="bandeira-wordmark" href="#inicio">
            {candidateName}
            {number ? <b>{number}</b> : null}
          </a>
          <CampaignCaptureTrigger className="bandeira-nav-cta">
            {groupLabel}
          </CampaignCaptureTrigger>
        </nav>

        <div className="bandeira-shell bandeira-hero-grid">
          <div className="bandeira-hero-copy">
            {campanha.textoFaixa ? (
              <span className="bandeira-eyebrow">{campanha.textoFaixa}</span>
            ) : null}
            <h1>
              <CampaignHeadline highlights={campanha.titleHighlights} text={title} />
            </h1>
            {office || number ? (
              <div className="bandeira-lockup">
                {office ? <span>{office}</span> : null}
                {number ? <strong>{number}</strong> : null}
              </div>
            ) : null}
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
            <CampaignCaptureTrigger>{groupLabel}</CampaignCaptureTrigger>
          </div>

          {heroPhoto ? (
            <div className="bandeira-hero-visual">
              <figure className="bandeira-hero-frame">
                <Image
                  alt={`Foto de ${candidateName}`}
                  fill
                  priority={!preview}
                  sizes="(max-width: 900px) 100vw, 50vw"
                  src={heroPhoto}
                  unoptimized
                />
              </figure>
            </div>
          ) : null}
        </div>
        <div aria-hidden="true" className="bandeira-stripe" />
      </header>

      {campanha.tituloTopicos || campanha.textoContexto ? (
        <section className="bandeira-statement">
          <div className="bandeira-shell bandeira-statement-grid">
            <div>
              <span className="bandeira-index">01 · Minha decisão</span>
              {campanha.tituloTopicos ? <h2>{campanha.tituloTopicos}</h2> : null}
            </div>
            <div className="bandeira-statement-copy">
              {blocks(campanha.textoContexto).map((block, index) => (
                <CampaignRichText
                  className="bandeira-paragraph"
                  key={`${index}-${block.slice(0, 20)}`}
                  text={block}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {campanha.tituloCitacao || campanha.textoProposta || campanha.textoCitacao ? (
        <section className="bandeira-mission">
          {missionPhoto ? (
            <figure className="bandeira-mission-image">
              <Image
                alt={`${candidateName} em campanha`}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                src={missionPhoto}
                unoptimized
              />
            </figure>
          ) : null}
          <div className="bandeira-mission-copy">
            <span className="bandeira-index light">02 · Minha missão</span>
            {campanha.tituloCitacao ? <h2>{campanha.tituloCitacao}</h2> : null}
            {blocks(campanha.textoProposta).map((block, index) => (
              <CampaignRichText
                className="bandeira-paragraph"
                key={`${index}-${block.slice(0, 20)}`}
                text={block}
              />
            ))}
            {campanha.textoCitacao ? (
              <blockquote className="bandeira-quote">{campanha.textoCitacao}</blockquote>
            ) : null}
          </div>
        </section>
      ) : null}

      {campanha.videoUrl ? (
        <section className="bandeira-video">
          <div className="bandeira-shell">
            <div className="bandeira-heading">
              <span className="bandeira-index">03 · Assista</span>
              {campanha.tituloVideo ? <h2>{campanha.tituloVideo}</h2> : null}
            </div>
            <div className="bandeira-video-frame">
              <video controls playsInline preload="metadata" src={campanha.videoUrl} />
            </div>
          </div>
        </section>
      ) : null}

      {campanha.tituloAssinar || campaignFlags.length > 0 ? (
        <section className="bandeira-flags" id="bandeiras">
          <div className="bandeira-shell">
            <div className="bandeira-flags-heading">
              <div>
                <span className="bandeira-index light">04 · Bandeiras</span>
                {campanha.tituloAssinar ? <h2>{campanha.tituloAssinar}</h2> : null}
              </div>
              {campanha.textoTopicosIntro ? (
                <p>{campanha.textoTopicosIntro}</p>
              ) : null}
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
          </div>
        </section>
      ) : null}

      <section className="bandeira-group" id="assinar">
        <div className="bandeira-shell bandeira-group-grid">
          <div className="bandeira-group-intro">
            <span className="bandeira-index">05 · Grupo oficial</span>
            <h2>{campanha.textoForm || "Eu preciso de você nessa caminhada."}</h2>
            {campanha.textoAssinar ? (
              <CampaignRichText className="bandeira-paragraph" text={campanha.textoAssinar} />
            ) : null}
            <CampaignCaptureTrigger>{groupLabel}</CampaignCaptureTrigger>
            {allowSharing ? <CampaignShareButtons shareText={shareText} /> : null}
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
        </div>
      </section>

      <section className="bandeira-final">
        <div className="bandeira-shell bandeira-final-inner">
          <h2>{campanha.textoImpacto || title}</h2>
          {campanha.textoImpactoApoio ? <p>{campanha.textoImpactoApoio}</p> : null}
          <CampaignCaptureTrigger>{groupLabel}</CampaignCaptureTrigger>
          <strong className="bandeira-final-number">
            {candidateName}
            {number ? ` · ${number}` : ""}
          </strong>
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
        <PoliticasRodape candidateName={campanha.candidato?.nome} />
      </footer>
    </main>
    </CampaignCaptureProvider>
  );
}
