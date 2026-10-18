import type { SpeciesId, WindowSnapshot } from "@/engine/types";

/** What a window snapshot records about the user's slots: who played in each and their energy. */
export type EnergyWindow = Pick<WindowSnapshot, "minute" | "energy" | "onPitch">;

/** Below this energy a player sweats, strides slower and covers `TIRED_REACH` of each move. */
export const TIRED = 65;
/** Below this energy a stamina arc shows under the sprite as well. */
export const SPENT = 55;
/** The share of each phase's move a tired player covers. */
export const TIRED_REACH = 0.85;

/**
 * The energy of `species` in user slot `slot` at `minute`, from the latest window at or before it.
 * Null when no window has closed yet, or when that window recorded someone else in the slot (a
 * substitute's first minutes), so nobody is ever shown another player's energy.
 */
export function energyAt(
  windows: readonly EnergyWindow[],
  slot: number,
  species: SpeciesId | null,
  minute: number,
): number | null {
  let latest: EnergyWindow | undefined;
  for (const w of windows) {
    if (w.minute > minute) break;
    latest = w;
  }
  if (latest === undefined || species === null || latest.onPitch[slot] !== species) return null;
  return latest.energy[slot] ?? null;
}

export function isTired(energy: number | null): boolean {
  return energy !== null && energy < TIRED;
}

export function isSpent(energy: number | null): boolean {
  return energy !== null && energy < SPENT;
}
