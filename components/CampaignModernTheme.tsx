import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { CSSProperties } from "react";

import { CampaignHeadline } from "@/components/CampaignHeadline";
import { CampaignRichText } from "@/components/CampaignRichText";
import { CampaignShareButtons } from "@/components/CampaignShareButtons";
import { PoliticasRodape } from "@/components/PoliticasRodape";
import { PublicSignatureForm } from "@/components/PublicSignatureForm";
import { campaignAllowsSharing, resolveCandidateNumber } from "@/lib/campaign-settings";
import type { CampaignTitleHighlight } from "@/lib/campaign-title-highlights";

type ModernThemeId = 5 | 6 | 7;

type ModernCampaign = {
  assinaturasMeta: number | null;
  candidato: {
    cargo: string | null;
    estado: string | null;
    municipio: string | null;
    nome: string | null;
    numero: string | null;
    partido: string | null;
  } | null;
  descricao: string | null;
  formConfig: Record<string, unknown> | null;
  id: string;
  settings: Record<string, unknown> | null;
  textoAssinar: string | null;
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
  titleHighlights: CampaignTitleHighlight[] | null;
  titulo: string | null;
  tituloAssinar: string | null;
  tituloTopicos: string | null;
};

const themeMeta: Record<ModernThemeId, {
  className: string;
  defaultAccent: string;
  eyebrow: string;
  name: string;
}> = {
  5: {
    className: "campaign-modern-horizon",
    defaultAccent: "#1479D1",
    eyebrow: "Participação que constrói futuro",
    name: "Horizonte Azul",
  },
  6: {
    className: "campaign-modern-community",
    defaultAccent: "#218A61",
    eyebrow: "Uma comunidade em movimento",
    name: "Verde Comunidade",
  },
  7: {
    className: "campaign-modern-pulse",
    defaultAccent: "#18BFA4",
    eyebrow: "Mobilização conectada",
    name: "Pulso Turquesa",
  },
};

