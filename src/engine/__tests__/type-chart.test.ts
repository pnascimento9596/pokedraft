import { describe, expect, it } from "vitest";
import { TYPES } from "@/data/pokedex";
import chart from "@/data/type-chart.json";
import { speciesById } from "../species";
import { covers, superEffective } from "../type-chart";

describe("superEffective", () => {
  it("reads the PokéAPI efficacy table", () => {
    expect(superEffective("water", "fire")).toBe(true);
    expect(superEffective("fire", "water")).toBe(false);
    expect(superEffective("electric", "ground")).toBe(false);
    expect(superEffective("ground", "electric")).toBe(true);
    expect(superEffective("fairy", "dragon")).toBe(true);
    expect(superEffective("normal", "ghost")).toBe(false);
  });

  it("has 51 super-effective pairs over the 18 types", () => {
    let n = 0;
    for (const a of TYPES) for (const d of TYPES) if (superEffective(a, d)) n++;
    expect(n).toBe(51);
  });

  it("the built JSON lists attackers in TYPES order", () => {
    expect(Object.keys(chart)).toEqual([...TYPES]);
  });
});

describe("covers (a has a type that beats a type b is weak to)", () => {
  it("Charizard covers Blastoise: water is weak to grass, and fire beats grass", () => {
    expect(covers(speciesById(6), speciesById(9))).toBe(true);
  });

  it("Pikachu does not cover Snorlax: normal is weak only to fighting, which electric does not beat", () => {
    expect(covers(speciesById(25), speciesById(143))).toBe(false);
  });

  it("a pure normal type covers nobody", () => {
    expect(covers(speciesById(143), speciesById(9))).toBe(false);
  });
});
