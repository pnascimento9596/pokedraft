import { z } from "zod";
import { TYPES } from "./pokedex-schema";

export const DAMAGE_CLASSES = ["physical", "special", "status"] as const;
export type DamageClass = (typeof DAMAGE_CLASSES)[number];

const MoveIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const MoveSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(TYPES),
    damageClass: z.enum(DAMAGE_CLASSES),
    power: z.number().int().positive().nullable(),
  })
  .strict();

export const SpeciesMovesetRowSchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    moves: z.array(MoveIdSchema).min(1).max(4),
    keeperMove: MoveIdSchema.nullable(),
  })
  .strict();

export const MovesetsArtifactSchema = z
  .object({
    about: z.string().min(1),
    pokeapiCommit: z.string().regex(/^[0-9a-f]{40}$/),
    moves: z.record(MoveIdSchema, MoveSchema),
    species: z.array(SpeciesMovesetRowSchema).length(1025),
  })
  .strict()
  .superRefine((doc, ctx) => {
    doc.species.forEach((row, i) => {
      if (row.id !== i + 1) {
        ctx.addIssue({
          code: "custom",
          message: `species[${i}] has id ${row.id}`,
          path: ["species", i],
        });
      }
      if (new Set(row.moves).size !== row.moves.length) {
        ctx.addIssue({
          code: "custom",
          message: `species ${row.id} repeats a move`,
          path: ["species", i],
        });
      }
      for (const ref of [...row.moves, ...(row.keeperMove ? [row.keeperMove] : [])]) {
        if (!(ref in doc.moves)) {
          ctx.addIssue({
            code: "custom",
            message: `species ${row.id} cites unknown move ${ref}`,
            path: ["species", i],
          });
        }
      }
    });
  });

export type Move = z.infer<typeof MoveSchema> & { id: string };
export type MovesetsArtifact = z.infer<typeof MovesetsArtifactSchema>;
export type Moveset = { id: number; moves: readonly Move[]; keeperMove: Move | null };
