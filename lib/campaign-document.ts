import "server-only";

import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { FONT_STYLESHEETS } from "@/lib/fonts";

const SCRIPT_PATTERN = /<script\b[\s\S]*?<\/script>/gi;
const NOSCRIPT_PATTERN = /<noscript\b[\s\S]*?<\/noscript>/gi;
const STYLE_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const LINK_PATTERN = /<link\b[^>]*>/gi;
const DATA_IMAGE_PATTERN =
  /data:image\/(png|jpe?g|webp|gif);base64,([a-z0-9+/=\s]+)/gi;
const IMPORT_PATTERN =
  /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi;

const MIME_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function extensionForMimeSubtype(subtype: string) {
  if (subtype === "jpeg" || subtype === "jpg") return "jpg";
  return subtype;
}

function assetHash(base64: string) {
  return crypto
    .createHash("sha256")
    .update(base64.replace(/\s+/g, ""))
    .digest("hex")
    .slice(0, 24);
}

function attribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function stylesheetLinks(html: string) {
  const links = new Set<string>();

  for (const match of html.matchAll(LINK_PATTERN)) {
    const tag = match[0];
    const rel = attribute(tag, "rel").toLowerCase().split(/\s+/);
    const href = attribute(tag, "href");
    if (href && rel.includes("stylesheet") && safeStylesheetUrl(href)) {
      links.add(href);
    }
  }

  return links;
}

function safeStylesheetUrl(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname === "fonts.googleapis.com";
  } catch {
    return false;
  }
}

function rewriteDataImageAssets(content: string, campanhaId: string) {
  return content.replace(DATA_IMAGE_PATTERN, (_, subtype: string, base64: string) => {
    const extension = extensionForMimeSubtype(subtype.toLowerCase());
    const filename = `${assetHash(base64)}.${extension}`;
    return `/api/campanhas/${encodeURIComponent(campanhaId)}/assets/${filename}`;
  });
}

function extractStyles(html: string, campanhaId: string) {
  const stylesheets = stylesheetLinks(html);
  const styles: string[] = [];

  for (const match of html.matchAll(STYLE_PATTERN)) {
    const withoutImports = match[1].replace(IMPORT_PATTERN, (_, href: string) => {
      if (safeStylesheetUrl(href)) stylesheets.add(href);
      return "";
    });
    styles.push(rewriteDataImageAssets(withoutImports, campanhaId));
  }

  const css = styles.join("\n");
  const desktopImage = css.match(
    /--img-desktop\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i
  )?.[1];
  const mobileImage = css.match(
    /--img-mobile\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i
  )?.[1];

  return {
    css,
    imagePreloads: [
      ...(desktopImage ? [{ href: desktopImage, media: "(min-width: 901px)" }] : []),
      ...(mobileImage ? [{ href: mobileImage, media: "(max-width: 900px)" }] : [])
    ],
    stylesheets: [...stylesheets].filter(
      (href) => !FONT_STYLESHEETS.includes(href as (typeof FONT_STYLESHEETS)[number])
    )
  };
}

function extractBody(html: string, campanhaId: string) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const rewritten = rewriteDataImageAssets(
    body
      .replace(SCRIPT_PATTERN, "")
      .replace(NOSCRIPT_PATTERN, "")
      .replace(STYLE_PATTERN, "")
      .replace(LINK_PATTERN, "")
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
      .trim(),
    campanhaId
  );

  return sanitizeHtml(rewritten, {
    allowProtocolRelative: false,
    allowedAttributes: {
      "*": ["aria-*", "class", "data-*", "id", "role", "style", "title"],
      a: ["href", "rel", "target"],
      button: ["disabled", "type"],
      img: ["alt", "decoding", "height", "loading", "sizes", "src", "srcset", "width"],
      source: ["media", "sizes", "src", "srcset", "type"]
    },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedTags: [
      "a",
      "article",
      "aside",
      "b",
      "blockquote",
      "br",
      "button",
      "code",
      "div",
      "em",
      "footer",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hr",
      "i",
      "img",
      "li",
      "main",
      "nav",
      "ol",
      "p",
      "picture",
      "section",
      "small",
      "source",
      "span",
      "strong",
      "sub",
      "sup",
      "ul"
    ],
    enforceHtmlBoundary: true,
    transformTags: {
      a(tagName, attributes) {
        const transformed = { ...attributes };
        if (transformed.target === "_blank") {
          transformed.rel = "noopener noreferrer";
        }
        return { tagName, attribs: transformed };
      },
      button(tagName, attributes) {
        const { onclick, ...transformed } = attributes;
        if (
          onclick?.includes(".form-card") &&
          onclick.includes("scrollIntoView")
        ) {
          transformed["data-scroll-to-form"] = "true";
        }
        return { tagName, attribs: transformed };
      }
    }
  });
}

export function parseCampaignDocument(html: string, campanhaId: string) {
  const { css, imagePreloads, stylesheets } = extractStyles(html, campanhaId);

  return {
    css,
    imagePreloads,
    markup: extractBody(html, campanhaId),
    stylesheets
  };
}

export function findCampaignAsset(html: string, filename: string) {
  const requested = filename.match(/^([a-f0-9]{24})\.(gif|jpg|png|webp)$/);
  if (!requested) return null;

  for (const match of html.matchAll(DATA_IMAGE_PATTERN)) {
    const extension = extensionForMimeSubtype(match[1].toLowerCase());
    const base64 = match[2].replace(/\s+/g, "");
    if (`${assetHash(base64)}.${extension}` !== filename) continue;

    return {
      bytes: Buffer.from(base64, "base64"),
      contentType: MIME_BY_EXTENSION[extension]
    };
  }

  return null;
}
