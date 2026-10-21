// Regenerates src/data/scouting.json and src/data/scouting-contributions.json from pokedex.json (data),
// Layer 1 (attributes.ts), Layer 2 (src/scouting/review/gen-<n>.json), and Layer 3 (fit.ts). Deterministic.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX } from "@/data/pokedex";
import { ABILITY_TRAITS } from "@/scouting/ability-traits";
import {
  buildScouting,
  buildScoutingContributions,
  serializeScouting,
  serializeScoutingContributions,
} from "@/scouting/build";
import { checkReviewFile } from "@/scouting/review";
import { REVIEW_FILES, REVIEWS } from "@/scouting/reviews";
import {
  validatePokedex,
  validateScouting,
  validateScoutingContributions,
} from "./validate-artifacts";

validatePokedex(POKEDEX);
const problems = REVIEW_FILES.flatMap((f) => checkReviewFile(f, POKEDEX));
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
const out = path.resolve(import.meta.dirname, "../../src/data/scouting.json");
const contributionsOut = path.resolve(
  import.meta.dirname,
  "../../src/data/scouting-contributions.json",
);
const entries = buildScouting(POKEDEX, ABILITY_TRAITS, REVIEWS);
const contributions = buildScoutingContributions(POKEDEX, ABILITY_TRAITS);
validateScouting(entries);
validateScoutingContributions(contributions);
writeFileSync(out, serializeScouting(entries));
writeFileSync(contributionsOut, serializeScoutingContributions(contributions));
console.log(
  `wrote ${entries.length} species to src/data/scouting.json and src/data/scouting-contributions.json`,
);
