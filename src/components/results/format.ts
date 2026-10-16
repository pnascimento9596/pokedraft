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
    default: {
      const unhandled: never = m.shootout.decider;
      throw new Error(`Unknown shootout decider "${String(unhandled)}"`);
    }
  }
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

export const TACTIC_LABEL: Readonly<Record<Tactic, string>> = {
  balanced: "Balanced",
  attack: "Attack",
  defend: "Defend",
  press: "Press",
  counter: "Counter",
};

// Grounded in ENGINE_COEFFICIENTS.manager: attack and defend scale both goal rates, press drains
// energy and draws more cards, counter trims both rates.
export const TACTIC_HINT: Readonly<Record<Tactic, string>> = {
  balanced: "Even shape. No extra risk either way.",
  attack: "Push forward. More chances, more space behind you.",
  defend: "Drop deep. Fewer chances at both ends.",
  press: "Win it high. A small edge, but legs tire and cards come.",
  counter: "Sit and spring. Fewer chances, harder to break down.",
};

const SUB_REASON = { injury: "injury", fatigue: "fresh legs", tactical: "tactical" } as const;

/** One line for an injury, substitution, card or tactic change. `team` names the opponent. */
export function incidentLine(i: Incident, team: string): string {
  const who = (id: Parameters<typeof speciesById>[0]) => speciesById(id).name;
  switch (i.kind) {
    case "injury":
      return `${i.minute}' ${who(i.player)} is injured`;
    case "sub": {
      const by = i.by === "manager" ? "your call" : "assistant";
      return `${i.minute}' ${who(i.in)} on for ${who(i.out)} (${SUB_REASON[i.reason]}, ${by})`;
    }
    case "yellow":
      return `${i.minute}' Yellow card for ${who(i.player)}${i.side === "opp" ? ` (${team})` : ""}`;
    case "red":
      return `${i.minute}' ${i.secondYellow ? "Second yellow, red card" : "Red card"} for ${who(i.player)}${i.side === "opp" ? ` (${team})` : ""}`;
    case "tactic": {
      const label = TACTIC_LABEL[i.tactic];
      if (i.side === "opp") return `${i.minute}' ${team} switch to ${label}`;
      if (i.minute === 0) return `Kick off: you play ${label}`;
      return i.by === "manager"
        ? `${i.minute}' You switch to ${label}`
        : `${i.minute}' Your assistant switches to ${label}`;
    }
  }
}
