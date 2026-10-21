import { z } from "zod";
import { COEFFICIENTS } from "./coefficients";
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

const NonZeroAbilityContributionSchema = z
  .number()
  .min(-COEFFICIENTS.abilities.capPerAttr)
  .max(COEFFICIENTS.abilities.capPerAttr)
  .refine((v) => v !== 0, "zero ability contribution");

const NonZeroMoveContributionSchema = z
  .number()
  .min(-99)
  .max(99)
  .refine((v) => v !== 0, "zero move contribution");

export const ScoutingContributionsEntrySchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    abilities: z.partialRecord(z.enum(ATTRS), NonZeroAbilityContributionSchema),
    moves: z.partialRecord(z.enum(ATTRS), NonZeroMoveContributionSchema),
  })
  .strict();

export type ScoutingContributionsRecord = z.infer<typeof ScoutingContributionsEntrySchema>;
