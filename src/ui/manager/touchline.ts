import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { runCup } from "@/engine/cup";
import { FORMATIONS } from "@/engine/formations";
import {
  RunTokenError,
  type BenchIndex,
  type CupResult,
  type FullLineup,
  type Incident,
  type ManagerAction,
  type MatchResult,
  type Mode,
  type Seed,
  type SpeciesId,
  type StarterIndex,
  type Tactic,
} from "@/engine/types";

export type PlayedMatch = Extract<MatchResult, { status: "played" }>;

export const MAX_SUBS = ENGINE_COEFFICIENTS.manager.maxSubs;
const FRESH = 100;
const REGULATION = 90;
const EXTRA_TIME = 120;

/** What a run needs to replay its cup with a new coach decision. */
export interface CupContext {
  readonly lineup: FullLineup;
  readonly seed: Seed;
  readonly mode: Mode;
}

/**
 * The eleven and five a match was played with. An absence moves a bench player into the eleven
 * and the absentee into that bench seat, where nobody can bring them on.
 */
export interface Fielded {
  readonly starters: readonly SpeciesId[];
  readonly bench: readonly SpeciesId[];
  readonly benchOut: BenchIndex | null;
}

export function fieldedFor(lineup: FullLineup, match: PlayedMatch): Fielded {
  const absence = match.absences[0];
  if (absence === undefined || absence.in === null) {
    return { starters: lineup.starters, bench: lineup.bench, benchOut: null };
  }
  const slot = FORMATIONS[lineup.formation].slots.findIndex((sl) => sl.id === absence.slot);
  const seat = lineup.bench.indexOf(absence.in);
  if (slot < 0 || seat < 0)
    throw new RangeError("the absence names a slot or bench seat the lineup lacks");
  return {
    starters: lineup.starters.with(slot, absence.in),
    bench: lineup.bench.with(seat, absence.out),
    benchOut: seat as BenchIndex,
  };
}

export function finalMinute(match: PlayedMatch): number {
  return match.extraTime === null ? REGULATION : EXTRA_TIME;
}

// The auto coach acts at a window boundary after anything a decision taken at that same minute
// would precede, so a decision at minute t erases the assistant's changes logged at t.
function assistantAt(i: Incident, minute: number): boolean {
  if (i.minute !== minute || i.side !== "user") return false;
  if (i.kind === "tactic") return i.by === "auto";
  return i.kind === "sub" && i.by === "auto" && i.reason === "fatigue";
}

/** The incidents a decision taken at `minute` acts after, in the order the engine logged them. */
export function incidentsBefore(match: PlayedMatch, minute: number): readonly Incident[] {
  return (match.incidents ?? []).filter(
    (i) => i.minute < minute || (i.minute === minute && !assistantAt(i, minute)),
  );
}

export interface BenchSeat {
  readonly index: BenchIndex;
  readonly species: SpeciesId;
  readonly available: boolean;
}

/** The user's side as the touchline sees it at one minute. */
export interface Touchline {
  readonly minute: number;
  readonly tactic: Tactic;
  /** The user decided something in this match at or before this minute; the assistant is off. */
  readonly managed: boolean;
  readonly subsUsed: number;
  readonly onPitch: readonly (SpeciesId | null)[];
  readonly energy: readonly (number | null)[];
  readonly bench: readonly BenchSeat[];
  /** A decision at this minute would still be played: the match has minutes after it. */
  readonly open: boolean;
}

function sideState(fielded: Fielded, incidents: readonly Incident[]) {
  const onPitch: (SpeciesId | null)[] = [...fielded.starters];
  const since: number[] = fielded.starters.map(() => 0);
  const used = new Set<SpeciesId>();
  let subs = 0;
  let tactic: Tactic = "balanced";
  for (const i of incidents) {
    if (i.side !== "user") continue;
    if (i.kind === "tactic") tactic = i.tactic;
    else if (i.kind === "sub") {
      onPitch[i.slot] = i.in;
      since[i.slot] = i.minute;
      used.add(i.in);
      subs++;
    } else if (i.kind === "red" || i.kind === "injury") onPitch[i.slot] = null;
  }
  const bench = fielded.bench.map((species, index): BenchSeat => ({
    index: index as BenchIndex,
    species,
    available: index !== fielded.benchOut && !used.has(species),
  }));
  return { onPitch, since, subs, tactic, bench };
}

function managedAt(actions: readonly ManagerAction[], matchIndex: number, minute: number): boolean {
  return actions.some((a) => a.match === matchIndex && a.minute <= minute);
}

