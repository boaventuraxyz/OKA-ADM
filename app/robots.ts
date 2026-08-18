import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/p/", "/formulario/", "/formularios"],
      disallow: ["/admin/", "/api/", "/auth/", "/login"],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
