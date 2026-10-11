import { speciesById } from "@/engine/species";
import type { Lineup, SlotRef } from "@/engine/types";
import { slotLabel, valueAt } from "./lineup";

// This module reads the species data, so only the lazy boundaries (the builder's live engine
// and the run's LiveRun) may import it. Cold pages must never pull it in statically.

/** What swapping slots `a` and `b` of `lineup` (the lineup before the swap) does, in words. */
export function swapMessage(lineup: Lineup, a: SlotRef, b: SlotRef): string {
  const first = valueAt(lineup, a);
  const second = valueAt(lineup, b);
  if (first === null) return second === null ? "" : swapMessage(lineup, b, a);
  const moved = `Moved ${speciesById(first).name} to ${slotLabel(lineup, b)}`;
  return second === null
    ? `${moved}.`
    : `${moved} and ${speciesById(second).name} to ${slotLabel(lineup, a)}.`;
}
