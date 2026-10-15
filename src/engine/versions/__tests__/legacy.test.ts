import { describe, expect, it } from "vitest";
import type { Shirt, SpeciesId } from "@/engine";
import { replayAnyVersion } from "..";
import {
  fromLegacy,
  LEGACY_SHIRT_ROSTER,
  type LegacyCupResult,
  type LegacyV3CupResult,
  type LegacyLadder,
  type LegacyOppKick,
  type UserKick,
} from "../legacy";
import * as v1 from "../v1";
import * as v3 from "../v3";
import { ENGINE_COEFFICIENTS as V3_COEFFICIENTS } from "../v3/src/engine/coefficients";
import { toFullLineup as v3Lineup } from "../v3/src/engine/draft";
import { FORMATIONS as V3_FORMATIONS } from "../v3/src/engine/formations";
import { simulateMatch as v3Match } from "../v3/src/engine/match";
import { buildLadder as v3Ladder } from "../v3/src/engine/opponents";
import { speciesById as v3Species } from "../v3/src/engine/species";
import { matchLines as v3Lines } from "../v3/src/engine/team";
import { buildLadder as v1Ladder } from "../v1/src/engine/opponents";
import { A11Y_RUN_V1, GOLDEN_CUP8_V3 } from "./fixtures";

// The "Out in the quarter-final" engine-1 run from ResultsView.test.tsx (cup8 Classic, seed c-4).
const ELIMINATED_V1 =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

// The old engines' shootout kicks name shirt numbers; fromLegacy carries them as shirt refs.
function kicks(pairs: number, lastUser: boolean, lastOpp: boolean): (UserKick | LegacyOppKick)[] {
  const out: (UserKick | LegacyOppKick)[] = [];
  for (let i = 0; i < pairs; i++) {
    out.push({ side: "user", taker: 1 as SpeciesId, scored: true });
    out.push({ side: "opp", taker: 9 as Shirt, scored: true });
  }
  out.push({ side: "user", taker: 1 as SpeciesId, scored: lastUser });
  out.push({ side: "opp", taker: 9 as Shirt, scored: lastOpp });
  return out;
}

const NO_LADDER: LegacyLadder = () => {
  throw new Error("this run has no unplayed match");
};

function withFinalShootout(
  user: number,
  opp: number,
  k: readonly (UserKick | LegacyOppKick)[],
): LegacyCupResult {
  const run = v1.replay(A11Y_RUN_V1);
  const legacy = run.cup as unknown as LegacyCupResult;
  return {
    ...legacy,
    matches: legacy.matches.map((m) =>
      m.status === "played" && m.round === "F"
        ? { ...m, shootout: { user, opp, keeper: 1 as SpeciesId, kicks: k } }
        : m,
    ),
  };
}

