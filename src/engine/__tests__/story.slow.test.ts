import { describe, expect, it } from "vitest";
import { checkRun, panel, type PanelTally } from "./story-panel";

// Excluded from `pnpm test`. Run with: SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/story.slow.test.ts
describe("matchStory parity, 200 runs (the Red reviewer's receipt run)", () => {
  it("replays every played match of 200 runs byte for byte", { timeout: 300_000 }, () => {
    const tally: PanelTally = { matches: 0, extraTime: 0, coachedMatches: 0, saved: 0, off: 0 };
    for (const run of panel(200)) checkRun(run, tally);
    expect(tally.extraTime).toBeGreaterThan(0);
    expect(tally.coachedMatches).toBeGreaterThan(0);
    expect(tally.off / (tally.off + tally.saved)).toBeGreaterThanOrEqual(0.9);
    console.log(`story parity: ${JSON.stringify(tally)}`);
  });
});
