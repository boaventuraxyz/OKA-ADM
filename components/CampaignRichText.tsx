import "server-only";

import sanitizeHtml from "sanitize-html";

const allowedTags = ["b", "strong", "i", "em", "u", "br"];

function safeHtml(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedTags,
    disallowedTagsMode: "discard"
  }).replace(/\r?\n/g, "<br />");
}

export function CampaignRichText({
  className,
  text
}: {
  className: string;
  text: string;
}) {
  const paragraphs = text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map(safeHtml)
    .filter(Boolean);

  return paragraphs.map((html, index) => (
    <p
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      key={`${index}-${html.slice(0, 24)}`}
    />
  ));
}
