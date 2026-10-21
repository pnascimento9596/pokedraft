import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { cupMatchInput, runCup } from "../cup";
import { playMatchCore } from "../match";
import { buildLadder } from "../opponents";
import { createEngineRng, deriveSubseed } from "../rng";
import type { MatchResult, Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Golden panel run 10 (cup8 4-2-3-1), match 0 against Hau'oli City (fighting), under engine 7.
const SEED = "panel-10" as Seed;
const LINEUP = draftLineup(CUP8, SEED);

function match0(c: EngineCoefficients): PlayedMatch {
  const m = runCup(LINEUP, SEED, "cup8", c).matches[0];
  if (m?.status !== "played") throw new Error("match 0 is always played");
  return m;
}

const opponentChanges = (m: PlayedMatch) =>
  (m.incidents ?? []).filter(
    (i) => i.side === "opp" && (i.kind === "injury" || i.kind === "sub" || i.kind === "rotate"),
  );

/** Engine 7's new output across golden panel runs 0 to n - 1. */
function census(c: EngineCoefficients, n: number) {
  const t = { matches: 0, oppInjuries: 0, oppSubs: 0, rotations: 0, oppEnergyKeys: 0 };
  for (let r = 0; r < n; r++) {
    const seed = `panel-${r}` as Seed;
    const cup = runCup(draftLineup(CUP8, seed), seed, "cup8", c);
    t.oppEnergyKeys += JSON.stringify(cup).split('"oppEnergy"').length - 1;
    for (const m of cup.matches) {
      if (m.status !== "played") continue;
      t.matches++;
      for (const i of m.incidents ?? []) {
        if (i.kind === "injury" && i.side === "opp") t.oppInjuries++;
        if (i.kind === "sub" && i.side === "opp") t.oppSubs++;
        if (i.kind === "rotate") t.rotations++;
      }
    }
  }
  return t;
}

describe("opponent injuries under engine 7 (catches a Boss Club that never loses a player)", () => {
  it("panel-10 match 0: Tyrogue (236) is injured at 13' in slot 9 and Monferno (391) comes on", () => {
    const m = match0(ENGINE_COEFFICIENTS_V7);
    expect(m.opponent.name).toBe("Hau'oli City");
    expect(opponentChanges(m).filter((i) => i.kind !== "rotate")).toEqual([
      { kind: "injury", side: "opp", minute: 13, slot: 9, player: 236 },
      {
        kind: "sub",
        side: "opp",
        minute: 13,
        slot: 9,
        out: 236,
        in: 391,
        reason: "injury",
        by: "auto",
      },
    ]);
  });

  it("Monferno takes Hau'oli City's chances from 17' and Tyrogue none after the injury", () => {
    const seen: string[] = [];
    let tyrogue = 0;
    const c = ENGINE_COEFFICIENTS_V7;
    playMatchCore(cupMatchInput(LINEUP, SEED, "cup8", 0, [], c), c, {
      chance: (ch) => {
        if (ch.side !== "opp") return;
        if (ch.shooter === 391) seen.push(`${ch.minute}' ${ch.outcome}`);
        if (ch.shooter === 236 && ch.minute >= 13) tyrogue++;
      },
      window: () => {},
    });
    expect(seen).toEqual([
      "17' off",
      "20' off",
      "23' off",
      "31' off",
      "44' off",
      "47' off",
      "52' saved",
      "52' off",
      "59' saved",
      "63' off",
      "82' off",
      "87' off",
    ]);
    expect(tyrogue).toBe(0);
  });

  it("panel-10 match 0: Hau'oli City rest Riolu (447) at 60' and Mankey (56) at 75'", () => {
    expect(
      opponentChanges(match0(ENGINE_COEFFICIENTS_V7)).filter((i) => i.kind === "rotate"),
    ).toEqual([
      { kind: "rotate", side: "opp", minute: 60, slot: 8, player: 447 },
      { kind: "rotate", side: "opp", minute: 75, slot: 7, player: 56 },
    ]);
  });

  it("each window records the Boss Club's rounded outfield energy, lifted by each rotation", () => {
    const m = match0(ENGINE_COEFFICIENTS_V7);
    expect(m.windows!.map((w) => [w.minute, w.oppEnergy])).toEqual([
      [5, 98],
      [10, 96],
      [15, 95],
      [20, 93],
      [25, 91],
      [30, 89],
      [35, 87],
      [40, 85],
      [45, 83],
      [50, 81],
      [55, 79],
      [60, 78],
      [65, 79],
      [70, 78],
      [75, 76],
      [80, 78],
      [85, 76],
      [90, 73],
    ]);
  });

  it("golden panel runs 0 to 49: 71 opponent injuries, each replaced, and 425 rotations in 242 matches", () => {
    expect(census(ENGINE_COEFFICIENTS_V7, 50)).toEqual({
      matches: 242,
      oppInjuries: 71,
      oppSubs: 71,
      rotations: 425,
      oppEnergyKeys: 4488,
    });
  });
});

describe("a re-injured slot draws a fresh reserve (catches two injuries in one slot sharing one draw)", () => {
  it("panel-87 match 3: Sawk (539) goes off at 6' for Hitmonlee (106), and Hitmonlee at 48' for Pheromosa (795)", () => {
    const seed = "panel-87" as Seed;
    const m = runCup(draftLineup(CUP8, seed), seed, "cup8", ENGINE_COEFFICIENTS_V7).matches[3];
    if (m?.status !== "played") throw new Error("match 3 is played");
    expect(
      opponentChanges(m).flatMap((i) =>
        i.kind === "sub" ? [[i.minute, i.slot, i.out, i.in]] : [],
      ),
    ).toEqual([
      [6, 8, 539, 106],
      [48, 8, 106, 795],
    ]);
  });
});

// Regression guard, no RED: behaviour already correct. A reserve is drawn on its own
// `opponent_roster` scope, `inj:<match>:<slot>:<n>`, so the ladder's rung scopes draw what they drew.
describe("the reserve's scope leaves the opponent rosters alone (catches a reserve draw shifting a ladder)", () => {
  it("the rung scopes 0 to 7 still open on the same first draw, and inj:0:9:0 opens elsewhere", () => {
    const first = (scope: string) =>
      createEngineRng(deriveSubseed("pin-seed", "opponent_roster", scope)).uint32();
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((k) => first(`${k}`))).toEqual([
      3865100042, 441332670, 3912850124, 3395792505, 3917561808, 2638849127, 222207424, 2684933535,
    ]);
    expect(first("inj:0:9:0")).toBe(2134766504);
  });

  it("panel runs 0 to 9 field the same Boss Clubs under live coefficients as under ENGINE_COEFFICIENTS_V7", () => {
    for (let r = 0; r < 10; r++) {
      const seed = `panel-${r}` as Seed;
      expect(buildLadder(seed, "cup8", ENGINE_COEFFICIENTS)).toEqual(
        buildLadder(seed, "cup8", ENGINE_COEFFICIENTS_V7),
      );
    }
  });
});
