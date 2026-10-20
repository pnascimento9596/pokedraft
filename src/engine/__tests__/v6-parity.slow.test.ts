import { describe, expect, it } from "vitest";
import { checkParity, emptyTally, parityPanel } from "./v6-parity";

// Excluded from `pnpm test`. Run with: SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/v6-parity.slow.test.ts --silent=false
describe("live engine against the frozen engine 6 bundle, 200 runs (the Red reviewer's receipt run)", () => {
  it("plays 200 runs byte for byte", { timeout: 600_000 }, () => {
    const tally = emptyTally();
    for (const run of parityPanel(200)) checkParity(run, tally);
    expect(tally.runs).toBe(200);
    expect(tally.formations.size).toBe(8);
    expect(tally.injuryAnswers).toBeGreaterThan(0);
    console.log(
      `v6 parity: ${JSON.stringify({ ...tally, shapes: [...tally.shapes], formations: tally.formations.size })}`,
    );
  });
});
