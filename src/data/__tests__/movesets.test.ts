import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serialize } from "../../../scripts/data/build-movesets.mjs";
import raw from "../movesets.json";
import { MovesetsArtifactSchema, movesetFor } from "../movesets";
import { POKEDEX } from "../pokedex";

const ids = (speciesId: number) => movesetFor(speciesId).moves.map((m) => m.id);

describe("movesets.json", () => {
  it("passes the artifact schema, so a dangling move reference or a fifth move fails", () => {
    expect(() => MovesetsArtifactSchema.parse(raw)).not.toThrow();
  });

  it("covers exactly the Pokedex species ids with one to four moves each", () => {
    expect(raw.species.map((s) => s.id)).toEqual(POKEDEX.map((s) => s.id));
    const outOfRange = raw.species.filter((s) => s.moves.length < 1 || s.moves.length > 4);
    expect(outOfRange).toEqual([]);
  });

  it("is committed in the builder's canonical form, so a hand edit or reformat shows up", () => {
    const file = readFileSync(path.join(import.meta.dirname, "../movesets.json"), "utf8");
    expect(serialize(JSON.parse(file))).toBe(file);
  });
});

describe("movesetFor canon spot checks (verified against the pinned PokéAPI CSVs)", () => {
  it("gives Charizard its red-blue Flamethrower, catching a newest-group-first pick", () => {
    expect(ids(6)).toContain("flamethrower");
    expect(ids(6)).toEqual(["flamethrower", "ember", "slash", "scratch"]);
    expect(movesetFor(6).moves[0]).toEqual({
      id: "flamethrower",
      name: "Flamethrower",
      type: "fire",
      damageClass: "special",
      power: 90,
    });
    expect(movesetFor(6).keeperMove?.id).toBe("reflect");
  });

  it("gives Blastoise both Water Gun and Hydro Pump from red-blue", () => {
    expect(ids(9)).toContain("water-gun");
    expect(ids(9)).toContain("hydro-pump");
    expect(ids(9)).toEqual(["hydro-pump", "water-gun", "skull-bash", "bite"]);
    expect(movesetFor(9).keeperMove?.id).toBe("reflect");
  });

  it("gives Pikachu its red-blue level-up set, which has Thunder but not Thunderbolt", () => {
    expect(ids(25)).toEqual(["thunder", "thunder-shock", "swift", "quick-attack"]);
    expect(ids(25)).not.toContain("thunderbolt");
  });

  it("gives Gengar its red-blue Lick and Dream Eater, then Scarlet/Violet ghost and dark moves", () => {
    expect(ids(94)).toEqual(["lick", "dream-eater", "shadow-ball", "dark-pulse"]);
    expect(movesetFor(94).keeperMove?.id).toBe("protect");
  });

  it("gives Magikarp Tackle, its Sword/Shield TMs, and Splash with null power", () => {
    expect(ids(129)).toEqual(["tackle", "hydro-pump", "bounce", "splash"]);
    expect(movesetFor(129).moves[3]).toEqual({
      id: "splash",
      name: "Splash",
      type: "normal",
      damageClass: "status",
      power: null,
    });
    expect(movesetFor(129).keeperMove).toBeNull();
  });

  it("gives Ditto only Transform", () => {
    expect(movesetFor(132)).toEqual({
      id: 132,
      moves: [
        { id: "transform", name: "Transform", type: "normal", damageClass: "status", power: null },
      ],
      keeperMove: null,
    });
  });

  it("gives Smeargle only Sketch", () => {
    expect(ids(235)).toEqual(["sketch"]);
    expect(movesetFor(235).keeperMove).toBeNull();
  });

  it("gives Wobbuffet its canon counters with null power rather than an invented damage figure", () => {
    expect(ids(202)).toEqual(["mirror-coat", "destiny-bond", "safeguard", "counter"]);
    expect(movesetFor(202).moves[0]).toEqual({
      id: "mirror-coat",
      name: "Mirror Coat",
      type: "psychic",
      damageClass: "special",
      power: null,
    });
  });

  it("throws RangeError for an id outside 1..1025 or a non-integer id", () => {
    expect(() => movesetFor(0)).toThrow(RangeError);
    expect(() => movesetFor(1026)).toThrow(RangeError);
    expect(() => movesetFor(1.5)).toThrow(RangeError);
  });
});
