import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POKEDEX } from "@/data/pokedex";
import { ABILITY_TRAITS } from "../ability-traits";
import {
  buildScouting,
  buildScoutingContributions,
  serializeScouting,
  serializeScoutingContributions,
} from "../build";
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
    const sha256 = createHash("sha256").update(file).digest("hex");
    expect(sha256).toBe("9f771c3ad5f68097321551d188f1b0071d7d53cbceb22da217ee29b9d85d4e8e");
  });
});

describe("scouting-contributions.json golden", () => {
  it("emits non-zero ability and move contributions per species and attribute (catches discarded breakdown contributions)", () => {
    const entries = buildScoutingContributions(POKEDEX, ABILITY_TRAITS);
    expect(entries.map((e) => e.id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
    expect(entries[142]).toEqual({
      id: 143,
      abilities: { ACC: -2, PHY: 3 },
      moves: { SHO: 1.75, DRI: 0.5, TEC: 0.75, AER: 3, KIC: 1 },
    });
    expect(entries[105]).toEqual({
      id: 106,
      abilities: { PAC: 1, ACC: 2.5, SHO: 3, PAS: -2, DRI: 3, TEC: 2, TAK: 2 },
      moves: { SHO: 24.25, DRI: 12, TEC: 18, AER: 1, DIV: 2.25, HAN: 1.5, REF: 3, KIC: 24 },
    });
    expect(entries[745]).toEqual({
      id: 746,
      abilities: { DIV: 8, HAN: 8, REF: 4, GKP: 6 },
      moves: {},
    });
    expect(entries[0]).toEqual({
      id: 1,
      abilities: {},
      moves: { SHO: 0.25, AER: 1 },
    });
  });

  it("equals the committed src/data/scouting-contributions.json artifact", () => {
    const file = readFileSync(
      path.resolve(__dirname, "../../data/scouting-contributions.json"),
      "utf8",
    );
    const built = serializeScoutingContributions(
      buildScoutingContributions(POKEDEX, ABILITY_TRAITS),
    );
    expect(file === built).toBe(true);
  });
});
