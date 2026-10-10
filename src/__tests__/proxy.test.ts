import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PASSCODE_COOKIE, isPublicPath, passcodeDigest, safeNext } from "../passcode";
import { proxy } from "../proxy";
import { scriptedToken } from "../leaderboard/server/__tests__/fixtures";
import { RUN_TOKEN_VERSION } from "../engine";
import { A11Y_RUN_V1 } from "../engine/versions/__tests__/fixtures";

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
      "/card/extra",
      "/r/pd1.abc/opengraph-image/x",
      "/_next/image",
      "/robots.txt.bak",
      "/gate/other",
    ];
    expect(exempt.filter((p) => !isPublicPath(p))).toEqual([]);
    expect(gated.filter((p) => isPublicPath(p))).toEqual([]);
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
});
