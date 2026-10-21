import { z } from "zod";
import raw from "../../../_blobs/01f6314fad9c713cafeb0ef4f3dccbced1ef8297c8dba8d8aba4f95d1e0b5851.json";

export const MOVE_TRAIT_NAMES = ["kick", "reflex", "header"] as const;
export type MoveTrait = (typeof MOVE_TRAIT_NAMES)[number];

const MoveTraitsSchema = z
  .object({
    about: z.string(),
    moves: z.record(
      z.string().min(1),
      z.object({ trait: z.enum(MOVE_TRAIT_NAMES), reason: z.string().min(1) }).strict(),
    ),
  })
  .strict();

export const MOVE_TRAITS: Readonly<Record<string, MoveTrait>> = Object.fromEntries(
  Object.entries(MoveTraitsSchema.parse(raw).moves).map(([id, m]) => [id, m.trait]),
);
