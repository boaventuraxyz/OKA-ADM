import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8"
};

const CONTENT_ROOT = path.join(process.cwd(), "Content");
const SCRIPTS_ROOT = path.join(process.cwd(), "Scripts");
const GRUPO_WPP_ROOT = path.join(process.cwd(), "Views", "GrupoWpp");

function safePath(resolvedRoot: string, segments: string[]) {
  const resolvedPath = path.resolve(resolvedRoot, ...segments);

  if (!resolvedPath.startsWith(resolvedRoot)) {
    throw new Error("Caminho invalido.");
  }

  return resolvedPath;
}

async function serveFileFromRoot(root: string, segments: string[]) {
  const filePath = safePath(root, segments);
  const data = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  return new Response(data, {
    headers: {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}

export function serveContentFile(segments: string[]) {
  return serveFileFromRoot(CONTENT_ROOT, segments);
}

export function serveScriptFile(segments: string[]) {
  return serveFileFromRoot(SCRIPTS_ROOT, segments);
}

export async function readGrupoWppView(fileName: "Index.cshtml" | "Tias.cshtml") {
  const filePath = safePath(GRUPO_WPP_ROOT, [fileName]);
  const raw = await fs.readFile(filePath, "utf8");

  return raw
    .replace(/^\uFEFF?@\{[\s\S]*?\}\s*/m, "")
    .replace(/@@/g, "@")
    .replace(/~\/Scripts\/cidades\.js\?dc=@this\.Request\.QueryString\["_dc"\]/g, "/Scripts/cidades.js")
    .replace(/~\//g, "/");
}
