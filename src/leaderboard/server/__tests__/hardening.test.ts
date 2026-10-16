import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { leaderboardEntries } from "@/db/schema";
import { drizzleLimiter } from "@/ratelimit/store";
import type { Db } from "@/db/types";
import type { DraftSettings } from "@/engine";
import { clientIp, handleBoard, handleSubmit, hashIp } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { migratedDb, scriptedToken } from "./fixtures";

const NOW = new Date("2026-10-09T16:00:00Z");
const SECRET = "test-secret-0123456789abcdef01234567";
const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};

let db: Db;
let client: PGlite;
let store: LeaderboardStore;

beforeEach(async () => {
  ({ db, client } = await migratedDb());
  store = drizzleStore(() => db);
});
afterEach(async () => {
  await client.close();
});

function post(body: unknown, headers: Record<string, string>): Request {
  return new Request("http://local/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("client IP (catches a spoofable first x-forwarded-for hop beating Vercel's header)", () => {
  it("prefers x-real-ip, then the first x-forwarded-for hop, then unknown", () => {
    const h = (o: Record<string, string>) => new Request("http://local/", { headers: o });
    expect(
      clientIp(h({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "6.6.6.6, 10.0.0.1" })),
    ).toBe("198.51.100.9");
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(h({}))).toBe("unknown");
  });
});

describe("IP hash (catches an unkeyed hash that anyone can brute-force from the IPv4 space)", () => {
  it("is HMAC-SHA256 of the IP under the secret", () => {
    expect(hashIp("203.0.113.7", SECRET)).toBe(
      "a3f44a585b68d73be09a10c3fd364c23d94fe2b7490b49b357357502e71a5edd",
    );
    expect(hashIp("203.0.113.7", `${SECRET}x`)).not.toBe(hashIp("203.0.113.7", SECRET));
  });
});

describe("submit hardening", () => {
  it("spends no attempt on submissions rejected before the replay (catches a typo or a stale page burning one of ten)", async () => {
    const headers = { "x-real-ip": "198.51.100.1", "x-forwarded-for": "198.51.100.1" };
    const deps = { store, limiter: drizzleLimiter(() => db), ipHashSecret: SECRET, now: () => NOW };
    const token = scriptedToken(CUP8, "lb-cup8");
    for (let i = 0; i < 12; i++) {
      const res = await handleSubmit(
        post({ nickname: "Ash", token: "not-a-token" }, headers),
        deps,
      );
      expect(res.status).toBe(422);
    }
    const stale = await handleSubmit(
      post({ nickname: "Ash", token, engineVersion: "pokedraft-engine-4" }, headers),
      deps,
    );
    expect(stale.status).toBe(409);
    const badNick = await handleSubmit(post({ nickname: "", token }, headers), deps);
    expect(badNick.status).toBe(422);
    const events = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_limit_events",
    );
    const buckets = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_limit_buckets",
    );
    expect([events.rows[0]!.n, buckets.rows[0]!.n]).toEqual([0, 0]);
    const res = await handleSubmit(post({ nickname: "Ash", token }, headers), deps);
    expect(res.status).toBe(201);
    expect(await db.select().from(leaderboardEntries)).toHaveLength(1);
  });

  it("returns 201 with rank null when the rank lookup fails after the insert (catches a 503 for a saved run)", async () => {
    const flaky: LeaderboardStore = {
      ...store,
      rankOf: () => Promise.reject(new Error("rank query timed out")),
    };
    const res = await handleSubmit(
      post(
        { nickname: "Ash", token: scriptedToken(CUP8, "lb-cup8") },
        { "x-real-ip": "198.51.100.2" },
      ),
      { store: flaky, limiter: drizzleLimiter(() => db), ipHashSecret: SECRET, now: () => NOW },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { entry: { rank: number | null; nickname: string } };
    expect(body.entry.nickname).toBe("Ash");
    expect(body.entry.rank).toBeNull();
    expect(await db.select().from(leaderboardEntries)).toHaveLength(1);
  });

  it("serializes and records a rate-limit event in a single SQL round-trip and indexes all-time boards (SE-11)", async () => {
    const execSpy = vi.spyOn(db, "execute");
    const delSpy = vi.spyOn(db, "delete");
    const limiter = drizzleLimiter(() => db);
    const allowed = await limiter.consume("submit", "hash-1", NOW, { max: 10, windowMs: 3600_000 });
    expect(allowed).toBe(true);
    expect(delSpy).toHaveBeenCalledTimes(0);
    expect(execSpy).toHaveBeenCalledTimes(1);
    const idx = await client.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'leaderboard_entries' AND indexname = 'leaderboard_entries_alltime_idx'",
    );
    expect(idx.rows.map((r) => r.indexname)).toEqual(["leaderboard_entries_alltime_idx"]);
  });
});

