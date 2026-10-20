import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { runCup } from "../cup";
import { goalKindOf, type MatchStarter } from "../match";
import { createEngineRng } from "../rng";
import { asSpeciesId, speciesById } from "../species";
import type { GoalKind, Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

const TRIALS = 10_000;

// Three forwards: a striker between two wingers, the ATT line of a 4-3-3.
const attack = (ids: readonly [number, number, number]): MatchStarter[] =>
  ids.map((id, i) => ({
    species: speciesById(asSpeciesId(id)),
    line: "ATT",
    role: i === 1 ? "ST" : "W",
  }));

// Honchkrow, Conkeldurr and Fearow: AER 85, 85 and 84.
const HIGH_AER = attack([430, 534, 22]);
// Kartana, Shaymin and Togedemaru: AER 44, 46 and 44.
const LOW_AER = attack([798, 492, 777]);
// Dodrio, Krookodile and Darmanitan: mean(DRI, ACC) 89.5, 82 and 83.5.
const HIGH_CARRY = attack([85, 553, 555]);
// Armaldo, Druddigon and Golurk: mean(DRI, ACC) 42, 41 and 41.5.
const LOW_CARRY = attack([348, 621, 623]);

/** The kinds of TRIALS goals, each from the same seeded draws, so only the attack differs. */
function kinds(pool: readonly MatchStarter[], c: EngineCoefficients) {
  const rng = createEngineRng("goal-kind-guard");
  const count: Record<Exclude<GoalKind, "penalty">, number> = {
    header: 0,
    "free-kick": 0,
    solo: 0,
    "open-play": 0,
  };
  for (let i = 0; i < TRIALS; i++) count[goalKindOf(rng.next(), pool, c)]++;
  return count;
}

describe("engine 7 goal kinds follow the attack (catches a header share blind to who is in the box)", () => {
  it("a high-AER attack heads in 1,706 of 10,000 goals and a low-AER one 922", () => {
    expect(kinds(HIGH_AER, ENGINE_COEFFICIENTS_V7)).toEqual({
      header: 1706,
      "free-kick": 793,
      solo: 2079,
      "open-play": 5422,
    });
    expect(kinds(LOW_AER, ENGINE_COEFFICIENTS_V7)).toEqual({
      header: 922,
      "free-kick": 802,
      solo: 2706,
      "open-play": 5570,
    });
  });

  it("a high-DRI and ACC attack scores 2,674 solo goals of 10,000 and a low one 1,301", () => {
    expect(kinds(HIGH_CARRY, ENGINE_COEFFICIENTS_V7)).toEqual({
      header: 1716,
      "free-kick": 794,
      solo: 2674,
      "open-play": 4816,
    });
    expect(kinds(LOW_CARRY, ENGINE_COEFFICIENTS_V7)).toEqual({
      header: 1762,
      "free-kick": 793,
      solo: 1301,
      "open-play": 6144,
    });
  });
});

/** Goals whose kind changes when only the weighting is switched on, over golden panel runs 0 to 49. */
function weightedPanel() {
  const weighted = structuredClone(ENGINE_COEFFICIENTS);
  weighted.goalKind = { weighted: true, header: 1, solo: 1 };
  const t = { user: { goals: 0, changed: 0 }, opp: { goals: 0, changed: 0 }, moved: 0 };
  for (let r = 0; r < 50; r++) {
    const seed = `panel-${r}` as Seed;
    const lineup = draftLineup(CUP8, seed);
    const live = runCup(lineup, seed, "cup8").matches;
    runCup(lineup, seed, "cup8", weighted).matches.forEach((m, k) => {
      const base = live[k]!;
      if (m.status !== "played" || base.status !== "played") return;
      base.goals.forEach((g, i) => {
        const w = m.goals[i];
        if (w?.side !== g.side || w.minute !== g.minute) t.moved++;
        t[g.side].goals++;
        if (w?.kind !== g.kind) t[g.side].changed++;
      });
    });
  }
  return t;
}

describe("a match weights both sides' goal kinds (catches the weighting reaching only one side)", () => {
  it("panel runs 0 to 49: 63 of 495 user goals and 7 of 177 opponent goals change kind, none moves", () => {
    expect(weightedPanel()).toEqual({
      user: { goals: 495, changed: 63 },
      opp: { goals: 177, changed: 7 },
      moved: 0,
    });
  });
});

// Regression guard, no RED: behaviour already correct. Engine 6's shares ignore the attack.
describe("engine 6 goal kinds ignore the attack (catches the weighting leaking into live runs)", () => {
  it("every attack gets the same 1,266 headers, 783 free kicks and 1,817 solo goals", () => {
    for (const pool of [HIGH_AER, LOW_AER, HIGH_CARRY, LOW_CARRY]) {
      expect(kinds(pool, ENGINE_COEFFICIENTS)).toEqual({
        header: 1266,
        "free-kick": 783,
        solo: 1817,
        "open-play": 6134,
      });
    }
  });
});
