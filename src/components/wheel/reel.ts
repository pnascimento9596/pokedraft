import { TYPES } from "@/data/pokedex";
import {
  GENS,
  REGIONS,
  speciesById,
  type DraftSettings,
  type PokemonType,
  type Region,
  type RerollTarget,
  type Roll,
  type SpeciesId,
} from "@/engine";
import { GEN_REGION, REGION_LABEL, typeLabel } from "@/ui/labels";

export type Face =
  | { readonly kind: "region"; readonly value: Region; readonly label: string }
  | { readonly kind: "type"; readonly value: PokemonType; readonly label: string }
  | { readonly kind: "species"; readonly value: SpeciesId; readonly label: string };

export type StageKind = Face["kind"];

export interface Stage {
  readonly kind: StageKind;
  readonly faces: readonly Face[];
  readonly landing: Face;
}

export type RollCause = "new" | RerollTarget;

const KANTO151_MAX = 151;
const SPECIES_NEIGHBOURS_BEFORE = 6;
const SPECIES_NEIGHBOURS_AFTER = 5;

export function faceValue(face: Face): string {
  return String(face.value);
}

function sameFace(a: Face, b: Face): boolean {
  return a.kind === b.kind && a.value === b.value;
}

export function regionFace(region: Region): Face {
  return { kind: "region", value: region, label: REGION_LABEL[region] };
}

export function typeFace(type: PokemonType): Face {
  return { kind: "type", value: type, label: typeLabel(type) };
}

export function speciesFace(id: SpeciesId): Face {
  return { kind: "species", value: id, label: speciesById(id).name };
}

export function regionFaces(settings: DraftSettings): readonly Face[] {
  const gens = settings.mode === "kanto151" ? [1] : settings.gens;
  const selected = new Set<Region>(GENS.filter((g) => gens.includes(g)).map((g) => GEN_REGION[g]));
  return REGIONS.filter((r) => selected.has(r)).map(regionFace);
}

export function typeFaces(): readonly Face[] {
  return TYPES.map(typeFace);
}

// Real Kanto Dex neighbours around the rolled species, wrapping inside 1 to 151.
export function speciesFaces(landing: SpeciesId): readonly Face[] {
  const ids: number[] = [];
  for (let d = -SPECIES_NEIGHBOURS_BEFORE; d <= SPECIES_NEIGHBOURS_AFTER; d++) {
    ids.push(((((landing - 1 + d) % KANTO151_MAX) + KANTO151_MAX) % KANTO151_MAX) + 1);
  }
  return ids.sort((a, b) => a - b).map((id) => speciesFace(id as SpeciesId));
}

// Decoration laps walk the drum in pool order starting just after the landing face, so each lap
// and the whole strip end exactly on the landing face.
export function buildStrip(
  faces: readonly Face[],
  landing: Face,
  laps: number,
): { strip: readonly Face[]; landingIndex: number } {
  const n = faces.length;
  const at = faces.findIndex((f) => sameFace(f, landing));
  const start = at < 0 ? 0 : at + 1;
  const strip: Face[] = [];
  for (let lap = 0; lap < Math.max(1, laps); lap++) {
    for (let k = 0; k < n; k++) strip.push(faces[(start + k) % n]!);
  }
  if (at < 0 || n === 0) strip.push(landing);
  return { strip, landingIndex: strip.length - 1 };
}

// The face that follows `face` on the drum, used to fill the window around the payline.
export function neighbourFace(faces: readonly Face[], face: Face, step: 1 | -1): Face {
  const n = faces.length;
  const at = faces.findIndex((f) => sameFace(f, face));
  if (n === 0 || at < 0) return face;
  return faces[(at + step + n) % n]!;
}

export function stagesFor(roll: Roll, settings: DraftSettings, cause: RollCause): readonly Stage[] {
  if (roll.kind === "species") {
    return [
      { kind: "species", faces: speciesFaces(roll.species), landing: speciesFace(roll.species) },
    ];
  }
  const region: Stage = {
    kind: "region",
    faces: regionFaces(settings),
    landing: regionFace(roll.region),
  };
  const type: Stage = { kind: "type", faces: typeFaces(), landing: typeFace(roll.type) };
  return cause === "type" ? [type] : [region, type];
}

export function announce(stage: Stage): string {
  const { landing } = stage;
  switch (landing.kind) {
    case "region":
      return `Region: ${landing.label}.`;
    case "type":
      return `Type: ${landing.label}.`;
    case "species":
      return `Rolled ${landing.label}, number ${landing.value}.`;
  }
}

export function dexLabel(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

// cubic-bezier(x1, y1, x2, y2) as a function of progress, solved for x by Newton then bisection.
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u ** 2 * (1 - u) + u ** 3;
  const by = (u: number) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3;
  const dx = (u: number) =>
    3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u ** 2;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= (bx(u) - t) / d;
    }
    if (u < 0 || u > 1 || Math.abs(bx(u) - t) > 1e-4) {
      let lo = 0;
      let hi = 1;
      u = t;
      for (let i = 0; i < 30; i++) {
        if (bx(u) < t) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return by(u);
  };
}

export const reelEase = cubicBezier(0.16, 0.74, 0.12, 1);
