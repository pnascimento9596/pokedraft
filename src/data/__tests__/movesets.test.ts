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
  it("gives Charizard its Scarlet/Violet level-up fire and flying STAB moves", () => {
    expect(ids(6)).toEqual(["flare-blitz", "inferno", "air-slash", "dragon-claw"]);
    expect(movesetFor(6).moves[0]).toEqual({
      id: "flare-blitz",
      name: "Flare Blitz",
      type: "fire",
      damageClass: "physical",
      power: 120,
    });
    expect(movesetFor(6).keeperMove?.id).toBe("protect");
  });

  it("gives Blastoise water STAB first", () => {
    expect(ids(9)).toEqual(["wave-crash", "hydro-pump", "flash-cannon", "bite"]);
  });

  it("gives Pikachu two electric moves and then its strongest non-electric ones", () => {
    expect(ids(25)).toEqual(["thunder", "thunderbolt", "iron-tail", "quick-attack"]);
  });

  it("gives Gengar ghost STAB and no invented poison move, since its newest level-up set has none", () => {
    expect(ids(94)).toEqual(["shadow-ball", "hex", "dream-eater", "dark-pulse"]);
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
    expect(ids(202)).toEqual(["amnesia", "mirror-coat", "splash", "destiny-bond"]);
    expect(movesetFor(202).moves[1]).toEqual({
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
