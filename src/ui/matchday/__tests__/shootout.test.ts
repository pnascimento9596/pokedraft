import { describe, expect, it } from "vitest";
import { PACE } from "../clock";
import { kickCues, kickProgress, kicksShown, suddenDeath } from "../shootout";

describe("kickProgress (catches a kick that ignores the 2x speed toggle)", () => {
  it("runs from 0 to 1 over one kick and halves the time at 2x", () => {
    expect(kickProgress({ stage: "pens", kickAt: 1000, speed: 1 }, 1600, PACE.live)).toBe(0.5);
    expect(kickProgress({ stage: "pens", kickAt: 1000, speed: 2 }, 1300, PACE.live)).toBe(0.5);
    expect(kickProgress({ stage: "pens", kickAt: 1000, speed: 2 }, 1600, PACE.live)).toBe(1);
    expect(kickProgress({ stage: "pens", kickAt: 1000, speed: 1 }, 5000, PACE.live)).toBe(1);
    expect(kickProgress({ stage: "pens", kickAt: 1000, speed: 1 }, 900, PACE.live)).toBe(0);
  });

  it("reads 0 before the shootout starts and 1 once it is over", () => {
    expect(kickProgress({ stage: "play", kickAt: 0, speed: 1 }, 99_000, PACE.live)).toBe(0);
    expect(kickProgress({ stage: "done", kickAt: 0, speed: 1 }, 0, PACE.live)).toBe(1);
  });
});

describe("kicksShown (catches a shootout dot or score that lands before the keeper reacts)", () => {
  it("counts the kick in flight only once its reaction starts, and only with motion", () => {
    expect(kicksShown(12, 3, 0.59, true)).toBe(3);
    expect(kicksShown(12, 3, 0.6, true)).toBe(4);
    expect(kicksShown(12, 3, 0.9, false)).toBe(3);
    expect(kicksShown(12, 12, 1, true)).toBe(12);
  });
});

describe("suddenDeath (catches a sudden-death banner on a regulation kick)", () => {
  // The engine takes five regulation kicks a side (ENGINE_COEFFICIENTS.shootout.kicks), user
  // first, so kick 11 (index 10) is the first sudden-death kick.
  it("is false through kick 10 and true from kick 11", () => {
    expect([0, 8, 9, 10, 11, 30].map(suddenDeath)).toEqual([false, false, false, true, true, true]);
  });
});

describe("kickCues (catches a silent shootout, or one that plays motion sounds in Quick)", () => {
  it("with motion: whistle at the run-up, the strike at 0.35, then the roar or the glove at 0.6", () => {
    expect(kickCues(true, true)).toEqual([
      { cue: "whistle", at: 0 },
      { cue: "strike", at: 0.35 },
      { cue: "roar", at: 0.6 },
    ]);
    expect(kickCues(false, true)).toEqual([
      { cue: "whistle", at: 0 },
      { cue: "strike", at: 0.35 },
      { cue: "glove", at: 0.6 },
    ]);
  });

  it("without motion: only the outcome, as a beat sound when the kick resolves", () => {
    expect(kickCues(true, false)).toEqual([{ cue: "horn", at: 1 }]);
    expect(kickCues(false, false)).toEqual([{ cue: "glove", at: 1 }]);
  });
});
