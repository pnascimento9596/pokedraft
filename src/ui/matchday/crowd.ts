import type { Side } from "@/engine/types";
import type { PlayPhase } from "./timeline";

/** Crowd bed gain at the user's own goal line, the centre spot and the opponent's goal line. */
const BED = { own: 0.06, centre: 0.03, opp: 0.09 } as const;

/**
 * The crowd bed's gain for a ball at `ballX` (0 is the user's goal line, 100 the opponent's): it
 * sits low in midfield and swells toward either box, loudest when the user attacks.
 */
export function crowdGain(ballX: number): number {
  const x = Math.min(100, Math.max(0, ballX));
  return x >= 50
    ? BED.centre + (BED.opp - BED.centre) * ((x - 50) / 50)
    : BED.centre + (BED.own - BED.centre) * ((50 - x) / 50);
}

export interface Roar {
  readonly peak: number;
  readonly attackMs: number;
  readonly holdMs: number;
  readonly releaseMs: number;
}

const ROAR_PEAK: Readonly<Record<Side, number>> = { user: 0.32, opp: 0.16 };
const ROAR_ATTACK = 150;
const ROAR_NORMAL = { hold: 900, release: 1200 } as const;
const ROAR_LATE_LEVELLER = { hold: 2400, release: 2400 } as const;
const LATE_MINUTE = 80;

/**
 * The crowd's roar for a goal, in real milliseconds at `speed`. An equaliser at 80' or later holds
 * and fades for longer than any other goal.
 */
export function roarFor(
  goal: {
    readonly minute: number;
    readonly side: Side;
    readonly score: { readonly user: number; readonly opp: number };
  },
  speed: number,
): Roar {
  const late = goal.minute >= LATE_MINUTE && goal.score.user === goal.score.opp;
  const shape = late ? ROAR_LATE_LEVELLER : ROAR_NORMAL;
  return {
    peak: ROAR_PEAK[goal.side],
    attackMs: ROAR_ATTACK / speed,
    holdMs: shape.hold / speed,
    releaseMs: shape.release / speed,
  };
}

const ROAR_PENALTY = { hold: 500, release: 700 } as const;

/** The crowd's roar for a scored shootout kick: shorter than a goal's, so the next run-up is heard. */
export function penRoar(side: Side, speed: number): Roar {
  return {
    peak: ROAR_PEAK[side],
    attackMs: ROAR_ATTACK / speed,
    holdMs: ROAR_PENALTY.hold / speed,
    releaseMs: ROAR_PENALTY.release / speed,
  };
}

/** Phases between kick thuds, counting the phase that thudded. */
const KICK_GAP = 3;

/**
 * Whether phase `index` plays the kick thud: a pass with no callout of its own, at least three
 * phases after the last thud, so the thud never sounds twice in any three phases.
 */
export function kickPassDue(
  index: number,
  phase: Pick<PlayPhase, "kind" | "callout">,
  lastKick: number | null,
): boolean {
  if (phase.callout !== null || phase.kind === "dribble") return false;
  return lastKick === null || index - lastKick >= KICK_GAP;
}
