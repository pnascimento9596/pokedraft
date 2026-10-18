import { ENGINE_COEFFICIENTS } from "@/engine";
import type { Side } from "@/engine/types";
import type { Pace } from "./clock";
import type { Effect } from "./moves";
import type { PlayState } from "./player";
import type { BallTrail, PlayerPose, Point } from "./timeline";

/** The share of a kick at which the taker strikes the ball. */
export const RUN_UP_END = 0.35;
/** The share of a kick at which the ball reaches the goal and the keeper's reaction starts. */
export const FLIGHT_END = 0.6;

// The engine takes five regulation kicks a side, so every kick after them is sudden death.
const REGULATION_KICKS = 2 * ENGINE_COEFFICIENTS.shootout.kicks;

/** How far through the kick in progress the shootout is: 0 before it starts, 1 once it is over. */
export function kickProgress(
  state: Pick<PlayState, "stage" | "kickAt" | "speed">,
  now: number,
  pace: Pace,
): number {
  if (state.stage === "done") return 1;
  if (state.stage !== "pens") return 0;
  return clamp01((now - state.kickAt) / (pace.kick / state.speed));
}

/** Kicks whose outcome is on screen: with motion, the kick in progress counts once it lands. */
export function kicksShown(
  total: number,
  kicks: number,
  progress: number,
  motion: boolean,
): number {
  return motion && kicks < total && progress >= FLIGHT_END ? kicks + 1 : kicks;
}

export function suddenDeath(index: number): boolean {
  return index >= REGULATION_KICKS;
}

export type KickCue = "whistle" | "strike" | "roar" | "horn" | "glove";

/**
 * The sounds of one kick and the progress each plays at. A still pitch (Quick or reduced motion)
 * only hears the outcome, as a beat sound, once the kick resolves.
 */
export function kickCues(
  scored: boolean,
  motion: boolean,
): readonly { readonly cue: KickCue; readonly at: number }[] {
  if (!motion) return [{ cue: scored ? "horn" : "glove", at: 1 }];
  return [
    { cue: "whistle", at: 0 },
    { cue: "strike", at: RUN_UP_END },
    { cue: scored ? "roar" : "glove", at: FLIGHT_END },
  ];
}

export interface KickStage {
  readonly taker: { readonly point: Point; readonly pose: PlayerPose; readonly hasBall: boolean };
  readonly keeper: { readonly point: Point; readonly pose: PlayerPose };
  readonly ball: {
    readonly point: Point;
    readonly loft: number;
    readonly spin: number;
    readonly effect: Effect | null;
  };
  readonly trail: BallTrail | null;
}

// Which way each kick goes, by kick index: deterministic and not a simple alternation.
const AIM: readonly (1 | -1)[] = [1, -1, -1, 1, -1, 1, 1, -1];
const RUN_BACK = 7;
const RUN_WIDE = 9;
const SHOT_Y = 5;
const DIVE_Y = 7;
const PARRY_Y = 22;
const DIVE_FROM = 0.4;
const LATE_DIVE = 0.25;

/**
 * One kick at `progress`: run-up to the spot until RUN_UP_END, the ball in flight until
 * FLIGHT_END, then the keeper's reaction. A save dives the ball's way in time; a goal beats a
 * keeper who went the wrong way (even kicks) or guessed right too late (odd kicks).
 */
export function stageKick(
  kick: { readonly index: number; readonly side: Side; readonly scored: boolean },
  progress: number,
): KickStage {
  const dir = kick.side === "user" ? 1 : -1;
  const spot: Point = { x: 50 + dir * 39, y: 50 };
  const lineX = 50 + dir * 47;
  const aim = AIM[kick.index % AIM.length]!;
  const target: Point = { x: kick.scored ? 50 + dir * 49 : lineX, y: 50 + aim * SHOT_Y };
  const late = kick.scored && kick.index % 2 === 1;
  const diveSide = kick.scored && !late ? -aim : aim;
  const dive = late
    ? ease((progress - FLIGHT_END) / LATE_DIVE)
    : ease((progress - DIVE_FROM) / (FLIGHT_END - DIVE_FROM));
  const keeper = {
    point: { x: lineX, y: 50 + diveSide * DIVE_Y * dive },
    pose: dive > 0 ? ("dive" as const) : ("idle" as const),
  };

  if (progress < RUN_UP_END) {
    const runStart = { x: spot.x - dir * RUN_BACK, y: spot.y + RUN_WIDE };
    return {
      taker: {
        point: lerp(runStart, spot, ease(progress / RUN_UP_END)),
        pose: "run",
        hasBall: true,
      },
      keeper,
      ball: { point: spot, loft: 0, spin: 0, effect: null },
      trail: null,
    };
  }
  if (progress < FLIGHT_END) {
    const f = (progress - RUN_UP_END) / (FLIGHT_END - RUN_UP_END);
    const point = lerp(spot, target, f);
    return {
      taker: { point: spot, pose: "cast", hasBall: false },
      keeper,
      ball: { point, loft: 0.35 * Math.sin(Math.PI * f), spin: f * 540, effect: null },
      trail: { from: spot, to: point, effect: null, type: null, kind: "shot", progress: f },
    };
  }
  const effect: Effect = kick.scored ? "impact" : "shield";
  const parry: Point = { x: 50 + dir * 41, y: 50 + aim * PARRY_Y };
  const reaction = (progress - FLIGHT_END) / (1 - FLIGHT_END);
  return {
    taker: { point: spot, pose: kick.scored ? "celebrate" : "idle", hasBall: false },
    keeper,
    ball: {
      point: kick.scored ? target : lerp(target, parry, ease(reaction)),
      loft: 0,
      spin: 540,
      effect,
    },
    trail: { from: spot, to: target, effect, type: null, kind: "shot", progress: 1 },
  };
}

/**
 * Where a player waits for their turn: outfield slots 1 to 10 of each side on a two-row arc
 * either side of halfway, far enough apart that no two sprites overlap.
 */
export function waitingPoint(side: Side, slot: number): Point {
  const dir = side === "user" ? 1 : -1;
  const k = Math.min(9, Math.max(0, slot - 1));
  const s = (2 * k) / 9 - 1;
  const depth = 3 + 12 * (1 - s * s) + (k % 2) * 9;
  return { x: 50 - dir * depth, y: 50 + 30 * s };
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function ease(t: number): number {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
