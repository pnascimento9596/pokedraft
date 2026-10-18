import type { FormationId, Opponent, SpeciesId, Tactic } from "@/engine/types";

export type Edge = "favourable" | "neutral" | "unfavourable";
export const EDGE_MARGIN = 0;
export const ASSISTANT_ON = "";
export const ASSISTANT_OFF = "";

export function tacticEdge(_style: Opponent["tacticalStyle"], _tactic: Tactic): Edge | null {
  return null;
}

export function scoutLine(_style: Opponent["tacticalStyle"]): string {
  return "";
}

export function fatigueLine(
  _line: {
    readonly onPitch: readonly (SpeciesId | null)[];
    readonly energy: readonly (number | null)[];
  },
  _formation: FormationId,
): string | null {
  return null;
}

export function assistantStatus(_managed: boolean): string {
  return "";
}
