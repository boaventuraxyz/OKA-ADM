import "server-only";

import { multiline, singleLine } from "@/lib/validation";

export type ThemeThreeClaim = { title: string; text: string };

export type ThemeThreeContent = {
  alertText: string | null;
  category: string | null;
  claims: ThemeThreeClaim[];
  defenseNote: string | null;
  defenseText: string | null;
  defenseTitle: string | null;
  eyebrowLabel: string | null;
  footerSignature: string | null;
  location: string | null;
  sectionText: string | null;
  sectionTitle: string | null;
  shareText: string | null;
  testimonialCaption: string | null;
  testimonialText: string | null;
  testimonialTitle: string | null;
  videoUrl: string | null;
};

function nullableLine(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = singleLine(value, maxLength);
  if (parsed === null) throw new Error("Campo do Tema 3 invalido.");
  return parsed;
}

function nullableText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = multiline(value, maxLength);
  if (parsed === null) throw new Error("Campo do Tema 3 invalido.");
  return parsed;
}

function parseClaims(value: FormDataEntryValue | null): ThemeThreeClaim[] {
  const raw = nullableText(value, 6000);
  if (!raw) return [];

  const claims = raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error("Cada ponto do Tema 3 deve usar Titulo | texto.");
    const title = singleLine(line.slice(0, separator), 160);
    const text = singleLine(line.slice(separator + 1), 800);
    if (!title || !text) throw new Error("Ponto do Tema 3 invalido.");
    return { title, text };
  });
  if (claims.length > 12) throw new Error("O Tema 3 aceita no maximo 12 pontos.");
  return claims;
}

function videoUrl(value: FormDataEntryValue | null) {
  const url = nullableLine(value, 2048);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error();
    }
    return parsed.toString();
  } catch {
    throw new Error("URL do video do Tema 3 invalida.");
  }
}

export function themeThreeContentFromForm(formData: FormData): ThemeThreeContent {
  return {
    alertText: nullableLine(formData.get("tema3_alerta"), 300),
    category: nullableLine(formData.get("tema3_categoria"), 120),
    claims: parseClaims(formData.get("tema3_pontos")),
    defenseNote: nullableText(formData.get("tema3_nota"), 1000),
    defenseText: nullableText(formData.get("tema3_defesa_texto"), 4000),
    defenseTitle: nullableLine(formData.get("tema3_defesa_titulo"), 200),
    eyebrowLabel: nullableLine(formData.get("tema3_selo"), 80),
    footerSignature: nullableLine(formData.get("tema3_assinatura"), 160),
    location: nullableLine(formData.get("tema3_localizacao"), 120),
    sectionText: nullableText(formData.get("tema3_secao_texto"), 8000),
    sectionTitle: nullableLine(formData.get("tema3_secao_titulo"), 200),
    shareText: nullableLine(formData.get("tema3_compartilhar"), 500),
    testimonialCaption: nullableLine(formData.get("tema3_video_legenda"), 240),
    testimonialText: nullableText(formData.get("tema3_depoimento_texto"), 4000),
    testimonialTitle: nullableLine(formData.get("tema3_depoimento_titulo"), 200),
    videoUrl: videoUrl(formData.get("tema3_video_url"))
  };
}

export function parseThemeThreeContent(value: unknown): ThemeThreeContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = value as Partial<ThemeThreeContent>;
  const claims = Array.isArray(content.claims)
    ? content.claims
        .filter((claim): claim is ThemeThreeClaim => Boolean(
          claim && typeof claim === "object" && typeof claim.title === "string" && typeof claim.text === "string"
        ))
        .slice(0, 12)
    : [];
  const read = (key: keyof Omit<ThemeThreeContent, "claims">) =>
    typeof content[key] === "string" ? content[key] : null;
  return {
    alertText: read("alertText"), category: read("category"), claims,
    defenseNote: read("defenseNote"), defenseText: read("defenseText"),
    defenseTitle: read("defenseTitle"), eyebrowLabel: read("eyebrowLabel"),
    footerSignature: read("footerSignature"), location: read("location"),
    sectionText: read("sectionText"), sectionTitle: read("sectionTitle"),
    shareText: read("shareText"), testimonialCaption: read("testimonialCaption"),
    testimonialText: read("testimonialText"), testimonialTitle: read("testimonialTitle"),
    videoUrl: read("videoUrl")
  };
}
