import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POKEDEX, speciesByName } from "../pokedex";

describe("pokedex.json", () => {
  it("holds exactly species 1..1025 in order, so a dropped or duplicated species fails", () => {
    expect(POKEDEX).toHaveLength(1025);
    expect(POKEDEX.map((s) => s.id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
  });

  it("has the canonical per-generation species counts", () => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const s of POKEDEX) counts[s.gen - 1]++;
    expect(counts).toEqual([151, 100, 135, 107, 156, 72, 88, 96, 120]);
  });

  it("has all six base stats on every species (the schema rejects a missing stat)", () => {
    const missing = POKEDEX.filter((s) =>
      [s.hp, s.atk, s.def, s.spa, s.spd, s.spe].some((v) => !Number.isInteger(v)),
    );
    expect(missing).toEqual([]);
  });

  it("flags Mewtwo legendary, Mew mythical, and Pichu baby", () => {
    expect(speciesByName("Mewtwo").legendary).toBe(true);
    expect(speciesByName("Mew").mythical).toBe(true);
    expect(speciesByName("Pichu").isBaby).toBe(true);
  });

  it("keeps known base stats for Pikachu, catching a stat-id mapping swap", () => {
    const p = speciesByName("Pikachu");
    expect([p.hp, p.atk, p.def, p.spa, p.spd, p.spe]).toEqual([35, 55, 40, 50, 50, 90]);
  });

  it("gives Cinderace pyro-ball and Magikarp the fish shape", () => {
    expect(speciesByName("Cinderace").kickMoves).toContain("pyro-ball");
    expect(speciesByName("Magikarp").shape).toBe("fish");
  });

  it("derives evolution stage from evolves_from depth", () => {
    expect(["Charmander", "Charmeleon", "Charizard"].map((n) => speciesByName(n).evoStage)).toEqual(
      [1, 2, 3],
    );
  });

  it("is written in canonical one-species-per-line form, so the build is byte-stable", () => {
    const file = readFileSync(path.resolve(__dirname, "../pokedex.json"), "utf8");
    const canonical = "[\n" + POKEDEX.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
    expect(file === canonical).toBe(true);
  });
});
