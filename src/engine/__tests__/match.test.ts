import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { FORMATIONS } from "../formations";
import { simulateMatch, type MatchInput, type Phase } from "../match";
import { buildLadder, bossStarters } from "../opponents";
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
  role: FORMATIONS["4-3-3"].slots[i]!.role,
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
    opponentStarters: bossStarters(LADDER[round]),
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
    expect(a.goals).toHaveLength(3);
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

  it("pins a group match scoreline, scorers, recap and incidents", () => {
    const m = simulateMatch(input("m-25", 2, "G3", "group"));
    expect([m.regulation, m.extraTime, m.shootout, m.outcome, m.rating]).toEqual([
      { user: 6, opp: 0 },
      null,
      null,
      "W",
      943,
    ]);
    expect(m.goals).toEqual([
      { side: "user", minute: 4, penalty: false, kind: "solo", scorer: 135, assist: null },
      { side: "user", minute: 7, penalty: false, kind: "open-play", scorer: 85, assist: 26 },
      { side: "user", minute: 11, penalty: false, kind: "open-play", scorer: 80, assist: null },
      { side: "user", minute: 22, penalty: false, kind: "open-play", scorer: 6, assist: 59 },
      { side: "user", minute: 45, penalty: false, kind: "open-play", scorer: 6, assist: 135 },
      { side: "user", minute: 52, penalty: false, kind: "header", scorer: 80, assist: null },
    ]);
    expect(m.recap).toEqual([
      "Beat Pallet Town 6-0.",
      "Jolteon scores after a solo run in the 4th minute.",
      "Dodrio scores in the 7th minute, set up by Raichu.",
      "Slowbro scores in the 11th minute.",
      "Charizard finishes in the 22nd minute after a pass from Arcanine.",
      "Charizard scores in the 45th minute, set up by Jolteon.",
      "Slowbro heads home in the 52nd minute.",
    ]);
    expect(m.incidents).toEqual([
      { kind: "yellow", side: "user", minute: 1, slot: 4, player: 3, secondYellow: false },
      { kind: "yellow", side: "user", minute: 10, slot: 3, player: 130, secondYellow: false },
      { kind: "yellow", side: "user", minute: 38, slot: 6, player: 6, secondYellow: false },
      { kind: "tactic", side: "opp", minute: 45, tactic: "attack", by: "auto" },
      { kind: "rotate", side: "opp", minute: 60, slot: 8, player: 84 },
      { kind: "tactic", side: "user", minute: 75, tactic: "defend", by: "auto" },
      { kind: "rotate", side: "opp", minute: 75, slot: 10, player: 21 },
      { kind: "yellow", side: "opp", minute: 78, slot: 3, player: 42, secondYellow: false },
      { kind: "yellow", side: "user", minute: 88, slot: 1, player: 59, secondYellow: false },
    ]);
  });

  it("pins a final that goes to a shootout with SHO-ordered takers on both sides", () => {
    const m = simulateMatch(input("m-0", 7, "F", "knockout"));
    expect([m.regulation, m.extraTime, m.outcome]).toEqual([
      { user: 0, opp: 0 },
      { user: 0, opp: 0 },
      "L",
    ]);
    expect(m.shootout).toEqual({
      user: 7,
      opp: 8,
      keeper: 9,
      kicks: [
        { side: "user", taker: 149, scored: true },
        { side: "opp", taker: { kind: "species", id: 149 }, scored: true },
        { side: "user", taker: 59, scored: true },
        { side: "opp", taker: { kind: "species", id: 85 }, scored: false },
        { side: "user", taker: 85, scored: true },
        { side: "opp", taker: { kind: "species", id: 6 }, scored: true },
        { side: "user", taker: 6, scored: true },
        { side: "opp", taker: { kind: "species", id: 146 }, scored: true },
        { side: "user", taker: 26, scored: false },
        { side: "opp", taker: { kind: "species", id: 145 }, scored: true },
        { side: "user", taker: 9, scored: true },
        { side: "opp", taker: { kind: "species", id: 123 }, scored: true },
        { side: "user", taker: 55, scored: true },
        { side: "opp", taker: { kind: "species", id: 142 }, scored: true },
        { side: "user", taker: 3, scored: true },
        { side: "opp", taker: { kind: "species", id: 144 }, scored: true },
        { side: "user", taker: 130, scored: false },
        { side: "opp", taker: { kind: "species", id: 130 }, scored: true },
      ],
      decider: "kicks",
      coinWinner: null,
    });
    expect(m.recap).toEqual([
      "A 0-0 draw against Cinnabar FC after extra time.",
      "Lost the shootout 8-7.",
    ]);
  });
});

// No goal in regulation or extra time, and every penalty scores: the shootout can only end at
// the sudden-death cap.
const FORCED_TIE = {
  ...ENGINE_COEFFICIENTS,
  match: {
    ...ENGINE_COEFFICIENTS.match,
    chances: { ...ENGINE_COEFFICIENTS.match.chances, maxGoalProb: 0 },
  },
  shootout: { ...ENGINE_COEFFICIENTS.shootout, base: 1, band: 0 },
};

describe("shootout cap (catches the decree that handed the user every capped shootout)", () => {
  it("keeps sudden death going for 200 level pairs, then a seeded coin decides", () => {
    const m = simulateMatch(input("m-0", 7, "F", "knockout"), FORCED_TIE);
    const s = m.shootout!;
    expect([s.user, s.opp, s.kicks.length, s.decider]).toEqual([205, 205, 410, "coin"]);
    expect(["W", "L"]).toContain(m.outcome);
    expect(m.recap.at(-1)).toMatch(
      /^(Won|Lost) on a coin toss after 200 rounds of sudden death\.$/,
    );
  });

  it("flips a fair coin: over 200 forced ties the user wins between 80 and 120", () => {
    const wins = SEEDS.slice(0, 200).filter(
      (seed) => simulateMatch(input(seed, 7, "F", "knockout"), FORCED_TIE).outcome === "W",
    ).length;
    expect(wins).toBeGreaterThanOrEqual(80);
    expect(wins).toBeLessThanOrEqual(120);
  });

  it("marks a shootout settled by kicks as decided by kicks", () => {
    expect(simulateMatch(input("m-0", 7, "F", "knockout")).shootout!.decider).toBe("kicks");
  });
});