describe("fromLegacy (engine-1 and engine-2 results in today's shape)", () => {
  it("wraps raw frozen v1 scorer, assist, and taker shirts exactly once", () => {
    const eliminated = fromLegacy(
      v1.replay(ELIMINATED_V1).cup as unknown as LegacyCupResult,
      v1Ladder,
    );
    expect(
      eliminated.matches
        .flatMap((m) => (m.status === "played" ? m.goals : []))
        .filter((g) => g.side === "opp"),
    ).toEqual([
      {
        side: "opp",
        minute: 49,
        penalty: false,
        scorer: { kind: "shirt", number: 9 },
        assist: { kind: "shirt", number: 2 },
      },
      {
        side: "opp",
        minute: 75,
        penalty: false,
        scorer: { kind: "shirt", number: 6 },
        assist: { kind: "shirt", number: 3 },
      },
    ]);
    const cup = fromLegacy(withFinalShootout(26, 25, kicks(25, true, false)), NO_LADDER);
    expect(
      cup.matches
        .flatMap((m) => (m.status === "played" ? m.goals : []))
        .filter((g) => g.side === "opp"),
    ).toMatchObject([
      { scorer: { kind: "shirt", number: 8 }, assist: null },
      { scorer: { kind: "shirt", number: 10 }, assist: null },
    ]);
    const final = cup.matches.find((m) => m.round === "F")!;
    expect(final.status === "played" && final.shootout?.kicks.slice(0, 2)).toEqual([
      { side: "user", taker: 1, scored: true },
      { side: "opp", taker: { kind: "shirt", number: 9 }, scored: true },
    ]);
  });

  it("reads a shootout past 25 user kicks as the old decree", () => {
    const cup = fromLegacy(withFinalShootout(26, 25, kicks(25, true, false)), NO_LADDER);
    const final = cup.matches.find((m) => m.round === "F")!;
    expect(final.status === "played" && final.shootout).toMatchObject({
      decider: "decree",
      coinWinner: null,
    });
  });

  it("reads a shootout that ended inside the old cap as decided by kicks", () => {
    const cup = fromLegacy(withFinalShootout(21, 20, kicks(20, true, false)), NO_LADDER);
    const final = cup.matches.find((m) => m.round === "F")!;
    expect(final.status === "played" && final.shootout).toMatchObject({
      decider: "kicks",
      coinWinner: null,
    });
  });

  it("names an old run's unplayed opponents from that engine's own ladder, as shirt-only clubs", () => {
    const run = replayAnyVersion(ELIMINATED_V1);
    const ladder = v1Ladder(run.cup.seed, run.cup.mode);
    const unplayed = run.cup.matches.filter((m) => m.status === "notPlayed");
    expect(unplayed.map((m) => m.round)).toEqual(["SF", "F"]);
    for (const m of unplayed)
      expect(m.opponent).toEqual({ ...ladder[m.round], roster: LEGACY_SHIRT_ROSTER });
  });

  it("gives an old run no contribution breakdown rather than inventing one", () => {
    const run = replayAnyVersion(ELIMINATED_V1);
    expect(run.cup.awards.potContribution).toBeNull();
  });
});

describe("retained v3 metadata", () => {
  it("keeps the actual v3 golden player contribution through the dispatcher", () => {
    expect(replayAnyVersion(GOLDEN_CUP8_V3).cup.awards.potContribution).toEqual({
      species: 807,
      goals: 9,
      assists: 2,
      cleanSheets: 0,
      minutes: 450,
      points: { goals: 27, assists: 4, cleanSheets: 0, minutes: 2.5 },
      total: 33.5,
    });
  });

  it.each([
    ["m-0", "opp"],
    ["m-2", "user"],
  ] as const)("preserves a frozen v3 capped-coin result for %s", (seed, coinWinner) => {
    const replay = v3.replay(GOLDEN_CUP8_V3);
    const raw = replay.cup;
    const lineup = v3Lineup(replay.draft);
    const formation = V3_FORMATIONS[lineup.formation];
    const match = v3Match(
      {
        seed: seed as typeof raw.seed,
        matchIndex: 7,
        round: "F",
        phase: "knockout",
        rating: raw.rating.score,
        userLines: v3Lines(raw.rating),
        starters: lineup.starters.map((id, i) => ({
          species: v3Species(id),
          line: formation.slots[i]!.line,
          role: formation.slots[i]!.role,
        })),
        keeper: v3Species(lineup.starters[0]),
        opponent: v3Ladder(raw.seed, raw.mode).F,
        absences: [],
      },
      {
        ...V3_COEFFICIENTS,
        match: {
          ...V3_COEFFICIENTS.match,
          chances: { ...V3_COEFFICIENTS.match.chances, maxGoalProb: 0 },
        },
        shootout: { ...V3_COEFFICIENTS.shootout, base: 1, band: 0 },
      },
    );
    expect(match.shootout).toMatchObject({ decider: "coin", coinWinner });
    const cup = fromLegacy(
      { ...raw, matches: [match] } as unknown as LegacyV3CupResult,
      NO_LADDER,
      3,
    );
    const adapted = cup.matches[0]!;
    expect(adapted.status).toBe("played");
    if (adapted.status !== "played") throw new Error("expected a played final");
    expect(adapted.shootout).toMatchObject({
      user: 205,
      opp: 205,
      decider: "coin",
      coinWinner,
    });
    expect(adapted.shootout!.kicks).toHaveLength(410);
    expect(adapted.shootout!.kicks.slice(0, 2)).toEqual([
      { side: "user", taker: 807, scored: true },
      { side: "opp", taker: { kind: "shirt", number: 9 }, scored: true },
    ]);
  });
});
