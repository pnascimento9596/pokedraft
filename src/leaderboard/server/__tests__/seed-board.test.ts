import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { DraftSettings } from "@/engine/types";
import { leaderboardEntries, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import type { BoardEntry } from "../../contract";
import { handleBoard, handleSubmit } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { GOLDEN_CUP8_V7, migratedDb, scriptedToken } from "./fixtures";

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

function row(
  nickname: string,
  fields: Partial<NewLeaderboardRow> & { readonly wins: number; readonly teamScore: number },
): NewLeaderboardRow {
  return {
    nickname,
    mode: "cup8",
    variant: "classic3.squadFirst.g123456789",
    dailyDate: null,
    seed: "golden-cup8",
    token: `tok-${nickname}`,
    draws: 0,
    losses: 8 - fields.wins,
    engineVersion: "pokedraft-engine-7",
    coached: false,
    runFingerprint: `fp-${nickname}`,
    ipHash: "test",
    createdAt: new Date("2026-10-16T12:00:00Z"),
    ...fields,
  };
}

interface Body {
  scope?: string;
  seed?: string | null;
  engine?: string;
  coach?: string;
  entries: BoardEntry[];
  error?: { code: string; message: string };
}

async function board(qs: string) {
  const res = await handleBoard(new URL(`http://local/api/leaderboard?${qs}`), store);
  return { status: res.status, body: (await res.json()) as Body };
}

const ranked = (entries: readonly BoardEntry[]) =>
  entries.map((e) => [e.rank, e.nickname, e.engineVersion]);

describe("all-time engine filter (catches an engine 3 run ranked against engine 7 runs by default)", () => {
  beforeEach(async () => {
    await db.insert(leaderboardEntries).values([
      row("Lance", {
        token: GOLDEN_CUP8_V3,
        wins: 8,
        teamScore: 990,
        engineVersion: "pokedraft-engine-3",
      }),
      row("Ash", { token: GOLDEN_CUP8_V7, wins: 5, teamScore: 593 }),
    ]);
  });

  it("the default all-time board lists only current-engine runs and says so", async () => {
    const { status, body } = await board("mode=cup8&scope=all");
    expect(status).toBe(200);
    expect(body.engine).toBe("current");
    expect(ranked(body.entries)).toEqual([[1, "Ash", "pokedraft-engine-7"]]);
  });

  it("engine=all lists the engine 3 run above the engine 7 run", async () => {
    const { body } = await board("mode=cup8&scope=all&engine=all");
    expect(body.engine).toBe("all");
    expect(ranked(body.entries)).toEqual([
      [1, "Lance", "pokedraft-engine-3"],
      [2, "Ash", "pokedraft-engine-7"],
    ]);
  });

  it("a daily board is never engine filtered and refuses an engine parameter", async () => {
    await db.insert(leaderboardEntries).values([
      row("Daily3", {
        dailyDate: "2026-10-13",
        seed: "d",
        wins: 7,
        teamScore: 800,
        engineVersion: "pokedraft-engine-3",
      }),
      row("Daily7", { dailyDate: "2026-10-13", seed: "d", wins: 6, teamScore: 800 }),
    ]);
    const daily = await board("mode=cup8&scope=daily&date=2026-10-13");
    expect([daily.body.engine, ranked(daily.body.entries)]).toEqual([
      "all",
      [
        [1, "Daily3", "pokedraft-engine-3"],
        [2, "Daily7", "pokedraft-engine-7"],
      ],
    ]);
    const refused = await board("mode=cup8&scope=daily&date=2026-10-13&engine=all");
    expect([refused.status, refused.body.error?.code]).toEqual([400, "INVALID_QUERY"]);
  });

  it("an unknown engine value is a 400 INVALID_QUERY", async () => {
    const { status, body } = await board("mode=cup8&scope=all&engine=v3");
    expect([status, body.error?.code]).toEqual([400, "INVALID_QUERY"]);
  });

  it("a fresh all-time submit is ranked among current-engine runs, as the default board shows it (catches #2 for the leader of the board the link opens)", async () => {
    const res = await handleSubmit(
      new Request("http://local/api/leaderboard", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
        body: JSON.stringify({ nickname: "Misty", token: scriptedToken(CUP8, "seed-board-rank") }),
      }),
      { store, ipHashSecret: SECRET, now: () => NOW, grace: null },
    );
    const body = (await res.json()) as { entry: BoardEntry };
    const listed = (await board("mode=cup8&scope=all")).body.entries;
    // Lance's engine 3 run is not on the default board, so the reply ranks Misty first among the
    // current-engine runs, and the board lists her above Ash.
    expect([res.status, body.entry.rank, ranked(listed)]).toEqual([
      201,
      1,
      [
        [1, "Misty", "pokedraft-engine-7"],
        [2, "Ash", "pokedraft-engine-7"],
      ],
    ]);
  });
});

