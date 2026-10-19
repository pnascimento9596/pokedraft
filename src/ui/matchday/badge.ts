import type { Point } from "./timeline";

export interface Size {
  readonly w: number;
  readonly h: number;
}

// The badge floats over its player: its bottom edge this many badge heights above their feet.
const LIFT = 1.25;

const within = (value: number, max: number) => Math.max(0, Math.min(value, max));

/**
 * Where the play badge's top left corner goes, in percent of the pitch: centred over the player
 * at `point`, then moved the least distance that keeps the whole badge on the pitch.
 */
export function badgeCorner(point: Point, badge: Size, pitch: Size): Point {
  if (pitch.w === 0 || pitch.h === 0) return point;
  const left = within((point.x / 100) * pitch.w - badge.w / 2, pitch.w - badge.w);
  const top = within((point.y / 100) * pitch.h - badge.h * (1 + LIFT), pitch.h - badge.h);
  return { x: (left / pitch.w) * 100, y: (top / pitch.h) * 100 };
}

/** A box in pixels: its top left corner and its size. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const between = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** The least move, in pixels, that keeps the whole of `box` inside `bounds`, as `badgeCorner` does. */
export function keepInside(box: Box, bounds: Box): Point {
  return {
    x: between(box.x, bounds.x, bounds.x + bounds.w - box.w) - box.x,
    y: between(box.y, bounds.y, bounds.y + bounds.h - box.h) - box.y,
  };
}
