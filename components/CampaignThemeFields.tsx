"use client";

import { useState } from "react";
import { Columns2, LayoutTemplate, Megaphone, ShieldAlert } from "lucide-react";
import { CampaignBackgroundField } from "@/components/CampaignBackgroundField";
import {
  CAMPAIGN_THEME_LIBRARY,
  normalizeCampaignTheme,
  type CampaignThemeId
} from "@/lib/campaign-themes";

const campaignThemeIcons = {
  1: LayoutTemplate,
  2: Columns2,
  3: Megaphone,
  4: ShieldAlert
} satisfies Record<CampaignThemeId, typeof LayoutTemplate>;

type CampaignThemeFieldsProps = {
  defaultBackground?: string | null;
  defaultConclusion?: string | null;
  defaultContext?: string | null;
  defaultImpact?: string | null;
  defaultImpactSupport?: string | null;
  defaultProposal?: string | null;
  defaultSideImage?: string | null;
  defaultTheme?: number | null;
  defaultStrip?: string | null;
  defaultTopicsTitle?: string | null;
  defaultTopicsIntro?: string | null;
  defaultTopics?: string | null;
  defaultQuoteTitle?: string | null;
  defaultQuote?: string | null;
  defaultQuoteNote?: string | null;
  defaultVideoTitle?: string | null;
  defaultVideoUrl?: string | null;
  defaultVideoText?: string | null;
  defaultVideoCaption?: string | null;
  defaultVideoNote?: string | null;
  defaultSignTitle?: string | null;
  defaultSignText?: string | null;
  defaultShareText?: string | null;
};

