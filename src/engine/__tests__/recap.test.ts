import { describe, expect, it } from "vitest";
import { recapLines, type RecapInput } from "../recap";
import type { GoalEvent, Opponent, OpponentPlayerRef, PenKick, Shirt, SpeciesId } from "../types";

const OPPONENT: Opponent = {
  id: "lumiose-fc",
  name: "Lumiose FC",
  score: 800,
  lines: { GK: 80, DEF: 80, MID: 80, ATT: 80 },
  roster: Array.from({ length: 11 }, (_, i): OpponentPlayerRef => ({
    kind: "shirt",
    number: (i + 1) as Shirt,
  })),
};

const user = (
  minute: number,
  scorer: number,
  assist: number | null,
  penalty = false,
): GoalEvent => ({
  side: "user",
  minute,
  penalty,
  scorer: scorer as SpeciesId,
  assist: assist as SpeciesId | null,
});
const opp = (minute: number): GoalEvent => ({
  side: "opp",
  minute,
  penalty: false,
  scorer: { kind: "shirt", number: 9 as Shirt },
  assist: null,
});

const KNOCKOUT: RecapInput = {
  matchIndex: 4,
  opponent: OPPONENT,
  regulation: { user: 2, opp: 2 },
  extraTime: { user: 1, opp: 1 },
  shootout: {
    user: 3,
    opp: 4,
    keeper: 143 as SpeciesId,
    kicks: [],
    decider: "kicks",
    coinWinner: null,
  },
  outcome: "L",
  goals: [
    user(11, 25, 133),
    opp(12),
    user(22, 25, null),
    opp(40),
    user(103, 94, null, true),
    opp(113),
  ],
};

const kick = (side: PenKick["side"], scored: boolean): PenKick =>
  side === "user"
    ? { side, taker: 1 as SpeciesId, scored }
    : { side, taker: { kind: "shirt", number: 9 as Shirt }, scored };

// Pairs in which both sides score.
const levelPairs = (n: number): PenKick[] =>
  Array.from({ length: n }, () => [kick("user", true), kick("opp", true)]).flat();

const AFTER_EXTRA_TIME = {
  matchIndex: 0,
  opponent: OPPONENT,
  regulation: { user: 1, opp: 1 },
  extraTime: { user: 0, opp: 0 },
  goals: [],
} satisfies Partial<RecapInput>;

describe("recapLines", () => {
  it("writes the opening, one line per user goal and the shootout from fixed templates", () => {
    expect(recapLines(KNOCKOUT)).toEqual([
      "Drew 3-3 with Lumiose FC after extra time.",
      "Eevee sets up Pikachu in the 11th minute.",
      "Pikachu finds the net in the 22nd minute.",
      "Gengar converts a penalty in the 103rd minute.",
      "Lost the shootout 4-3.",
    ]);
  });

  it("rotates templates by match index so consecutive matches do not read the same", () => {
    expect(
      recapLines({
        matchIndex: 1,
        opponent: OPPONENT,
        regulation: { user: 0, opp: 1 },
        extraTime: null,
        shootout: null,
        outcome: "L",
        goals: [opp(71)],
      }),
    ).toEqual(["A 1-0 defeat to Lumiose FC."]);
    expect(
      recapLines({
        matchIndex: 0,
        opponent: OPPONENT,
        regulation: { user: 1, opp: 0 },
        extraTime: null,
        shootout: null,
        outcome: "W",
        goals: [user(1, 6, 25)],
      }),
    ).toEqual(["Beat Lumiose FC 1-0.", "Charizard scores in the 1st minute, set up by Pikachu."]);
  });

  it("counts 20 sudden-death rounds for an engine-1 or engine-2 decree, not the award pair as a 21st (catches 21 rounds in the recap against 20 on the results screen)", () => {
    // 5 regulation pairs and 20 level sudden-death pairs, then the award pair: the user scores,
    // the opponent misses. 26 pairs, 26 scored to 25.
    const kicks = [...levelPairs(25), kick("user", true), kick("opp", false)];
    const lines = recapLines({
      ...AFTER_EXTRA_TIME,
      shootout: {
        user: 26,
        opp: 25,
        keeper: 143 as SpeciesId,
        kicks,
        decider: "decree",
        coinWinner: null,
      },
      outcome: "W",
    });
    expect(lines.at(-1)).toBe("Won by the engine after 20 rounds of sudden death.");
  });

  it("counts a coin toss's rounds as every pair past the five regulation kicks, for a win and a loss", () => {
    // 5 regulation pairs and the 200 sudden-death pairs the cap allows, all scored, level at 205.
    const shootout = {
      user: 205,
      opp: 205,
      keeper: 143 as SpeciesId,
      kicks: levelPairs(205),
      decider: "coin" as const,
    };
    expect(
      recapLines({
        ...AFTER_EXTRA_TIME,
        shootout: { ...shootout, coinWinner: "user" },
        outcome: "W",
      }).at(-1),
    ).toBe("Won on a coin toss after 200 rounds of sudden death.");
    expect(
      recapLines({
        ...AFTER_EXTRA_TIME,
        shootout: { ...shootout, coinWinner: "opp" },
        outcome: "L",
      }).at(-1),
    ).toBe("Lost on a coin toss after 200 rounds of sudden death.");
  });

  it("never writes a long dash or a mid-sentence colon", () => {
    const text = recapLines(KNOCKOUT).join(" ");
    expect(text.includes("—") || text.includes("–") || /:\s/.test(text)).toBe(false);
    expect(text.length).toBeGreaterThan(100);
  });
});
