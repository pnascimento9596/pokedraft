import { z } from "zod";
import type { Species } from "../data/pokedex";
import { COEFFICIENTS } from "./coefficients";
import { TAGS } from "./tags";
import { ATTRS, ROLES } from "./types";

const { maxAdjustments, maxMagnitude } = COEFFICIENTS.review;

// A rationale must name at least one data field it relied on.
export const CITED_FIELD =
  /\b(hp|atk|def|spa|spd|spe|heightDm|weightHg|height|weight|shape|abilit(y|ies)|types?|genus|kickMoves|legendary|mythical|isBaby|evoStage)\b/i;

export const ReviewEntrySchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    name: z.string().min(1),
    adjustments: z
      .partialRecord(
        z.enum(ATTRS),
        z
          .number()
          .int()
          .min(-maxMagnitude)
          .max(maxMagnitude)
          .refine((v) => v !== 0, "zero adjustment"),
      )
      .refine(
        (a) => Object.keys(a).length <= maxAdjustments,
        `at most ${maxAdjustments} adjustments`,
      ),
    bestRoles: z
      .array(z.enum(ROLES))
      .length(3)
      .refine((r) => new Set(r).size === 3, "bestRoles must be distinct"),
    worstRoles: z
      .array(z.enum(ROLES))
      .length(2)
      .refine((r) => new Set(r).size === 2, "worstRoles must be distinct"),
    strengths: z.array(z.enum(TAGS)).min(2).max(4),
    weaknesses: z.array(z.enum(TAGS)).min(2).max(4),
    rationale: z.string().min(20).max(500).regex(CITED_FIELD, "rationale must cite a data field"),
  })
  .strict()
  .refine((e) => !e.bestRoles.some((r) => e.worstRoles.includes(r)), "best and worst roles overlap")
  .refine(
    (e) => !e.strengths.some((t) => e.weaknesses.includes(t)),
    "a tag is both strength and weakness",
  )
  .refine((e) => !/—/.test(e.rationale), "rationale contains an em dash");

export type ReviewEntry = z.infer<typeof ReviewEntrySchema>;

export const ReviewFileSchema = z
  .object({ gen: z.number().int().min(1).max(9), entries: z.array(ReviewEntrySchema) })
  .strict();

export type ReviewFile = z.infer<typeof ReviewFileSchema>;

// Checks one generation file against the Pokédex: every species of that gen exactly once,
// ordered by id, names matching. Returns problems; empty means valid.
export function checkReviewFile(file: ReviewFile, dex: readonly Species[]): string[] {
  const problems: string[] = [];
  const expected = dex.filter((s) => s.gen === file.gen);
  const ids = file.entries.map((e) => e.id);
  const want = expected.map((s) => s.id);
  if (ids.join(",") !== want.join(",")) {
    const have = new Set(ids);
    const missing = want.filter((id) => !have.has(id));
    const extra = ids.filter((id) => !want.includes(id));
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    problems.push(
      `gen ${file.gen}: ids must be exactly ${want[0]}..${want.at(-1)} in order; missing [${missing}] extra [${extra}] duplicate [${dupes}]`,
    );
  }
  const byId = new Map(dex.map((s) => [s.id, s]));
  for (const e of file.entries) {
    const s = byId.get(e.id);
    if (s && s.name !== e.name) problems.push(`id ${e.id}: name ${e.name} should be ${s.name}`);
  }
  return problems;
}
