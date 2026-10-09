import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POKEDEX } from "@/data/pokedex";
import { ABILITY_TRAITS } from "../ability-traits";
import { buildScouting, serializeScouting } from "../build";
import { checkReviewFile } from "../review";
import { REVIEW_FILES, REVIEWS } from "../reviews";

describe("scouting.json golden", () => {
  it("covers every species exactly once across the 9 review files", () => {
    expect(REVIEW_FILES.map((f) => f.gen)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(REVIEW_FILES.flatMap((f) => checkReviewFile(f, POKEDEX))).toEqual([]);
    expect(REVIEWS.map((r) => r.id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
  });

  it("equals a fresh deterministic build from layers 1 to 3, so a stale artifact fails", () => {
    const file = readFileSync(path.resolve(__dirname, "../../data/scouting.json"), "utf8");
    const built = serializeScouting(buildScouting(POKEDEX, ABILITY_TRAITS, REVIEWS));
    expect(file === built).toBe(true);
  });
});
