import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { decodeToken, encodeToken } from "@/engine/token";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { backfillRuns, type BackfillDb } from "../backfill";
import { GOLDEN_CUP8_V6, migratedDb } from "./fixtures";

const PD6_HEX = "65b48b2583b51d6e3121cf09ba4055e050bd75375d0b893ae784360daa78271c";
const PD3_HEX = "b3fb64d5a68dfcc25c4dc1b2d9598dd9e330c080500fca67c4da3daafbe79da3";
const PD3_ID = "00000000-0000-4000-8000-000000000003";
const PD6_ID = "00000000-0000-4000-8000-000000000006";

let client: PGlite;
let lines: string[];

const port = (): BackfillDb => ({
  query: async (text, params = []) => (await client.query(text, [...params])).rows,
  transaction: async (statements) => {
    await client.transaction(async (tx) => {
      for (const { text, params } of statements) await tx.query(text, [...params]);
    });
  },
});

const run = (dryRun: boolean) =>
  backfillRuns(port(), { dryRun, log: (line) => void lines.push(line) });

async function seed(
  id: string,
  nickname: string,
  token: string,
  record: readonly [number, number, number, number],
  engine: string,
) {
  const [wins, draws, losses, teamScore] = record;
  await client.query(
    `INSERT INTO leaderboard_entries
       (id, nickname, mode, variant, seed, token, team_score, wins, draws, losses, engine_version, ip_hash, created_at)
     VALUES ($1, $2, 'cup8', 'classic3.squadFirst.g123456789', 'golden-cup8', $3, $4, $5, $6, $7, $8, 'h', $9)`,
    [
      id,
      nickname,
      token,
      teamScore,
      wins,
      draws,
      losses,
      engine,
      `2026-10-0${id.at(-1)}T12:00:00Z`,
    ],
  );
}

async function stored() {
  return (
    await client.query<{ id: string; coached: boolean | null; run_fingerprint: string | null }>(
      "SELECT id, coached, run_fingerprint FROM leaderboard_entries ORDER BY id",
    )
  ).rows;
}

beforeEach(async () => {
  ({ client } = await migratedDb());
  lines = [];
  await seed(PD3_ID, "Retained", GOLDEN_CUP8_V3, [3, 0, 2, 593], "pokedraft-engine-3");
  await seed(PD6_ID, "Current", GOLDEN_CUP8_V6, [5, 0, 1, 593], "pokedraft-engine-6");
});
afterEach(async () => {
  await client.close();
});

describe("db:backfill-runs (catches retained rows left without coached or run_fingerprint)", () => {
  it("fills both columns for a retained pd3 row and a pd6 row, then finds nothing on a second run", async () => {
    expect(await run(false)).toBe(0);
    expect(await stored()).toEqual([
      { id: PD3_ID, coached: false, run_fingerprint: PD3_HEX },
      { id: PD6_ID, coached: false, run_fingerprint: PD6_HEX },
    ]);
    expect(lines).toEqual([
      `id=${PD3_ID} version=pd3 coached=false run_fingerprint=${PD3_HEX}`,
      `id=${PD6_ID} version=pd6 coached=false run_fingerprint=${PD6_HEX}`,
      "updated 2 row(s)",
    ]);
    lines = [];
    expect(await run(false)).toBe(0);
    expect(lines).toEqual(["updated 0 row(s)"]);
  });

  it("prints the plan and writes nothing on a dry run", async () => {
    expect(await run(true)).toBe(0);
    expect(lines).toEqual([
      `id=${PD3_ID} version=pd3 coached=false run_fingerprint=${PD3_HEX}`,
      `id=${PD6_ID} version=pd6 coached=false run_fingerprint=${PD6_HEX}`,
      "dry run: 2 row(s) would be updated, nothing written",
    ]);
    expect(await stored()).toEqual([
      { id: PD3_ID, coached: null, run_fingerprint: null },
      { id: PD6_ID, coached: null, run_fingerprint: null },
    ]);
  });

  it("marks a row with a manager decision coached", async () => {
    await client.query("DELETE FROM leaderboard_entries");
    const coached = encodeToken({
      ...decodeToken(GOLDEN_CUP8_V6),
      manager: [{ type: "tactic", match: 0, minute: 30, tactic: "attack" }],
    });
    const { replayAnyVersion } = await import("@/engine/versions");
    const { cup } = await replayAnyVersion(coached);
    await seed(
      PD6_ID,
      "Coach",
      coached,
      [cup.wins, cup.draws, cup.losses, cup.rating.score],
      "pokedraft-engine-6",
    );
    expect(await run(false)).toBe(0);
    expect((await stored()).map((r) => r.coached)).toEqual([true]);
  });

  it("refuses a token that does not replay, prints its id, and writes no row", async () => {
    await seed(
      "00000000-0000-4000-8000-000000000009",
      "Broken",
      "pd6.e30",
      [1, 0, 0, 1],
      "pokedraft-engine-6",
    );
    expect(await run(false)).toBe(1);
    expect(lines).toEqual([
      "refused id=00000000-0000-4000-8000-000000000009 version=pd6: token body has the wrong shape",
      "refused 1 row(s); nothing written",
    ]);
    expect((await stored()).map((r) => [r.coached, r.run_fingerprint])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it("refuses a row whose stored record differs from its replay instead of fingerprinting a run it does not hold", async () => {
    await client.query("UPDATE leaderboard_entries SET team_score = 594 WHERE id = $1", [PD6_ID]);
    expect(await run(false)).toBe(1);
    expect(lines).toEqual([
      `refused id=${PD6_ID} version=pd6: stored 5-0-1, Team Score 594; replay 5-0-1, Team Score 593`,
      "refused 1 row(s); nothing written",
    ]);
    expect((await stored()).map((r) => r.run_fingerprint)).toEqual([null, null]);
  });
});
