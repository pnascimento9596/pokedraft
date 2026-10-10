import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  ENGINE_VERSION,
  dailySeed,
  decodeToken,
  encodeToken,
  replay,
  toIsoDate,
  type DraftSettings,
  type RunToken,
} from "@/engine";
import { leaderboardEntries, rateLimitEvents } from "@/db/schema";
import type { Db } from "@/db/types";
import type { BoardEntry } from "../../contract";
import { dailySettings } from "../../daily";
import { RATE_LIMIT, handleBoard, handleSubmit, hashIp } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { drizzleLimiter } from "@/ratelimit/store";
import { migratedDb, scriptedToken } from "./fixtures";
import { A11Y_RUN_V1 } from "@/engine/versions/__tests__/fixtures";

const NOW = new Date("2026-10-09T16:00:00Z");
const SECRET = "test-secret-0123456789abcdef01234567";
const TODAY = toIsoDate("2026-10-09");
const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
const KANTO: DraftSettings = { mode: "kanto151", formation: "4-4-2", order: "positionFirst" };
const BUILDER: DraftSettings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1],
  legendaries: false,
};

interface Body {
  entry: BoardEntry;
  entries: BoardEntry[];
  error: { code: string; message: string };
}

let db: Db;
let client: PGlite;
let store: LeaderboardStore;
let replays: number;

const countingReplay = (t: RunToken) => {
  replays += 1;
  return replay(t);
};

