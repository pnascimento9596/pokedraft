import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { encodeToken } from "@/engine/token";
import type { DraftSettings, ManagerAction, Seed } from "@/engine/types";
import { leaderboardEntries, type NewLeaderboardRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { isCoached } from "@/ui/manager/coached";
import type { BoardEntry } from "../../contract";
import { handleBoard } from "../handlers";
import { coachedSql, drizzleStore, type LeaderboardStore } from "../store";
import { migratedDb } from "./fixtures";
import { A11Y_RUN_V1 } from "@/engine/versions/__tests__/fixtures";

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
const BUILDER: DraftSettings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1],
  legendaries: false,
};

function token(seed: string, manager: readonly ManagerAction[] = [], settings = CUP8): string {
  return encodeToken({ v: 6, settings, seed: seed as Seed, actions: [], manager });
}

const tactic = (minute: number): ManagerAction => ({
  type: "tactic",
  match: 0,
  minute,
  tactic: "attack",
});

function row(nickname: string, tok: string, wins: number, teamScore: number): NewLeaderboardRow {
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

describe("coachedSql equals isCoached row by row (catches the SQL and the TypeScript rule drifting apart)", () => {
  it("agrees on coached, uncoached, retained and builder tokens", async () => {
    const tokens: [string, string, boolean][] = [
      ["pd6 coached", token("eq-1", [tactic(0)]), true],
      ["pd6 coached twice", token("eq-2", [tactic(0), tactic(45)]), true],
      ["pd6 uncoached", token("eq-3"), false],
      ["pd6 builder coached", token("eq-4", [tactic(10)], BUILDER), true],
      ["pd5", "pd5.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwib3RoZXItc2VlZCIsW11d", false],
      ["pd3", "pd3.e30", false],
      ["pd1 golden", A11Y_RUN_V1, false],
    ];
    await db
      .insert(leaderboardEntries)
      .values(tokens.map(([name, tok], i) => row(name, tok, 1, i)));
    const result = await db.execute(
      sql`SELECT nickname, ${coachedSql} AS coached FROM ${leaderboardEntries}`,
    );
    const fromSql = Object.fromEntries(
      (result as unknown as { rows: { nickname: string; coached: boolean }[] }).rows.map((r) => [
        r.nickname,
        r.coached,
      ]),
    );
    expect(tokens.map(([name]) => [name, fromSql[name]])).toEqual(
      tokens.map(([name, , want]) => [name, want]),
    );
    expect(tokens.map(([name, tok]) => [name, isCoached(tok)])).toEqual(
      tokens.map(([name, , want]) => [name, want]),
    );
  });
});