export function CampaignThemeFields({
  defaultBackground = null,
  defaultConclusion = null,
  defaultContext = null,
  defaultImpact = null,
  defaultImpactSupport = null,
  defaultProposal = null,
  defaultSideImage = null,
  defaultTheme = 1,
  defaultStrip = null,
  defaultTopicsTitle = null,
  defaultTopicsIntro = null,
  defaultTopics = null,
  defaultQuoteTitle = null,
  defaultQuote = null,
  defaultQuoteNote = null,
  defaultVideoTitle = null,
  defaultVideoUrl = null,
  defaultVideoText = null,
  defaultVideoCaption = null,
  defaultVideoNote = null,
  defaultSignTitle = null,
  defaultSignText = null,
  defaultShareText = null
}: CampaignThemeFieldsProps) {
  const [theme, setTheme] = useState<CampaignThemeId>(normalizeCampaignTheme(defaultTheme));

  return (
    <>
      <div className="field">
        <label>Tema da página pública</label>
        <input name="tema" readOnly type="hidden" value={theme} />
        <div aria-label="Tema do formulário público" className="campaign-theme-selector" role="group">
          {CAMPAIGN_THEME_LIBRARY.map((definition) => {
            const ThemeIcon = campaignThemeIcons[definition.id];
            return (
              <button
                aria-pressed={theme === definition.id}
                className={theme === definition.id ? "selected" : ""}
                key={definition.id}
                onClick={() => setTheme(definition.id)}
                type="button"
              >
                <ThemeIcon aria-hidden="true" size={18} />
                <span>Tema {definition.id} - {definition.name}</span>
              </button>
            );
          })}
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

      <div className="campaign-theme-two-fields" hidden={theme !== 3}>
        <div className="field">
          <label htmlFor="texto_faixa">
            Tema 3 - 1. Texto da faixa animada no topo (opcional)
          </label>
          <input
            className="input"
            defaultValue={defaultStrip ?? ""}
            id="texto_faixa"
            maxLength={500}
            name="texto_faixa"
            placeholder="Ex.: Chega de abusos • Assine e compartilhe"
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="titulo_topicos">Tema 3 - 2. Título da seção de tópicos</label>
            <input
              className="input"
              defaultValue={defaultTopicsTitle ?? ""}
              id="titulo_topicos"
              maxLength={200}
              name="titulo_topicos"
              placeholder="Ex.: Eu não aceito isso calada."
            />
          </div>
          <div className="field">
            <label htmlFor="texto_topicos_intro">Tema 3 - 3. Texto de abertura da seção</label>
            <input
              className="input"
              defaultValue={defaultTopicsIntro ?? ""}
              id="texto_topicos_intro"
              maxLength={2000}
              name="texto_topicos_intro"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="texto_topicos">
            Tema 3 - 4. Tópicos numerados (1ª linha = título; separe cada tópico com uma linha em branco)
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultTopics ?? ""}
            id="texto_topicos"
            maxLength={8000}
            name="texto_topicos"
            placeholder={"Aluno não é militante\nCriança e jovem vão para a sala de aula para estudar.\n\nPai tem o direito de saber\nTodo pai e toda mãe têm o direito de acompanhar."}
            rows={8}
          />
        </div>
        <div className="field">
          <label htmlFor="titulo_citacao">Tema 3 - 5. Título da seção da citação</label>
          <input
            className="input"
            defaultValue={defaultQuoteTitle ?? ""}
            id="titulo_citacao"
            maxLength={200}
            name="titulo_citacao"
            placeholder="Ex.: O que eu defendo"
          />
        </div>
        <div className="field">
          <label htmlFor="texto_citacao">Tema 3 - 6. Texto da citação em destaque</label>
          <textarea
            className="textarea"
            defaultValue={defaultQuote ?? ""}
            id="texto_citacao"
            maxLength={2000}
            name="texto_citacao"
            rows={3}
          />
        </div>
        <div className="field">
          <label htmlFor="nota_citacao">Tema 3 - 7. Nota abaixo da citação (opcional)</label>
          <textarea
            className="textarea"
            defaultValue={defaultQuoteNote ?? ""}
            id="nota_citacao"
            maxLength={1000}
            name="nota_citacao"
            rows={2}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="titulo_video">Tema 3 - 8. Título da seção do vídeo</label>
            <input
              className="input"
              defaultValue={defaultVideoTitle ?? ""}
              id="titulo_video"
              maxLength={200}
              name="titulo_video"
              placeholder="Ex.: Não é teoria. É relato de quem viveu."
            />
          </div>
          <div className="field">
            <label htmlFor="video_url">Tema 3 - 9. Link do vídeo (mp4, obrigatório para exibir a seção)</label>
            <input
              className="input"
              defaultValue={defaultVideoUrl ?? ""}
              id="video_url"
              maxLength={2048}
              name="video_url"
              placeholder="https://exemplo.com/video.mp4"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="texto_video">
            {"Tema 3 - 10. Texto ao lado do vídeo (1º parágrafo vira o destaque grande; use <b>texto</b> para destacar em amarelo)"}
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultVideoText ?? ""}
            id="texto_video"
            maxLength={4000}
            name="texto_video"
            rows={5}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="legenda_video">Tema 3 - 11. Legenda abaixo do vídeo</label>
            <input
              className="input"
              defaultValue={defaultVideoCaption ?? ""}
              id="legenda_video"
              maxLength={300}
              name="legenda_video"
              placeholder="Ex.: Julia de Castro (@JuliadeCastroBR) · 2min25"
            />
          </div>
          <div className="field">
            <label htmlFor="nota_video">Tema 3 - 12. Nota da seção do vídeo (opcional)</label>
            <input
              className="input"
              defaultValue={defaultVideoNote ?? ""}
              id="nota_video"
              maxLength={1000}
              name="nota_video"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="titulo_assinar">Tema 3 - 13. Título da seção de assinatura</label>
            <input
              className="input"
              defaultValue={defaultSignTitle ?? ""}
              id="titulo_assinar"
              maxLength={200}
              name="titulo_assinar"
              placeholder="Ex.: Se você pensa como eu, assine."
            />
          </div>
          <div className="field">
            <label htmlFor="texto_assinar">Tema 3 - 14. Texto da seção de assinatura</label>
            <input
              className="input"
              defaultValue={defaultSignText ?? ""}
              id="texto_assinar"
              maxLength={2000}
              name="texto_assinar"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="texto_compartilhar">
            Tema 3 - 15. Texto dos botões de compartilhar (opcional; o link da página é adicionado ao final)
          </label>
          <input
            className="input"
            defaultValue={defaultShareText ?? ""}
            id="texto_compartilhar"
            maxLength={500}
            name="texto_compartilhar"
            placeholder="Ex.: Eu assinei este abaixo-assinado. Assine você também:"
          />
        </div>
      </div>

      <div className="campaign-theme-two-fields" hidden={theme !== 4}>
        <div className="field">
          <label htmlFor="tema4_marca">Tema 4 - 1. Marca do movimento</label>
          <input
            className="input"
            defaultValue={defaultStrip ?? ""}
            id="tema4_marca"
            maxLength={500}
            name="tema4_marca"
            placeholder="Ex.: CONTRA A CENSURA"
          />
        </div>
        <div className="field">
          <label htmlFor="tema4_titulo_principal">Tema 4 - 2. Chamada principal</label>
          <textarea
            className="textarea"
            defaultValue={defaultContext ?? ""}
            id="tema4_titulo_principal"
            maxLength={8000}
            name="tema4_titulo_principal"
            rows={3}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="tema4_video_principal">Tema 4 - 3. Vídeo principal (MP4)</label>
            <input
              className="input"
              defaultValue={defaultVideoUrl ?? ""}
              id="tema4_video_principal"
              maxLength={2048}
              name="tema4_video_principal"
              placeholder="/video-principal.mp4"
            />
          </div>
          <div className="field">
            <label htmlFor="tema4_video_legenda">Tema 4 - 4. Legenda do vídeo principal</label>
            <input
              className="input"
              defaultValue={defaultVideoCaption ?? ""}
              id="tema4_video_legenda"
              maxLength={300}
              name="tema4_video_legenda"
              placeholder="Ex.: Lucas Pavanato"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="tema4_relato_titulo">Tema 4 - 5. Título do relato</label>
          <input
            className="input"
            defaultValue={defaultTopicsTitle ?? ""}
            id="tema4_relato_titulo"
            maxLength={200}
            name="tema4_relato_titulo"
          />
        </div>
        <div className="field">
          <label htmlFor="tema4_relato_texto">
            {"Tema 4 - 6. Texto do relato (separe parágrafos com uma linha em branco; use <strong>texto</strong> para destacar)"}
          </label>
          <textarea
            className="textarea"
            defaultValue={defaultTopics ?? ""}
            id="tema4_relato_texto"
            maxLength={8000}
            name="tema4_relato_texto"
            rows={10}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="tema4_impacto">Tema 4 - 7. Frase de impacto</label>
            <input
              className="input"
              defaultValue={defaultImpact ?? ""}
              id="tema4_impacto"
              maxLength={300}
              name="tema4_impacto"
            />
          </div>
          <div className="field">
            <label htmlFor="tema4_impacto_apoio">Tema 4 - 8. Complemento da frase</label>
            <input
              className="input"
              defaultValue={defaultImpactSupport ?? ""}
              id="tema4_impacto_apoio"
              maxLength={500}
              name="tema4_impacto_apoio"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="tema4_assinar_titulo">Tema 4 - 9. Título da última chamada</label>
            <input
              className="input"
              defaultValue={defaultSignTitle ?? ""}
              id="tema4_assinar_titulo"
              maxLength={200}
              name="tema4_assinar_titulo"
            />
          </div>
          <div className="field">
            <label htmlFor="tema4_assinar_texto">Tema 4 - 10. Texto da última chamada</label>
            <textarea
              className="textarea"
              defaultValue={defaultSignText ?? ""}
              id="tema4_assinar_texto"
              maxLength={2000}
              name="tema4_assinar_texto"
              rows={3}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="tema4_compartilhar">Tema 4 - 11. Texto para compartilhamento (opcional)</label>
          <input
            className="input"
            defaultValue={defaultShareText ?? ""}
            id="tema4_compartilhar"
            maxLength={500}
            name="tema4_compartilhar"
          />
        </div>
      </div>
    </>
  );
}
