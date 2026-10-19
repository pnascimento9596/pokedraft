import type { Side, Tactic } from "@/engine/types";
import type { Beat, Kick } from "./timeline";

export const TACTIC_LABEL: Readonly<Record<Tactic, string>> = {
  balanced: "Balanced",
  attack: "Attack",
  defend: "Defend",
  press: "Press",
  counter: "Counter",
};

const REASON = { injury: "injury", fatigue: "fresh legs", tactical: "tactical" } as const;

export interface Teams {
  readonly user: string;
  readonly opp: string;
}

interface Named {
  readonly name: string;
}

/**
 * An injury, substitution, card or tactic change with its players already named. The broadcast's
 * beats have this shape, and the results map the engine's incidents onto it, so both read alike.
 */
export type IncidentCopy =
  | { readonly kind: "injury"; readonly minute: number; readonly player: Named }
  | {
      readonly kind: "sub";
      readonly minute: number;
      readonly in: Named;
      readonly out: Named;
      readonly reason: keyof typeof REASON;
      readonly by: "manager" | "auto";
    }
  | {
      readonly kind: "card";
      readonly minute: number;
      readonly side: Side;
      readonly player: Named;
      readonly color: "yellow" | "red";
      readonly secondYellow: boolean;
    }
  | {
      readonly kind: "tactic";
      readonly minute: number;
      readonly side: Side;
      readonly tactic: Tactic;
      readonly by: "manager" | "auto";
    };

/** A card names the player's team; `user` is null where the user's own side goes unnamed. */
export interface CardTeams {
  readonly user: string | null;
  readonly opp: string;
}

/** The one line for an incident, shared by the match ticker and the results list. */
/** A pitch nameplate: names over 10 characters keep their first 9 and an ellipsis. */
export function nameplate(name: string): string {
  return name.length > 10 ? `${name.slice(0, 9)}…` : name;
}

/** A club's name on the score bug: its first word, the town ("Goldenrod United" is "Goldenrod"). */
export function clubShort(name: string): string {
  return name.split(" ")[0] || name;
}

/** `shared` is a run opened from someone else's link: the user's side is "this squad", not "you". */
export function incidentText(c: IncidentCopy, teams: CardTeams, shared = false): string {
  const at = `${c.minute}'`;
  switch (c.kind) {
    case "injury":
      return `${at} ${c.player.name} is injured`;
    case "sub":
      return `${at} ${c.in.name} on for ${c.out.name} (${REASON[c.reason]}, ${c.by === "manager" ? (shared ? "manager's call" : "your call") : "assistant"})`;
    case "card": {
      const card =
        c.color === "yellow"
          ? "Yellow card"
          : c.secondYellow
            ? "Second yellow, red card"
            : "Red card";
      const team = c.side === "user" ? teams.user : teams.opp;
      return `${at} ${card} for ${c.player.name}${team === null ? "" : ` (${team})`}`;
    }
    case "tactic": {
      const label = TACTIC_LABEL[c.tactic];
      if (c.side === "opp") {
        return c.minute === 0
          ? `Kick off: ${teams.opp} play ${label}`
          : `${at} ${teams.opp} switch to ${label}`;
      }
      if (shared) {
        if (c.minute === 0) return `Kick off: this squad plays ${label}`;
        return c.by === "manager"
          ? `${at} This squad switches to ${label}`
          : `${at} This squad's assistant switches to ${label}`;
      }
      if (c.minute === 0) return `Kick off: you play ${label}`;
      return c.by === "manager"
        ? `${at} You switch to ${label}`
        : `${at} Your assistant switches to ${label}`;
    }
  }
}

function team(teams: Teams, side: Side): string {
  return side === "user" ? teams.user : teams.opp;
}

/** The ticker line for one broadcast beat. */
export function beatLine(b: Beat, teams: Teams): string {
  const at = `${b.minute}'`;
  switch (b.kind) {
    case "whistle":
      return b.minute === 0 ? b.label : `${at} ${b.label}`;
    case "goal": {
      const how = b.penalty ? " from the spot" : "";
      const assist = b.assist === null ? "" : `, assist ${b.assist.name}`;
      return `${at} Goal for ${team(teams, b.side)}! ${b.scorer.name}${how}${assist}`;
    }
    case "save":
      return `${at} ${b.keeper.name} saves from ${b.attacker.name}`;
    default:
      return incidentText(b, teams);
  }
}

export function kickLine(k: Kick, teams: Teams): string {
  return `Penalty ${k.index + 1}: ${k.taker.name} (${team(teams, k.side)}) ${k.scored ? "scores" : "misses"}`;
}
