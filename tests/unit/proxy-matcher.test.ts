import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

function proxyMatches(url: string) {
  return unstable_doesMiddlewareMatch({ config, url });
}

describe("proxy matcher", () => {
  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fhero.jpg&w=1200&q=75",
    "/fonts/inter.woff2",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml"
  ])("ignora recurso estatico %s", (url) => {
    expect(proxyMatches(url)).toBe(false);
  });

  it.each([
    "/admin",
    "/api/assinaturas",
    "/f/campanha-publica",
    "/Scripts/cidades.js"
  ])("preserva o proxy para %s", (url) => {
    expect(proxyMatches(url)).toBe(true);
  });
});
