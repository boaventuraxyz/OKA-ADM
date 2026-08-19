import type { CampaignRenderData } from "@/components/CampaignPublicRenderer";
import type { CampaignThemeDefinition } from "./registry";

export const CAMPAIGN_PREVIEW_MESSAGE = "oka:campaign-theme-preview";

export type ThemePreviewContent = Partial<
  Omit<CampaignRenderData, "candidato" | "id" | "tema">
> & {
  candidateName?: string;
};

const defaultFormConfig = {
  fields: [
    { id: "name", key: "nome", label: "Nome completo", options: [], placeholder: "Digite seu nome", required: true, type: "text" },
    { id: "email", key: "email", label: "E-mail", options: [], placeholder: "voce@exemplo.com", required: true, type: "email" },
  ],
};

export function createThemePreviewCampaign({ accent, content = {}, theme }: {
  accent?: string;
  content?: ThemePreviewContent;
  theme: CampaignThemeDefinition;
}): CampaignRenderData {
  const defaults: CampaignRenderData = {
    assinaturasMeta: 5000,
    candidato: { cargo: "Representante público", estado: "SP", municipio: "São Paulo", nome: content.candidateName || "Mobilização Cidadã", partido: null },
    corDestaque: accent || theme.palette.accent,
    descricao: "Participe deste movimento e ajude a transformar apoio em ação concreta.",
    destaquePrimario: "participação",
    destaqueSecundario: "resultado",
    formConfig: defaultFormConfig,
    id: "00000000-0000-4000-8000-000000000000",
    imagemFundoVersao: null,
    imagemLateralVersao: null,
    legendaVideo: null,
    notaCitacao: "Uma mobilização construída de forma aberta e responsável.",
    notaVideo: null,
    settings: { allowSharing: true, collectAddress: false, requireConsent: true },
    tema: theme.id,
    textoAssinar: "Sua participação fortalece esta proposta e amplia seu alcance.",
    textoCitacao: "Quando muitas vozes se encontram, uma mudança possível começa a ganhar forma.",
    textoCompartilhar: "Eu apoiei esta campanha. Participe também:",
    textoConclusao: "Com apoio coletivo, a proposta pode avançar e gerar resultados duradouros.",
    textoContexto: "Esta causa reúne pessoas que querem uma resposta clara para um problema urgente.",
    textoDot: "Mobilização aberta",
    textoFaixa: "Movimento cidadão",
    textoForm: "Assine esta causa",
    textoImpacto: "Uma assinatura pode abrir um novo caminho.",
    textoImpactoApoio: "Some sua voz e ajude esta proposta a alcançar mais pessoas.",
    textoProposta: "A proposta organiza uma solução objetiva, transparente e construída com participação.",
    textoTopicos: "Uma pauta clara\nObjetivos compreensíveis e verificáveis.\n\nParticipação aberta\nEspaço para diferentes vozes contribuírem.\n\nResultado coletivo\nAcompanhamento público dos próximos passos.",
    textoTopicosIntro: "Três pontos orientam esta mobilização.",
    textoVideo: null,
    titleHighlights: null,
    titulo: "Transformar participação em resultado",
    tituloAssinar: "Assine e fortaleça esta causa.",
    tituloCitacao: "Uma causa que merece ser ouvida",
    tituloTopicos: "O que esta mobilização defende",
    tituloVideo: null,
    videoCarousel: null,
    videoUrl: null,
  };

  return {
    ...defaults,
    ...content,
    candidato: { ...defaults.candidato!, nome: content.candidateName || defaults.candidato!.nome },
    corDestaque: accent || content.corDestaque || defaults.corDestaque,
    id: defaults.id,
    tema: theme.id,
  };
}
