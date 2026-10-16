import type { Side, Tactic } from "@/engine/types";
import type { Beat, Kick } from "./timeline";

const TACTIC: Readonly<Record<Tactic, string>> = {
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
    case "card":
      return `${at} ${b.color === "yellow" ? "Yellow card" : b.secondYellow ? "Second yellow, red card" : "Red card"} for ${b.player.name} (${team(teams, b.side)})`;
    case "injury":
      return `${at} ${b.player.name} is injured`;
    case "sub":
      return `${at} ${b.in.name} on for ${b.out.name} (${REASON[b.reason]}, ${b.by === "manager" ? "your call" : "assistant"})`;
    case "tactic":
      if (b.side === "opp") return `${at} ${teams.opp} switch to ${TACTIC[b.tactic]}`;
      if (b.minute === 0) return `Kick off: you play ${TACTIC[b.tactic]}`;
      return b.by === "manager"
        ? `${at} You switch to ${TACTIC[b.tactic]}`
        : `${at} Your assistant switches to ${TACTIC[b.tactic]}`;
  }
}

export function kickLine(k: Kick, teams: Teams): string {
  return `Penalty ${k.index + 1}: ${k.taker.name} (${team(teams, k.side)}) ${k.scored ? "scores" : "misses"}`;
}
