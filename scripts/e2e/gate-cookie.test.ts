import { describe, expect, it } from "vitest";
import { gateCookies } from "../../e2e/gate-cookie";

const BASE = "https://pokedraft-woad.vercel.app";
const FILE = "/tmp/friends-passcode-cookie";
const FAKE_DIGEST = "test-digest-not-real";
const readFake = () => FAKE_DIGEST;

describe("Playwright passcode gate cookie", () => {
  it("adds the pokedraft_pass cookie only when both PLAYWRIGHT_BASE_URL and PLAYWRIGHT_GATE_COOKIE_FILE are set (catches a live check that omits the cookie or a local run that sends one)", () => {
    expect(gateCookies(undefined, undefined, readFake)).toEqual([]);
    expect(gateCookies(BASE, undefined, readFake)).toEqual([]);
    expect(gateCookies(undefined, FILE, readFake)).toEqual([]);
    expect(gateCookies(BASE, FILE, readFake)).toEqual([
      {
        name: "pokedraft_pass",
        value: "test-digest-not-real",
        domain: "pokedraft-woad.vercel.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        expires: -1,
      },
    ]);
  });

  it("trims trailing newlines from the cookie file and returns no cookie when the file is unreadable or blank (catches a newline in the Cookie header or a crash on a missing file)", () => {
    expect(gateCookies(BASE, FILE, () => "abc123\n")).toEqual([
      {
        name: "pokedraft_pass",
        value: "abc123",
        domain: "pokedraft-woad.vercel.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        expires: -1,
      },
    ]);
    expect(
      gateCookies(BASE, "/tmp/missing", () => {
        throw new Error("ENOENT");
      }),
    ).toEqual([]);
    expect(gateCookies(BASE, FILE, () => "  \n")).toEqual([]);
  });

  it("sets domain to the hostname of PLAYWRIGHT_BASE_URL (catches a domain with a scheme or port that Chromium refuses)", () => {
    expect(gateCookies("https://pokedraft-woad.vercel.app", FILE, readFake)[0]?.domain).toBe(
      "pokedraft-woad.vercel.app",
    );
    expect(
      gateCookies("https://preview.pokedraft.example:8443/daily", FILE, readFake)[0]?.domain,
    ).toBe("preview.pokedraft.example");
  });
});
