import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PASSCODE_COOKIE, isPublicPath, passcodeDigest, safeNext } from "../passcode";
import { proxy } from "../proxy";

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
    expect(proxy(req("/r/pd1.abc")).headers.get("x-middleware-next")).toBe("1");
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

  it("only follows same-site relative next paths", () => {
    expect(safeNext("/r/pd1.abc")).toBe("/r/pd1.abc");
    expect(safeNext("//evil.test")).toBe("/");
    expect(safeNext("/\\evil.test")).toBe("/");
    expect(safeNext("https://evil.test")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
