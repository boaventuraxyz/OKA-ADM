export type LegacyThemeId = 1 | 2 | 3 | 4;

export type ThemeStatus = "active" | "beta" | "deprecated";

export type ThemeCategory =
  | "conversão"
  | "editorial"
  | "manifesto"
  | "mobilização";

export type ThemePalette = {
  accent: string;
  background: string;
  secondary: string;
  surface: string;
  text: string;
};

export type ThemePaletteOption = {
  description: string;
  key: string;
  name: string;
  palette: ThemePalette;
};

export type ThemeCapabilities = {
  backgroundImage: boolean;
  longform: boolean;
  sharing: boolean;
  sideImage: boolean;
  signatureModal: boolean;
  video: boolean;
};

export type CampaignThemeContentKey =
  | "descricao"
  | "destaque_primario"
  | "destaque_secundario"
  | "imagem_fundo"
  | "imagem_lateral"
  | "legenda_video"
  | "nota_citacao"
  | "nota_video"
  | "texto_assinar"
  | "texto_citacao"
  | "texto_compartilhar"
  | "texto_conclusao"
  | "texto_contexto"
  | "texto_faixa"
  | "texto_impacto"
  | "texto_impacto_apoio"
  | "texto_proposta"
  | "texto_topicos"
  | "texto_topicos_intro"
  | "texto_video"
  | "titulo_assinar"
  | "titulo_citacao"
  | "titulo_topicos"
  | "titulo_video"
  | "video_url";

export type CampaignThemeField = {
  help?: string;
  key: CampaignThemeContentKey;
  label: string;
  maxLength: number;
  placeholder?: string;
  required?: boolean;
  type: "image" | "text" | "textarea" | "url";
};

export type CampaignThemeSection = {
  description: string;
  fields: readonly CampaignThemeField[];
  id: string;
  title: string;
};

export type CampaignThemeDefinition = {
  capabilities: ThemeCapabilities;
  category: ThemeCategory;
  description: string;
  id: LegacyThemeId;
  key: string;
  name: string;
  palette: ThemePalette;
  paletteOptions: readonly ThemePaletteOption[];
  sections: readonly CampaignThemeSection[];
  status: ThemeStatus;
  tags: readonly string[];
};

