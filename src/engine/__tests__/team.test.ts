import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { matchLines, rateTeam } from "../team";
import type { FullLineup } from "../types";

function lineup(starters: number[], bench: number[]): FullLineup {
  return { formation: "4-3-3", starters, bench } as unknown as FullLineup;
}

const P75 = lineup([31, 123, 28, 139, 181, 6, 59, 121, 25, 38, 136], [1, 4, 7, 10, 13]);
const KANTO = lineup([9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135], [25, 94, 65, 68, 143]);

describe("rateTeam", () => {
  it("does not concentrate drag on a GK whose fit is the GK p75 (raw fit would)", () => {
    const rating = rateTeam(P75);
    const gk = rating.slots[0];
    const cb = rating.slots[2];
    expect([gk.role, gk.fit, cb.role, cb.fit]).toEqual(["GK", 40, "CB", 73]);

    const rawMean = rating.slots.reduce((s, x) => s + x.fit, 0) / 11;
    expect(rawMean - gk.fit).toBeCloseTo(28.27, 2);

    const qualityMean = rating.slots.reduce((s, x) => s + x.quality, 0) / 11;
    expect(Math.abs(gk.quality - qualityMean)).toBeLessThan(0.05);
    expect(rating.drag).toBeLessThan(0.01);
  });

  it("pins the p75 lineup's components so a formula change shows up as a diff", () => {
    const rating = rateTeam(P75);
    expect(rating.score).toBe(788);
    expect(rating.core).toBeCloseTo(0.7481674796747967, 12);
    expect(rating.drag).toBeCloseTo(0.003784183296378437, 12);
    expect(rating.synergy).toBeCloseTo(0.7196969696969696, 12);
    expect(rating.bench).toBeCloseTo(0.2856585365853659, 12);
    expect(rating.weakest).toEqual(["4-3-3.LB", "4-3-3.RB", "4-3-3.GK"]);
    expect(rating.edges).toHaveLength(33);
    expect(rating.slots[1]).toEqual({
      slot: "4-3-3.LB",
      species: 123,
      role: "FB",
      fit: 66,
      familiarity: 0.85,
      quality: 0.7375609756097561,
    });
  });

  it("scores each adjacency edge by its reasons and caps it (sum or cap wrong would move these)", () => {
    const edges = rateTeam(P75).edges.slice(0, 5);
    expect(edges).toEqual([
      { a: "4-3-3.CDM", b: "4-3-3.LB", reasons: ["sharedType", "sameGen", "coverage"], value: 1 },
      { a: "4-3-3.CDM", b: "4-3-3.LCB", reasons: ["sameGen", "coverage"], value: 0.5 },
      { a: "4-3-3.CDM", b: "4-3-3.LCM", reasons: ["sharedType", "sameGen", "coverage"], value: 1 },
      { a: "4-3-3.CDM", b: "4-3-3.LW", reasons: ["sameGen", "coverage"], value: 0.5 },
      { a: "4-3-3.CDM", b: "4-3-3.RB", reasons: ["coverage"], value: 0.25 },
    ]);
  });

  it("pins a strong Kanto lineup so the weakest-link order and score stay stable", () => {
    const rating = rateTeam(KANTO);
    expect(rating.score).toBe(943);
    expect(rating.drag).toBeCloseTo(0.016090169992608944, 12);
    expect(rating.weakest).toEqual(["4-3-3.RCM", "4-3-3.CDM", "4-3-3.RB"]);
  });

  it("uses a passed coefficient variant instead of the module table", () => {
    const noSynergy = {
      ...ENGINE_COEFFICIENTS,
      team: { ...ENGINE_COEFFICIENTS.team, synergyWeight: 0 },
    };
    expect(rateTeam(P75, noSynergy).score).toBe(713);
  });

  it("bends the blend with x + k·x·(1 − x), so curve 0 is the raw blend and the curve lifts mid scores", () => {
    const flat = { ...ENGINE_COEFFICIENTS, team: { ...ENGINE_COEFFICIENTS.team, curve: 0 } };
    expect(ENGINE_COEFFICIENTS.team.curve).toBe(0.4);
    expect(rateTeam(P75, flat).score).toBe(705);
    expect(rateTeam(P75).score).toBe(788);
  });
});

describe("matchLines", () => {
  it("centres the line shape on score / 10 so equal scores mean equal average strength", () => {
    const lines = matchLines(rateTeam(P75));
    expect(lines.GK).toBeCloseTo(78.70142276422763, 10);
    expect(lines.DEF).toBeCloseTo(78.64044715447154, 10);
    expect(lines.MID).toBeCloseTo(79.02662601626017, 10);
    expect(lines.ATT).toBeCloseTo(78.83150406504065, 10);
    expect((lines.GK + lines.DEF + lines.MID + lines.ATT) / 4).toBeCloseTo(78.8, 10);
  });
});
