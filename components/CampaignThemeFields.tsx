"use client";

import { useState } from "react";
import { Columns2, LayoutTemplate } from "lucide-react";
import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";

type CampaignThemeFieldsProps = {
  defaultBackground?: string | null;
  defaultConclusion?: string | null;
  defaultContext?: string | null;
  defaultImpact?: string | null;
  defaultImpactSupport?: string | null;
  defaultProposal?: string | null;
  defaultSideImage?: string | null;
  defaultTheme?: number | null;
};

export function CampaignThemeFields({
  defaultBackground = null,
  defaultConclusion = null,
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
        <label>Tema da página pública</label>
        <input name="tema" readOnly type="hidden" value={theme} />
        <div aria-label="Tema do formulário público" className="campaign-theme-selector" role="group">
          <button
            aria-pressed={theme === 1}
            className={theme === 1 ? "selected" : ""}
            onClick={() => setTheme(1)}
            type="button"
          >
            <LayoutTemplate aria-hidden="true" size={18} />
            <span>Tema 1 - Capa</span>
          </button>
          <button
            aria-pressed={theme === 2}
            className={theme === 2 ? "selected" : ""}
            onClick={() => setTheme(2)}
            type="button"
          >
            <Columns2 aria-hidden="true" size={18} />
            <span>Tema 2 - Editorial</span>
          </button>
        </div>
      </div>

      <div hidden={theme !== 1}>
        <CampaignBackgroundField
          defaultValue={defaultBackground}
          label="Tema 1: imagem de fundo da capa (opcional)"
        />
      </div>

      <div className="campaign-theme-two-fields" hidden={theme !== 2}>
        <CampaignBackgroundField
          defaultValue={defaultSideImage}
          inputId="campaign-side-image-file"
          label="Tema 2: imagem ao lado do título principal (opcional)"
          name="imagem_lateral"
        />
        <div className="field">
          <label htmlFor="texto_contexto">
            {"Tema 2 - 1. Texto da seção \"O caso e a proposta\" (use <b>texto</b> para destacar com cor)"}
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultContext ?? ""}
            id="texto_contexto"
            maxLength={8000}
            name="texto_contexto"
            placeholder="Parágrafos que aparecem antes da caixa destacada. Separe parágrafos com uma linha em branco."
            rows={6}
          />
        </div>
        <div className="field">
          <label htmlFor="texto_proposta">
            {"Tema 2 - 2. Texto dentro da caixa destacada (use <b>texto</b> para destacar com cor)"}
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultProposal ?? ""}
            id="texto_proposta"
            maxLength={4000}
            name="texto_proposta"
            placeholder="Resumo da proposta principal da campanha."
            rows={4}
          />
        </div>
        <div className="field">
          <label htmlFor="texto_conclusao">
            {"Tema 2 - 3. Texto após a caixa destacada (use <b>texto</b> para destacar com cor)"}
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultConclusion ?? ""}
            id="texto_conclusao"
            maxLength={4000}
            name="texto_conclusao"
            placeholder="Argumentos finais e convite para a pessoa assinar."
            rows={4}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="texto_impacto">Tema 2 - 4. Título do bloco claro</label>
            <input
              className="input"
              defaultValue={defaultImpact ?? ""}
              id="texto_impacto"
              maxLength={300}
              name="texto_impacto"
            />
          </div>
          <div className="field">
            <label htmlFor="texto_impacto_apoio">Tema 2 - 5. Texto abaixo da chamada</label>
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
