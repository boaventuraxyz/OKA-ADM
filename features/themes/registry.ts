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

export type ThemeCapabilities = {
  backgroundImage: boolean;
  longform: boolean;
  sharing: boolean;
  sideImage: boolean;
  signatureModal: boolean;
  video: boolean;
};

export type CampaignThemeDefinition = {
  capabilities: ThemeCapabilities;
  category: ThemeCategory;
  description: string;
  id: LegacyThemeId;
  key: string;
  name: string;
  palette: ThemePalette;
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
    capabilities: {
      backgroundImage: true,
      sideImage: false,
      video: false,
      longform: false,
      signatureModal: false,
      sharing: false
    }
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
    capabilities: {
      backgroundImage: false,
      sideImage: true,
      video: false,
      longform: true,
      signatureModal: false,
      sharing: false
    }
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
    capabilities: {
      backgroundImage: false,
      sideImage: false,
      video: true,
      longform: true,
      signatureModal: false,
      sharing: true
    }
  },
  {
    id: 4,
    key: "impact-dark",
    name: "Impacto escuro",
    description: "Mobilização de alto contraste com narrativa longa, vídeo e chamada final.",
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
    capabilities: {
      backgroundImage: false,
      sideImage: false,
      video: true,
      longform: true,
      signatureModal: true,
      sharing: true
    }
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
