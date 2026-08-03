type Highlight = {
  className: string;
  phrase?: string | null;
};

function normalized(value?: string | null) {
  return value?.trim().toLocaleLowerCase("pt-BR") || "";
}

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
  primary,
  secondary,
  text
}: {
  primary?: string | null;
  secondary?: string | null;
  text: string;
}) {
  const highlights: Highlight[] = [
    { className: "campaign-headline-accent", phrase: primary },
    { className: "campaign-headline-gold", phrase: secondary }
  ].filter((item) => normalized(item.phrase));

  if (highlights.length === 0) return <>{text}</>;

  const loweredText = text.toLocaleLowerCase("pt-BR");
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matches = highlights
      .map((highlight) => ({
        ...highlight,
        index: loweredText.indexOf(normalized(highlight.phrase), cursor)
      }))
      .filter((highlight) => highlight.index >= cursor)
      .sort((left, right) => left.index - right.index)[0];

    if (!matches?.phrase) {
      parts.push(text.slice(cursor));
      break;
    }

    if (matches.index > cursor) parts.push(text.slice(cursor, matches.index));
    const end = matches.index + matches.phrase.length;
    parts.push(
      <span className={matches.className} key={`${matches.index}-${matches.className}`}>
        {text.slice(matches.index, end)}
      </span>
    );
    cursor = end;
  }

  return <>{parts}</>;
}
