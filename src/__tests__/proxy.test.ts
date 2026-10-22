import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "../proxy";
import { scriptedToken } from "../leaderboard/server/__tests__/fixtures";
import { RUN_TOKEN_VERSION } from "../engine";
import { RETAINED_TOKEN_VERSIONS } from "../engine/versions/label";
import {
  A11Y_RUN_V1,
  GOLDEN_CUP8_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V4,
  GOLDEN_CUP8_V5,
  GOLDEN_CUP8_V6,
  GOLDEN_CUP8_V7,
  GOLDEN_CUP8_V8,
} from "../engine/versions/__tests__/fixtures";

// Named here rather than read from RETAINED_TOKEN_VERSIONS, so a flip that forgets to retain
// engine 7 still has its pd7 links checked.
const FLIP_RETAINS = 7;

const GOLDEN_BY_VERSION: Readonly<Record<number, string>> = {
  1: GOLDEN_CUP8_V1,
  2: GOLDEN_CUP8_V2,
  3: GOLDEN_CUP8_V3,
  4: GOLDEN_CUP8_V4,
  5: GOLDEN_CUP8_V5,
  6: GOLDEN_CUP8_V6,
  7: GOLDEN_CUP8_V7,
  8: GOLDEN_CUP8_V8,
};

function importClosure(entryRel: string): string[] {
  const root = path.resolve(import.meta.dirname, "../..");
  const specRe = /^\s*(?:import|export)\s+(?!type\b)(?:[\s\S]*?from\s+)?"([^"]+)"/gm;
  const exts = ["", ".ts", ".tsx", ".json", "/index.ts"];
  const visited = new Set<string>();
  const queue = [path.join(root, entryRel)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    const rel = path.relative(root, file);
    if (visited.has(rel)) continue;
    visited.add(rel);
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(specRe)) {
      const spec = m[1]!;
      let base: string | null = null;
      if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
      else if (spec.startsWith(".")) base = path.resolve(path.dirname(file), spec);
      if (base === null) continue;
      for (const ext of exts) {
        const candidate = base + ext;
        if (existsSync(candidate) && (ext !== "" || path.extname(candidate) !== "")) {
          queue.push(candidate);
          break;
        }
      }
    }
  }
  return [...visited].sort();
}

function req(path: string): NextRequest {
  return new NextRequest(`https://pokedraft.test${path}`);
}

afterEach(() => vi.unstubAllEnvs());

