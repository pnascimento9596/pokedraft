import type { Active } from "./player";
import type { Point, Shot, Timeline } from "./timeline";

export type CameraMode = "follow" | "full";

/**
 * The follow camera between two frames: the pitch point it centres, in percent of the pitch, how
 * fast that point moves, in percent per second, and how far it has eased out to the full pitch.
 */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  /** 0 is zoomed in on the ball, 1 is the whole pitch. */
  readonly wide: number;
}

export const FOLLOW_ZOOM = 1.6;
// A critically damped spring: the gap shrinks as (1 + wt) e^-wt, under 2% at about 0.49 s.
const OMEGA = 12;
const ZOOM_EASE_MS = 400;
// The frame loop's own cap on a frame, so a frame after a long pause moves no further.
const MAX_STEP_MS = 100;
// No frame of play moves the clock this far, so a jump this big is a seek.
const SEEK_MINUTES = 1;

/** A camera already settled on `target`, zoomed in or out. */
export function cameraAt(target: Point, wide: boolean): Camera {
  return { x: target.x, y: target.y, vx: 0, vy: 0, wide: wide ? 1 : 0 };
}

function spring(at: number, v: number, target: number, s: number): readonly [number, number] {
  // The exact solution over the step for a target that holds still, so any frame length is stable.
  const gap = at - target;
  const decay = Math.exp(-OMEGA * s);
  const k = (v + OMEGA * gap) * s;
  return [target + (gap + k) * decay, (v - OMEGA * k) * decay];
}

/** The camera one frame of `dt` ms later, chasing `target` and easing toward the full pitch if `wide`. */
export function stepCamera(cam: Camera, target: Point, wide: boolean, dt: number): Camera {
  const ms = Math.min(MAX_STEP_MS, Math.max(0, dt));
  if (ms === 0) return cam;
  const s = ms / 1000;
  const [x, vx] = spring(cam.x, cam.vx, target.x, s);
  const [y, vy] = spring(cam.y, cam.vy, target.y, s);
  const ease = ms / ZOOM_EASE_MS;
  const toward = wide ? Math.min(1, cam.wide + ease) : Math.max(0, cam.wide - ease);
  return { x, y, vx, vy, wide: toward };
}

export function zoomOf(cam: Camera): number {
  const u = cam.wide;
  const eased = u * u * (3 - 2 * u);
  return 1 + (FOLLOW_ZOOM - 1) * (1 - eased);
}

// How far the pitch moves, in percent of its own box, so `point` sits in the middle of the view
// without the view leaving the pitch.
function shift(point: number, zoom: number): number {
  return Math.min(0, Math.max(100 * (1 - zoom), 50 - zoom * point));
}

function frame(cam: Camera): { readonly zoom: number; readonly tx: number; readonly ty: number } {
  const zoom = zoomOf(cam);
  return { zoom, tx: shift(cam.x, zoom), ty: shift(cam.y, zoom) };
}

/** The pitch layer's transform, from its top left corner. */
export function cameraTransform(cam: Camera): string {
  const { zoom, tx, ty } = frame(cam);
  const fixed = (n: number) => (n === 0 ? 0 : n).toFixed(2);
  return `translate(${fixed(tx)}%, ${fixed(ty)}%) scale(${zoom.toFixed(3)})`;
}

/** The part of the pitch the camera shows, in percent of the pitch. */
export function visibleRect(cam: Camera): {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
} {
  const { zoom, tx, ty } = frame(cam);
  return { x: -tx / zoom, y: -ty / zoom, w: 100 / zoom, h: 100 / zoom };
}

/** Where a pitch point shows, in percent of the camera's view. */
export function projectPoint(cam: Camera, p: Point): Point {
  const { zoom, tx, ty } = frame(cam);
  return { x: tx + zoom * p.x, y: ty + zoom * p.y };
}

/**
 * Goals and saves (set pieces and penalties included) are framed whole: the camera eases out to the
 * full pitch while one is staged or settling, and stays out for the shootout.
 */
export function framesWhole(
  timeline: Timeline,
  clock: number,
  active: Active | null,
  shot: Shot | null,
): boolean {
  if (shot !== null || active?.beat.kind === "goal" || active?.beat.kind === "save") return true;
  return timeline.kicks.length > 0 && clock >= timeline.finalMinute;
}

/** Follow on a phone, the full pitch from 600px and under reduced motion; a stored choice wins. */
export function defaultCamera(screen: {
  readonly wide: boolean;
  readonly reducedMotion: boolean;
  readonly stored: CameraMode | null;
}): CameraMode {
  if (screen.stored !== null) return screen.stored;
  return screen.wide || screen.reducedMotion ? "full" : "follow";
}

/** Whether the clock moving from `from` to `to` minutes in one frame is a seek, not play. */
export function seeks(from: number, to: number): boolean {
  return to < from || to - from > SEEK_MINUTES;
}
