import { z } from "zod";
import raw from "./pokedex.json";

export const TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;
export type PokemonType = (typeof TYPES)[number];

export const SHAPES = [
  "ball",
  "squiggle",
  "fish",
  "arms",
  "blob",
  "upright",
  "legs",
  "quadruped",
  "wings",
  "tentacles",
  "heads",
  "humanoid",
  "bug-wings",
  "armor",
] as const;
export type Shape = (typeof SHAPES)[number];

const stat = z.number().int().min(1).max(255);

export const SpeciesSchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    name: z.string().min(1),
    genus: z.string().min(1),
    gen: z.number().int().min(1).max(9),
    region: z.string().min(1),
    types: z.array(z.enum(TYPES)).min(1).max(2),
    hp: stat,
    atk: stat,
    def: stat,
    spa: stat,
    spd: stat,
    spe: stat,
    heightDm: z.number().int().positive(),
    weightHg: z.number().int().positive(),
    shape: z.enum(SHAPES),
    abilities: z
      .array(
        z.object({ id: z.string().min(1), name: z.string().min(1), hidden: z.boolean() }).strict(),
      )
      .min(1),
    legendary: z.boolean(),
    mythical: z.boolean(),
    isBaby: z.boolean(),
    evoChainId: z.number().int().positive(),
    evoStage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    kickMoves: z.array(z.string().min(1)),
  })
  .strict();

export type Species = z.infer<typeof SpeciesSchema>;

export const POKEDEX: readonly Species[] = z.array(SpeciesSchema).parse(raw);

const byName = new Map(POKEDEX.map((s) => [s.name, s]));

export function speciesByName(name: string): Species {
  const s = byName.get(name);
  if (!s) throw new Error(`unknown species ${name}`);
  return s;
}
