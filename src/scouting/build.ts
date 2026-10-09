import type { Species } from "@/data/pokedex";
import type { AbilityTraits } from "./ability-traits";
import { clampAttr, computeBaselines } from "./attributes";
import { allFits } from "./fit";
import type { ReviewEntry } from "./review";
import { ATTRS, type Attributes, type RoleFits } from "./types";

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
