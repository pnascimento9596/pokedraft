import { describe, expect, it } from "vitest";
import { badgeCorner, keepInside } from "../badge";

// The pitch at 390px is 324 by 207.36; a long badge there is about 150 by 18.
const PITCH = { w: 324, h: 207.36 };
const BADGE = { w: 150, h: 18 };

function box(point: { x: number; y: number }) {
  const corner = badgeCorner(point, BADGE, PITCH);
  const left = (corner.x / 100) * PITCH.w;
  const top = (corner.y / 100) * PITCH.h;
  const px = (n: number) => Math.round(n * 1000) / 1000;
  return { left: px(left), top: px(top), right: px(left + BADGE.w), bottom: px(top + BADGE.h) };
}

describe("play badge placement (catches badges clipped at the pitch edge)", () => {
  it("centres the badge over the player, its bottom 1.25 badge heights above them, in midfield", () => {
    const corner = badgeCorner({ x: 50, y: 50 }, BADGE, PITCH);
    expect(corner.x).toBeCloseTo(26.852, 3);
    expect(corner.y).toBeCloseTo(30.469, 3);
  });

  it("edge badge stays inside the pitch box", () => {
    expect(box({ x: 97, y: 40 })).toEqual({ left: 174, top: 42.444, right: 324, bottom: 60.444 });
    expect(box({ x: 2, y: 3 })).toEqual({ left: 0, top: 0, right: 150, bottom: 18 });
    expect(box({ x: 50, y: 100 }).top).toBe(166.86);
  });

  it("keeps every badge inside the pitch across a grid of player spots (catches a clamp on one edge only)", () => {
    const outside: string[] = [];
    for (let x = 0; x <= 100; x += 5)
      for (let y = 0; y <= 100; y += 5) {
        const b = box({ x, y });
        if (b.left < 0 || b.top < 0 || b.right > PITCH.w || b.bottom > PITCH.h)
          outside.push(`${x},${y}`);
      }
    expect(outside).toEqual([]);
  });

  it("leaves the badge on the player before the pitch is measured", () => {
    expect(badgeCorner({ x: 97, y: 3 }, { w: 0, h: 0 }, { w: 0, h: 0 })).toEqual({ x: 97, y: 3 });
  });
});

describe("nameplate kept inside the view (catches the carrier's nameplate clipped at the pitch edge)", () => {
  const VIEW = { x: 0, y: 0, w: 360, h: 230.4 };

  it("moves a nameplate 23.4px off the left edge 23.4px right, and leaves its height alone", () => {
    expect(keepInside({ x: -23.4, y: 120, w: 70, h: 18 }, VIEW)).toEqual({ x: 23.4, y: 0 });
  });

  it("moves a nameplate past the right and bottom edges back by exactly the overlap", () => {
    const move = keepInside({ x: 300, y: 220, w: 70, h: 18 }, VIEW);
    expect(move.x).toBe(-10);
    expect(move.y).toBeCloseTo(-7.6, 10);
  });

  it("keeps the nameplate inside a zoomed view's window, not the whole pitch", () => {
    expect(keepInside({ x: 100, y: 50, w: 70, h: 18 }, { x: 120, y: 40, w: 225, h: 144 })).toEqual({
      x: 20,
      y: 0,
    });
  });

  it("does not move a nameplate already inside", () => {
    expect(keepInside({ x: 10, y: 10, w: 70, h: 18 }, VIEW)).toEqual({ x: 0, y: 0 });
  });
});
