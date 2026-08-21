/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV === "development";
const supabaseOrigin = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
})();
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "media-src 'self' blob: https:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy
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
      bodySizeLimit: "16mb"
    }
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      ...[
        "/login",
        "/auth/:path*",
        "/admin/:path*",
        "/campanhas/:path*",
        "/candidatos/:path*",
        "/assinaturas/:path*",
        "/temas/:path*"
      ].map(
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