describe("seed board (catches friends on one seed missing from each other's results)", () => {
  beforeEach(async () => {
    await db.insert(leaderboardEntries).values([
      row("Ash", { token: GOLDEN_CUP8_V7, wins: 5, teamScore: 593 }),
      row("Lance", {
        token: GOLDEN_CUP8_V3,
        wins: 6,
        teamScore: 500,
        engineVersion: "pokedraft-engine-3",
      }),
      row("Misty", { wins: 5, teamScore: 700, dailyDate: "2026-10-13" }),
      row("Brock", { wins: 8, teamScore: 900, seed: "another-seed" }),
      row("Erika", { wins: 8, teamScore: 900, mode: "kanto151", variant: "squadFirst" }),
    ]);
  });

  it("returns exactly this seed's rows on this mode, in board order, across engines and boards", async () => {
    const { status, body } = await board("mode=cup8&seed=golden-cup8");
    expect(status).toBe(200);
    expect([body.scope, body.seed, body.engine, body.coach]).toEqual([
      "seed",
      "golden-cup8",
      "all",
      "all",
    ]);
    expect(ranked(body.entries)).toEqual([
      [1, "Lance", "pokedraft-engine-3"],
      [2, "Misty", "pokedraft-engine-7"],
      [3, "Ash", "pokedraft-engine-7"],
    ]);
    expect(body.entries.map((e) => e.seed)).toEqual(["golden-cup8", "golden-cup8", "golden-cup8"]);
  });

  it("caps the seed board at 20 rows", async () => {
    await db
      .insert(leaderboardEntries)
      .values(
        Array.from({ length: 21 }, (_, i) =>
          row(`p${String(i).padStart(2, "0")}`, { seed: "busy", wins: 3, teamScore: 900 - i }),
        ),
      );
    const { body } = await board("mode=cup8&seed=busy");
    expect(body.entries.map((e) => e.nickname)).toEqual(
      Array.from({ length: 20 }, (_, i) => `p${String(i).padStart(2, "0")}`),
    );
  });

  it("a seed nobody played is an empty board, not an error", async () => {
    const { status, body } = await board("mode=cup8&seed=nobody-played-this");
    expect([status, body.entries]).toEqual([200, []]);
  });

  it.each([
    ["an empty seed", "mode=cup8&seed="],
    ["a blank seed", "mode=cup8&seed=%20%20"],
    ["a seed longer than a token", `mode=cup8&seed=${"s".repeat(4097)}`],
    ["a seed on the all-time board", "mode=cup8&scope=all&seed=golden-cup8"],
    ["a seed with a date", "mode=cup8&seed=golden-cup8&date=2026-10-13"],
    ["a seed with a coach view", "mode=cup8&seed=golden-cup8&coach=coached"],
    ["a seed without a mode", "seed=golden-cup8"],
  ])("%s is a 400 INVALID_QUERY", async (_, qs) => {
    const { status, body } = await board(qs);
    expect([status, body.error?.code]).toEqual([400, "INVALID_QUERY"]);
  });
});
