import { describe, expect, it } from "vitest";
import { recapLines, type RecapInput } from "../recap";
import type { GoalEvent, Opponent, Shirt, SpeciesId } from "../types";

const OPPONENT: Opponent = {
  id: "lumiose-fc",
  name: "Lumiose FC",
  score: 800,
  lines: { GK: 80, DEF: 80, MID: 80, ATT: 80 },
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
  scorer: 9 as Shirt,
  assist: null,
});

const KNOCKOUT: RecapInput = {
  matchIndex: 4,
  opponent: OPPONENT,
  regulation: { user: 2, opp: 2 },
  extraTime: { user: 1, opp: 1 },
  shootout: { user: 3, opp: 4, keeper: 143 as SpeciesId, kicks: [] },
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

  it("never writes a long dash or a mid-sentence colon", () => {
    const text = recapLines(KNOCKOUT).join(" ");
    expect(text.includes("—") || text.includes("–") || /:\s/.test(text)).toBe(false);
    expect(text.length).toBeGreaterThan(100);
  });
});