export const THEME_REGISTRY = [
  {
    id: 1,
    key: "cover",
    name: "Capa",
    description: "Capa direta com imagem de fundo e formulário em destaque.",
    category: "conversão",
    tags: ["hero", "imagem", "formulário", "direto"],
    status: "active",
    palette: {
      background: "#0d111a",
      surface: "#172136",
      text: "#eef0f5",
      accent: "#e05a5a",
      secondary: "#e8c84a"
    },
    paletteOptions: [
      { key: "civic-night", name: "Cívica", description: "Azul profundo com vermelho de ação.", palette: { background: "#0d111a", surface: "#172136", text: "#eef0f5", accent: "#e05a5a", secondary: "#e8c84a" } },
      { key: "forest", name: "Floresta", description: "Verde sóbrio para causas locais e comunitárias.", palette: { background: "#0b1713", surface: "#153027", text: "#f3f7f4", accent: "#43b581", secondary: "#e2bd55" } },
      { key: "daylight", name: "Clara", description: "Base luminosa com contraste institucional.", palette: { background: "#f5f2ea", surface: "#ffffff", text: "#17223a", accent: "#c43d42", secondary: "#b88722" } }
    ],
    capabilities: {
      backgroundImage: true,
      sideImage: false,
      video: false,
      longform: false,
      signatureModal: false,
      sharing: false
    },
    sections: [
      {
        id: "message",
        title: "Mensagem principal",
        description: "O tema de capa usa uma mensagem curta e direta.",
        fields: [
          { key: "destaque_primario", label: "Trecho principal legado", maxLength: 160, type: "text", placeholder: "A frase de maior impacto" },
          { key: "destaque_secundario", label: "Complemento do slogan", maxLength: 160, type: "text", placeholder: "Uma segunda linha curta" },
          { key: "descricao", label: "Descrição", maxLength: 5000, type: "textarea", placeholder: "Explique a causa em poucas linhas." }
        ]
      },
      {
        id: "visual",
        title: "Imagem da capa",
        description: "A imagem é otimizada antes do salvamento.",
        fields: [
          { key: "imagem_fundo", label: "Imagem de fundo", maxLength: 1230000, type: "image" }
        ]
      }
    ]
  },
  {
    id: 2,
    key: "editorial",
    name: "Editorial",
    description: "Leitura editorial com imagem lateral, contexto e proposta.",
    category: "editorial",
    tags: ["narrativa", "proposta", "imagem lateral", "conteúdo"],
    status: "active",
    palette: {
      background: "#0b0e13",
      surface: "#151a22",
      text: "#f3f1ec",
      accent: "#d95c61",
      secondary: "#e8c84a"
    },
    paletteOptions: [
      { key: "newsroom", name: "Redação", description: "Preto editorial com vermelho contido.", palette: { background: "#0b0e13", surface: "#151a22", text: "#f3f1ec", accent: "#d95c61", secondary: "#e8c84a" } },
      { key: "paper", name: "Papel", description: "Visual de revista, claro e confortável para leitura.", palette: { background: "#eee9df", surface: "#fffdf8", text: "#25211d", accent: "#9f2f35", secondary: "#9b762a" } },
      { key: "navy", name: "Institucional", description: "Azul e cobre para propostas públicas.", palette: { background: "#0b1829", surface: "#142943", text: "#f2f5f8", accent: "#d77a45", secondary: "#dbc07c" } }
    ],
    capabilities: {
      backgroundImage: false,
      sideImage: true,
      video: false,
      longform: true,
      signatureModal: false,
      sharing: false
    },
    sections: [
      {
        id: "opening",
        title: "Abertura editorial",
        description: "Título, resumo e imagem que apresentam a campanha.",
        fields: [
          { key: "destaque_primario", label: "Destaque principal", maxLength: 160, type: "text" },
          { key: "destaque_secundario", label: "Destaque secundário", maxLength: 160, type: "text" },
          { key: "descricao", label: "Resumo", maxLength: 5000, type: "textarea" },
          { key: "imagem_lateral", label: "Imagem lateral", maxLength: 1230000, type: "image" }
        ]
      },
      {
        id: "narrative",
        title: "Narrativa",
        description: "Organize o caso, a proposta e o fechamento em blocos curtos.",
        fields: [
          { key: "texto_contexto", label: "Contexto", maxLength: 8000, type: "textarea", help: "O que está acontecendo?" },
          { key: "texto_proposta", label: "Proposta", maxLength: 4000, type: "textarea", help: "Qual mudança está sendo defendida?" },
          { key: "texto_conclusao", label: "Conclusão", maxLength: 4000, type: "textarea" }
        ]
      },
      {
        id: "impact",
        title: "Chamada intermediária",
        description: "Um reforço visual antes do formulário.",
        fields: [
          { key: "texto_impacto", label: "Frase de impacto", maxLength: 300, type: "text" },
          { key: "texto_impacto_apoio", label: "Texto de apoio", maxLength: 500, type: "text" }
        ]
      }
    ]
  },
  {
    id: 3,
    key: "manifesto",
    name: "Manifesto",
    description: "Manifesto com tópicos, citação, vídeo e compartilhamento.",
    category: "manifesto",
    tags: ["tópicos", "citação", "vídeo", "compartilhamento"],
    status: "active",
    palette: {
      background: "#07111d",
      surface: "#102033",
      text: "#f4f2ec",
      accent: "#e2382b",
      secondary: "#f0ba36"
    },
    paletteOptions: [
      { key: "manifesto", name: "Manifesto", description: "Azul noturno, vermelho e amarelo de mobilização.", palette: { background: "#07111d", surface: "#102033", text: "#f4f2ec", accent: "#e2382b", secondary: "#f0ba36" } },
      { key: "liberty", name: "Liberdade", description: "Azul cobalto com amarelo vibrante.", palette: { background: "#071b35", surface: "#0d315b", text: "#f5f8fb", accent: "#f2b632", secondary: "#55a6dc" } },
      { key: "burgundy", name: "Bordô", description: "Tom clássico para manifestos densos.", palette: { background: "#210c13", surface: "#3c1722", text: "#fff6ee", accent: "#dc5b50", secondary: "#e3b45d" } }
    ],
    capabilities: {
      backgroundImage: false,
      sideImage: false,
      video: true,
      longform: true,
      signatureModal: false,
      sharing: true
    },
    sections: [
      {
        id: "opening",
        title: "Abertura do manifesto",
        description: "Mensagem de entrada e faixa opcional.",
        fields: [
          { key: "destaque_primario", label: "Destaque principal", maxLength: 160, type: "text" },
          { key: "destaque_secundario", label: "Destaque secundário", maxLength: 160, type: "text" },
          { key: "descricao", label: "Descrição", maxLength: 5000, type: "textarea" },
          { key: "texto_faixa", label: "Faixa animada", maxLength: 500, type: "text" }
        ]
      },
      {
        id: "topics",
        title: "Tópicos",
        description: "Apresente os argumentos centrais em uma sequência fácil de ler.",
        fields: [
          { key: "titulo_topicos", label: "Título da seção", maxLength: 200, type: "text" },
          { key: "texto_topicos_intro", label: "Introdução", maxLength: 2000, type: "textarea" },
          { key: "texto_topicos", label: "Tópicos", maxLength: 8000, type: "textarea", help: "Separe cada tópico com uma linha em branco." }
        ]
      },
      {
        id: "quote",
        title: "Citação",
        description: "Bloco de destaque para uma posição ou declaração.",
        fields: [
          { key: "titulo_citacao", label: "Título da citação", maxLength: 200, type: "text" },
          { key: "texto_citacao", label: "Citação", maxLength: 2000, type: "textarea" },
          { key: "nota_citacao", label: "Nota da citação", maxLength: 1000, type: "textarea" }
        ]
      },
      {
        id: "video",
        title: "Vídeo",
        description: "A seção só aparece quando uma URL de vídeo é informada.",
        fields: [
          { key: "titulo_video", label: "Título do vídeo", maxLength: 200, type: "text" },
          { key: "video_url", label: "URL do vídeo", maxLength: 2048, type: "url", help: "Use HTTPS ou um caminho interno iniciado por /." },
          { key: "texto_video", label: "Texto de apoio", maxLength: 4000, type: "textarea" },
          { key: "legenda_video", label: "Legenda", maxLength: 300, type: "text" },
          { key: "nota_video", label: "Nota do vídeo", maxLength: 1000, type: "textarea" }
        ]
      },
      {
        id: "closing",
        title: "Assinatura e compartilhamento",
        description: "Feche o manifesto com uma ação clara.",
        fields: [
          { key: "titulo_assinar", label: "Título da assinatura", maxLength: 200, type: "text" },
          { key: "texto_assinar", label: "Texto da assinatura", maxLength: 2000, type: "textarea" },
          { key: "texto_compartilhar", label: "Chamada para compartilhar", maxLength: 500, type: "text" }
        ]
      }
    ]
  },
  {
    id: 4,
    key: "impact-dark",
    name: "Impacto escuro",
    description: "Mobilização de alto contraste com narrativa longa, carrossel de vídeos e chamada final.",
    category: "mobilização",
    tags: ["escuro", "mobilização", "vídeo", "alto contraste"],
    status: "active",
    palette: {
      background: "#0b0b0c",
      surface: "#1b1b1e",
      text: "#f3efe7",
      accent: "#d81f26",
      secondary: "#8f8d8a"
    },
    paletteOptions: [
      { key: "charcoal", name: "Carvão", description: "Alto contraste para mobilizações urgentes.", palette: { background: "#0b0b0c", surface: "#1b1b1e", text: "#f3efe7", accent: "#d81f26", secondary: "#8f8d8a" } },
      { key: "midnight", name: "Meia-noite", description: "Azul escuro com acento elétrico.", palette: { background: "#060b16", surface: "#111c30", text: "#eef4ff", accent: "#4a8fff", secondary: "#9aa9c2" } },
      { key: "ember", name: "Brasa", description: "Preto quente com laranja para ação imediata.", palette: { background: "#110d0a", surface: "#271a13", text: "#fff4ea", accent: "#ef652f", secondary: "#b9a395" } }
    ],
    capabilities: {
      backgroundImage: false,
      sideImage: false,
      video: true,
      longform: true,
      signatureModal: true,
      sharing: true
    },
    sections: [
      {
        id: "hero",
        title: "Abertura de impacto",
        description: "Marca, chamada principal e resumo da mobilização.",
        fields: [
          { key: "texto_faixa", label: "Marca do movimento", maxLength: 500, type: "text" },
          { key: "texto_contexto", label: "Chamada principal", maxLength: 8000, type: "textarea" },
          { key: "descricao", label: "Resumo", maxLength: 5000, type: "textarea" }
        ]
      },
      {
        id: "video",
        title: "Carrossel de vídeos",
        description: "Apresente diferentes relatos e organize a ordem de exibição.",
        fields: [
          { key: "video_url", label: "URL legada do vídeo", maxLength: 2048, type: "url" },
          { key: "legenda_video", label: "Legenda legada do vídeo", maxLength: 300, type: "text" }
        ]
      },
      {
        id: "story",
        title: "Relato",
        description: "Conte a história em blocos curtos e objetivos.",
        fields: [
          { key: "titulo_topicos", label: "Título do relato", maxLength: 200, type: "text" },
          { key: "texto_topicos", label: "Texto do relato", maxLength: 8000, type: "textarea", help: "Separe os parágrafos com uma linha em branco." }
        ]
      },
      {
        id: "impact",
        title: "Reforço da causa",
        description: "Duas chamadas curtas antes da assinatura.",
        fields: [
          { key: "texto_impacto", label: "Frase de impacto", maxLength: 300, type: "text" },
          { key: "texto_impacto_apoio", label: "Complemento", maxLength: 500, type: "text" }
        ]
      },
      {
        id: "closing",
        title: "Chamada final",
        description: "Convide a pessoa a assinar e compartilhar.",
        fields: [
          { key: "titulo_assinar", label: "Título da chamada", maxLength: 200, type: "text" },
          { key: "texto_assinar", label: "Texto da chamada", maxLength: 2000, type: "textarea" },
          { key: "texto_compartilhar", label: "Texto para compartilhar", maxLength: 500, type: "text" }
        ]
      }
    ]
  }
] as const satisfies readonly CampaignThemeDefinition[];

export function getThemeById(id: number) {
  return THEME_REGISTRY.find((theme) => theme.id === id);
}

export function getThemeByKey(key: string) {
  return THEME_REGISTRY.find((theme) => theme.key === key);
}

export function isLegacyThemeId(value: unknown): value is LegacyThemeId {
  return typeof value === "number" && THEME_REGISTRY.some((theme) => theme.id === value);
}

export function themeContentKeys(themeKey: string) {
  const theme: CampaignThemeDefinition = getThemeByKey(themeKey) ?? THEME_REGISTRY[0];
  return new Set(themeContentFields(theme).map((field) => field.key));
}

export function themeContentFields(theme: CampaignThemeDefinition) {
  return theme.sections.flatMap((section) => section.fields);
}
