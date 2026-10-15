import {
  DraftError,
  FORMATION_IDS,
  GENS,
  type DraftSettings,
  type Gen,
  type SpeciesId,
} from "./types";

const MAX_SPECIES_ID = 1025;

export function asSpeciesId(n: number): SpeciesId {
  if (!Number.isInteger(n) || n < 1 || n > MAX_SPECIES_ID) {
    throw new RangeError(`species id must be an integer in 1..${MAX_SPECIES_ID}, got ${n}`);
  }
  return n as SpeciesId;
}

function invalidSettings(message: string): never {
  throw new DraftError("invalidSettings", message);
}

function normalizeGens(gens: unknown): readonly Gen[] {
  if (!Array.isArray(gens) || gens.length === 0) invalidSettings("gens must be a non-empty list");
  const known: readonly number[] = GENS;
  const out: Gen[] = [];
  for (const g of gens) {
    if (typeof g !== "number" || !known.includes(g)) invalidSettings(`unknown gen ${String(g)}`);
    if (out.includes(g as Gen)) invalidSettings(`duplicate gen ${g}`);
    out.push(g as Gen);
  }
  return out.sort((a, b) => a - b);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    invalidSettings(`unknown ${what} ${String(value)}`);
  }
  return value as T;
}

export function normalizeSettings(settings: DraftSettings): DraftSettings {
  const formation = oneOf(settings.formation, FORMATION_IDS, "formation");
  switch (settings.mode) {
    case "builder":
      if (typeof settings.legendaries !== "boolean") invalidSettings("legendaries must be boolean");
      return {
        mode: "builder",
        formation,
        gens: normalizeGens(settings.gens),
        legendaries: settings.legendaries,
      };
    case "cup8":
      return {
        mode: "cup8",
        formation,
        gens: normalizeGens(settings.gens),
        style: oneOf(settings.style, ["open", "classic3"], "style"),
        order: oneOf(settings.order, ["squadFirst", "positionFirst"], "order"),
      };
    case "kanto151":
      return {
        mode: "kanto151",
        formation,
        order: oneOf(settings.order, ["squadFirst", "positionFirst"], "order"),
      };
    default:
      return invalidSettings(`unknown mode ${String((settings as { mode: unknown }).mode)}`);
  }
}