describe("proxy", () => {
  it("never gates anything, even with FRIENDS_PASSCODE set (catches the friends-only lockout where / redirected to /gate and /api/leaderboard answered 401)", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
    for (const path of ["/", "/play", "/daily", "/leaderboard", "/api/leaderboard"]) {
      const res = proxy(req(path));
      expect([path, res.status, res.headers.get("x-middleware-next")]).toEqual([path, 200, "1"]);
    }
  });

  it("runs the proxy on every path except static assets (catches a matcher that skips the API or runs on /_next/static)", () => {
    const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    const matched = ["/", "/play", "/api/leaderboard", "/card", "/r/pd3.abc", "/_next/image"];
    const skipped = ["/_next/static/chunks/app.js", "/favicon.ico", "/robots.txt"];
    expect(matched.filter((u) => !runs(u))).toEqual([]);
    expect(skipped.filter((u) => runs(u))).toEqual([]);
  });

  it("skips creature images and health checks and runs on everything else", () => {
    const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    const notMatched = [
      "/creatures/pokeapi-art/0001.webp",
      "/api/health",
      "/api/health?db=1",
      "/api/csp-report",
      "/_next/static/x.js",
      "/favicon.ico",
      "/robots.txt",
    ];
    const matched = [
      "/",
      "/api/leaderboard",
      "/api/leaderboard?mode=cup8",
      "/r/pd7.abc",
      "/daily",
      "/card",
      "/api/healthz",
      "/creaturesx",
    ];
    expect(notMatched.filter((u) => runs(u) !== false)).toEqual([]);
    expect(matched.filter((u) => runs(u) !== true)).toEqual([]);
  });

  it("rewrites an undecodable share link to the 404 route and passes a real token through", () => {
    const cur = `pd${RUN_TOKEN_VERSION}`;
    for (const bad of ["garbage", `${cur}.%%%`, "pd99.abc", "pd0.abc", "pd01.e30", `${cur}.e30`]) {
      const res = proxy(req(`/r/${bad}`));
      expect(res.headers.get("x-middleware-rewrite")).toBe("https://pokedraft.test/run-not-found");
    }
    const real = scriptedToken(
      { mode: "kanto151", formation: "4-4-2", order: "squadFirst" },
      "proxy-seed",
    );
    expect(proxy(req(`/r/${real}`)).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/r/garbage/opengraph-image")).headers.get("x-middleware-next")).toBe("1");
  });

  it("passes an old engine's share link through to the page, which replays it on its own bundle", () => {
    expect(RUN_TOKEN_VERSION).not.toBe(1);
    const res = proxy(req(`/r/${A11Y_RUN_V1}`));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("restores the payload from a message-safe query link before rendering the canonical run", () => {
    const real = scriptedToken(
      { mode: "kanto151", formation: "4-4-2", order: "squadFirst" },
      "proxy-seed",
    );
    const res = proxy(req(`/r/pd8?t=${real.slice(4)}`));
    expect(res.headers.get("x-middleware-rewrite")).toBe(`https://pokedraft.test/r/${real}`);
    expect(
      proxy(req(`/r/pd8?t=${real.slice(4)}&_rsc=123&source=chat`)).headers.get(
        "x-middleware-rewrite",
      ),
    ).toBe(`https://pokedraft.test/r/${real}?_rsc=123&source=chat`);
    for (const token of [
      A11Y_RUN_V1,
      GOLDEN_CUP8_V2,
      GOLDEN_CUP8_V3,
      GOLDEN_CUP8_V4,
      GOLDEN_CUP8_V5,
      GOLDEN_CUP8_V6,
      GOLDEN_CUP8_V7,
    ]) {
      const [version, payload] = token.split(".");
      expect(proxy(req(`/r/${version}?t=${payload}`)).headers.get("x-middleware-rewrite")).toBe(
        `https://pokedraft.test/r/${token}`,
      );
    }
  });

  it("keeps a shipped engine-5 share link on its page once engine 6 is live (catches pd5 links 404ing)", () => {
    expect(proxy(req(`/r/${GOLDEN_CUP8_V5}`)).headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("passes a golden share link of every retained, live and flip-retained version (regression guard, no RED: behaviour already correct; catches pd7 links 404ing at the flip)", () => {
    const versions = [
      ...new Set([...RETAINED_TOKEN_VERSIONS, RUN_TOKEN_VERSION, FLIP_RETAINS]),
    ].sort((a, b) => a - b);
    for (const v of versions) {
      const token = GOLDEN_BY_VERSION[v];
      expect(token, `a golden pd${v} token`).toBeDefined();
      const res = proxy(req(`/r/${token}`));
      expect([v, res.headers.get("x-middleware-rewrite")]).toEqual([v, null]);
      expect([v, res.headers.get("x-middleware-next")]).toEqual([v, "1"]);
    }
  });

  it("keeps missing, malformed and unsupported query payloads on the real 404 route", () => {
    for (const path of [
      "/r/pd4",
      "/r/pd4?t=",
      "/r/pd4?t=%%%",
      "/r/pd4?t=e30",
      "/r/pd99?t=abc",
      "/r/pd0?t=abc",
      "/r/pd1?t=abc/def",
      "/r/pd2?t=abc.def",
      "/r/pd4?t=abc&t=def",
    ]) {
      expect(proxy(req(path)).headers.get("x-middleware-rewrite")).toBe(
        "https://pokedraft.test/run-not-found",
      );
    }
    for (const version of [1, 2, 3, 4]) {
      for (const payload of [
        "%%%",
        "e30",
        "W1siayIsIjQtNC0yIiwicyJdLCJzZWVkIixbWyJwIiwwLCJzMCJdXV0",
      ]) {
        for (const path of [`/r/pd${version}.${payload}`, `/r/pd${version}?t=${payload}`]) {
          expect(proxy(req(path)).headers.get("x-middleware-rewrite"), path).toBe(
            "https://pokedraft.test/run-not-found",
          );
        }
      }
    }
  });

  it("keeps pokedex.json and scouting.json out of the proxy and token import closure (SD-03: 1.33 MB data chunk in proxy)", () => {
    const closure = importClosure("src/proxy.ts");
    expect(closure).not.toContain("src/data/pokedex.json");
    expect(closure).not.toContain("src/data/scouting.json");
    expect(closure.filter((file) => /(?:pokedex|scouting)\.json$/.test(file))).toEqual([]);
    expect(closure.filter((file) => /\/species\.ts$/.test(file))).toEqual([]);
  });
});
