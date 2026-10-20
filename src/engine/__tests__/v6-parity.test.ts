import { describe, expect, it } from "vitest";
import { checkParity, emptyTally, parityPanel } from "./v6-parity";

// Regression guard, no RED: behaviour already correct. Every engine 7 rule row before the flip
// must leave the live engine at its default coefficients byte-identical to the frozen engine 6.
describe("live engine against the frozen engine 6 bundle (catches engine 6 drift before the flip)", () => {
  it("plays 50 runs byte for byte", { timeout: 120_000 }, () => {
    const tally = emptyTally();
    for (const run of parityPanel(50)) checkParity(run, tally);
    expect(tally.runs).toBe(50);
    expect([...tally.shapes].sort()).toEqual(["builder", "cup8", "daily", "kanto151"]);
    expect(tally.formations.size).toBe(8);
    expect(tally.coachedMatches).toBeGreaterThan(0);
    expect(tally.injuryAnswers).toBeGreaterThan(0);
    expect(tally.extraTime).toBeGreaterThan(0);
    // Shootouts exercise recapLines' injected c.shootout.kicks.
    expect(tally.shootouts).toBeGreaterThan(0);
  });
});
