import type { FullLineup, Lineup, SpeciesId } from "@/engine/types";
import { ALL_REFS, valueAt } from "@/ui/lineup";

export function fullLineup(lineup: Lineup): FullLineup | null {
  const full = [...lineup.starters, ...lineup.bench].every((v) => v !== null);
  return full ? (lineup as FullLineup) : null;
}

export const CASCADE_STAGGER_MS = 60;
export const CASCADE_FLICKER_MS = 220;
const FLICKER_FRAME_MS = 45;

// One frame of the Randomize reveal. Slots before the wavefront show their final species,
// the slot under it flickers through names from the pool, and later slots stay empty.
export function cascadeFrame(target: Lineup, pool: readonly SpeciesId[], elapsed: number): Lineup {
  const at = (i: number): SpeciesId | null => {
    const start = i * CASCADE_STAGGER_MS;
    if (elapsed < start) return null;
    if (elapsed >= start + CASCADE_FLICKER_MS || pool.length === 0) {
      return valueAt(target, ALL_REFS[i]!);
    }
    const frame = Math.floor((elapsed - start) / FLICKER_FRAME_MS);
    return pool[(i * 7919 + frame * 104729) % pool.length]!;
  };
  return {
    formation: target.formation,
    starters: target.starters.map((_, i) => at(i)) as unknown as Lineup["starters"],
    bench: target.bench.map((_, i) => at(11 + i)) as unknown as Lineup["bench"],
  };
}

export const CASCADE_TOTAL_MS = (ALL_REFS.length - 1) * CASCADE_STAGGER_MS + CASCADE_FLICKER_MS;
