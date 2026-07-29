/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/grupo-wpp": ["./Views/GrupoWpp/**/*", "./Scripts/cidades.js"],
    "/grupo-wpp/tias": ["./Views/GrupoWpp/**/*"],
    "/Content/[...path]": ["./Content/**/*"],
    "/Scripts/[...path]": ["./Scripts/**/*"]
  }
};

export default nextConfig;
