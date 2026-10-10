import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
      { source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
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