function post(body: unknown, ip = "203.0.113.7"): Request {
  return new Request("http://local/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function submit(body: unknown, ip?: string) {
  const res = await handleSubmit(post(body, ip), {
    store,
    limiter: drizzleLimiter(() => db),
    ipHashSecret: SECRET,
    now: () => NOW,
    replay: countingReplay,
  });
  return { status: res.status, body: (await res.json()) as Body };
}

async function rows() {
  return db.select().from(leaderboardEntries);
}

beforeEach(async () => {
  ({ db, client } = await migratedDb());
  store = drizzleStore(() => db);
  replays = 0;
});
afterEach(async () => {
  await client.close();
});

describe("POST /api/leaderboard (catches client-trusted scores and unranked runs on the board)", () => {
  it("stores the server's replay numbers and ignores numbers the client sends", async () => {
    const token = scriptedToken(CUP8, "lb-cup8");
    const res = await submit({
      nickname: "  Ash  ",
      token,
      engineVersion: ENGINE_VERSION,
      wins: 8,
      teamScore: 999,
    });
    expect(res.status).toBe(201);
    expect(res.body.entry).toMatchObject({
      rank: 1,
      nickname: "Ash",
      mode: "cup8",
      variant: "classic3.squadFirst.g123456789",
      dailyDate: null,
      token,
      wins: 4,
      draws: 1,
      losses: 1,
      teamScore: 623,
    });
    const [row] = await rows();
    expect(row).toMatchObject({
      nickname: "Ash",
      seed: "lb-cup8",
      wins: 4,
      draws: 1,
      losses: 1,
      teamScore: 623,
      engineVersion: "pokedraft-engine-2",
      ipHash: hashIp("203.0.113.7", SECRET),
    });
  });

  it("replays the token exactly once per submission", async () => {
    await submit({ nickname: "Misty", token: scriptedToken(KANTO, "lb-kanto") });
    expect(replays).toBe(1);
  });

  it("rejects builder tokens with 422 BUILDER_NOT_RANKED before replaying and writes nothing", async () => {
    const res = await submit({ nickname: "Brock", token: scriptedToken(BUILDER, "builder") });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BUILDER_NOT_RANKED");
    expect(replays).toBe(0);
    expect(await rows()).toHaveLength(0);
  });

  it("rejects an action the seed never offered with 422 ILLEGAL_ACTION", async () => {
    const run = decodeToken(scriptedToken(CUP8, "lb-cup8"));
    const actions = [...run.actions];
    const first = actions[0]!;
    if (first.type !== "pick") throw new Error("fixture changed");
    actions[0] = { ...first, species: (first.species === 25 ? 26 : 25) as never };
    const res = await submit({ nickname: "Gary", token: encodeToken({ ...run, actions }) });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ILLEGAL_ACTION");
    expect(await rows()).toHaveLength(0);
  });

  it("rejects an extra reroll past the cap with 422 ILLEGAL_ACTION", async () => {
    const run = decodeToken(scriptedToken(CUP8, "lb-cup8"));
    const rerolls = Array.from({ length: 4 }, () => ({ type: "reroll", target: "type" }) as const);
    const res = await submit({
      nickname: "Gary",
      token: encodeToken({ ...run, actions: [...rerolls, ...run.actions] }),
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ILLEGAL_ACTION");
  });

  it("rejects an incomplete draft with 422 ILLEGAL_ACTION", async () => {
    const run = decodeToken(scriptedToken(CUP8, "lb-cup8"));
    const res = await submit({
      nickname: "Gary",
      token: encodeToken({ ...run, actions: run.actions.slice(0, 10) }),
    });
    expect(res.body.error.code).toBe("ILLEGAL_ACTION");
  });

  it("maps garbage to 422 TOKEN_MALFORMED and an unknown token version to 409", async () => {
    expect((await submit({ nickname: "Gary", token: "not-a-token" })).body.error.code).toBe(
      "TOKEN_MALFORMED",
    );
    const future = scriptedToken(CUP8, "lb-cup8").replace(/^pd2\./, "pd3.");
    const res = await submit({ nickname: "Gary", token: future });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ENGINE_VERSION_MISMATCH");
  });

  it("refuses a real engine-1 run with 409, so a daily board never mixes engines", async () => {
    const res = await submit({ nickname: "Gary", token: A11Y_RUN_V1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ENGINE_VERSION_MISMATCH");
    expect(await rows()).toEqual([]);
  });

  it("returns 409 ENGINE_VERSION_MISMATCH when the page runs another engine", async () => {
    const res = await submit({
      nickname: "Gary",
      token: scriptedToken(CUP8, "lb-cup8"),
      engineVersion: "pokedraft-engine-0",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ENGINE_VERSION_MISMATCH");
    expect(replays).toBe(0);
  });

  it("rejects bad bodies and bad nicknames", async () => {
    expect((await submit("{nope")).status).toBe(400);
    expect((await submit({ token: "x" })).body.error.code).toBe("INVALID_BODY");
    const token = scriptedToken(CUP8, "lb-cup8");
    for (const nickname of ["a", " b ", "x".repeat(21), "<script>", "Sh1thead"]) {
      const res = await submit({ nickname, token });
      expect([res.status, res.body.error.code]).toEqual([422, "NICKNAME_INVALID"]);
    }
  });

  it("files today's daily seed under today's New York date, once per nickname", async () => {
    const seed = dailySeed(TODAY);
    const token = scriptedToken(dailySettings("4-3-3"), seed);
    const first = await submit({ nickname: "Ash", token });
    expect(first.status).toBe(201);
    expect(first.body.entry.dailyDate).toBe("2026-10-09");
    const again = await submit({
      nickname: "Ash",
      token: scriptedToken(dailySettings("4-4-2"), seed),
    });
    expect([again.status, again.body.error.code]).toEqual([409, "DAILY_ALREADY_SUBMITTED"]);
    const other = await submit({
      nickname: "Misty",
      token: scriptedToken(dailySettings("4-4-2"), seed),
    });
    expect(other.status).toBe(201);
  });

  it("still accepts yesterday's daily seed and dates it yesterday", async () => {
    const token = scriptedToken(dailySettings("4-3-3"), dailySeed(toIsoDate("2026-10-08")));
    const res = await submit({ nickname: "Ash", token });
    expect(res.body.entry.dailyDate).toBe("2026-10-08");
  });

  it("rejects a daily seed played with non-daily settings", async () => {
    const res = await submit({ nickname: "Ash", token: scriptedToken(CUP8, dailySeed(TODAY)) });
    expect([res.status, res.body.error.code]).toEqual([422, "DAILY_SETTINGS_MISMATCH"]);
  });

  it("rejects the same token twice with 409 DUPLICATE_TOKEN", async () => {
    const token = scriptedToken(CUP8, "lb-cup8");
    expect((await submit({ nickname: "Ash", token })).status).toBe(201);
    const res = await submit({ nickname: "Misty", token });
    expect([res.status, res.body.error.code]).toEqual([409, "DUPLICATE_TOKEN"]);
  });

  it("rejects a resubmitted token or a taken daily nickname without replaying again", async () => {
    const token = scriptedToken(CUP8, "lb-cup8");
    expect((await submit({ nickname: "Ash", token })).status).toBe(201);
    for (const nickname of ["Misty", "Brock", "Gary", "Oak"]) {
      expect((await submit({ nickname, token })).body.error.code).toBe("DUPLICATE_TOKEN");
    }
    const seed = dailySeed(TODAY);
    expect(
      (await submit({ nickname: "Ash", token: scriptedToken(dailySettings("4-3-3"), seed) }))
        .status,
    ).toBe(201);
    const again = await submit({
      nickname: "Ash",
      token: scriptedToken(dailySettings("4-4-2"), seed),
    });
    expect(again.body.error.code).toBe("DAILY_ALREADY_SUBMITTED");
    expect(replays).toBe(2);
  });

  it("allows 10 attempts per IP per hour, counted in rate_limit_events, then 429", async () => {
    const keyHash = hashIp("198.51.100.1", SECRET);
    await db.insert(rateLimitEvents).values(
      Array.from({ length: RATE_LIMIT.max }, () => ({
        scope: "submit" as const,
        keyHash,
        createdAt: new Date(NOW.getTime() - 30 * 60 * 1000),
      })),
    );
    const token = scriptedToken(CUP8, "lb-cup8");
    const limited = await submit({ nickname: "Ash", token }, "198.51.100.1");
    expect([limited.status, limited.body.error.code]).toEqual([429, "RATE_LIMITED"]);
    expect(replays).toBe(0);
    expect((await submit({ nickname: "Ash", token }, "198.51.100.2")).status).toBe(201);
  });

  it("ignores attempts older than an hour in the rate limit", async () => {
    await db.insert(rateLimitEvents).values(
      Array.from({ length: RATE_LIMIT.max }, () => ({
        scope: "submit" as const,
        keyHash: hashIp("198.51.100.1", SECRET),
        createdAt: new Date(NOW.getTime() - 61 * 60 * 1000),
      })),
    );
    const res = await submit(
      { nickname: "Ash", token: scriptedToken(CUP8, "lb-cup8") },
      "198.51.100.1",
    );
    expect(res.status).toBe(201);
  });

  it("returns 503 DB_UNAVAILABLE when the secret is missing or too short, without touching the table", async () => {
    for (const ipHashSecret of [undefined, "short"]) {
      const res = await handleSubmit(post({ nickname: "Ash", token: "x" }), {
        store,
        limiter: drizzleLimiter(() => db),
        ipHashSecret,
        now: () => NOW,
      });
      expect(res.status).toBe(503);
    }
    expect(await db.select().from(rateLimitEvents)).toHaveLength(0);
  });

  it("returns 503 DB_UNAVAILABLE when the database fails", async () => {
    const broken: LeaderboardStore = drizzleStore(() => {
      throw new Error("DATABASE_URL is not set");
    });
    const res = await handleSubmit(post({ nickname: "Ash", token: "x" }), {
      store: broken,
      limiter: drizzleLimiter(() => {
        throw new Error("DATABASE_URL is not set");
      }),
      ipHashSecret: SECRET,
      now: () => NOW,
    });
    expect(res.status).toBe(503);
    expect(((await res.json()) as Body).error.code).toBe("DB_UNAVAILABLE");
  });
});

describe("GET /api/leaderboard (catches a wrong board order or a read that writes)", () => {
  async function board(qs: string, s: LeaderboardStore = store) {
    const res = await handleBoard(new URL(`http://local/api/leaderboard?${qs}`), s);
    return { status: res.status, body: (await res.json()) as Body };
  }

  it("ranks by wins, then draws, then Team Score, then first to submit", async () => {
    const mk = (
      nickname: string,
      wins: number,
      draws: number,
      teamScore: number,
      minute: number,
    ) => ({
      nickname,
      mode: "cup8" as const,
      variant: "open.squadFirst.g123456789",
      seed: nickname,
      token: `tok-${nickname}`,
      teamScore,
      wins,
      draws,
      losses: 8 - wins - draws,
      engineVersion: ENGINE_VERSION,
      ipHash: "h",
      createdAt: new Date(Date.UTC(2026, 9, 9, 12, minute)),
    });
    await db
      .insert(leaderboardEntries)
      .values([
        mk("late", 6, 1, 900, 5),
        mk("early", 6, 1, 900, 1),
        mk("score", 6, 1, 950, 9),
        mk("draws", 6, 2, 800, 9),
        mk("wins", 7, 0, 700, 9),
      ]);
    const before = (await rows()).length;
    const res = await board("mode=cup8&scope=all");
    expect(res.status).toBe(200);
    expect(res.body.entries.map((e: BoardEntry) => [e.rank, e.nickname])).toEqual([
      [1, "wins"],
      [2, "draws"],
      [3, "score"],
      [4, "early"],
      [5, "late"],
    ]);
    expect((await rows()).length).toBe(before);
    expect((await board("mode=kanto151&scope=all")).body.entries).toEqual([]);
  });

  it("returns exactly the top 50 of 51 entries, ranked 1 to 50", async () => {
    await db.insert(leaderboardEntries).values(
      Array.from({ length: 51 }, (_, i) => ({
        nickname: `p${String(i).padStart(2, "0")}`,
        mode: "kanto151" as const,
        variant: "squadFirst",
        seed: "s",
        token: `tok${i}`,
        teamScore: 1000 - i,
        wins: 3,
        draws: 0,
        losses: 2,
        engineVersion: ENGINE_VERSION,
        ipHash: "h",
      })),
    );
    const entries = (await board("mode=kanto151&scope=all")).body.entries;
    expect(entries).toHaveLength(50);
    expect([entries[0]!.rank, entries[0]!.nickname]).toEqual([1, "p00"]);
    expect([entries[49]!.rank, entries[49]!.nickname]).toEqual([50, "p49"]);
  });

  it("matches the submit rank to the board position", async () => {
    await submit({ nickname: "Ash", token: scriptedToken(CUP8, "lb-cup8") });
    const second = await submit({ nickname: "Misty", token: scriptedToken(CUP8, "lb-cup8-b") });
    const listed = (await board("mode=cup8&scope=all")).body.entries;
    const pos = listed.findIndex((e: BoardEntry) => e.nickname === "Misty") + 1;
    expect(second.body.entry.rank).toBe(pos);
  });

  it("scopes the daily board to one date", async () => {
    await submit({
      nickname: "Ash",
      token: scriptedToken(dailySettings("4-3-3"), dailySeed(TODAY)),
    });
    await submit({ nickname: "Gary", token: scriptedToken(CUP8, "lb-cup8") });
    const daily = await board("mode=cup8&scope=daily&date=2026-10-09");
    expect(daily.body.entries.map((e: BoardEntry) => e.nickname)).toEqual(["Ash"]);
    expect((await board("mode=cup8&scope=daily&date=2026-10-08")).body.entries).toEqual([]);
    expect((await board("mode=cup8&scope=all")).body.entries).toHaveLength(2);
  });

  it("returns 400 INVALID_QUERY for a bad query and 503 when the database fails", async () => {
    for (const qs of [
      "mode=cup9&scope=all",
      "mode=cup8&scope=daily",
      "mode=cup8&scope=week",
      "mode=cup8&scope=daily&date=2026-02-30",
      "mode=cup8&scope=daily&date=2026-99-99",
    ]) {
      const res = await board(qs);
      expect([res.status, res.body.error.code]).toEqual([400, "INVALID_QUERY"]);
    }
    const broken = drizzleStore(() => {
      throw new Error("down");
    });
    const res = await board("mode=cup8&scope=all", broken);
    expect([res.status, res.body.error.code]).toEqual([503, "DB_UNAVAILABLE"]);
  });
});
