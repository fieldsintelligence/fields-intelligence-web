import type { NextConfig } from "next";

/**
 * Source inventory for the enforced CSP (no third-party origins):
 * - script-src: same-origin `/_next/static` chunks, Next.js inline flight
 *   payloads, and the JSON-LD script. Nonces are not in this stack (they
 *   require per-request dynamic rendering). `'unsafe-inline'` covers those
 *   inline scripts. `'unsafe-eval'` is dev-only (React error stacks).
 * - style-src: compiled Tailwind CSS from this origin, plus the `style`
 *   attribute next/image emits. Nonces do not apply to style attributes.
 * - font-src / img-src / connect-src: same origin. next/font self-hosts
 *   woff2 files. Images are local. The contact form posts to `/api/contact`.
 * L2 (strip `Access-Control-Allow-Origin: *` on documents) is in vercel.json.
 */
function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ];

  // Production is HTTPS. Skip this on local http so the dev server still loads.
  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "browsing-topics=()",
              "camera=()",
              "display-capture=()",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
