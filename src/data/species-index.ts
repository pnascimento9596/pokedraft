import raw from "./species-index.json";
import { REGIONS, type Gen, type PokemonType, type Region, type SpeciesId } from "@/engine/types";

export interface SlimSpecies {
  readonly id: SpeciesId;
  readonly name: string;
  readonly types: readonly [PokemonType] | readonly [PokemonType, PokemonType];
  readonly gen: Gen;
  readonly region: Region;
  readonly special: boolean;
}

export const SPECIES_INDEX: readonly SlimSpecies[] = raw.map((s) => ({
  id: s.id as SpeciesId,
  name: s.name,
  types: s.types as unknown as readonly [PokemonType] | readonly [PokemonType, PokemonType],
  gen: s.gen as Gen,
  region: REGIONS[s.gen - 1] as Region,
  special: s.special,
}));

const BY_ID = new Map<number, SlimSpecies>(SPECIES_INDEX.map((s) => [s.id, s]));

export function slimSpeciesById(id: number): SlimSpecies {
  const s = BY_ID.get(id);
  if (!s) throw new RangeError(`unknown species id ${id}`);
  return s;
}

export function slimSpeciesByName(name: string): SlimSpecies | undefined {
  return SPECIES_INDEX.find((s) => s.name === name);
}
