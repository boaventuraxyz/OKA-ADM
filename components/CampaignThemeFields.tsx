"use client";

import { useState } from "react";
import { Columns2, LayoutTemplate } from "lucide-react";
import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";

type CampaignThemeFieldsProps = {
  defaultBackground?: string | null;
  defaultContext?: string | null;
  defaultImpact?: string | null;
  defaultImpactSupport?: string | null;
  defaultProposal?: string | null;
  defaultSideImage?: string | null;
  defaultTheme?: number | null;
};

export function CampaignThemeFields({
  defaultBackground = null,
  defaultContext = null,
  defaultImpact = null,
  defaultImpactSupport = null,
  defaultProposal = null,
  defaultSideImage = null,
  defaultTheme = 1
}: CampaignThemeFieldsProps) {
  const [theme, setTheme] = useState(defaultTheme === 2 ? 2 : 1);

  return (
    <>
      <div className="field">
        <label>Tema do formulário público</label>
        <input name="tema" readOnly type="hidden" value={theme} />
        <div aria-label="Tema do formulário público" className="campaign-theme-selector" role="group">
          <button
            aria-pressed={theme === 1}
            className={theme === 1 ? "selected" : ""}
            onClick={() => setTheme(1)}
            type="button"
          >
            <LayoutTemplate aria-hidden="true" size={18} />
            <span>Tema 1</span>
          </button>
          <button
            aria-pressed={theme === 2}
            className={theme === 2 ? "selected" : ""}
            onClick={() => setTheme(2)}
            type="button"
          >
            <Columns2 aria-hidden="true" size={18} />
            <span>Tema 2</span>
          </button>
        </div>
      </div>

      <div hidden={theme !== 1}>
        <CampaignBackgroundField defaultValue={defaultBackground} />
      </div>

      <div className="campaign-theme-two-fields" hidden={theme !== 2}>
        <CampaignBackgroundField
          defaultValue={defaultSideImage}
          inputId="campaign-side-image-file"
          label="Foto ao lado do texto (opcional)"
          name="imagem_lateral"
        />
        <div className="field">
          <label htmlFor="texto_contexto">Contexto da campanha</label>
          <textarea
            className="textarea"
            defaultValue={defaultContext ?? ""}
            id="texto_contexto"
            maxLength={8000}
            name="texto_contexto"
            rows={6}
          />
        </div>
        <div className="field">
          <label htmlFor="texto_proposta">Proposta em destaque</label>
          <textarea
            className="textarea"
            defaultValue={defaultProposal ?? ""}
            id="texto_proposta"
            maxLength={4000}
            name="texto_proposta"
            rows={4}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="texto_impacto">Chamada intermediária</label>
            <input
              className="input"
              defaultValue={defaultImpact ?? ""}
              id="texto_impacto"
              maxLength={300}
              name="texto_impacto"
            />
          </div>
          <div className="field">
            <label htmlFor="texto_impacto_apoio">Complemento da chamada</label>
            <input
              className="input"
              defaultValue={defaultImpactSupport ?? ""}
              id="texto_impacto_apoio"
              maxLength={500}
              name="texto_impacto_apoio"
            />
          </div>
        </div>
      </div>
    </>
  );
}
