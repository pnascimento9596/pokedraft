import { SPECIES_INDEX } from "@/data/species-index";
import gen1 from "@/data/species-chunks/gen-1.json";
import gen2 from "@/data/species-chunks/gen-2.json";
import gen3 from "@/data/species-chunks/gen-3.json";
import gen4 from "@/data/species-chunks/gen-4.json";
import gen5 from "@/data/species-chunks/gen-5.json";
import gen6 from "@/data/species-chunks/gen-6.json";
import gen7 from "@/data/species-chunks/gen-7.json";
import gen8 from "@/data/species-chunks/gen-8.json";
import gen9 from "@/data/species-chunks/gen-9.json";
import { ROLES } from "@/scouting/types";
import {
  type Attributes,
  type Quality,
  type Role,
  type RoleFits,
  type Species,
} from "./types";

const MAX_FIT = 100;

export { ROLE_LINE } from "./roles";
export { asSpeciesId } from "./settings";

interface ChunkEntry {
  readonly id: number;
  readonly evoChainId: number;
  readonly attrs: Record<string, number>;
  readonly fits: Record<string, number>;
  readonly bestRoles: readonly string[];
  readonly worstRoles: readonly string[];
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
}

const CHUNKS: readonly ChunkEntry[] = [
  ...gen1,
  ...gen2,
  ...gen3,
  ...gen4,
  ...gen5,
  ...gen6,
  ...gen7,
  ...gen8,
  ...gen9,
];

function buildQualityTables(): Record<Role, readonly Quality[]> {
  const total = CHUNKS.length;
  const tables = {} as Record<Role, readonly Quality[]>;
  for (const role of ROLES) {
    const counts = new Array<number>(MAX_FIT + 1).fill(0);
    for (const s of CHUNKS) counts[s.fits[role]!]! += 1;
    const table: Quality[] = [];
    let below = 0;
    for (let f = 0; f <= MAX_FIT; f++) {
      table.push(((below + 0.5 * counts[f]!) / total) as Quality);
      below += counts[f]!;
    }
    tables[role] = table;
  }
  return tables;
}

const QUALITY_TABLES = buildQualityTables();

export function qualityOf(role: Role, fit: number): Quality {
  if (!Number.isInteger(fit) || fit < 0 || fit > MAX_FIT) {
    throw new RangeError(`fit must be an integer in 0..${MAX_FIT}, got ${fit}`);
  }
  return QUALITY_TABLES[role][fit]!;
}

function buildSpecies(): readonly Species[] {
  const chunkMap = new Map<number, ChunkEntry>(CHUNKS.map((c) => [c.id, c]));
  return SPECIES_INDEX.map((idx): Species => {
    const c = chunkMap.get(idx.id);
    if (!c) throw new RangeError(`chunk record missing for species ${idx.id}`);
    return {
      id: idx.id,
      name: idx.name,
      gen: idx.gen,
      region: idx.region,
      types: idx.types,
      special: idx.special,
      evoChainId: c.evoChainId,
      attrs: c.attrs as unknown as Attributes,
      fits: c.fits as unknown as RoleFits,
      quality: Object.fromEntries(
        ROLES.map((r) => [r, qualityOf(r, c.fits[r]!)]),
      ) as Record<Role, Quality>,
      bestRoles: c.bestRoles as readonly Role[],
      worstRoles: c.worstRoles as readonly Role[],
      strengths: c.strengths,
      weaknesses: c.weaknesses,
    };
  }).sort((a, b) => a.id - b.id);
}

export const SPECIES: readonly Species[] = buildSpecies();

const BY_ID = new Map<number, Species>(SPECIES.map((s) => [s.id, s]));

export function speciesById(id: number): Species {
  const s = BY_ID.get(id);
  if (!s) throw new RangeError(`unknown species id ${id}`);
  return s;
}
