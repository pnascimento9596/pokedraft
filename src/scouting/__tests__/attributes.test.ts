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

  it("applies the heavy penalty to DIV, so a 420 kg Regigigas does not dive like a keeper", () => {
    expect(all.get(speciesByName("Regigigas").id)!.breakdown.DIV.heavy).toBe(-5.94);
  });

  it("gives the legless arms shape KIC, DRI and TEC penalties (Geodude)", () => {
    const b = all.get(speciesByName("Geodude").id)!.breakdown;
    expect([b.KIC.shape, b.DRI.shape, b.TEC.shape]).toEqual([-8, -8, -7]);
  });

  it("cuts a tiny body's keeper frame and caps it (Flabébé 0.1 m, 0.1 kg; Joltik 0.1 m, 0.6 kg)", () => {
    const flabebe = all.get(speciesByName("Flabébé").id)!.breakdown;
    const joltik = all.get(speciesByName("Joltik").id)!.breakdown;
    expect([flabebe.HAN.frame, flabebe.DIV.frame, joltik.HAN.frame]).toEqual([-5.95, -5.95, -5.82]);
  });

  it("boosts a big keeper frame and caps it at 6 (Wailord 14.5 m, 398 kg; Eternatus 20 m, 950 kg)", () => {
    const wailord = all.get(speciesByName("Wailord").id)!.breakdown;
    const eternatus = all.get(speciesByName("Eternatus").id)!.breakdown;
    expect([wailord.HAN.frame, wailord.DIV.frame, eternatus.HAN.frame]).toEqual([5.85, 5.85, 5.98]);
  });

  it("skips the frame term when an ability already sets the body size (Wishiwashi, Schooling)", () => {
    const b = all.get(speciesByName("Wishiwashi").id)!.breakdown;
    expect([b.HAN.frame, b.DIV.frame, b.HAN.abilities]).toEqual([0, 0, 8]);
  });

  it("keeps the frame term off every attribute but DIV and HAN", () => {
    const wailord = all.get(speciesByName("Wailord").id)!.breakdown;
    expect([wailord.AER.frame, wailord.PHY.frame, wailord.REF.frame]).toEqual([0, 0, 0]);
  });

  it("reads a serpent's Pokédex height as body length, so it does not lift AER or DIV (Arbok 3.5 m)", () => {
    const arbok = speciesByName("Arbok");
    const asSquiggle = all.get(arbok.id)!.breakdown;
    const asUpright = baselineFor({ ...arbok, shape: "upright" }).breakdown;
    expect([asSquiggle.AER.base, asUpright.AER.base]).toEqual([72.98, 85.2]);
    expect([asSquiggle.DIV.base, asUpright.DIV.base]).toEqual([72.77, 83.15]);
  });

  it("keeps a levitating squiggle body's height as its reach (Cresselia, Levitate, 1.5 m)", () => {
    const cresselia = speciesByName("Cresselia");
    const asSquiggle = all.get(cresselia.id)!.breakdown;
    const asUpright = baselineFor({ ...cresselia, shape: "upright" }).breakdown;
    expect([asSquiggle.AER.base, asSquiggle.DIV.base]).toEqual([
      asUpright.AER.base,
      asUpright.DIV.base,
    ]);
  });

  it("gives the handless quadruped shape HAN -12 (Zacian)", () => {
    expect(all.get(speciesByName("Zacian").id)!.breakdown.HAN.shape).toBe(-12);
  });

  it("leads ACC with speed, so tiny slow Flabébé is not quick off the mark", () => {
    expect(all.get(speciesByName("Flabébé").id)!.attrs.ACC).toBe(51);
    expect(all.get(speciesByName("Regieleki").id)!.attrs.ACC).toBe(93);
  });

  it("caps kick-move points at 24 for KIC (Hitmonlee's 32 points clip)", () => {
    expect(all.get(speciesByName("Hitmonlee").id)!.breakdown.KIC.moves).toBe(24);
  });

  it("does not flatten a deep kicking learnset to a single kick (Hitmontop scores 22)", () => {
    expect(all.get(speciesByName("Hitmontop").id)!.breakdown.KIC.moves).toBe(22);
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
