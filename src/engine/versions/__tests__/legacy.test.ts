import { describe, expect, it } from "vitest";
import type { CupRound, Opponent, PenKick, Shirt, SpeciesId } from "@/engine";
import { replayAnyVersion } from "..";
import { fromLegacy, type LegacyCupResult } from "../legacy";
import { buildLadder as v1Ladder } from "../v1/src/engine/opponents";
import { A11Y_RUN_V1 } from "./fixtures";

// The "Out in the quarter-final" engine-1 run from ResultsView.test.tsx (cup8 Classic, seed c-4).
const ELIMINATED_V1 =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

function kicks(pairs: number, lastUser: boolean, lastOpp: boolean): PenKick[] {
  const out: PenKick[] = [];
  for (let i = 0; i < pairs; i++) {
    out.push({ side: "user", taker: 1 as SpeciesId, scored: true });
    out.push({ side: "opp", taker: 9 as Shirt, scored: true });
  }
  out.push({ side: "user", taker: 1 as SpeciesId, scored: lastUser });
  out.push({ side: "opp", taker: 9 as Shirt, scored: lastOpp });
  return out;
}

const NO_LADDER = (): Readonly<Record<CupRound, Opponent>> => {
  throw new Error("this run has no unplayed match");
};

function withFinalShootout(user: number, opp: number, k: PenKick[]): LegacyCupResult {
  const run = replayAnyVersion(A11Y_RUN_V1);
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

  it("names an old run's unplayed opponents from that engine's own ladder", () => {
    const run = replayAnyVersion(ELIMINATED_V1);
    const ladder = v1Ladder(run.cup.seed, run.cup.mode);
    const unplayed = run.cup.matches.filter((m) => m.status === "notPlayed");
    expect(unplayed.map((m) => m.round)).toEqual(["SF", "F"]);
    for (const m of unplayed) expect(m.opponent).toEqual(ladder[m.round]);
  });
});
