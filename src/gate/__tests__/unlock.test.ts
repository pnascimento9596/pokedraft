import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  return new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search;
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

  it("sets the passcode cookie on the right passcode", async () => {
    const res = await unlock(PASSCODE);
    expect(res.headers.get("set-cookie")).toContain(`${PASSCODE_COOKIE}=${passcodeDigest(PASSCODE)}`);
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
    const res = await unlock("anything", "198.51.100.4", deps({ passcode: undefined, ipHashSecret: undefined }));
    expect([res.status, location(res)]).toEqual([303, "/daily"]);
  });
});
