import { ImageIcon, Layers3, Plus, Video } from "lucide-react";
import Link from "next/link";
import { CAMPAIGN_THEME_LIBRARY } from "@/lib/campaign-themes";

const mediaLabels = {
  backgroundImage: "Imagem de fundo",
  sideImage: "Imagem lateral",
  video: "Vídeo"
} as const;

export default function TemasPage() {
  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Biblioteca de temas</h1>
          <p className="page-toolbar-subtitle">
            Modelos reutilizáveis para campanhas com texto, imagem e vídeo.
          </p>
        </div>
        <Link className="button primary" href="/campanhas/novo">
          <Plus size={16} />
          Nova campanha
        </Link>
      </div>

      <div className="theme-library-summary">
        <Layers3 aria-hidden="true" size={20} />
        <span>
          {CAMPAIGN_THEME_LIBRARY.length} temas disponíveis. Os campos exibidos ao editar uma
          campanha são definidos pelo tema selecionado.
        </span>
      </div>

      <div className="theme-library-grid">
        {CAMPAIGN_THEME_LIBRARY.map((theme) => {
          const supportedMedia = Object.entries(theme.supports)
            .filter(([, supported]) => supported)
            .map(([media]) => mediaLabels[media as keyof typeof mediaLabels]);

          return (
            <article className="theme-library-card" key={theme.id}>
              <div className={`theme-library-preview theme-library-preview-${theme.id}`}>
                <span>Tema {theme.id}</span>
                {theme.supports.video ? <Video aria-hidden="true" size={22} /> : null}
                {theme.supports.backgroundImage || theme.supports.sideImage ? (
                  <ImageIcon aria-hidden="true" size={22} />
                ) : null}
              </div>
              <div className="theme-library-card-body">
                <div className="theme-library-card-title">
                  <h2>{theme.name}</h2>
                  <span className="badge ok">Disponível</span>
                </div>
                <p>{theme.description}</p>
                <div className="theme-library-capabilities" aria-label="Mídias compatíveis">
                  <span>Texto</span>
                  {supportedMedia.map((media) => <span key={media}>{media}</span>)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
