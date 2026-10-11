import { describe, expect, it } from "vitest";
import { scriptedToken } from "@/leaderboard/server/__tests__/fixtures";
import Image from "../opengraph-image";

const TOKEN = scriptedToken(
  {
    mode: "cup8",
    formation: "4-3-3",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "classic3",
    order: "squadFirst",
  },
  "og-cache",
);

describe("share image caching (catches a fresh CPU render for every link preview)", () => {
  it("caches a valid run's image for a day in browsers and a year on the CDN", async () => {
    const res = await Image({ params: Promise.resolve({ token: TOKEN }) });
    expect([res.status, res.headers.get("content-type"), res.headers.get("cache-control")]).toEqual(
      [200, "image/png", "public, max-age=86400, s-maxage=31536000"],
    );
  }, 30_000);

  it("keeps a broken link's image for an hour only", async () => {
    const res = await Image({ params: Promise.resolve({ token: "pd3.garbage" }) });
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
  }, 30_000);
});
