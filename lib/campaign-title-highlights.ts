export type CampaignTitleHighlight = {
  color: string;
  index: number;
};

export type CampaignTitleToken = {
  end: number;
  start: number;
  text: string;
  wordIndex: number | null;
};

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAX_TITLE_WORDS = 80;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeTitleHighlightColor(value: unknown) {
  return typeof value === "string" && COLOR_PATTERN.test(value)
    ? value.toUpperCase()
    : null;
}

export function campaignTitleTokens(title: string): CampaignTitleToken[] {
  let offset = 0;
  let wordIndex = 0;

  return title.split(/(\s+)/).filter(Boolean).map((text) => {
    const start = offset;
    const end = start + text.length;
    offset = end;
    const isWhitespace = /^\s+$/.test(text);

    return {
      end,
      start,
      text,
      wordIndex: isWhitespace ? null : wordIndex++
    };
  });
}

export function parseCampaignTitleHighlights(
  settings: unknown
): CampaignTitleHighlight[] | null {
  const settingsRecord = record(settings);
  if (!settingsRecord || !("title_highlights" in settingsRecord)) return null;
  if (!Array.isArray(settingsRecord.title_highlights)) return [];

  const highlights = new Map<number, CampaignTitleHighlight>();
  for (const value of settingsRecord.title_highlights) {
    const highlight = record(value);
    const index = highlight?.index;
    const color = normalizeTitleHighlightColor(highlight?.color);
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= MAX_TITLE_WORDS ||
      !color
    ) {
      continue;
    }
    highlights.set(index, { color, index });
  }

  return [...highlights.values()].sort((left, right) => left.index - right.index);
}

export function legacyCampaignTitleHighlights({
  primary,
  primaryColor = "#E05A5A",
  secondary,
  secondaryColor = "#E8C84A",
  title
}: {
  primary?: string | null;
  primaryColor?: string | null;
  secondary?: string | null;
  secondaryColor?: string | null;
  title: string;
}): CampaignTitleHighlight[] {
  const tokens = campaignTitleTokens(title);
  const loweredTitle = title.toLocaleLowerCase("pt-BR");
  const highlights = new Map<number, CampaignTitleHighlight>();

  for (const [phrase, requestedColor] of [
    [primary, primaryColor],
    [secondary, secondaryColor]
  ] as const) {
    const normalizedPhrase = phrase?.trim().toLocaleLowerCase("pt-BR");
    const color = normalizeTitleHighlightColor(requestedColor);
    if (!normalizedPhrase || !color) continue;
    const start = loweredTitle.indexOf(normalizedPhrase);
    if (start < 0) continue;
    const end = start + normalizedPhrase.length;

    for (const token of tokens) {
      if (
        token.wordIndex !== null &&
        token.end > start &&
        token.start < end &&
        !highlights.has(token.wordIndex)
      ) {
        highlights.set(token.wordIndex, { color, index: token.wordIndex });
      }
    }
  }

  return [...highlights.values()].sort((left, right) => left.index - right.index);
}
