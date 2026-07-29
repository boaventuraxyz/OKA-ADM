import "server-only";

import crypto from "node:crypto";
import { FONT_STYLESHEETS } from "@/lib/fonts";

const SCRIPT_PATTERN = /<script\b[\s\S]*?<\/script>/gi;
const STYLE_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const LINK_PATTERN = /<link\b[^>]*>/gi;
const DATA_IMAGE_PATTERN =
  /data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([a-z0-9+/=\s]+)/gi;
const IMPORT_PATTERN =
  /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi;

const MIME_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp"
};

function extensionForMimeSubtype(subtype: string) {
  if (subtype === "jpeg" || subtype === "jpg") return "jpg";
  if (subtype === "svg+xml") return "svg";
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
    if (href && rel.includes("stylesheet")) links.add(href);
  }

  return links;
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
      stylesheets.add(href);
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

  return rewriteDataImageAssets(
    body
      .replace(SCRIPT_PATTERN, "")
      .replace(STYLE_PATTERN, "")
      .replace(LINK_PATTERN, "")
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "")
      .trim(),
    campanhaId
  );
}

export function parseCampaignDocument(html: string, campanhaId: string) {
  const scripts = (html.match(SCRIPT_PATTERN) ?? []).map((script) =>
    rewriteDataImageAssets(script, campanhaId)
  );
  const { css, imagePreloads, stylesheets } = extractStyles(html, campanhaId);

  return {
    css,
    imagePreloads,
    markup: extractBody(html, campanhaId),
    scripts,
    stylesheets
  };
}

export function findCampaignAsset(html: string, filename: string) {
  const requested = filename.match(/^([a-f0-9]{24})\.(gif|jpg|png|svg|webp)$/);
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
