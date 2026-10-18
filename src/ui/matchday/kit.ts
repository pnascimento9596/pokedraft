import { speciesById } from "@/engine/species";
import type { PokemonType, SpeciesId } from "@/engine/types";
import { kitDistance } from "@/design/color-distance";
import { PITCH_KIT, TYPE_PALETTE } from "@/design/stadium";

/** Each side's ring colour on the pitch, as a six-digit hex. */
export interface Kits {
  readonly user: string;
  readonly opp: string;
}

// Oklab distance times 100, the CVD audit's metric. The audit asks 4 of labelled chips; a ring
// carries no label, so it needs more.
const CLASH = 10;

/**
 * The type the most starters carry. A dual-type starter counts toward both its types. A tie goes
 * to the type seen first reading the slots in order, each starter's types in their own order.
 */
function dominantType(starters: readonly SpeciesId[]): PokemonType {
  const counts = new Map<PokemonType, number>();
  for (const id of starters)
    for (const type of speciesById(id).types) counts.set(type, (counts.get(type) ?? 0) + 1);
  let best: PokemonType | null = null;
  for (const [type, count] of counts) if (best === null || count > counts.get(best)!) best = type;
  return best!;
}

export function kitsFor(starters: readonly SpeciesId[], theme: PokemonType | undefined): Kits {
  const user = TYPE_PALETTE[dominantType(starters)];
  const opp = theme === undefined ? PITCH_KIT.opp : TYPE_PALETTE[theme];
  return { user, opp: kitDistance(user, opp) < CLASH ? PITCH_KIT.clash : opp };
}
