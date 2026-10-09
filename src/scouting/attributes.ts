import type { Species } from "@/data/pokedex";
import type { AbilityTraits } from "./ability-traits";
import { COEFFICIENTS, type Feature, type ScoutingCoefficients } from "./coefficients";
import { MOVE_TRAITS } from "./move-traits";
import { ATTRS, type Attr, type Attributes } from "./types";

export interface AttributeBreakdown {
  base: number;
  shape: number;
  heavy: number;
  baby: number;
  moves: number;
  abilities: number;
  type: number;
}

export interface Baseline {
  attrs: Attributes;
  breakdown: Record<Attr, AttributeBreakdown>;
}

type FeatureVector = Record<Feature, number>;

function midrankPercentiles(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lower = (v: number) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid]! < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const upper = (v: number) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid]! <= v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  return values.map((v) => {
    const less = lower(v);
    const equal = upper(v) - less;
    return (less + equal / 2) / values.length;
  });
}

function featureVectors(dex: readonly Species[]): FeatureVector[] {
  const pct = (pick: (s: Species) => number) => midrankPercentiles(dex.map(pick));
  const hp = pct((s) => s.hp);
  const atk = pct((s) => s.atk);
  const def = pct((s) => s.def);
  const spa = pct((s) => s.spa);
  const spd = pct((s) => s.spd);
  const spe = pct((s) => s.spe);
  const height = pct((s) => s.heightDm);
  const weight = pct((s) => s.weightHg);
  return dex.map((_, i) => ({
    hp: hp[i]!,
    atk: atk[i]!,
    def: def[i]!,
    spa: spa[i]!,
    spd: spd[i]!,
    spe: spe[i]!,
    height: height[i]!,
    weight: weight[i]!,
    small: 1 - height[i]!,
    light: 1 - weight[i]!,
  }));
}

function capped(value: number, cap: number): number {
  return Math.max(-cap, Math.min(cap, value));
}

function moveMods(s: Species, c: ScoutingCoefficients): Partial<Record<Attr, number>> {
  const out: Partial<Record<Attr, number>> = {};
  for (const [trait, rule] of Object.entries(c.moves.traits)) {
    let points = 0;
    for (const move of s.kickMoves) {
      if (MOVE_TRAITS[move] === trait) points += c.moves.points[move] ?? 0;
    }
    points = Math.min(points, rule.cap);
    for (const [attr, mult] of Object.entries(rule.attrs) as [Attr, number][]) {
      out[attr] = (out[attr] ?? 0) + points * mult;
    }
  }
  return out;
}

function abilityMods(
  s: Species,
  traits: AbilityTraits,
  c: ScoutingCoefficients,
): Partial<Record<Attr, number>> {
  const out: Partial<Record<Attr, number>> = {};
  for (const a of s.abilities) {
    const t = traits[a.id];
    if (!t) continue;
    const w = a.hidden ? c.abilities.hiddenWeight : 1;
    for (const [attr, v] of Object.entries(t.mods) as [Attr, number][]) {
      out[attr] = (out[attr] ?? 0) + v * w;
    }
  }
  for (const attr of Object.keys(out) as Attr[]) {
    out[attr] = capped(out[attr]!, c.abilities.capPerAttr);
  }
  return out;
}

function typeMods(s: Species, c: ScoutingCoefficients): Partial<Record<Attr, number>> {
  const out: Partial<Record<Attr, number>> = {};
  for (const t of s.types) {
    for (const [attr, v] of Object.entries(c.type.mods[t] ?? {}) as [Attr, number][]) {
      out[attr] = (out[attr] ?? 0) + v;
    }
  }
  for (const attr of Object.keys(out) as Attr[]) {
    out[attr] = capped(out[attr]!, c.type.capPerAttr);
  }
  return out;
}

function heavyPenalty(s: Species, c: ScoutingCoefficients): number {
  const kg = s.weightHg / 10;
  if (kg <= c.heavy.thresholdKg) return 0;
  return Math.min(c.heavy.cap, c.heavy.perDoubling * Math.log2(kg / c.heavy.thresholdKg));
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function computeBaselines(
  dex: readonly Species[],
  traits: AbilityTraits,
  c: ScoutingCoefficients = COEFFICIENTS,
): Map<number, Baseline> {
  const features = featureVectors(dex);
  const basePct = {} as Record<Attr, number[]>;
  for (const attr of ATTRS) {
    const blends = features.map((f) =>
      Object.entries(c.blend[attr]).reduce((sum, [k, w]) => sum + f[k as Feature] * w!, 0),
    );
    basePct[attr] = midrankPercentiles(blends);
  }

  const out = new Map<number, Baseline>();
  dex.forEach((s, i) => {
    const shape = c.shape[s.shape];
    const heavy = heavyPenalty(s, c);
    const moves = moveMods(s, c);
    const abilities = abilityMods(s, traits, c);
    const types = typeMods(s, c);
    const attrs = {} as Attributes;
    const breakdown = {} as Record<Attr, AttributeBreakdown>;
    for (const attr of ATTRS) {
      const b: AttributeBreakdown = {
        base: c.scale.floor + c.scale.span * basePct[attr][i]!,
        shape: shape[attr] ?? 0,
        heavy: -heavy * (c.heavy.attrs[attr] ?? 0),
        baby: s.isBaby ? c.baby.allAttrs : 0,
        moves: moves[attr] ?? 0,
        abilities: abilities[attr] ?? 0,
        type: types[attr] ?? 0,
      };
      const total = b.base + b.shape + b.heavy + b.baby + b.moves + b.abilities + b.type;
      attrs[attr] = clampAttr(total, c);
      breakdown[attr] = {
        base: round2(b.base),
        shape: b.shape,
        heavy: round2(b.heavy),
        baby: b.baby,
        moves: round2(b.moves),
        abilities: round2(b.abilities),
        type: b.type,
      };
    }
    out.set(s.id, { attrs, breakdown });
  });
  return out;
}

export function clampAttr(v: number, c: ScoutingCoefficients = COEFFICIENTS): number {
  return Math.max(c.scale.min, Math.min(c.scale.max, Math.round(v)));
}
