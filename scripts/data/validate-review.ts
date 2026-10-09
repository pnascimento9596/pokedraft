// Validates one Layer 2 review file. Usage: pnpm tsx scripts/data/validate-review.ts <gen>
import { readFileSync } from "node:fs";
import path from "node:path";
import { POKEDEX } from "@/data/pokedex";
import { ReviewFileSchema, checkReviewFile } from "@/scouting/review";

const gen = Number(process.argv[2]);
const file = path.resolve(import.meta.dirname, `../../src/scouting/review/gen-${gen}.json`);
const parsed = ReviewFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!parsed.success) {
  for (const issue of parsed.error.issues.slice(0, 40)) {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  }
  console.error(`INVALID: ${parsed.error.issues.length} schema issues`);
  process.exit(1);
}
const problems = checkReviewFile(parsed.data, POKEDEX);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`VALID: gen ${gen}, ${parsed.data.entries.length} entries`);
