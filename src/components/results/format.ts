import {
  ENGINE_COEFFICIENTS,
  speciesById,
  type Absence,
  type CupResult,
  type CupRound,
  type GoalEvent,
  type MatchResult,
  type Score,
} from "@/engine";

export type PlayedMatch = Extract<MatchResult, { status: "played" }>;

export const SHOOTOUT_CAP_LINE = `Won on penalties (decided after ${ENGINE_COEFFICIENTS.shootout.maxSuddenDeath} rounds)`;

export function finalScore(m: PlayedMatch): Score {
  if (m.extraTime === null) return m.regulation;
  return {
    user: m.regulation.user + m.extraTime.user,
    opp: m.regulation.opp + m.extraTime.opp,
  };
}

// The engine ends a shootout still level after the sudden-death cap by scoring one more user
// kick and missing one opponent kick, so the decree shows as kicks past the cap. A win with
// level shootout goals would be the same decree reported differently.
export function decidedByCap(m: PlayedMatch): boolean {
  if (m.outcome !== "W" || m.shootout === null) return false;
  const { kicks, maxSuddenDeath } = ENGINE_COEFFICIENTS.shootout;
  const userKicks = m.shootout.kicks.filter((k) => k.side === "user").length;
  return m.shootout.user === m.shootout.opp || userKicks > kicks + maxSuddenDeath;
}

export function shootoutLine(m: PlayedMatch): string | null {
  if (m.shootout === null) return null;
  if (decidedByCap(m)) return SHOOTOUT_CAP_LINE;
  return `${m.shootout.user}-${m.shootout.opp} on pens`;
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
