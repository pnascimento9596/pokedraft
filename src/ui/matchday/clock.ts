import { FORMATIONS } from "@/engine/formations";
import type { FullLineup, MatchResult } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
import { injuries } from "@/ui/manager/touchline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

export interface Pace {
  /** Real milliseconds per match minute in normal time. */
  readonly regulation: number;
  /** Real milliseconds per match minute in extra time. */
  readonly extraTime: number;
  /** Real milliseconds per shootout kick. */
  readonly kick: number;
  /** How long the clock holds on a goal and on a save while the broadcast stages it. */
  readonly holdGoal: number;
  readonly holdSave: number;
}

// Live: 25 s a half (one five-minute window is about 2.8 s), 8 s an extra-time half, 1.2 s a
// kick. Quick: about 5 s for a whole match.
export const PACE: Readonly<Record<MatchView, Pace>> = {
  live: {
    regulation: 25_000 / 45,
    extraTime: 8_000 / 15,
    kick: 1_200,
    holdGoal: 2_600,
    // The whole save staging, so open play resumes from the save's minute as it does after a goal.
    holdSave: 1_100,
  },
  quick: {
    regulation: 4_400 / 90,
    extraTime: 900 / 30,
    kick: 300,
    holdGoal: 0,
    holdSave: 0,
  },
};

export type StopKind = "halftime" | "fatigue" | "extraTime" | "injury";

// Interim until engine 7 (W6b): engine 6 switches the assistant's fatigue subs off with the
// user's first decision, so a managed side gets a stop to check its legs instead.
const FATIGUE_STOP = 65;
const FATIGUE_ENERGY = 65;

/** A minute where manager mode stops the clock and hands the touchline to the player. */
export interface Stop {
  readonly key: string;
  readonly kind: StopKind;
  readonly minute: number;
}

/**
 * Half-time, the break before extra time and each user injury the manager can answer, in minute
 * order. The starting tactic is picked before kickoff, so the clock never stops at 0'. A side the
 * manager has taken over (`managed`) also stops at 65' when an outfield player is below 65 energy.
 */
export function stopsFor(match: PlayedMatch, lineup: FullLineup, managed = false): readonly Stop[] {
  if (match.windows === undefined) return [];
  const stops: Stop[] = [
    { key: "halftime", kind: "halftime", minute: 45 },
    ...injuries(match, lineup)
      .filter((call) => call.options.length > 0)
      .map((call): Stop => ({
        key: `injury:${call.minute}:${call.slot}`,
        kind: "injury",
        minute: call.minute,
      })),
  ];
  if (managed && tiredAt(match, lineup, FATIGUE_STOP)) {
    stops.push({ key: `fatigue:${FATIGUE_STOP}`, kind: "fatigue", minute: FATIGUE_STOP });
  }
  if (match.extraTime) stops.push({ key: "extraTime", kind: "extraTime", minute: 90 });
  // An injury at 45 happens before the half-time whistle, so its prompt comes first.
  const order = (s: Stop) => (s.kind === "injury" ? 0 : 1);
  return stops.sort((a, b) => a.minute - b.minute || order(a) - order(b));
}

function tiredAt(match: PlayedMatch, lineup: FullLineup, minute: number): boolean {
  const window = match.windows?.find((w) => w.minute === minute);
  if (window === undefined) return false;
  const slots = FORMATIONS[lineup.formation].slots;
  return window.energy.some(
    (e, slot) => e !== null && slots[slot]!.role !== "GK" && e < FATIGUE_ENERGY,
  );
}

/** The next stop at or after `minute` that the player has not answered yet. */
export function nextStop(
  stops: readonly Stop[],
  answered: ReadonlySet<string>,
  minute: number,
): Stop | null {
  return stops.find((s) => s.minute >= minute && !answered.has(s.key)) ?? null;
}

/**
 * Moves the match clock on by `ms` real milliseconds at `speed`, never past `limit` (the next
 * stop or hold) or the final whistle.
 */
export function advanceClock(
  minute: number,
  ms: number,
  pace: Pace,
  speed: number,
  limit: number,
): number {
  let left = ms * speed;
  let at = minute;
  while (left > 0 && at < limit) {
    const rate = at < 90 ? pace.regulation : pace.extraTime;
    const edge = at < 90 ? Math.min(90, limit) : limit;
    const step = Math.min(edge - at, left / rate);
    at += step;
    left -= step * rate;
    if (step <= 0) break;
  }
  return Math.min(at, limit);
}
