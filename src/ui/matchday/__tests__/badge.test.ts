import { describe, expect, it } from "vitest";
import { badgeCorner } from "../badge";

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

describe("play badge under the follow camera (catches a badge clamped to the whole pitch while the camera shows only part of it)", () => {
  // At 1.6x zoom on the far corner flag the camera shows the pitch from 37.5% to 100% each way.
  const VIEW = { left: 37.5, top: 37.5, right: 100, bottom: 100 };

  it("a badge over a player at the view's left edge moves right into the view: left 121.5px", () => {
    const corner = badgeCorner({ x: 40, y: 60 }, BADGE, PITCH, VIEW);
    expect((corner.x / 100) * PITCH.w).toBeCloseTo(121.5, 3);
  });

  it("a badge over a player at the view's top edge moves down into the view: top 77.76px", () => {
    const corner = badgeCorner({ x: 70, y: 40 }, BADGE, PITCH, VIEW);
    expect((corner.y / 100) * PITCH.h).toBeCloseTo(77.76, 3);
  });
});
