import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { PASSCODE_COOKIE, isPublicPath, passcodeDigest, safeNext } from "../passcode";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "../proxy";
import { scriptedToken } from "../leaderboard/server/__tests__/fixtures";
import { RUN_TOKEN_VERSION } from "../engine";
import { A11Y_RUN_V1, GOLDEN_CUP8_V2 } from "../engine/versions/__tests__/fixtures";

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

function req(path: string, cookie?: string): NextRequest {
  const headers = cookie ? { cookie: `${PASSCODE_COOKIE}=${cookie}` } : undefined;
  return new NextRequest(`https://pokedraft.test${path}`, { headers });
}

afterEach(() => vi.unstubAllEnvs());

describe("passcode gate (catches a gate that breaks link previews or leaks the API)", () => {
  it("exempts exactly the preview and gate paths", () => {
    const exempt = [
      "/card",
      "/r/pd1.abc/opengraph-image",
      "/r/pd1.abc/opengraph-image-1x2y3z",
      "/_next/static/chunks/app.js",
      "/favicon.ico",
      "/robots.txt",
      "/gate",
      "/gate/unlock",
      "/api/csp-report",
      "/api/health",
    ];
    const gated = [
      "/",
      "/play",
      "/daily",
      "/leaderboard",
      "/history",
      "/how-to-play",
      "/r/pd1.abc",
      "/api/leaderboard",
      "/api/anything",
      "/api/csp-report/x",
      "/api/health/x",
      "/card/extra",
      "/r/pd1.abc/opengraph-image/x",
      "/_next/image",
      "/robots.txt.bak",
      "/gate/other",
    ];
    expect(exempt.filter((p) => !isPublicPath(p))).toEqual([]);
    expect(gated.filter((p) => isPublicPath(p))).toEqual([]);
  });

  it("runs the proxy on every path except static assets (catches a matcher that skips the API or gates /_next/static)", () => {
    const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    const matched = [
      "/",
      "/play",
      "/api/leaderboard",
      "/card",
      "/gate/unlock",
      "/r/pd3.abc",
      "/_next/image",
    ];
    const skipped = ["/_next/static/chunks/app.js", "/favicon.ico", "/robots.txt"];
    expect(matched.filter((u) => !runs(u))).toEqual([]);
    expect(skipped.filter((u) => runs(u))).toEqual([]);
  });

  it("is off when FRIENDS_PASSCODE is unset", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "");
    expect(proxy(req("/play")).headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects gated pages to /gate with the original path", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
    const res = proxy(req("/r/pd1.abc?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://pokedraft.test/gate?next=%2Fr%2Fpd1.abc%3Fx%3D1",
    );
  });

  it("answers gated API calls with 401 JSON, never the gate page", async () => {
    vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
    const res = proxy(req("/api/leaderboard?mode=cup8&scope=all"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "PASSCODE_REQUIRED", message: "Enter the friends passcode first." },
    });
  });

  it("lets public paths and the right cookie through, and rejects a stale cookie", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
    expect(proxy(req("/r/pd1.abc/opengraph-image")).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/api/health?db=1")).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/", passcodeDigest("pikachu"))).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(req("/", passcodeDigest("old-passcode"))).status).toBe(307);
  });

  it("rewrites an undecodable share link to the 404 route and passes a real token through", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "");
    const cur = `pd${RUN_TOKEN_VERSION}`;
    for (const bad of ["garbage", `${cur}.%%%`, "pd99.abc", "pd0.abc", `${cur}.e30`]) {
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
    vi.stubEnv("FRIENDS_PASSCODE", "");
    expect(RUN_TOKEN_VERSION).not.toBe(1);
    const res = proxy(req(`/r/${A11Y_RUN_V1}`));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("restores the payload from a message-safe query link before rendering the canonical run", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "");
    const real = scriptedToken(
      { mode: "kanto151", formation: "4-4-2", order: "squadFirst" },
      "proxy-seed",
    );
    const res = proxy(req(`/r/pd3?t=${real.slice(4)}`));
    expect(res.headers.get("x-middleware-rewrite")).toBe(`https://pokedraft.test/r/${real}`);
    expect(
      proxy(req(`/r/pd3?t=${real.slice(4)}&_rsc=123&source=chat`)).headers.get(
        "x-middleware-rewrite",
      ),
    ).toBe(`https://pokedraft.test/r/${real}?_rsc=123&source=chat`);
    for (const token of [A11Y_RUN_V1, GOLDEN_CUP8_V2]) {
      const [version, payload] = token.split(".");
      expect(proxy(req(`/r/${version}?t=${payload}`)).headers.get("x-middleware-rewrite")).toBe(
        `https://pokedraft.test/r/${token}`,
      );
    }
  });

  it("keeps missing, malformed and unsupported query payloads on the real 404 route", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "");
    for (const path of [
      "/r/pd3",
      "/r/pd3?t=",
      "/r/pd3?t=%%%",
      "/r/pd3?t=e30",
      "/r/pd99?t=abc",
      "/r/pd0?t=abc",
      "/r/pd1?t=abc/def",
      "/r/pd2?t=abc.def",
      "/r/pd3?t=abc&t=def",
    ]) {
      expect(proxy(req(path)).headers.get("x-middleware-rewrite")).toBe(
        "https://pokedraft.test/run-not-found",
      );
    }
  });

  it("gates the complete query link before rewriting and lets an unlocked player replay it", () => {
    vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
    const path = `/r/pd1?t=${A11Y_RUN_V1.slice(4)}`;
    const res = proxy(req(path));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe(path);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(proxy(req(path, passcodeDigest("pikachu"))).headers.get("x-middleware-rewrite")).toBe(
      `https://pokedraft.test/r/${A11Y_RUN_V1}`,
    );
  });

  it("only follows same-site relative next paths", () => {
    expect(safeNext("/r/pd1.abc")).toBe("/r/pd1.abc");
    expect(safeNext("//evil.test")).toBe("/");
    expect(safeNext("/\\evil.test")).toBe("/");
    expect(safeNext("https://evil.test")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("/\t/evil.test")).toBe("/");
    expect(safeNext("/\n/evil.test/x")).toBe("/");
    expect(safeNext("/leaderboard?mode=cup8#top")).toBe("/leaderboard?mode=cup8#top");
  });

  it("keeps pokedex.json and scouting.json out of the proxy and token import closure (SD-03: 1.33 MB data chunk in proxy)", () => {
    const closure = importClosure("src/proxy.ts");
    expect(closure).not.toContain("src/data/pokedex.json");
    expect(closure).not.toContain("src/data/scouting.json");
  });
});
