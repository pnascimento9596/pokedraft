import { POKEDEX } from "../data/pokedex";
import { COEFFICIENTS } from "../scouting/coefficients";
import { SCOUTING } from "../scouting/scouting-data";
import { ROLES } from "../scouting/types";
import {
  GENS,
  LINES,
  REGIONS,
  type Gen,
  type Line,
  type Quality,
  type Region,
  type Role,
  type Species,
  type SpeciesId,
} from "./types";

const MAX_SPECIES_ID = 1025;
const MAX_FIT = 100;

export const ROLE_LINE: Readonly<Record<Role, Line>> = Object.fromEntries(
  ROLES.map((role) => [role, LINES[COEFFICIENTS.roleLine[role]]]),
) as Record<Role, Line>;

export function asSpeciesId(n: number): SpeciesId {
  if (!Number.isInteger(n) || n < 1 || n > MAX_SPECIES_ID) {
    throw new RangeError(`species id must be an integer in 1..${MAX_SPECIES_ID}, got ${n}`);
  }
  return n as SpeciesId;
}

function buildQualityTables(): Record<Role, readonly Quality[]> {
  const total = SCOUTING.length;
  const tables = {} as Record<Role, readonly Quality[]>;
  for (const role of ROLES) {
    const counts = new Array<number>(MAX_FIT + 1).fill(0);
    for (const s of SCOUTING) counts[s.fits[role]]! += 1;
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

function asRegion(region: string, id: number): Region {
  if (!(REGIONS as readonly string[]).includes(region)) {
    throw new RangeError(`species ${id} has unknown region ${region}`);
  }
  return region as Region;
}

function asGen(gen: number, id: number): Gen {
  if (!(GENS as readonly number[]).includes(gen)) {
    throw new RangeError(`species ${id} has unknown gen ${gen}`);
  }
  return gen as Gen;
}

function buildSpecies(): readonly Species[] {
  const dex = new Map(POKEDEX.map((p) => [p.id, p]));
  return SCOUTING.map((s): Species => {
    const p = dex.get(s.id);
    if (!p) throw new RangeError(`scouting species ${s.id} is missing from the Pokédex`);
    if (p.name !== s.name || p.gen !== s.gen) {
      throw new RangeError(`scouting and Pokédex disagree on species ${s.id}`);
    }
    const [first, second] = p.types;
    return {
      id: asSpeciesId(s.id),
      name: s.name,
      gen: asGen(p.gen, p.id),
      region: asRegion(p.region, p.id),
      types: second === undefined ? [first!] : [first!, second],
      special: p.legendary || p.mythical,
      evoChainId: p.evoChainId,
      attrs: s.attrs,
      fits: s.fits,
      quality: Object.fromEntries(ROLES.map((r) => [r, qualityOf(r, s.fits[r])])) as Record<
        Role,
        Quality
      >,
      bestRoles: s.bestRoles,
      strengths: s.strengths,
      weaknesses: s.weaknesses,
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
