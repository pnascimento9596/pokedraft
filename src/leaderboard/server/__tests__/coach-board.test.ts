import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { decodeToken, encodeToken } from "@/engine/token";
import type { DraftSettings, ManagerAction, Seed } from "@/engine/types";
import { leaderboardEntries, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { isCoached } from "@/ui/manager/coached";
import type { BoardEntry } from "../../contract";
import { handleBoard, handleSubmit } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { GOLDEN_CUP8_V6, migratedDb, scriptedToken } from "./fixtures";

const NOW = new Date("2026-10-09T16:00:00Z");

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
function token(seed: string, manager: readonly ManagerAction[] = []): string {
  return encodeToken({ v: 6, settings: CUP8, seed: seed as Seed, actions: [], manager });
}

const tactic = (minute: number): ManagerAction => ({
  type: "tactic",
  match: 0,
  minute,
  tactic: "attack",
});

function row(
  nickname: string,
  tok: string,
  wins: number,
  teamScore: number,
  coached = isCoached(tok),
): NewLeaderboardRow {
  return {
    nickname,
    mode: "cup8",
    variant: "classic3.squadFirst.g123456789",
    dailyDate: null,
    seed: "coach-board",
    token: tok,
    teamScore,
    wins,
    draws: 0,
    losses: 8 - wins,
    engineVersion: "pokedraft-engine-6",
    coached,
    runFingerprint: `fp-${nickname}`,
    ipHash: "test",
    createdAt: new Date("2026-10-16T12:00:00Z"),
  };
}

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

async function board(coach?: string) {
  const qs = `mode=cup8&scope=all${coach === undefined ? "" : `&coach=${coach}`}`;
  const res = await handleBoard(new URL(`http://local/api/leaderboard?${qs}`), store);
  return {
    status: res.status,
    body: (await res.json()) as {
      coach?: string;
      entries: BoardEntry[];
      error?: { code: string; message: string };
    },
  };
}

describe("coach filter is its own ranked top 50 (catches an Uncoached view cut short by coached rows above it)", () => {
  beforeEach(async () => {
    // 51 coached runs all outrank the single uncoached one, which sits 52nd overall.
    const coached = Array.from({ length: 51 }, (_, i) =>
      row(`Coach ${i}`, token("coach-board", [tactic(i)]), 8, 900 - i),
    );
    await db.insert(leaderboardEntries).values([...coached, row("Plain", token("plain"), 1, 300)]);
  });

  it("rankOf ranks the uncoached #1 at 1 on the uncoached board and 52 on All (catches a submit reply saying #52 for the uncoached leader)", async () => {
    const [plain] = await db
      .select()
      .from(leaderboardEntries)
      .where(sql`${leaderboardEntries.nickname} = 'Plain'`);
    const all = { mode: "cup8", dailyDate: null, engine: "current" } as const;
    expect(await store.rankOf(plain!, all, "uncoached")).toBe(1);
    expect(await store.rankOf(plain!, all, "all")).toBe(52);
  });

  it("rankOf ranks the last coached run at 51 on the coached board", async () => {
    const [last] = await db
      .select()
      .from(leaderboardEntries)
      .where(sql`${leaderboardEntries.nickname} = 'Coach 50'`);
    expect(
      await store.rankOf(last!, { mode: "cup8", dailyDate: null, engine: "current" }, "coached"),
    ).toBe(51);
  });

  it("coach=uncoached returns the one uncoached run at rank 1", async () => {
    const { status, body } = await board("uncoached");
    expect(status).toBe(200);
    expect(body.coach).toBe("uncoached");
    expect(body.entries.map((e) => [e.rank, e.nickname, e.coached])).toEqual([[1, "Plain", false]]);
  });

  it("coach=coached returns 50 coached runs ranked 1 to 50", async () => {
    const { body } = await board("coached");
    expect(body.coach).toBe("coached");
    expect(body.entries.map((e) => e.rank)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(body.entries.map((e) => e.nickname)).toEqual(
      Array.from({ length: 50 }, (_, i) => `Coach ${i}`),
    );
    expect(body.entries.every((e) => e.coached)).toBe(true);
  });

  it("no coach parameter is All: 50 rows, none of them the uncoached run", async () => {
    const { body } = await board();
    expect(body.coach).toBe("all");
    expect(body.entries).toHaveLength(50);
    expect(body.entries.some((e) => e.nickname === "Plain")).toBe(false);
  });

  it("an unknown coach value is a 400 INVALID_QUERY that names the allowed values", async () => {
    const { status, body } = await board("managed");
    expect(status).toBe(400);
    expect(body.error?.code).toBe("INVALID_QUERY");
    expect(body.error?.message).toContain("coach=all|uncoached|coached");
  });
});

describe("coach views read the stored coached column (catches the filter and the chip following different rules)", () => {
  it("files a row by its coached column, not by its token, in every view and on the chip", async () => {
    await db
      .insert(leaderboardEntries)
      .values([
        row("Column coached", token("column-1"), 5, 500, true),
        row("Column plain", token("column-2", [tactic(0)]), 4, 400, false),
      ]);
    const views = await Promise.all(["all", "uncoached", "coached"].map((c) => board(c)));
    expect(
      views.map((v) => [v.status, v.body.entries.map((e) => [e.nickname, e.coached])]),
    ).toEqual([
      [
        200,
        [
          ["Column coached", true],
          ["Column plain", false],
        ],
      ],
      [200, [["Column plain", false]]],
      [200, [["Column coached", true]]],
    ]);
  });

  it("stores coached equal to isCoached(token) for every fixture token a submit accepts (regression guard, no RED: behaviour already correct)", async () => {
    const plain = scriptedToken(CUP8, "eq-1");
    const coached = encodeToken({
      ...decodeToken(scriptedToken(CUP8, "eq-2")),
      manager: [tactic(30)],
    });
    const goldenCoached = encodeToken({ ...decodeToken(GOLDEN_CUP8_V6), manager: [tactic(0)] });
    const fixtures: [string, string][] = [
      ["Plain", plain],
      ["Coached", coached],
      ["Golden", GOLDEN_CUP8_V6],
      ["Golden coached", goldenCoached],
    ];
    for (const [nickname, tok] of fixtures) {
      const res = await handleSubmit(
        new Request("http://local/api/leaderboard", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": "198.51.100.9" },
          body: JSON.stringify({ nickname, token: tok }),
        }),
        { store, ipHashSecret: "test-secret-0123456789abcdef01234567", now: () => NOW },
      );
      expect([nickname, res.status]).toEqual([nickname, 201]);
    }
    const stored = Object.fromEntries(
      (await db.select().from(leaderboardEntries)).map((r) => [r.nickname, r.coached]),
    );
    expect(fixtures.map(([nickname, tok]) => [nickname, isCoached(tok), stored[nickname]])).toEqual(
      [
        ["Plain", false, false],
        ["Coached", true, true],
        ["Golden", false, false],
        ["Golden coached", true, true],
      ],
    );
  });
});
