import {
  campaignTitleTokens,
  normalizeTitleHighlightColor,
  type CampaignTitleHighlight
} from "@/lib/campaign-title-highlights";

export function splitCandidateName(value?: string | null) {
  const words = value?.trim().split(/\s+/).filter(Boolean) || [];
  if (words.length === 0) return ["Campanha", "Cidadã"] as const;
  if (words.length === 1) return ["", words[0]] as const;

  const connectors = new Set(["da", "das", "de", "do", "dos", "e"]);
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const boundaryPenalty = connectors.has(words[index].toLocaleLowerCase("pt-BR"))
      ? 8
      : connectors.has(words[index - 1].toLocaleLowerCase("pt-BR"))
        ? 12
        : 0;
    const score = Math.abs(left.length - right.length) + boundaryPenalty;
    if (score < bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return [
    words.slice(0, bestIndex).join(" "),
    words.slice(bestIndex).join(" ")
  ] as const;
}

export function CampaignHeadline({
  highlights,
  text
}: {
  highlights?: readonly CampaignTitleHighlight[] | null;
  text: string;
}) {
  const colors = new Map(
    (highlights ?? []).flatMap((highlight) => {
      const color = normalizeTitleHighlightColor(highlight.color);
      return color ? [[highlight.index, color] as const] : [];
    })
  );

  return campaignTitleTokens(text).map((token) => {
    const color = token.wordIndex === null ? null : colors.get(token.wordIndex);
    return (
      <span
        className={color ? "campaign-headline-custom" : undefined}
        key={`${token.start}-${token.end}`}
        style={color ? { color } : undefined}
      >
        {token.text}
      </span>
    );
  });
}
