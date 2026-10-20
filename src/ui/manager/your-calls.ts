import { runCup } from "@/engine/cup";
import { speciesById } from "@/engine/species";
import {
  RunTokenError,
  type CupResult,
  type ManagerAction,
  type MatchResult,
} from "@/engine/types";
import { TACTIC_LABEL } from "@/ui/matchday/copy";
import type { CupContext, PlayedMatch } from "./touchline";

/** Leave-one-out replays are bounded so a busy match never queues more than this many runs. */
export const MAX_CHECKED = 8;

export type Later = "changed" | "same" | "depended";

export type Decisive =
  | { readonly kind: "named"; readonly call: string }
  /** `complete` is false when a call went unchecked or its replay was refused. */
  | { readonly kind: "none"; readonly complete: boolean };

/** What the full-time card knows so far; `decisive` is null until every replay has run. */
export interface CallsReport {
  readonly assistant: string;
  readonly you: string;
  /** Null when the real cup has no later match. */
  readonly later: Later | null;
  readonly decisive: Decisive | null;
}

export function callsIn(actions: readonly ManagerAction[], matchIndex: number) {
  return actions.filter((a) => a.match === matchIndex);
}

function played(m: MatchResult | undefined): PlayedMatch {
  if (m?.status !== "played") throw new RangeError("expected a played match");
  return m;
}

function total(m: PlayedMatch) {
  return {
    user: m.regulation.user + (m.extraTime?.user ?? 0),
    opp: m.regulation.opp + (m.extraTime?.opp ?? 0),
  };
}

export function scoreText(m: PlayedMatch): string {
  const { user, opp } = total(m);
  const base = `${user}-${opp}`;
  if (m.shootout === null) return base;
  if (m.shootout.decider === "kicks") return `${base} (${m.shootout.user}-${m.shootout.opp} pens)`;
  return `${base} (${m.shootout.decider === "coin" ? "coin toss" : "pens"})`;
}

function sameResult(a: MatchResult | undefined, b: MatchResult | undefined): boolean {
  if (a?.status !== b?.status) return false;
  if (a?.status !== "played" || b?.status !== "played") return true;
  return scoreText(a) === scoreText(b) && a.outcome === b.outcome;
}

function laterResults(real: CupResult, other: CupResult, matchIndex: number): Later {
  const changed = real.matches.some((m, j) => j > matchIndex && !sameResult(m, other.matches[j]));
  return changed ? "changed" : "same";
}

// How far a replay moved the score from the real one: goal difference first, then goals, then
// the shootout. Compared as a tuple, so a bigger swing in the result always wins.
function swing(real: PlayedMatch, other: PlayedMatch): readonly number[] {
  const r = total(real);
  const o = total(other);
  const pens = (m: PlayedMatch) => (m.shootout === null ? 0 : m.shootout.user - m.shootout.opp);
  return [
    Math.abs(r.user - r.opp - (o.user - o.opp)),
    Math.abs(r.user - o.user) + Math.abs(r.opp - o.opp),
    Math.abs(pens(real) - pens(other)),
  ];
}

function bigger(a: readonly number[], b: readonly number[]): boolean {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k]! > b[k]!;
  return false;
}

/** A call in plain words, named from what the real match logged. */
export function callLabel(a: ManagerAction, match: PlayedMatch): string {
  if (a.type === "taker") {
    const set = a.set === "penalty" ? "penalty" : "free-kick";
    return a.minute === 0 ? `your ${set} taker from kickoff` : `your ${set} taker at ${a.minute}'`;
  }
  if (a.type === "tactic") {
    const label = TACTIC_LABEL[a.tactic];
    return a.minute === 0 ? `your ${label} from kickoff` : `your ${label} switch at ${a.minute}'`;
  }
  const sub = (match.incidents ?? []).find(
    (i) => i.kind === "sub" && i.by === "manager" && i.minute === a.minute && i.slot === a.slot,
  );
  if (sub?.kind !== "sub") return `your substitution at ${a.minute}'`;
  return `your ${speciesById(sub.in).name} on for ${speciesById(sub.out).name} at ${a.minute}'`;
}

function replay(ctx: CupContext, actions: readonly ManagerAction[]): CupResult | null {
  try {
    return runCup(ctx.lineup, ctx.seed, ctx.mode, undefined, actions);
  } catch (e) {
    if (e instanceof RunTokenError) return null;
    throw e;
  }
}

/**
 * Replays match `matchIndex` without the user's calls, one `runCup` per step, and yields what the
 * card can say after each. The baseline keeps only earlier matches' calls: matches up to this one
 * depend on nothing later, so it is always a valid run. Yields nothing for a match the user did
 * not coach.
 */
export function* yourCallsRuns(
  ctx: CupContext,
  cup: CupResult,
  actions: readonly ManagerAction[],
  matchIndex: number,
): Generator<CallsReport, void, void> {
  const calls = callsIn(actions, matchIndex);
  if (calls.length === 0) return;
  const real = played(cup.matches[matchIndex]);
  const earlier = actions.filter((a) => a.match < matchIndex);
  const baseline = runCup(ctx.lineup, ctx.seed, ctx.mode, undefined, earlier);
  const hasLater = cup.matches.some((m, j) => j > matchIndex && m.status === "played");
  const laterCalls = actions.some((a) => a.match > matchIndex);
  let report: CallsReport = {
    assistant: scoreText(played(baseline.matches[matchIndex])),
    you: scoreText(real),
    later: hasLater && !laterCalls ? laterResults(cup, baseline, matchIndex) : null,
    decisive: null,
  };
  yield report;

  if (hasLater && laterCalls) {
    const without = replay(
      ctx,
      actions.filter((a) => a.match !== matchIndex),
    );
    report = {
      ...report,
      later: without === null ? "depended" : laterResults(cup, without, matchIndex),
    };
    yield report;
  }

  const checked = calls.slice(0, MAX_CHECKED);
  let best: { call: ManagerAction; swing: readonly number[] } | null = null;
  let refused = false;
  for (const [k, call] of checked.entries()) {
    const run = replay(ctx, [
      ...earlier,
      ...checked.filter((_, j) => j !== k),
      ...calls.slice(MAX_CHECKED),
    ]);
    if (run === null) {
      refused = true;
    } else {
      const other = played(run.matches[matchIndex]);
      const s = swing(real, other);
      const moved = !sameResult(real, other);
      if (moved && (best === null || bigger(s, best.swing))) best = { call, swing: s };
    }
    if (k < checked.length - 1) yield report;
  }
  yield {
    ...report,
    decisive:
      best !== null
        ? { kind: "named", call: callLabel(best.call, real) }
        : { kind: "none", complete: !refused && calls.length <= MAX_CHECKED },
  };
}

export interface CallsCopy {
  readonly score: string;
  readonly same: string | null;
  readonly later: string | null;
  /** Null while the per-call replays are still running. */
  readonly call: string | null;
}

const LATER_COPY: Readonly<Record<Later, string>> = {
  changed: "Your calls here changed later results.",
  same: "Later results are the same without your calls here.",
  depended: "Later calls depended on this match.",
};

export function callsCopy(r: CallsReport): CallsCopy {
  const d = r.decisive;
  return {
    score: `Assistant ${r.assistant}, You ${r.you}`,
    same: r.assistant === r.you ? "Your calls gave the same score as the assistant." : null,
    later: r.later === null ? null : LATER_COPY[r.later],
    call:
      d === null
        ? null
        : d.kind === "named"
          ? `Biggest swing: ${d.call}.`
          : d.complete
            ? "No single call changed the score."
            : "No single call that could be checked changed the score.",
  };
}
