import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SpeciesSchema, TYPES } from "../../src/data/pokedex-schema";
import {
  ScoutingContributionsEntrySchema,
  ScoutingEntrySchema,
} from "../../src/scouting/scouting-schema";

export function validatePokedex(input: unknown) {
  return z.array(SpeciesSchema).parse(input);
}

export function validateScouting(input: unknown) {
  // Raw readers must not expose nested keys that the public schema would strip.
  const artifactSchema = ScoutingEntrySchema.extend({
    baseline: ScoutingEntrySchema.shape.baseline.strict(),
    attrs: ScoutingEntrySchema.shape.attrs.strict(),
    fits: ScoutingEntrySchema.shape.fits.strict(),
  });
  return z.array(artifactSchema).parse(input);
}

export function validateScoutingContributions(input: unknown) {
  return z.array(ScoutingContributionsEntrySchema).parse(input);
}

export const SpeciesIndexEntrySchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    name: z.string().min(1),
    types: z.array(z.enum(TYPES)).min(1).max(2),
    gen: z.number().int().min(1).max(9),
    special: z.boolean(),
  })
  .strict();

export function validateSpeciesIndex(input: unknown) {
  return z.array(SpeciesIndexEntrySchema).parse(input);
}

export const SpeciesChunkEntrySchema = z
  .object({
    id: z.number().int().min(1).max(1025),
    evoChainId: z.number().int().min(1),
    attrs: ScoutingEntrySchema.shape.attrs.strict(),
    fits: ScoutingEntrySchema.shape.fits.strict(),
    bestRoles: ScoutingEntrySchema.shape.bestRoles,
    worstRoles: ScoutingEntrySchema.shape.worstRoles,
    strengths: ScoutingEntrySchema.shape.strengths,
    weaknesses: ScoutingEntrySchema.shape.weaknesses,
  })
  .strict();

export function validateSpeciesChunk(input: unknown) {
  return z.array(SpeciesChunkEntrySchema).parse(input);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "../..");
  const dex = validatePokedex(
    JSON.parse(readFileSync(path.join(root, "src/data/pokedex.json"), "utf8")),
  );
  const scouting = validateScouting(
    JSON.parse(readFileSync(path.join(root, "src/data/scouting.json"), "utf8")),
  );
  const contributions = validateScoutingContributions(
    JSON.parse(readFileSync(path.join(root, "src/data/scouting-contributions.json"), "utf8")),
  );
  const index = validateSpeciesIndex(
    JSON.parse(readFileSync(path.join(root, "src/data/species-index.json"), "utf8")),
  );
  let totalChunkRecords = 0;
  for (let g = 1; g <= 9; g++) {
    const chunk = validateSpeciesChunk(
      JSON.parse(readFileSync(path.join(root, `src/data/species-chunks/gen-${g}.json`), "utf8")),
    );
    totalChunkRecords += chunk.length;
  }
  console.log(
    `validated ${dex.length} Pokedex, ${scouting.length} scouting, ${contributions.length} contribution records, ${index.length} index records, and ${totalChunkRecords} species chunk records across 9 gens`,
  );
}