function blocks(value?: string | null) {
  return (value || "")
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function topics(value?: string | null) {
  return blocks(value).map((block) => {
    const [title, ...body] = block.split(/\r?\n/).map((line) => line.trim());
    return { body: body.join("\n"), title };
  });
}

export function CampaignModernTheme({
  accent,
  campanha,
  preview = false,
  themeId,
  totalAssinaturas,
}: {
  accent: string;
  campanha: ModernCampaign;
  preview?: boolean;
  themeId: ModernThemeId;
  totalAssinaturas: number;
}) {
  const meta = themeMeta[themeId];
  const title = campanha.titulo || "Participe desta mobilização";
  const brand = campanha.textoFaixa?.trim() || campanha.candidato?.nome || "Mobilização cidadã";
  const candidateNumber = resolveCandidateNumber(
    campanha.candidato?.numero,
    campanha.settings,
  );
  const location = [campanha.candidato?.municipio, campanha.candidato?.estado]
    .filter(Boolean)
    .join(" / ");
  const campaignTopics = topics(campanha.textoTopicos);
  const narrative = [
    { label: "O contexto", text: campanha.textoContexto },
    { label: "A proposta", text: campanha.textoProposta },
    { label: "O resultado", text: campanha.textoConclusao },
  ].filter((item) => item.text?.trim());
  const shareText = campanha.textoCompartilhar?.trim() ||
    `Eu apoiei a campanha “${title}”. Participe também:`;
  const allowSharing = campaignAllowsSharing(campanha.settings);

  return (
    <main
      className={`campaign-public-page campaign-modern ${meta.className}`}
      data-theme={themeId}
      style={{ "--modern-accent": accent || meta.defaultAccent } as CSSProperties}
    >
      <header className="campaign-modern-nav">
        <a className="campaign-modern-brand" href="#inicio">
          <span aria-hidden="true" />
          {brand}
        </a>
        <a className="campaign-modern-nav-cta" href="#assinar">Assinar agora</a>
      </header>

      <section className="campaign-modern-hero" id="inicio">
        <div className="campaign-modern-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="campaign-modern-wrap campaign-modern-hero-grid">
          <div className="campaign-modern-hero-copy">
            <div className="campaign-modern-eyebrow">
              {candidateNumber ? `Nº ${candidateNumber} · ` : ""}
              {campanha.textoDot || meta.eyebrow}
            </div>
            <h1>
              <CampaignHeadline
                highlights={campanha.titleHighlights}
                text={title}
              />
            </h1>
            {campanha.descricao ? (
              <CampaignRichText className="campaign-modern-lede" text={campanha.descricao} />
            ) : null}
            <div className="campaign-modern-hero-actions">
              <a className="campaign-modern-primary" href="#assinar">
                Quero participar <ArrowRight aria-hidden="true" size={18} />
              </a>
              {location ? <span>{location}</span> : null}
            </div>
          </div>
          <aside className="campaign-modern-summary">
            <small>{meta.name}</small>
            <strong>{campanha.textoImpacto || "Uma proposta clara para avançar"}</strong>
            <p>{campanha.textoImpactoApoio || "Informação, participação e resultado coletivo."}</p>
            <div><b>{totalAssinaturas.toLocaleString("pt-BR")}</b> apoios registrados</div>
          </aside>
        </div>
      </section>

      {narrative.length > 0 ? (
        <section className="campaign-modern-section campaign-modern-narrative">
          <div className="campaign-modern-wrap">
            <div className="campaign-modern-section-heading">
              <span>01</span>
              <div><small>Entenda a causa</small><h2>Clareza para decidir e agir.</h2></div>
            </div>
            <div className="campaign-modern-narrative-grid">
              {narrative.map((item, index) => (
                <article key={item.label}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.label}</h3>
                  <CampaignRichText className="campaign-modern-copy" text={item.text || ""} />
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {campanha.tituloTopicos || campaignTopics.length > 0 ? (
        <section className="campaign-modern-section campaign-modern-points">
          <div className="campaign-modern-wrap">
            <div className="campaign-modern-section-heading">
              <span>02</span>
              <div><small>Pontos principais</small><h2>{campanha.tituloTopicos || "O que esta mobilização defende"}</h2></div>
            </div>
            <div className="campaign-modern-points-grid">
              {campaignTopics.map((item, index) => (
                <article key={`${index}-${item.title}`}>
                  <CheckCircle2 aria-hidden="true" size={22} />
                  <h3>{item.title}</h3>
                  {item.body ? <CampaignRichText className="campaign-modern-copy" text={item.body} /> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="campaign-modern-impact">
        <div className="campaign-modern-wrap">
          <small>Faça parte</small>
          <h2>{campanha.textoImpacto || "Uma assinatura pode abrir um novo caminho."}</h2>
          <p>{campanha.textoImpactoApoio || "Some sua voz e ajude esta proposta a alcançar mais pessoas."}</p>
        </div>
      </section>

      <section className="campaign-modern-sign" id="assinar">
        <div className="campaign-modern-wrap campaign-modern-sign-grid">
          <div className="campaign-modern-sign-copy">
            <span>03 · Sua participação</span>
            <h2>{campanha.tituloAssinar || "Assine e fortaleça esta causa."}</h2>
            {campanha.textoAssinar ? <CampaignRichText className="campaign-modern-copy" text={campanha.textoAssinar} /> : null}
            {allowSharing ? <CampaignShareButtons shareText={shareText} /> : null}
          </div>
          <div className="campaign-modern-form">
            <PublicSignatureForm
              campanhaId={campanha.id}
              formConfig={campanha.formConfig}
              meta={campanha.assinaturasMeta}
              preview={preview}
              settings={campanha.settings}
              textoDot={campanha.textoDot}
              textoForm={campanha.textoForm || title}
              totalAssinaturas={totalAssinaturas}
            />
          </div>
        </div>
      </section>

      <footer className="campaign-modern-footer">
        <div className="campaign-modern-wrap"><strong>{brand}</strong><span>{meta.name}</span></div>
        <PoliticasRodape candidateName={campanha.candidato?.nome} />
      </footer>
    </main>
  );
}
