import {
  ENGINE_COEFFICIENTS,
  speciesById,
  type Absence,
  type Contribution,
  type CupResult,
  type CupRound,
  type GoalEvent,
  type MatchResult,
  type Score,
} from "@/engine";

export type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Engine-1 and engine-2 awarded the user a shootout still level after 20 sudden-death pairs.
export const SHOOTOUT_CAP_LINE = "Won on penalties (decided after 20 rounds)";

export function finalScore(m: PlayedMatch): Score {
  if (m.extraTime === null) return m.regulation;
  return {
    user: m.regulation.user + m.extraTime.user,
    opp: m.regulation.opp + m.extraTime.opp,
  };
}

export function shootoutLine(m: PlayedMatch): string | null {
  if (m.shootout === null) return null;
  switch (m.shootout.decider) {
    case "kicks":
      return `${m.shootout.user}-${m.shootout.opp} on pens`;
    case "decree":
      return SHOOTOUT_CAP_LINE;
    case "coin": {
      const rounds = m.shootout.kicks.length / 2 - ENGINE_COEFFICIENTS.shootout.kicks;
      return `${m.outcome === "W" ? "Won" : "Lost"} on a coin toss after ${rounds} sudden-death rounds`;
    }
  }
}

// The player of the tournament's points, by source, as the engine scored them.
export function contributionLine(c: Contribution): string {
  const { points: p } = c;
  return `${c.total} pts: goals ${p.goals}, assists ${p.assists}, clean sheets ${p.cleanSheets}, minutes ${p.minutes}`;
}

export function goalLine(g: GoalEvent): string {
  const pen = g.penalty ? " (pen)" : "";
  if (g.side === "opp") return `${g.minute}' No. ${g.scorer}${pen}`;
  const assist = g.assist === null ? "" : `, assist ${speciesById(g.assist).name}`;
  return `${g.minute}' ${speciesById(g.scorer).name}${pen}${assist}`;
}

export function absenceLine(a: Absence): string {
  const out = speciesById(a.out).name;
  if (a.in === null) return `${out} missed this match; nobody was available to come in`;
  return `${out} missed this match; ${speciesById(a.in).name} came in`;
}

export function eliminatedIn(cup: CupResult): CupRound | null {
  if (cup.finish === "champion") return null;
  const lastPlayed = cup.matches.filter((m) => m.status === "played").at(-1);
  return lastPlayed?.round ?? null;
}
