import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import type {
  Channel,
  FullLineup,
  GoalKind,
  Line,
  ManagerAction,
  MatchResult,
  Mode,
  Seed,
  Side,
  SpeciesId,
} from "./types";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

/**
 * Where a chance came from. Derived, not simulated: the engine has no ball position, so this
 * reads the shooter's formation slot (line and channel) and the goal kind.
 */
export interface ChanceZone {
  readonly depth: "box" | "outside";
  readonly lane: "left" | "centre" | "right";
}

/** One chance trial as the engine rolled it. A trial is a slice of the goal rate, not a shot. */
export interface StoryChance {
  readonly window: number;
  readonly minute: number;
  readonly side: Side;
  /** The trial's goal probability, the same `p` the engine rolled against. */
  readonly p: number;
  /** "saved" when the engine recorded a save for this trial, "off" for every other miss. */
  readonly outcome: "goal" | "saved" | "off";
  /** The goal's kind; null when the trial did not score. */
  readonly kind: GoalKind | null;
  /** The scorer for a goal, the attacker the save roll picked otherwise. */
  readonly shooter: SpeciesId;
  readonly zone: ChanceZone;
}

/** One five-minute window's chances, summed per side. */
export interface StoryWindow {
  readonly window: number;
  /** The window's last minute, matching `WindowSnapshot.minute`. */
  readonly minute: number;
  readonly xgUser: number;
  readonly xgOpp: number;
  /** xgUser / (xgUser + xgOpp), or 0.5 when neither side had a chance worth anything. */
  readonly territory: number;
}

/** The run a story replays a match from: the same inputs `runCup` takes. */
export interface StoryRun {
  readonly lineup: FullLineup;
  readonly mode: Mode;
  readonly manager?: readonly ManagerAction[];
}

export interface MatchStory {
  readonly chances: readonly StoryChance[];
  readonly windows: readonly StoryWindow[];
  /** Exactly the `MatchResult` that `runCup` produces for this match. */
  readonly result: PlayedMatch;
}

export function chanceZone(line: Line, channel: Channel, kind: GoalKind | null): ChanceZone {
  throw new Error(`chanceZone is not built yet (${line}, ${channel}, ${kind})`);
}

export function matchStory(
  seed: Seed,
  matchIndex: number,
  run: StoryRun,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): MatchStory {
  throw new Error(`matchStory is not built yet (${seed}, ${matchIndex}, ${run.mode}, ${c.match})`);
}
