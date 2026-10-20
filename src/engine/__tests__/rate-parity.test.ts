import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "../coefficients";
import { firstDivergence, rateInputs, rateTraces } from "./v6-parity";

// Output parity only sees a rate when it flips an outcome, so this compares every trial the live
// engine observes (rate, outcome, kind, shooter) with the frozen engine 6 bundle. Golden panel runs
// 0 to 7, uncoached and holding Counter or Press, reach leads, tired sides and the opponent's side.
const INPUTS = rateInputs(8);

function divergences(c: EngineCoefficients) {
  const sides = { user: 0, opp: 0, length: 0 };
  let trials = 0;
  for (const { input } of INPUTS) {
    const traces = rateTraces(input, c);
    trials += traces.frozen.length;
    const side = firstDivergence(traces);
    if (side !== null) sides[side]++;
  }
  return { sides, trials };
}

function mutate(patch: (c: EngineCoefficients) => void): EngineCoefficients {
  const c = structuredClone(ENGINE_COEFFICIENTS);
  patch(c);
  return c;
}

// Regression guard, no RED: behaviour already correct.
describe("per-trial rate parity with engine 6 (catches a dormant engine 7 term moving engine 6)", () => {
  it("123 matches, 12946 trials, every one identical at the live coefficients", () => {
    expect(INPUTS.length).toBe(123);
    expect(divergences(ENGINE_COEFFICIENTS)).toEqual({
      sides: { user: 0, opp: 0, length: 0 },
      trials: 12946,
    });
  });
});

// The comparison above can only pass honestly if it would fail when a term goes live. Each case
// switches one engine 7 term on in a clone of the live coefficients and checks the comparison sees
// it, on the opponent's side as well as the user's.
describe("per-trial rate parity self-test (catches a comparison too blind to see a live term)", () => {
  it("counterLead 1.1: 23 matches diverge first on the user's side, 11 on the opponent's", () => {
    const c = mutate((m) => {
      m.manager.counterLead = 1.1;
    });
    expect(divergences(c).sides).toEqual({ user: 23, opp: 11, length: 0 });
  });

  it("pressFade.perPoint 0.004: 20 user-side and 13 opponent-side divergences", () => {
    const c = mutate((m) => {
      m.manager.pressFade.perPoint = 0.004;
    });
    expect(divergences(c).sides).toEqual({ user: 20, opp: 13, length: 0 });
  });

  it("missable penalties at awardShare 0.077: 23 user-side and 15 opponent-side divergences", () => {
    const c = mutate((m) => {
      m.penalty.missable = true;
      m.penalty.awardShare = 0.077;
    });
    expect(divergences(c).sides).toEqual({ user: 23, opp: 15, length: 0 });
  });

  it("opponent injuries: 11 user-side and 23 opponent-side divergences", () => {
    const c = mutate((m) => {
      m.opponent.injuries = true;
    });
    expect(divergences(c).sides).toEqual({ user: 11, opp: 23, length: 0 });
  });

  it("weighted goal kinds: 24 user-side divergences, each first in a goal's kind", () => {
    const c = mutate((m) => {
      m.goalKind = { weighted: true, header: 1, solo: 1 };
    });
    expect(divergences(c).sides).toEqual({ user: 24, opp: 0, length: 0 });
    const firstFields = new Set<string>();
    for (const { input } of INPUTS) {
      const { live, frozen } = rateTraces(input, c);
      const i = live.findIndex((ch, k) => JSON.stringify(ch) !== JSON.stringify(frozen[k]));
      if (i < 0) continue;
      const a = live[i]!;
      const b = frozen[i]!;
      firstFields.add(
        (Object.keys(a) as (keyof typeof a)[]).filter((key) => a[key] !== b[key]).join(","),
      );
    }
    expect([...firstFields].sort()).toEqual(["kind", "kind,shooter,slot"]);
  });
});
