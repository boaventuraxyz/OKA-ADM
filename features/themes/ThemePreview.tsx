import type { CSSProperties, ReactNode } from "react";
import type { CampaignThemeDefinition, ThemePalette } from "./registry";
import styles from "./ThemePreview.module.css";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export type ThemePreviewContent = {
  brand?: string;
  cta?: string;
  eyebrow?: string;
  fieldLabels?: readonly string[];
  formTitle?: string;
  subtitle?: string;
  title?: ReactNode;
};

type ThemePreviewStyle = CSSProperties & {
  "--preview-accent": string;
  "--preview-bg": string;
  "--preview-secondary": string;
  "--preview-surface": string;
  "--preview-text": string;
};

function PreviewForm({ content }: { content: ThemePreviewContent }) {
  const fieldLabels = content.fieldLabels?.filter(Boolean).slice(0, 3) ?? [];

  return (
    <div className={styles.form}>
      <p className={styles.formTitle}>{content.formTitle || "Assine esta causa"}</p>
      {(fieldLabels.length ? fieldLabels : ["Nome", "E-mail", "WhatsApp"]).map(
        (label) => <span className={styles.fakeInput} key={label}>{label}</span>,
      )}
      <span className={styles.fakeButton}>{content.cta || "Quero apoiar"}</span>
    </div>
  );
}

function PreviewTopbar({ label = "Campanha cidadã" }: { label?: string }) {
  return (
    <div className={styles.topbar}>
      <span className={styles.brand}>{label}</span>
      <span className={styles.miniCta}>Assinar agora</span>
    </div>
  );
}

function CoverPreview({ content }: { content: ThemePreviewContent }) {
  return (
    <div className={`${styles.page} ${styles.cover}`}>
      <PreviewTopbar label={content.brand || "Campanha cidadã"} />
      <div className={styles.coverHero}>
        <div>
          <span className={styles.eyebrow}>{content.eyebrow || "Mobilização aberta"}</span>
          <h3 className={styles.headline}>{content.title || <>Uma causa que precisa da <span>sua voz</span></>}</h3>
          <p className={styles.lede}>{content.subtitle || "Participe deste movimento e ajude a transformar apoio em ação concreta."}</p>
          <span className={styles.cta}>{content.cta || "Conhecer a proposta"}</span>
        </div>
        <PreviewForm content={content} />
      </div>
    </div>
  );
}

function EditorialPreview({ content }: { content: ThemePreviewContent }) {
  return (
    <div className={`${styles.page} ${styles.editorial}`}>
      <PreviewTopbar label={content.brand || "Iniciativa pública"} />
      <div className={styles.editorialHero}>
        <div>
          <span className={styles.eyebrow}>{content.eyebrow || "O caso e a proposta"}</span>
          <h3 className={styles.headline}>{content.title || <>Informação para <span>mobilizar</span> pessoas</>}</h3>
          <p className={styles.lede}>{content.subtitle || "Contexto, argumentos e uma chamada clara para quem deseja participar."}</p>
          <span className={styles.cta}>{content.cta || "Ler e assinar"}</span>
        </div>
        <div aria-hidden="true" className={styles.editorialVisual} />
      </div>
    </div>
  );
}

function ManifestoPreview({ content }: { content: ThemePreviewContent }) {
  return (
    <div className={`${styles.page} ${styles.manifesto}`}>
      <div className={styles.ticker}>{content.brand || "Manifesto público • participe • compartilhe •"}</div>
      <div className={styles.manifestoBody}>
        <div>
          <span className={styles.eyebrow}>{content.eyebrow || "Abaixo-assinado"}</span>
          <h3 className={styles.headline}>{content.title || <>Não vamos <span>ficar em silêncio</span></>}</h3>
          <p className={styles.lede}>{content.subtitle || "Uma declaração direta, organizada em pontos e pronta para circular."}</p>
          <span className={styles.cta}>{content.cta || "Assinar o manifesto"}</span>
        </div>
        <div className={styles.claims}>
          {["Uma pauta clara", "Contexto objetivo", "Ação coletiva"].map((claim, index) => (
            <div className={styles.claim} key={claim}>
              <span className={styles.claimNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span>{claim}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobilizationPreview({ content }: { content: ThemePreviewContent }) {
  return (
    <div className={`${styles.page} ${styles.mobilization}`}>
      <PreviewTopbar label={content.brand || "Movimento cidadão"} />
      <div className={styles.mobilizationBody}>
        <div>
          <span className={styles.eyebrow}>{content.eyebrow || "Caso em andamento"}</span>
          <h3 className={styles.headline}>{content.title || "Coragem para defender o que importa"}</h3>
          <p className={styles.lede}>{content.subtitle || "Uma apresentação sóbria, com relato, vídeo e chamada final."}</p>
          <span className={styles.cta}>{content.cta || "Apoiar agora"}</span>
        </div>
        <div aria-label="Espaço para vídeo" className={styles.videoPanel}>
          <span aria-hidden="true" className={styles.play}>▶</span>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({
  content,
  theme,
}: {
  content: ThemePreviewContent;
  theme: CampaignThemeDefinition;
}) {
  switch (theme.id) {
    case 1:
      return <CoverPreview content={content} />;
    case 2:
      return <EditorialPreview content={content} />;
    case 3:
      return <ManifestoPreview content={content} />;
    case 4:
      return <MobilizationPreview content={content} />;
  }
}

export function ThemePreview({
  accent,
  content = {},
  device = "desktop",
  palette,
  theme
}: {
  accent?: string;
  content?: ThemePreviewContent;
  device?: PreviewDevice;
  palette?: ThemePalette;
  theme: CampaignThemeDefinition;
}) {
  const colors = palette ?? theme.palette;
  const previewStyle: ThemePreviewStyle = {
    "--preview-bg": colors.background,
    "--preview-surface": colors.surface,
    "--preview-text": colors.text,
    "--preview-accent": accent || colors.accent,
    "--preview-secondary": colors.secondary
  };

  const deviceLabel = {
    desktop: "desktop",
    tablet: "tablet",
    mobile: "celular"
  }[device];

  return (
    <div
      aria-label={`Prévia do tema ${theme.name} em ${deviceLabel}`}
      className={`${styles.preview} ${styles[device]}`}
      role="img"
      style={previewStyle}
    >
      <div className={styles.frame}>
        <div className={styles.viewport}>
          <PreviewContent content={content} theme={theme} />
        </div>
      </div>
    </div>
  );
}
