import raw from "./pokedex.json";
import type { Species } from "./pokedex-schema";

export { TYPES, SHAPES, SpeciesSchema } from "./pokedex-schema";
export type { PokemonType, Shape, Species } from "./pokedex-schema";

// Generated artifacts are validated before writes and by pnpm build (data:validate).
export const POKEDEX: readonly Species[] = raw as Species[];

const byName = new Map(POKEDEX.map((s) => [s.name, s]));
const byId = new Map(POKEDEX.map((s) => [s.id, s]));

export function speciesByName(name: string): Species {
  const s = byName.get(name);
  if (!s) throw new Error(`unknown species ${name}`);
  return s;
}

export function pokedexById(id: number): Species | undefined {
  return byId.get(id);
}
