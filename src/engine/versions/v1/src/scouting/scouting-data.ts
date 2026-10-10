import { z } from "zod";
import raw from "../data/scouting.json";
import { ReviewEntrySchema } from "./review";
import { ATTRS, ROLES } from "./types";

const AttributesSchema = z.object(
  Object.fromEntries(ATTRS.map((a) => [a, z.number().int().min(1).max(99)])) as Record<
    (typeof ATTRS)[number],
    z.ZodNumber
  >,
);
const FitsSchema = z.object(
  Object.fromEntries(ROLES.map((r) => [r, z.number().int().min(0).max(100)])) as Record<
    (typeof ROLES)[number],
    z.ZodNumber
  >,
);

const review = ReviewEntrySchema.shape;

export const ScoutingEntrySchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    name: z.string().min(1),
    gen: z.number().int().min(1).max(9),
    baseline: AttributesSchema,
    adjustments: review.adjustments,
    attrs: AttributesSchema,
    fits: FitsSchema,
    bestRoles: review.bestRoles,
    worstRoles: review.worstRoles,
    strengths: review.strengths,
    weaknesses: review.weaknesses,
    rationale: review.rationale,
  })
  .strict();

export type ScoutingRecord = z.infer<typeof ScoutingEntrySchema>;

export const SCOUTING: readonly ScoutingRecord[] = z.array(ScoutingEntrySchema).parse(raw);
