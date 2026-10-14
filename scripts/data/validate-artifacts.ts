import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SpeciesSchema } from "../../src/data/pokedex-schema";
import { ScoutingEntrySchema } from "../../src/scouting/scouting-schema";

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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "../..");
  const dex = validatePokedex(
    JSON.parse(readFileSync(path.join(root, "src/data/pokedex.json"), "utf8")),
  );
  const scouting = validateScouting(
    JSON.parse(readFileSync(path.join(root, "src/data/scouting.json"), "utf8")),
  );
  console.log(`validated ${dex.length} Pokedex and ${scouting.length} scouting records`);
}
