import { describe, expect, it } from "vitest";
import { POKEDEX, speciesByName, type Species } from "@/data/pokedex";
import { ABILITY_TRAITS } from "../ability-traits";
import { computeBaselines } from "../attributes";
import { COEFFICIENTS } from "../coefficients";
import { MOVE_TRAITS } from "../move-traits";
import { ATTRS } from "../types";

const baselineFor = (s: Species, dex: readonly Species[] = POKEDEX) =>
  computeBaselines(
    dex.map((d) => (d.id === s.id ? s : d)),
    ABILITY_TRAITS,
  ).get(s.id)!;

describe("Layer 1 baseline", () => {
  const all = computeBaselines(POKEDEX, ABILITY_TRAITS);

  it("produces integer attributes in 1..99 for every species", () => {
    const bad = POKEDEX.filter((s) =>
      ATTRS.some((a) => {
        const v = all.get(s.id)!.attrs[a];
        return !Number.isInteger(v) || v < 1 || v > 99;
      }),
    );
    expect(bad.map((s) => s.name)).toEqual([]);
  });

  it("is deterministic across runs", () => {
    const again = computeBaselines(POKEDEX, ABILITY_TRAITS);
    expect(JSON.stringify([...again])).toBe(JSON.stringify([...all]));
  });

  it("costs a fish shape footwork against the same body as upright", () => {
    const cinderace = speciesByName("Cinderace");
    const asFish = baselineFor({ ...cinderace, shape: "fish" }).breakdown.DRI.shape;
    const upright = baselineFor(cinderace).breakdown.DRI.shape;
    expect([asFish, upright]).toEqual([-22, 6]);
  });

  it("applies 4 points per weight doubling above 150 kg to ACC (Snorlax, 460 kg)", () => {
    expect(all.get(speciesByName("Snorlax").id)!.breakdown.ACC.heavy).toBe(-6.47);
  });

  it("gives protect no signal because 1003 of 1025 species learn it", () => {
    expect(COEFFICIENTS.moves.points.protect).toBe(0);
  });

  it("caps kick-move points at 12 for KIC (Hitmonlee knows many kicks)", () => {
    expect(all.get(speciesByName("Hitmonlee").id)!.breakdown.KIC.moves).toBe(12);
  });

  it("scores only moves listed in move-traits.json", () => {
    expect(Object.keys(COEFFICIENTS.moves.points).sort()).toEqual(Object.keys(MOVE_TRAITS).sort());
  });

  it("keys every ability trait to an ability some species has, so a typo is caught", () => {
    const known = new Set(POKEDEX.flatMap((s) => s.abilities.map((a) => a.id)));
    expect(Object.keys(ABILITY_TRAITS).filter((k) => !known.has(k))).toEqual([]);
  });

  it("docks babies 6 points on every attribute", () => {
    expect(all.get(speciesByName("Pichu").id)!.breakdown.PAC.baby).toBe(-6);
  });
});
