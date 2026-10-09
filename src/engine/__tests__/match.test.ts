import { describe, expect, it } from "vitest";
import { FORMATIONS } from "../formations";
import { simulateMatch, type MatchInput, type Phase } from "../match";
import { buildLadder } from "../opponents";
import { speciesById } from "../species";
import { matchLines, rateTeam } from "../team";
import type { CupRound, FullLineup, Seed } from "../types";

const KANTO = {
  formation: "4-3-3",
  starters: [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135],
  bench: [25, 94, 65, 68, 143],
} as unknown as FullLineup;
const RATING = rateTeam(KANTO);
const STARTERS = KANTO.starters.map((id, i) => ({
  species: speciesById(id),
  line: FORMATIONS["4-3-3"].slots[i]!.line,
}));
const LADDER = buildLadder("golden-1", "kanto151");

function input(seed: string, matchIndex: number, round: CupRound, phase: Phase): MatchInput {
  return {
    matchIndex,
    round,
    phase,
    seed: seed as Seed,
    rating: RATING.score,
    userLines: matchLines(RATING),
    starters: STARTERS,
    keeper: speciesById(9),
    opponent: LADDER[round],
    absences: [],
  };
}

const SEEDS = Array.from({ length: 300 }, (_, i) => `m-${i}`);
const OUTFIELD = new Set([59, 149, 130, 3, 80, 6, 55, 26, 85, 135]);

describe("simulateMatch", () => {
  it("is a pure function of its input (hidden state would break replay)", () => {
    expect(simulateMatch(input("m-25", 0, "G1", "group"))).toEqual(
      simulateMatch(input("m-25", 0, "G1", "group")),
    );
  });

  it("keys its streams on the match index (shared streams would replay one match eight times)", () => {
    const a = simulateMatch(input("m-25", 0, "G1", "group"));
    const b = simulateMatch(input("m-25", 1, "G1", "group"));
    expect(a.goals).toHaveLength(9);
    expect(b.goals).not.toEqual(a.goals);
  });

  it("never returns a draw in a knockout and only shoots out after a level extra time", () => {
    const outcomes = { W: 0, D: 0, L: 0, shootouts: 0 };
    for (const seed of SEEDS) {
      const m = simulateMatch(input(seed, 7, "F", "knockout"));
      outcomes[m.outcome]++;
      if (m.shootout) {
        outcomes.shootouts++;
        expect(m.regulation.user).toBe(m.regulation.opp);
        expect(m.extraTime!.user).toBe(m.extraTime!.opp);
      }
    }
    expect(outcomes.D).toBe(0);
    expect(outcomes.W + outcomes.L).toBe(300);
    expect(outcomes.shootouts).toBeGreaterThan(0);
  });

  it("emits exactly one goal event per goal in the scoreline", () => {
    for (const seed of SEEDS) {
      const m = simulateMatch(input(seed, 3, "R32", "knockout"));
      const user = m.goals.filter((g) => g.side === "user").length;
      const opp = m.goals.filter((g) => g.side === "opp").length;
      expect([user, opp]).toEqual([
        m.regulation.user + (m.extraTime?.user ?? 0),
        m.regulation.opp + (m.extraTime?.opp ?? 0),
      ]);
    }
  });

  it("credits user goals only to outfield starters (the keeper or a bench player must never score)", () => {
    const scorers = new Set<number>();
    for (const seed of SEEDS) {
      for (const g of simulateMatch(input(seed, 0, "G1", "group")).goals) {
        if (g.side === "user") scorers.add(g.scorer);
      }
    }
    expect([...scorers].every((id) => OUTFIELD.has(id))).toBe(true);
    expect(scorers.size).toBe(10);
  });

  it("pins a group match scoreline, scorers and recap", () => {
    const m = simulateMatch(input("m-25", 0, "G1", "group"));
    expect([m.regulation, m.extraTime, m.shootout, m.outcome, m.rating]).toEqual([
      { user: 6, opp: 3 },
      null,
      null,
      "W",
      939,
    ]);
    expect(m.goals).toEqual([
      { side: "user", minute: 1, penalty: false, scorer: 3, assist: 135 },
      { side: "user", minute: 6, penalty: false, scorer: 85, assist: null },
      { side: "opp", minute: 26, penalty: false, scorer: 9, assist: 8 },
      { side: "opp", minute: 39, penalty: true, scorer: 10, assist: null },
      { side: "user", minute: 43, penalty: false, scorer: 80, assist: 55 },
      { side: "user", minute: 47, penalty: false, scorer: 55, assist: null },
      { side: "opp", minute: 47, penalty: false, scorer: 10, assist: null },
      { side: "user", minute: 60, penalty: false, scorer: 3, assist: null },
      { side: "user", minute: 68, penalty: true, scorer: 149, assist: null },
    ]);
    expect(m.recap).toEqual([
      "Beat Celadon City 6-3.",
      "Venusaur scores in the 1st minute, set up by Jolteon.",
      "Dodrio finds the net in the 6th minute.",
      "Slowbro finishes in the 43rd minute after a pass from Golduck.",
      "Golduck finds the net in the 47th minute.",
      "Venusaur scores in the 60th minute.",
      "Dragonite scores from the spot in the 68th minute.",
    ]);
  });

  it("pins a final that goes to a shootout with SHO-ordered user takers and the fixed opp order", () => {
    const m = simulateMatch(input("m-0", 7, "F", "knockout"));
    expect([m.regulation, m.extraTime, m.outcome]).toEqual([
      { user: 0, opp: 0 },
      { user: 0, opp: 0 },
      "W",
    ]);
    expect(m.shootout).toEqual({
      user: 6,
      opp: 5,
      keeper: 9,
      kicks: [
        { side: "user", taker: 149, scored: false },
        { side: "opp", taker: 9, scored: true },
        { side: "user", taker: 59, scored: true },
        { side: "opp", taker: 10, scored: true },
        { side: "user", taker: 85, scored: true },
        { side: "opp", taker: 11, scored: true },
        { side: "user", taker: 6, scored: true },
        { side: "opp", taker: 8, scored: false },
        { side: "user", taker: 26, scored: true },
        { side: "opp", taker: 7, scored: true },
        { side: "user", taker: 9, scored: true },
        { side: "opp", taker: 6, scored: true },
        { side: "user", taker: 55, scored: true },
        { side: "opp", taker: 5, scored: false },
      ],
    });
    expect(m.recap).toEqual([
      "A 0-0 draw against Cinnabar FC after extra time.",
      "Won the shootout 6-5.",
    ]);
  });
});