export function touchlineAt(
  match: PlayedMatch,
  matchIndex: number,
  lineup: FullLineup,
  actions: readonly ManagerAction[],
  minute: number,
): Touchline {
  const state = sideState(fieldedFor(lineup, match), incidentsBefore(match, minute));
  const snapshot = (match.windows ?? []).filter((w) => w.minute <= minute).at(-1);
  const energy = state.onPitch.map((id, slot) => {
    if (id === null) return null;
    if (snapshot === undefined || state.since[slot]! > snapshot.minute) return FRESH;
    return snapshot.energy[slot] ?? FRESH;
  });
  return {
    minute,
    tactic: state.tactic,
    managed: managedAt(actions, matchIndex, minute),
    subsUsed: state.subs,
    onPitch: state.onPitch,
    energy,
    bench: state.bench,
    open:
      Number.isInteger(minute) &&
      minute >= 0 &&
      minute < finalMinute(match) &&
      match.windows !== undefined,
  };
}

/** A user injury the touchline can answer: who went off and the assistant's replacement. */
export interface InjuryCall {
  readonly minute: number;
  readonly slot: StarterIndex;
  readonly player: SpeciesId;
  /** The bench seat the assistant sent on, or null when nobody could come on. */
  readonly autoPick: BenchIndex | null;
  /** Seats the manager may send on instead; empty when no substitution is left. */
  readonly options: readonly BenchSeat[];
}

export function injuries(match: PlayedMatch, lineup: FullLineup): readonly InjuryCall[] {
  const all = match.incidents ?? [];
  const fielded = fieldedFor(lineup, match);
  return all.flatMap((i, k): InjuryCall[] => {
    if (i.kind !== "injury") return [];
    const state = sideState(fielded, all.slice(0, k));
    const next = all[k + 1];
    const replaced =
      next?.kind === "sub" &&
      next.minute === i.minute &&
      next.slot === i.slot &&
      next.reason === "injury"
        ? next
        : null;
    const autoPick =
      replaced === null
        ? null
        : (state.bench.find((b) => b.species === replaced.in)?.index ?? null);
    return [
      {
        minute: i.minute,
        slot: i.slot,
        player: i.player,
        autoPick,
        options: state.subs >= MAX_SUBS ? [] : state.bench.filter((b) => b.available),
      },
    ];
  });
}

export type Decision =
  | { readonly kind: "tactic"; readonly tactic: Tactic }
  | { readonly kind: "sub"; readonly slot: StarterIndex; readonly bench: BenchIndex };

export type Verdict =
  | { readonly ok: true; readonly actions: readonly ManagerAction[]; readonly cup: CupResult }
  | { readonly ok: false; readonly reason: string };

function refuse(reason: string): Verdict {
  return { ok: false, reason };
}

// The checks the engine makes, run against what the touchline can see, so the copy can say why.
function precheck(
  match: PlayedMatch,
  matchIndex: number,
  lineup: FullLineup,
  actions: readonly ManagerAction[],
  minute: number,
  decision: Decision,
): string | null {
  const last = actions.at(-1);
  if (last && (last.match > matchIndex || (last.match === matchIndex && last.minute > minute))) {
    return "That moment has already been played.";
  }
  const line = touchlineAt(match, matchIndex, lineup, actions, minute);
  if (!line.open) return "The match is over.";
  if (decision.kind === "tactic") {
    return decision.tactic === line.tactic ? "Your side already plays that way." : null;
  }
  const call = injuries(match, lineup).find((c) => c.minute === minute && c.slot === decision.slot);
  if (call !== undefined) {
    return call.options.some((b) => b.index === decision.bench)
      ? null
      : "That player cannot replace the injured player.";
  }
  if (line.subsUsed >= MAX_SUBS) return `All ${MAX_SUBS} substitutions are used.`;
  if (line.onPitch[decision.slot] === null) return "Nobody is playing in that position.";
  if (!line.bench[decision.bench]?.available) return "That bench player cannot come on.";
  return null;
}

/**
 * Records a decision at `minute` of match `matchIndex` and replays the cup with it. The decision
 * is checked against the touchline first and then by the engine itself, so a refused decision
 * never reaches the token.
 */
export function decide(
  ctx: CupContext,
  cup: CupResult,
  actions: readonly ManagerAction[],
  matchIndex: number,
  minute: number,
  decision: Decision,
): Verdict {
  const match = cup.matches[matchIndex];
  if (match?.status !== "played") return refuse("That match was not played.");
  const why = precheck(match, matchIndex, ctx.lineup, actions, minute, decision);
  if (why !== null) return refuse(why);
  const action: ManagerAction =
    decision.kind === "tactic"
      ? { type: "tactic", match: matchIndex, minute, tactic: decision.tactic }
      : { type: "sub", match: matchIndex, minute, slot: decision.slot, bench: decision.bench };
  const next = [...actions, action];
  try {
    return {
      ok: true,
      actions: next,
      cup: runCup(ctx.lineup, ctx.seed, ctx.mode, undefined, next),
    };
  } catch (e) {
    if (e instanceof RunTokenError) return refuse("That decision is not allowed right now.");
    throw e;
  }
}
