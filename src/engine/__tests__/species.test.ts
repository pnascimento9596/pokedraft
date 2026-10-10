import { describe, expect, it } from "vitest";
import { ROLES } from "@/scouting/types";
import { ROLE_LINE, SPECIES, asSpeciesId, qualityOf, speciesById } from "../species";

function byName(name: string) {
  const s = SPECIES.find((x) => x.name === name);
  if (!s) throw new Error(`no species ${name}`);
  return s;
}

describe("SPECIES pool", () => {
  it("joins all 1,025 species sorted by id", () => {
    expect(SPECIES).toHaveLength(1025);
    expect(SPECIES[0]!.id).toBe(1);
    expect(SPECIES[1024]!.id).toBe(1025);
    expect(SPECIES.every((s, i) => s.id === i + 1)).toBe(true);
  });

  it("joins Pokédex facts onto scouting data (Charizard)", () => {
    const s = speciesById(6);
    expect(s.name).toBe("Charizard");
    expect(s.gen).toBe(1);
    expect(s.region).toBe("kanto");
    expect(s.types).toEqual(["fire", "flying"]);
    expect(s.special).toBe(false);
  });

  it("marks legendary and mythical species special and counts 94", () => {
    expect(speciesById(150).special).toBe(true);
    expect(speciesById(151).special).toBe(true);
    expect(SPECIES.filter((s) => s.special)).toHaveLength(94);
  });

  it("keeps single-typed species as a 1-tuple", () => {
    expect(byName("Magikarp").types).toEqual(["water"]);
  });

  it("keeps every quality in [0, 1]", () => {
    for (const s of SPECIES) {
      for (const r of ROLES) {
        expect(s.quality[r]).toBeGreaterThanOrEqual(0);
        expect(s.quality[r]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("role-relative quality (GK fits must not make every keeper the weakest link)", () => {
  it("puts the GK median fit (32) and the CB median fit (56) within 0.05 of each other", () => {
    const gk = qualityOf("GK", 32);
    const cb = qualityOf("CB", 56);
    expect(gk).toBeCloseTo(0.4917073170731707, 12);
    expect(cb).toBeCloseTo(0.49658536585365853, 12);
    expect(Math.abs(gk - cb)).toBeLessThan(0.05);
  });

  it("pins Lugia GK, Mewtwo ST and Magikarp ST", () => {
    expect(byName("Lugia").quality.GK).toBe(0.9995121951219512);
    expect(byName("Mewtwo").quality.ST).toBe(0.9990243902439024);
    expect(byName("Magikarp").quality.ST).toBe(0.06682926829268293);
  });

  it("stores the same value qualityOf returns for a species' fit", () => {
    const lugia = byName("Lugia");
    expect(lugia.fits.GK).toBe(96);
    expect(qualityOf("GK", 96)).toBe(lugia.quality.GK);
  });

  it("is monotone non-decreasing in fit for every role, from 0 at fit 0 to 1 at fit 100", () => {
    for (const r of ROLES) {
      let prev = -1;
      for (let f = 0; f <= 100; f++) {
        const q = qualityOf(r, f);
        expect(q).toBeGreaterThanOrEqual(prev);
        prev = q;
      }
      expect(qualityOf(r, 0)).toBe(0);
      expect(qualityOf(r, 100)).toBe(1);
    }
  });

  it.each([-1, 101, 50.5])("qualityOf rejects fit %s", (f) => {
    expect(() => qualityOf("CM", f)).toThrow(RangeError);
  });
});

describe("ids and role lines", () => {
  it("asSpeciesId accepts 1..1025 and rejects the rest", () => {
    expect(asSpeciesId(1)).toBe(1);
    expect(asSpeciesId(1025)).toBe(1025);
    for (const bad of [0, 1026, 2.5, Number.NaN]) {
      expect(() => asSpeciesId(bad)).toThrow(RangeError);
    }
  });

  it("speciesById throws on an unknown id", () => {
    expect(() => speciesById(0)).toThrow(RangeError);
  });

  it("maps scouting role lines onto engine lines", () => {
    expect(ROLE_LINE).toEqual({
      GK: "GK",
      CB: "DEF",
      FB: "DEF",
      WB: "DEF",
      DM: "MID",
      CM: "MID",
      AM: "MID",
      WM: "MID",
      W: "ATT",
      ST: "ATT",
    });
  });
});
