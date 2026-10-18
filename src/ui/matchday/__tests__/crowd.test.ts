import { describe, expect, it } from "vitest";
import { crowdGain, kickPassDue, roarFor } from "../crowd";

describe("crowdGain (catches a crowd bed that ignores where the ball is)", () => {
  it("sits low at the centre spot and rises toward both goals, loudest at the user's attacking end", () => {
    expect(crowdGain(50)).toBeCloseTo(0.03, 10);
    expect(crowdGain(100)).toBeCloseTo(0.09, 10);
    expect(crowdGain(0)).toBeCloseTo(0.06, 10);
    expect(crowdGain(75)).toBeCloseTo(0.06, 10);
    expect(crowdGain(25)).toBeCloseTo(0.045, 10);
  });

  it("clamps a ball drawn past either goal line", () => {
    expect(crowdGain(140)).toBeCloseTo(0.09, 10);
    expect(crowdGain(-20)).toBeCloseTo(0.06, 10);
  });
});

describe("roarFor (catches a late equaliser that roars no longer than any other goal)", () => {
  it("a normal user goal roars for 2250 ms: 150 up, 900 held, 1200 down", () => {
    expect(roarFor({ minute: 30, side: "user", score: { user: 1, opp: 0 } }, 1)).toEqual({
      peak: 0.32,
      attackMs: 150,
      holdMs: 900,
      releaseMs: 1200,
    });
  });

  it("an 80' or later equaliser roars for 4950 ms: 150 up, 2400 held, 2400 down", () => {
    expect(roarFor({ minute: 84, side: "user", score: { user: 2, opp: 2 } }, 1)).toEqual({
      peak: 0.32,
      attackMs: 150,
      holdMs: 2400,
      releaseMs: 2400,
    });
    expect(roarFor({ minute: 80, side: "opp", score: { user: 1, opp: 1 } }, 1)).toEqual({
      peak: 0.16,
      attackMs: 150,
      holdMs: 2400,
      releaseMs: 2400,
    });
  });

  it("a 79' equaliser and an 85' winner are normal goals", () => {
    expect(roarFor({ minute: 79, side: "user", score: { user: 1, opp: 1 } }, 1).holdMs).toBe(900);
    expect(roarFor({ minute: 85, side: "user", score: { user: 2, opp: 1 } }, 1).holdMs).toBe(900);
  });

  it("an opponent goal draws a quieter roar", () => {
    expect(roarFor({ minute: 12, side: "opp", score: { user: 0, opp: 1 } }, 1).peak).toBe(0.16);
  });

  it("at 2x speed every stage of the roar takes half as long", () => {
    expect(roarFor({ minute: 88, side: "user", score: { user: 1, opp: 1 } }, 2)).toEqual({
      peak: 0.32,
      attackMs: 75,
      holdMs: 1200,
      releaseMs: 1200,
    });
  });
});

describe("kickPassDue (catches a kick thud on every passing phase)", () => {
  const pass = { kind: "pass" as const, callout: null };

  const thuds = (eligible: readonly number[]): number[] => {
    const out: number[] = [];
    for (const i of eligible) if (kickPassDue(i, pass, out.at(-1) ?? null)) out.push(i);
    return out;
  };

  it("sounds on phases 0, 3, 6 and 9 of ten passing phases in a row, never two within three", () => {
    expect(thuds([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([0, 3, 6, 9]);
  });

  it("drops the second of two back-to-back passes and keeps the rest", () => {
    expect(thuds([0, 5, 6, 8, 12, 16])).toEqual([0, 5, 8, 12, 16]);
  });

  it("a dribble or a phase with a callout never thuds", () => {
    expect(kickPassDue(0, { kind: "dribble", callout: null }, null)).toBe(false);
    expect(
      kickPassDue(
        3,
        {
          kind: "through",
          callout: { move: "Ember", effect: "fire", text: "Ember!" } as never,
        },
        null,
      ),
    ).toBe(false);
  });
});
