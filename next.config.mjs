/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; frame-ancestors 'self'; form-action 'self'; object-src 'none'"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off"
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN"
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none"
  }
];

const privatePageHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store"
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive"
  }
];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb"
    }
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      ...["/login", "/campanhas/:path*", "/candidatos/:path*", "/assinaturas/:path*"].map(
        (source) => ({
          source,
          headers: privatePageHeaders
        })
      ),
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
