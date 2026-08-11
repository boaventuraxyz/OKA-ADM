import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { updateCampanhaAction } from "@/app/actions";
import { CampaignSaveAlert } from "@/components/CampaignSaveAlert";
import { CampaignThemeFields } from "@/components/CampaignThemeFields";
import { parseCampaignBackground } from "@/lib/campaign-background";
import { toDateTimeLocal } from "@/lib/format";
import { getCampanha, listCandidatosForSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditarCampanhaPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const [campanha, candidatos] = await Promise.all([
    getCampanha(id),
    listCandidatosForSelect()
  ]);

  if (!campanha) notFound();
  const templateColumnsReady = [
    "texto_form",
    "texto_dot",
    "destaque_primario",
    "destaque_secundario",
    "cor_destaque",
    "imagem_fundo",
    "imagem_lateral",
    "tema",
    "texto_contexto",
    "texto_proposta",
    "texto_conclusao",
    "texto_impacto",
    "texto_impacto_apoio",
    "url_formulario",
    "texto_faixa",
    "titulo_topicos",
    "texto_topicos_intro",
    "texto_topicos",
    "titulo_citacao",
    "texto_citacao",
    "nota_citacao",
    "titulo_video",
    "video_url",
    "texto_video",
    "legenda_video",
    "nota_video",
    "titulo_assinar",
    "texto_assinar",
    "texto_compartilhar"
  ].every((column) => Object.prototype.hasOwnProperty.call(campanha, column));
  const backgroundValue = parseCampaignBackground(campanha.imagem_fundo)
    ? campanha.imagem_fundo
    : null;
  const sideImageValue = parseCampaignBackground(campanha.imagem_lateral)
    ? campanha.imagem_lateral
    : null;

  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1>Editar campanha</h1>
          <p className="page-toolbar-subtitle">{campanha.titulo}</p>
        </div>
        <Link className="button" href="/campanhas">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <form action={updateCampanhaAction} className="panel panel-padding form-grid">
        <CampaignSaveAlert error={erro || (!templateColumnsReady ? "estrutura" : undefined)} />
        <input name="id" type="hidden" value={campanha.id} />
        <div className="field">
          <label htmlFor="titulo">Título principal (texto grande no topo da página)</label>
          <input
            className="input"
            defaultValue={campanha.titulo ?? ""}
            id="titulo"
            maxLength={200}
            name="titulo"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="descricao">Resumo principal (texto logo abaixo do título)</label>
          <textarea
            className="textarea"
            defaultValue={campanha.descricao ?? ""}
            id="descricao"
            maxLength={5000}
            name="descricao"
            rows={4}
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="destaque_primario">
              Trecho do título na cor escolhida (todos os temas)
            </label>
            <input
              className="input"
              defaultValue={campanha.destaque_primario ?? ""}
              id="destaque_primario"
              maxLength={160}
              name="destaque_primario"
            />
          </div>
          <div className="field">
            <label htmlFor="destaque_secundario">
              Outro trecho do título em amarelo (no Tema 3 vira marca-texto amarelo)
            </label>
            <input
              className="input"
              defaultValue={campanha.destaque_secundario ?? ""}
              id="destaque_secundario"
              maxLength={160}
              name="destaque_secundario"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="candidato_id">Candidato ou responsável exibido no topo</label>
            <select
              className="select"
              defaultValue={campanha.candidato_id ?? ""}
              id="candidato_id"
              name="candidato_id"
            >
              <option value="">Selecione</option>
              {candidatos.map((candidato) => (
                <option key={candidato.id} value={candidato.id}>
                  {candidato.nome} {candidato.partido ? `(${candidato.partido})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assinaturas_meta">Meta de assinaturas (contador exibido no Tema 1)</label>
            <input
              className="input"
              defaultValue={campanha.assinaturas_meta ?? ""}
              id="assinaturas_meta"
              min="0"
              name="assinaturas_meta"
              type="number"
            />
          </div>
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="texto_form">
              Tema 1: título do formulário / Tema 2: texto abaixo de &quot;Assine o abaixo-assinado&quot;
            </label>
            <input
              className="input"
              defaultValue={campanha.texto_form ?? ""}
              id="texto_form"
              maxLength={200}
              name="texto_form"
            />
          </div>
          <div className="field">
            <label htmlFor="texto_dot">Selo acima do título / texto pulsante do Tema 1</label>
            <input
              className="input"
              defaultValue={campanha.texto_dot ?? "Assine agora"}
              id="texto_dot"
              maxLength={80}
              name="texto_dot"
            />
          </div>
        </div>
        <div className="field campaign-color-field">
          <label htmlFor="cor_destaque">
            Cor dos botões, bordas e palavras destacadas
          </label>
          <input
            className="campaign-color-input"
            defaultValue={campanha.cor_destaque ?? "#E05A5A"}
            id="cor_destaque"
            name="cor_destaque"
            type="color"
          />
        </div>
        <CampaignThemeFields
          defaultBackground={backgroundValue}
          defaultConclusion={campanha.texto_conclusao}
          defaultContext={campanha.texto_contexto}
          defaultImpact={campanha.texto_impacto}
          defaultImpactSupport={campanha.texto_impacto_apoio}
          defaultProposal={campanha.texto_proposta}
          defaultSideImage={sideImageValue}
          defaultTheme={campanha.tema}
          defaultStrip={campanha.texto_faixa}
          defaultTopicsTitle={campanha.titulo_topicos}
          defaultTopicsIntro={campanha.texto_topicos_intro}
          defaultTopics={campanha.texto_topicos}
          defaultQuoteTitle={campanha.titulo_citacao}
          defaultQuote={campanha.texto_citacao}
          defaultQuoteNote={campanha.nota_citacao}
          defaultVideoTitle={campanha.titulo_video}
          defaultVideoUrl={campanha.video_url}
          defaultVideoText={campanha.texto_video}
          defaultVideoCaption={campanha.legenda_video}
          defaultVideoNote={campanha.nota_video}
          defaultSignTitle={campanha.titulo_assinar}
          defaultSignText={campanha.texto_assinar}
          defaultShareText={campanha.texto_compartilhar}
        />
        <div className="field">
          <label htmlFor="url_formulario">Link do WhatsApp após a assinatura (opcional)</label>
          <input
            autoComplete="url"
            className="input"
            defaultValue={campanha.url_formulario ?? ""}
            id="url_formulario"
            maxLength={2048}
            name="url_formulario"
            placeholder="https://wa.me/5511999999999"
            type="url"
          />
        </div>
        <div className="two-cols">
          <div className="field">
            <label htmlFor="inicio_em">Início</label>
            <input
              className="input"
              defaultValue={toDateTimeLocal(campanha.inicio_em)}
              id="inicio_em"
              name="inicio_em"
              type="datetime-local"
            />
          </div>
          <div className="field">
            <label htmlFor="fim_em">Fim</label>
            <input
              className="input"
              defaultValue={toDateTimeLocal(campanha.fim_em)}
              id="fim_em"
              name="fim_em"
              type="datetime-local"
            />
          </div>
        </div>
        <label className="checkbox-row">
          <input defaultChecked={campanha.ativa ?? false} name="ativa" type="checkbox" />
          Campanha ativa
        </label>
        <div className="page-actions">
          <button className="button primary" disabled={!templateColumnsReady} type="submit">
            <Save size={16} />
            Salvar
          </button>
          <Link className="button" href="/campanhas">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
