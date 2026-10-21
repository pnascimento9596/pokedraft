import { ENGINE_COEFFICIENTS } from "@/engine/coefficients";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import {
  TACTICS,
  type FormationId,
  type Opponent,
  type SpeciesId,
  type Tactic,
} from "@/engine/types";
import { TACTIC_LABEL } from "@/ui/matchday/copy";

export type OpponentStyle = Opponent["tacticalStyle"];
export type Edge = "favourable" | "neutral" | "unfavourable";

const { tactics, styleEdges } = ENGINE_COEFFICIENTS.manager;
type EdgeStyle = keyof typeof styleEdges;

/**
 * A tactic is favourable against a style when its goals-for multiplier beats its goals-against
 * multiplier by at least this share, and unfavourable when it trails by as much.
 */
export const EDGE_MARGIN = 0.04;

function edgeStyle(style: OpponentStyle): EdgeStyle | null {
  return style !== undefined && style !== "balanced" ? style : null;
}

// The engine replaces the tactic's own multipliers with the style edge when there is one.
function ratio(style: EdgeStyle, tactic: Tactic): number {
  const [own, gives] = styleEdges[style][tactic] ?? tactics[tactic];
  return own / gives;
}

function band(r: number): Edge {
  if (r >= 1 + EDGE_MARGIN) return "favourable";
  if (r <= 1 - EDGE_MARGIN) return "unfavourable";
  return "neutral";
}

/** How a tactic plays against this style; null when the style has no edges at all. */
export function tacticEdge(style: OpponentStyle, tactic: Tactic): Edge | null {
  const s = edgeStyle(style);
  return s === null ? null : band(ratio(s, tactic));
}

export const NO_EDGE_LINE = "Scout: no tactic has a clear edge against this opponent.";

/** The scout's one line on this style, ranked from the engine's multipliers. */
export function scoutLine(style: OpponentStyle): string {
  const s = edgeStyle(style);
  if (s === null) return NO_EDGE_LINE;
  const ranked = [...TACTICS].sort((a, b) => ratio(s, b) - ratio(s, a));
  const named = (edge: Edge) =>
    ranked.filter((t) => band(ratio(s, t)) === edge).map((t) => TACTIC_LABEL[t]);
  const best = named("favourable");
  const worst = named("unfavourable").reverse();
  const parts = [`Scout: a ${s} side.`];
  parts.push(
    best.length > 0 ? `Best edge: ${best.join(", then ")}.` : "No tactic has a clear edge.",
  );
  if (worst.length > 0) parts.push(`Avoid ${worst.join(" and ")}.`);
  return parts.join(" ");
}

/** The two lowest-energy outfield players on the pitch, lowest first; null when none is known. */
export function fatigueLine(
  line: {
    readonly onPitch: readonly (SpeciesId | null)[];
    readonly energy: readonly (number | null)[];
  },
  formation: FormationId,
): string | null {
  const slots = FORMATIONS[formation].slots;
  const tired = line.onPitch
    .flatMap((id, slot) => {
      const energy = line.energy[slot];
      return id === null || energy == null || slots[slot]!.role === "GK" ? [] : [{ id, energy }];
    })
    .sort((a, b) => a.energy - b.energy)
    .slice(0, 2)
    .map((p) => `${speciesById(p.id).name} (${p.energy})`);
  return tired.length === 0 ? null : `Most tired: ${tired.join(" and ")}.`;
}

export const ASSISTANT_ON = "Assistant: subs on, tactics on";
export const ASSISTANT_OFF = "Assistant: subs off, tactics off";

export function assistantStatus(tacticManaged: boolean, subsManaged: boolean): string {
  return `Assistant: subs ${subsManaged ? "off" : "on"}, tactics ${tacticManaged ? "off" : "on"}`;
}
