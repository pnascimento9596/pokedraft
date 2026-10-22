import { describe, expect, it } from "vitest";
import rawPokedex from "../pokedex.json";
import rawScouting from "../scouting.json";
import { SPECIES_INDEX, slimSpeciesById, type SlimSpecies } from "../species-index";

describe("species-index (slim species index)", () => {
  it("indexes all 1,025 species sorted by dex id", () => {
    expect(SPECIES_INDEX).toHaveLength(1025);
    expect(SPECIES_INDEX[0]!.id).toBe(1);
    expect(SPECIES_INDEX[1024]!.id).toBe(1025);
    expect(SPECIES_INDEX.every((s, i) => s.id === i + 1)).toBe(true);
  });

  it("matches pokedex.json and scouting.json fields for every species (1,025)", () => {
    expect(rawPokedex).toHaveLength(1025);
    expect(rawScouting).toHaveLength(1025);

    for (let i = 0; i < 1025; i++) {
      const p = rawPokedex[i]!;
      const sc = rawScouting[i]!;
      const s = SPECIES_INDEX[i]!;

      expect(s.id).toBe(p.id);
      expect(s.id).toBe(sc.id);
      expect(s.name).toBe(p.name);
      expect(s.name).toBe(sc.name);
      expect(s.gen).toBe(p.gen);
      expect(s.gen).toBe(sc.gen);
      expect(s.types).toEqual(p.types);
      expect(s.special).toBe(p.legendary || p.mythical);
    }
  });

  it("finds species by dex id using slimSpeciesById", () => {
    expect(slimSpeciesById(1).name).toBe("Bulbasaur");
    expect(slimSpeciesById(25).name).toBe("Pikachu");
    expect(slimSpeciesById(150).name).toBe("Mewtwo");
    expect(slimSpeciesById(150).special).toBe(true);
    expect(slimSpeciesById(1025).name).toBe("Pecharunt");
    expect(slimSpeciesById(1025).special).toBe(true);
  });

  it("throws on unknown id in slimSpeciesById", () => {
    expect(() => slimSpeciesById(0)).toThrow(RangeError);
    expect(() => slimSpeciesById(1026)).toThrow(RangeError);
    expect(() => slimSpeciesById(-1)).toThrow(RangeError);
  });
});
