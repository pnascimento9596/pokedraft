import { describe, expect, it } from "vitest";
import { POKEDEX, speciesByName } from "@/data/pokedex";
import { ABILITY_TRAITS } from "../ability-traits";
import { computeBaselines } from "../attributes";
import { checkCitations, layer1ModTotals } from "../citations";
import { SCOUTING } from "../scouting-data";

const baselines = computeBaselines(POKEDEX, ABILITY_TRAITS);
const abilityNames = new Map(
  POKEDEX.flatMap((s) => s.abilities.map((a) => [a.id, a.name] as const)),
);
const entry = (id: number, rationale?: string) => {
  const e = SCOUTING[id - 1]!;
  return {
    ...e,
    rationale: rationale ?? e.rationale,
    layer1Mods: layer1ModTotals(baselines.get(id)!.breakdown),
  };
};
const check = (name: string, rationale: string) => {
  const s = speciesByName(name);
  return checkCitations(entry(s.id, rationale), s, abilityNames);
};

describe("citation checker", () => {
  it("flags a base stat the species does not have (Snorlax hp is 160)", () => {
    expect(check("Snorlax", "Hp 150 makes it durable.")).toEqual(['"Hp 150" but hp is 160']);
  });

  it("flags a stale attribute value and names the shipped values", () => {
    expect(check("Snorlax", "Its STA 12 is low.")).toEqual([
      '"STA 12" but STA is 96 baseline, 90 final, Layer 1 mods 1',
    ]);
  });

  it("accepts a citation of a Layer 1 modifier total (Marill Huge Power SHO 13)", () => {
    expect(check("Marill", "Ability Huge Power already added SHO 13 in layer1Mods.")).toEqual([]);
  });

  it("flags a kick move the species cannot learn (Snorlax and pyro-ball)", () => {
    expect(check("Snorlax", "Its pyro-ball is lethal.")).toEqual([
      '"pyro-ball" is not in kickMoves',
    ]);
  });

  it("reads a negated type as a negation (Sirfetch'd has no flying type)", () => {
    expect(check("Sirfetch’d", "Type fighting with no flying type keeps it grounded.")).toEqual([]);
  });

  it("flags a wrong shape and a wrong weight", () => {
    expect(check("Geodude", "A 25 kg quadruped shape boulder.")).toEqual([
      '"25 kg" but weight is 200 hg',
      '"quadruped shape" but shape is arms',
    ]);
  });
});

describe("Layer 2 rationales cite only shipped data", () => {
  it("has no citation that disagrees with pokedex.json or scouting.json", () => {
    const findings = SCOUTING.flatMap((e) =>
      checkCitations(entry(e.id), POKEDEX[e.id - 1]!, abilityNames).map(
        (p) => `${e.id} ${e.name}: ${p}`,
      ),
    );
    expect(findings).toEqual([]);
  });
});
