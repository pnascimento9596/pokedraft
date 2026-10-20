import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { cupMatchInput, runCup } from "./cup";
import { FORMATIONS } from "./formations";
import { playMatchCore, type MatchObserver } from "./match";
import { BOSS_FORMATION } from "./opponents";
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
  Slot,
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

const LANE: Readonly<Record<Channel, ChanceZone["lane"]>> = { L: "left", C: "centre", R: "right" };

export function chanceZone(line: Line, channel: Channel, kind: GoalKind | null): ChanceZone {
  if (kind === "penalty") return { depth: "box", lane: "centre" };
  const depth =
    kind === "header"
      ? "box"
      : kind === "free-kick"
        ? "outside"
        : line === "MID" || line === "GK"
          ? "outside"
          : "box";
  return { depth, lane: LANE[channel] };
}

/**
 * Replays match `matchIndex` of a run and returns every chance trial and per-window xG next to
 * the result. Nothing here feeds back into the engine: the result is the one runCup produces.
 * The whole run plays first, so a run runCup rejects throws the same RunTokenError, and a match
 * the run never reaches throws a RangeError.
 */
export function matchStory(
  seed: Seed,
  matchIndex: number,
  run: StoryRun,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): MatchStory {
  const cup = runCup(run.lineup, seed, run.mode, c, run.manager ?? []);
  if (cup.matches[matchIndex]?.status !== "played") {
    throw new RangeError(`the run never plays match ${matchIndex}`);
  }
  const input = cupMatchInput(run.lineup, seed, run.mode, matchIndex, run.manager ?? [], c);
  const slots: Readonly<Record<Side, readonly Slot[]>> = {
    user: FORMATIONS[run.lineup.formation].slots,
    opp: BOSS_FORMATION.slots,
  };
  const chances: StoryChance[] = [];
  const windows: StoryWindow[] = [];
  let xgUser = 0;
  let xgOpp = 0;
  const observe: MatchObserver = {
    chance: (ch) => {
      const slot = slots[ch.side][ch.slot]!;
      if (ch.side === "user") xgUser += ch.p;
      else xgOpp += ch.p;
      chances.push({
        window: ch.window,
        minute: ch.minute,
        side: ch.side,
        p: ch.p,
        outcome: ch.outcome,
        kind: ch.kind,
        shooter: ch.shooter,
        zone: chanceZone(slot.line, slot.channel, ch.kind),
      });
    },
    window: ({ window, minute }) => {
      const total = xgUser + xgOpp;
      windows.push({
        window,
        minute,
        xgUser,
        xgOpp,
        territory: total === 0 ? 0.5 : xgUser / total,
      });
      xgUser = 0;
      xgOpp = 0;
    },
  };
  const result = playMatchCore(input, c, observe);
  return { chances, windows, result };
}
