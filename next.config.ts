import type { NextConfig } from "next";

// Report-Only until the runtime log shows no csp-report lines from real devices; then rename the
// key to Content-Security-Policy. No nonces: they force dynamic rendering. report-uri, not
// report-to: headless Chromium never delivered a Reporting API batch, and WebKit logs an error
// for a report-only policy with no report target. Development adds 'unsafe-eval' because React
// uses eval for its dev-only error stacks.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.json": {
        condition: {
          all: [
            { not: "browser" },
            {
              path: /(?:^|\/)src\/engine\/versions\/v[1234]\/src\/data\/(pokedex|scouting)\.json$/,
            },
          ],
        },
        loaders: ["./scripts/build/retained-json-loader.cjs"],
        as: "*.js",
      },
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  // The card renderers read the creature files from disk (src/components/share/card-images.ts),
  // and file tracing cannot see a path built at runtime.
  outputFileTracingIncludes: {
    "/card": ["./public/creatures/**/*"],
    "/r/[token]/opengraph-image": ["./public/creatures/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, ...SECURITY_HEADERS],
      },
      {
        // Packs are re-imported rarely and the file names carry no hash, so a day, not forever.
        source: "/creatures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
