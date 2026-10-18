import { describe, expect, it } from "vitest";
import { trailPath } from "../Broadcast";

const base = {
  from: { x: 75, y: 50 },
  to: { x: 100, y: 50 },
  effect: null,
  type: null,
  progress: 0.5,
} as const;

describe("trailPath (catches a free kick that curls on the pitch but draws a straight-line arc)", () => {
  it("bends a free kick's trail through its control point", () => {
    expect(trailPath({ ...base, kind: "shot", via: { x: 80.75, y: 43 } })).toBe(
      "M 75.00 32.00 Q 80.75 27.52 100.00 32.00",
    );
  });

  it("keeps the plain arc when a trail has no control point", () => {
    expect(trailPath({ ...base, kind: "shot" })).toBe("M 75.00 32.00 Q 87.50 29.76 100.00 32.00");
  });
});
