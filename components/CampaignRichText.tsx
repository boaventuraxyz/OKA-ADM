import { createElement, Fragment, type ReactNode } from "react";

const inlineTags = new Set(["b", "strong", "i", "em", "u"]);
const blockedTags = new Set(["iframe", "noscript", "object", "script", "style", "template"]);

type RichTextTag = "b" | "br" | "em" | "i" | "strong" | "u";
type RichTextNode = string | { children: RichTextNode[]; tag: RichTextTag };
type RichTextContainer = { children: RichTextNode[]; tag: string | null };

function decodeEntity(entity: string) {
  const normalized = entity.toLowerCase();
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };

  if (normalized in named) return named[normalized];

  const hexadecimal = normalized.startsWith("#x");
  const numeric = hexadecimal
    ? normalized.slice(2)
    : normalized.startsWith("#")
      ? normalized.slice(1)
      : "";
  if (!numeric) return `&${entity};`;

  const codePoint = Number.parseInt(numeric, hexadecimal ? 16 : 10);
  return Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : "�";
}

function decodeEntities(value: string) {
  return value.replace(/&([a-z]+|#\d+|#x[\da-f]+);/gi, (_, entity: string) => decodeEntity(entity));
}

function parseInlineContent(value: string): RichTextNode[] {
  const root: RichTextContainer = { children: [], tag: null };
  const stack: RichTextContainer[] = [root];
  const tokens = value.replace(/\r?\n/g, "<br>").match(/<[^>]*>|[^<]+|</g) ?? [];
  let blockedTag: string | null = null;
  let blockedDepth = 0;

  for (const token of tokens) {
    if (!token.startsWith("<") || token === "<") {
      if (!blockedTag) stack.at(-1)!.children.push(decodeEntities(token));
      continue;
    }

    const closing = /^<\s*\/\s*([a-z0-9-]+)[^>]*>$/i.exec(token);
    const opening = /^<\s*([a-z0-9-]+)(?:\s[^>]*)?\s*\/?>$/i.exec(token);
    const tag = (closing?.[1] || opening?.[1] || "").toLowerCase();
    const selfClosing = token.trimEnd().endsWith("/>");

    if (blockedTag) {
      if (opening && tag === blockedTag && !selfClosing) blockedDepth += 1;
      if (closing && tag === blockedTag) {
        blockedDepth -= 1;
        if (blockedDepth === 0) blockedTag = null;
      }
      continue;
    }

    if (opening && blockedTags.has(tag) && !selfClosing) {
      blockedTag = tag;
      blockedDepth = 1;
      continue;
    }

    if (opening && tag === "br") {
      stack.at(-1)!.children.push({ children: [], tag: "br" });
      continue;
    }

    if (opening && inlineTags.has(tag) && !selfClosing) {
      const node = { children: [], tag: tag as RichTextTag };
      stack.at(-1)!.children.push(node);
      stack.push(node);
      continue;
    }

    if (closing && inlineTags.has(tag)) {
      const matchingIndex = stack.findLastIndex((container) => container.tag === tag);
      if (matchingIndex > 0) stack.splice(matchingIndex);
    }
  }

  return root.children;
}

function renderNodes(nodes: RichTextNode[], path = "root"): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${path}-${index}`;
    if (typeof node === "string") return createElement(Fragment, { key }, node);
    if (node.tag === "br") return createElement("br", { key });
    return createElement(node.tag, { key }, renderNodes(node.children, key));
  });
}

export function CampaignRichText({ className, text }: { className: string; text: string }) {
  return text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p className={className} key={`${index}-${paragraph.slice(0, 24)}`}>
        {renderNodes(parseInlineContent(paragraph), `paragraph-${index}`)}
      </p>
    ));
}
