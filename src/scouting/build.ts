import type { Species } from "@/data/pokedex";
import type { AbilityTraits } from "./ability-traits";
import { clampAttr, computeBaselines } from "./attributes";
import { allFits } from "./fit";
import type { ReviewEntry } from "./review";
import { ATTRS, type Attr, type Attributes, type RoleFits } from "./types";

export interface ScoutingEntry {
  id: number;
  name: string;
  gen: number;
  baseline: Attributes;
  adjustments: ReviewEntry["adjustments"];
  attrs: Attributes;
  fits: RoleFits;
  bestRoles: ReviewEntry["bestRoles"];
  worstRoles: ReviewEntry["worstRoles"];
  strengths: ReviewEntry["strengths"];
  weaknesses: ReviewEntry["weaknesses"];
  rationale: string;
}

export interface ScoutingContributionsEntry {
  id: number;
  abilities: Partial<Record<Attr, number>>;
  moves: Partial<Record<Attr, number>>;
}

export function applyAdjustments(
  baseline: Attributes,
  adj: ReviewEntry["adjustments"],
): Attributes {
  return Object.fromEntries(
    ATTRS.map((a) => [a, clampAttr(baseline[a] + (adj[a] ?? 0))]),
  ) as Attributes;
}

export function buildScouting(
  dex: readonly Species[],
  traits: AbilityTraits,
  reviews: readonly ReviewEntry[],
): ScoutingEntry[] {
  const baselines = computeBaselines(dex, traits);
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  return dex.map((s) => {
    const review = reviewById.get(s.id);
    if (!review) throw new Error(`no Layer 2 review for ${s.id} ${s.name}`);
    const baseline = baselines.get(s.id)!.attrs;
    const attrs = applyAdjustments(baseline, review.adjustments);
    return {
      id: s.id,
      name: s.name,
      gen: s.gen,
      baseline,
      adjustments: review.adjustments,
      attrs,
      fits: allFits(attrs, review.bestRoles),
      bestRoles: review.bestRoles,
      worstRoles: review.worstRoles,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      rationale: review.rationale,
    };
  });
}

export function serializeScouting(entries: readonly ScoutingEntry[]): string {
  return "[\n" + entries.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
}

export function buildScoutingContributions(
  dex: readonly Species[],
  traits: AbilityTraits,
): ScoutingContributionsEntry[] {
  const baselines = computeBaselines(dex, traits);
  return dex.map((s) => {
    const breakdown = baselines.get(s.id)!.breakdown;
    const abilities: Partial<Record<Attr, number>> = {};
    const moves: Partial<Record<Attr, number>> = {};
    for (const attr of ATTRS) {
      if (breakdown[attr].abilities !== 0) abilities[attr] = breakdown[attr].abilities;
      if (breakdown[attr].moves !== 0) moves[attr] = breakdown[attr].moves;
    }
    return { id: s.id, abilities, moves };
  });
}

export function serializeScoutingContributions(
  entries: readonly ScoutingContributionsEntry[],
): string {
  return "[\n" + entries.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
}