describe("server error logging (catches a 503 whose cause is lost, or a log that leaks personal data)", () => {
  const RID = "iad1::7xq2k-1791600000000-0a1b2c3d4e5f";
  const NICK = "Ashketchum";
  const IP = "198.51.100.77";

  function driverError(): Error {
    const neon = Object.assign(new Error(`insert ... values ('${NICK}', '${IP}')`), {
      code: "08006",
    });
    return Object.assign(new Error(`Failed query: insert ... params: ${NICK},${IP}`), {
      name: "DrizzleQueryError",
      cause: neon,
    });
  }

  function logged(spy: { mock: { calls: unknown[][] } }): unknown[] {
    return spy.mock.calls.map((args) => JSON.parse(String(args[0])));
  }

  it("logs one JSON line with the request id and SQLSTATE, and returns the id in x-request-id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = scriptedToken(CUP8, "lb-cup8");
    const broken: LeaderboardStore = {
      ...store,
      admitSubmission: () => Promise.reject(driverError()),
    };
    const res = await handleSubmit(
      post({ nickname: NICK, token }, { "x-real-ip": IP, "x-vercel-id": RID }),
      { store: broken, limiter: drizzleLimiter(() => db), ipHashSecret: SECRET, now: () => NOW },
    );
    expect([res.status, res.headers.get("x-request-id")]).toEqual([503, RID]);
    expect(logged(spy)).toEqual([
      {
        level: "error",
        where: "submit.admission",
        requestId: RID,
        name: "DrizzleQueryError",
        sqlstate: "08006",
      },
    ]);
    const line = String(spy.mock.calls[0]![0]);
    for (const secret of [NICK, IP, token, hashIp(IP, SECRET), "Failed query"]) {
      expect(line).not.toContain(secret);
    }
    spy.mockRestore();
  });

  it("logs a failed rank lookup after a saved run instead of dropping it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const flaky: LeaderboardStore = { ...store, rankOf: () => Promise.reject(driverError()) };
    const res = await handleSubmit(
      post({ nickname: NICK, token: scriptedToken(CUP8, "lb-cup8") }, { "x-vercel-id": RID }),
      { store: flaky, limiter: drizzleLimiter(() => db), ipHashSecret: SECRET, now: () => NOW },
    );
    expect(res.status).toBe(201);
    expect(logged(spy)).toEqual([
      {
        level: "error",
        where: "submit.rank",
        requestId: RID,
        name: "DrizzleQueryError",
        sqlstate: "08006",
      },
    ]);
    spy.mockRestore();
  });

  it("logs a failed board read with the request id", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: LeaderboardStore = {
      ...store,
      top: () => Promise.reject(new TypeError("fetch failed")),
    };
    const res = await handleBoard(
      new URL("http://local/api/leaderboard?mode=cup8&scope=all"),
      broken,
      RID,
    );
    expect([res.status, res.headers.get("x-request-id")]).toEqual([503, RID]);
    expect(logged(spy)).toEqual([
      { level: "error", where: "board.read", requestId: RID, name: "TypeError", sqlstate: null },
    ]);
    spy.mockRestore();
  });
});
