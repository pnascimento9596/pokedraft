import { z } from "zod";
import raw from "./ability-traits.json";
import { ATTRS } from "./types";

const AttrModsSchema = z.partialRecord(z.enum(ATTRS), z.number().int().min(-10).max(10));

const AbilityTraitsSchema = z
  .object({
    about: z.string(),
    abilities: z.record(
      z.string().min(1),
      z.object({ mods: AttrModsSchema, reason: z.string().min(1) }).strict(),
    ),
  })
  .strict();

export type AbilityTraits = z.infer<typeof AbilityTraitsSchema>["abilities"];

export const ABILITY_TRAITS: AbilityTraits = AbilityTraitsSchema.parse(raw).abilities;
