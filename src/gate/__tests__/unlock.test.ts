import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { PASSCODE_COOKIE, passcodeDigest } from "@/passcode";
import { drizzleLimiter } from "@/ratelimit/store";
import { migratedDb } from "@/leaderboard/server/__tests__/fixtures";
import type { Db } from "@/db/types";
import { GATE_LIMIT, handleUnlock, type UnlockDeps } from "../unlock";

const NOW = new Date("2026-10-09T16:00:00Z");
const PASSCODE = "correct horse";
const SECRET = "test-secret-0123456789abcdef01234567";

let db: Db;
let client: PGlite;
let now: Date;

beforeEach(async () => {
  ({ db, client } = await migratedDb());
  now = NOW;
});
afterEach(async () => {
  await client.close();
});

function deps(over: Partial<UnlockDeps> = {}): UnlockDeps {
  return {
    limiter: drizzleLimiter(() => db),
    now: () => now,
    passcode: PASSCODE,
    ipHashSecret: SECRET,
    ...over,
  };
}

function unlock(passcode: string, ip = "198.51.100.1", d: UnlockDeps = deps()) {
  const form = new FormData();
  form.set("passcode", passcode);
  form.set("next", "/daily");
  const req = new Request("https://pokedraft.test/gate/unlock", {
    method: "POST",
    headers: { "x-real-ip": ip },
    body: form,
  });
  return handleUnlock(req, d);
}

function location(res: Response): string {
  return (
    new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search
  );
}

describe("passcode gate attempt limit (catches unlimited passcode guessing)", () => {
  it("allows 10 attempts per IP per 15 minutes, then locks that IP out even for the right passcode", async () => {
    expect(GATE_LIMIT).toEqual({ max: 10, windowMs: 15 * 60 * 1000 });
    for (let i = 0; i < 10; i++) {
      const res = await unlock("wrong");
      expect([res.status, location(res)]).toEqual([303, "/gate?next=%2Fdaily&error=1"]);
    }
    const locked = await unlock(PASSCODE);
    expect([locked.status, location(locked)]).toEqual([303, "/gate?next=%2Fdaily&error=limited"]);
    expect(locked.headers.get("set-cookie")).toBeNull();
  });

  it("does not lock out other IPs, and frees the IP after 15 minutes", async () => {
    for (let i = 0; i < 10; i++) await unlock("wrong");
    const other = await unlock(PASSCODE, "198.51.100.2");
    expect([other.status, location(other)]).toEqual([303, "/daily"]);
    now = new Date(NOW.getTime() + 15 * 60 * 1000 + 1);
    const later = await unlock(PASSCODE);
    expect([later.status, location(later)]).toEqual([303, "/daily"]);
  });

  it("sets an HttpOnly, SameSite=Lax, Path=/ cookie that lasts 90 days (catches a script-readable or short-lived cookie)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    vi.stubEnv("NODE_ENV", "test");
    expect((await unlock(PASSCODE)).headers.get("set-cookie")).toBe(
      "pokedraft_pass=dc6e586e6ea1b89d5818e4467281bedef5967f38e81090af7932aa29d8d94490; Path=/; Expires=Thu, 07 Jan 2027 16:00:00 GMT; Max-Age=7776000; HttpOnly; SameSite=lax",
    );
    vi.stubEnv("NODE_ENV", "production");
    expect((await unlock(PASSCODE, "198.51.100.9")).headers.get("set-cookie")).toBe(
      "pokedraft_pass=dc6e586e6ea1b89d5818e4467281bedef5967f38e81090af7932aa29d8d94490; Path=/; Expires=Thu, 07 Jan 2027 16:00:00 GMT; Max-Age=7776000; Secure; HttpOnly; SameSite=lax",
    );
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("sets the passcode cookie on the right passcode", async () => {
    const res = await unlock(PASSCODE);
    expect(res.headers.get("set-cookie")).toContain(
      `${PASSCODE_COOKIE}=${passcodeDigest(PASSCODE)}`,
    );
  });

  it("fails closed when the limiter or its secret is unavailable", async () => {
    const broken = deps({
      limiter: drizzleLimiter(() => {
        throw new Error("down");
      }),
    });
    expect(location(await unlock(PASSCODE, "198.51.100.3", broken))).toBe(
      "/gate?next=%2Fdaily&error=unavailable",
    );
    expect(
      location(await unlock(PASSCODE, "198.51.100.3", deps({ ipHashSecret: undefined }))),
    ).toBe("/gate?next=%2Fdaily&error=unavailable");
  });

  it("skips the limiter entirely when no passcode is configured", async () => {
    const res = await unlock(
      "anything",
      "198.51.100.4",
      deps({ passcode: undefined, ipHashSecret: undefined }),
    );
    expect([res.status, location(res)]).toEqual([303, "/daily"]);
  });

  it("logs a limiter failure with the request id and no IP or passcode", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const form = new FormData();
    form.set("passcode", PASSCODE);
    form.set("next", "/daily");
    const req = new Request("https://pokedraft.test/gate/unlock", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.5", "x-vercel-id": "iad1::gate-1" },
      body: form,
    });
    const broken = deps({
      limiter: drizzleLimiter(() => {
        throw Object.assign(new Error("198.51.100.5 correct horse"), { code: "57P01" });
      }),
    });
    expect(location(await handleUnlock(req, broken))).toBe("/gate?next=%2Fdaily&error=unavailable");
    expect(spy.mock.calls.map((a) => JSON.parse(String(a[0])))).toEqual([
      {
        level: "error",
        where: "gate.limiter",
        requestId: "iad1::gate-1",
        name: "Error",
        sqlstate: "57P01",
      },
    ]);
    spy.mockRestore();
  });
});

describe("IPv6 attempt buckets (catches SE-12, one IPv6 client rotating through its /64 for unlimited guesses)", () => {
  it("locks every address in the same /64 once ten attempts are spent, and leaves the next /64 alone", async () => {
    for (let i = 0; i < 10; i++) await unlock("wrong", `2001:db8:1:2::${i + 1}`);
    const sibling = await unlock(PASSCODE, "2001:db8:1:2:ffff:ffff:ffff:ffff");
    expect([sibling.status, location(sibling)]).toEqual([303, "/gate?next=%2Fdaily&error=limited"]);
    const neighbour = await unlock(PASSCODE, "2001:db8:1:3::1");
    expect([neighbour.status, location(neighbour)]).toEqual([303, "/daily"]);
  });
});

describe("a body that is not a form (catches SE-13, a JSON POST to /gate/unlock throwing a 500)", () => {
  it("answers a JSON body with a 303 back to the gate and an error, without a cookie", async () => {
    const req = new Request("https://pokedraft.test/gate/unlock", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.6", "content-type": "application/json" },
      body: JSON.stringify({ passcode: PASSCODE, next: "/daily" }),
    });
    const res = await handleUnlock(req, deps());
    expect([res.status, location(res)]).toEqual([303, "/gate?next=%2F&error=1"]);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers an empty text/plain body the same way", async () => {
    const req = new Request("https://pokedraft.test/gate/unlock", {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.6", "content-type": "text/plain" },
      body: "",
    });
    const res = await handleUnlock(req, deps());
    expect([res.status, location(res)]).toEqual([303, "/gate?next=%2F&error=1"]);
  });
});
