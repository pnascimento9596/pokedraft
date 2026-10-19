import {
  ENGINE_COEFFICIENTS,
  speciesById,
  type Absence,
  type Contribution,
  type CupResult,
  type CupRound,
  type GoalEvent,
  type Incident,
  type MatchResult,
  type OpponentPlayerRef,
  type Score,
  type SaveEvent,
  type Tactic,
} from "@/engine";
import { incidentText, type IncidentCopy } from "@/ui/matchday/copy";

export type PlayedMatch = Extract<MatchResult, { status: "played" }>;

/** `live` is the player's own run; `shared` is a run opened from someone's /r/ link. */
export type ResultsVariant = "live" | "shared";

// A shared token carries no nickname, so a friend's squad is "This squad", never "You".
export const SIDE_COPY = {
  live: {
    side: "You",
    team: "Your team",
    xi: "Your XI",
    ourSide: "Your side",
    switchesTo: "Your side switch to",
    squad: "Your squad",
    lineup: "Your lineup",
    goals: "Your goals",
    fullTeamScore: "your full Team Score",
    summary: "Your record, Team Score and cup finish.",
    squadSummary: "Your lineup, Synergy links and ratings for each role.",
  },
  shared: {
    side: "This squad",
    team: "This squad",
    xi: "This squad",
    ourSide: "This squad",
    switchesTo: "This squad switches to",
    squad: "This squad",
    lineup: "This lineup",
    goals: "This squad's goals",
    fullTeamScore: "this squad's full Team Score",
    summary: "This squad's record, Team Score and cup finish.",
    squadSummary: "This lineup, Synergy links and ratings for each role.",
  },
} as const satisfies Record<ResultsVariant, Record<string, string>>;

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
    default: {
      const unhandled: never = m.shootout.decider;
      throw new Error(`Unknown shootout decider "${String(unhandled)}"`);
    }
  }
}

// The weak-spot penalty in Team Score points, with a minus sign only when it costs something.
export function dragLabel(drag: number): string {
  const points = Math.round(drag * 100);
  return points === 0 ? "0" : `-${points}`;
}

// The player of the tournament's points, by source, as the engine scored them.
export function contributionLine(c: Contribution): string {
  const { points: p } = c;
  return `${c.total} pts: goals ${p.goals}, assists ${p.assists}, clean sheets ${p.cleanSheets}, minutes ${p.minutes}`;
}

// An opponent identity: a Boss Club Pokemon by name, or the shirt number a retained engine rolled.
export function opponentRefLabel(ref: OpponentPlayerRef): string {
  return ref.kind === "species" ? speciesById(ref.id).name : `No. ${ref.number}`;
}

export function goalLine(g: GoalEvent): string {
  const pen = g.penalty
    ? " (pen)"
    : g.kind === "header"
      ? " (header)"
      : g.kind === "solo"
        ? " (solo run)"
        : g.kind === "free-kick"
          ? " (free kick)"
          : "";
  if (g.side === "opp") {
    const assist = g.assist === null ? "" : `, assist ${opponentRefLabel(g.assist)}`;
    return `${g.minute}' ${opponentRefLabel(g.scorer)}${pen}${assist}`;
  }
  const assist = g.assist === null ? "" : `, assist ${speciesById(g.assist).name}`;
  return `${g.minute}' ${speciesById(g.scorer).name}${pen}${assist}`;
}

export function saveLine(event: SaveEvent): string {
  return `${event.minute}' ${speciesById(event.keeper).name} saves ${speciesById(event.attacker).name}'s shot`;
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

// Grounded in ENGINE_COEFFICIENTS.manager: attack and defend scale both goal rates, press drains
// energy and draws more cards, counter trims both rates.
export const TACTIC_HINT: Readonly<Record<Tactic, string>> = {
  balanced: "Even shape. No extra risk either way.",
  attack: "Push forward. More chances, more space behind you.",
  defend: "Drop deep. Fewer chances at both ends.",
  press: "Win it high. A small edge, but legs tire and cards come.",
  counter: "Sit and spring. Fewer chances, harder to break down.",
};

function incidentCopy(i: Incident): IncidentCopy {
  const named = (id: Parameters<typeof speciesById>[0]) => ({ name: speciesById(id).name });
  switch (i.kind) {
    case "injury":
      return { kind: "injury", minute: i.minute, player: named(i.player) };
    case "sub":
      return { ...i, in: named(i.in), out: named(i.out) };
    case "yellow":
    case "red":
      return {
        kind: "card",
        minute: i.minute,
        side: i.side,
        player: named(i.player),
        color: i.kind,
        secondYellow: i.secondYellow,
      };
    case "tactic":
      return i;
  }
}

/**
 * One line for an injury, substitution, card or tactic change. `team` names the opponent; the
 * user's own cards go unnamed in the results.
 */
export function incidentLine(i: Incident, team: string, variant: ResultsVariant = "live"): string {
  return incidentText(incidentCopy(i), { user: null, opp: team }, variant === "shared");
}
