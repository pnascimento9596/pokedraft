import { describe, expect, it } from "vitest";
import { buildMovesets } from "./build-movesets.mjs";

type Learn = [vg: string, method: string, move: string];
type MoveRow = [
  id: string,
  ident: string,
  type: string,
  power: string,
  accuracy: string,
  cls: string,
];

const MOVES: MoveRow[] = [
  ["1", "blaze-a", "10", "120", "100", "2"],
  ["2", "blaze-b", "10", "100", "100", "3"],
  ["3", "blaze-c", "10", "90", "100", "3"],
  ["4", "rock-sure", "6", "80", "100", "2"],
  ["5", "rock-null", "6", "80", "", "2"],
  ["6", "tackle", "1", "40", "100", "2"],
  ["7", "old-kick", "2", "60", "100", "2"],
  ["8", "tm-wave", "11", "110", "80", "3"],
  ["9", "tm-weak", "11", "20", "100", "3"],
  ["10", "splash", "1", "", "", "1"],
  ["11", "flail", "1", "", "100", "2"],
  ["12", "protect", "1", "", "", "1"],
  ["20", "detect", "2", "", "", "1"],
  ["14", "endure", "1", "", "", "1"],
  ["16", "wide-guard", "6", "", "", "1"],
  ["15", "baneful-bunker", "4", "", "", "1"],
  ["17", "spiky-shield", "12", "", "", "1"],
  ["18", "kings-shield", "9", "", "", "1"],
  ["19", "obstruct", "17", "", "100", "1"],
  ["13", "silk-trap", "7", "", "", "1"],
  ["21", "burning-bulwark", "10", "", "", "1"],
];

const TYPE_IDS: [string, string][] = [
  ["1", "normal"],
  ["2", "fighting"],
  ["4", "poison"],
  ["6", "rock"],
  ["7", "bug"],
  ["9", "steel"],
  ["10", "fire"],
  ["11", "water"],
  ["12", "grass"],
  ["17", "dark"],
];

function fixture(speciesType: string, learns: Learn[][]) {
  return {
    pokemon: learns.map((_, i) => ({
      id: String(i + 1),
      species_id: String(i + 1),
      is_default: "1",
    })),
    pokemon_types: learns.map((_, i) => ({
      pokemon_id: String(i + 1),
      type_id: speciesType,
      slot: "1",
    })),
    pokemon_moves: learns.flatMap((rows, i) =>
      rows.map(([vg, method, move]) => ({
        pokemon_id: String(i + 1),
        version_group_id: vg,
        move_id: MOVES.find((m) => m[1] === move)![0],
        pokemon_move_method_id: method,
      })),
    ),
    pokemon_move_methods: [
      { id: "1", identifier: "level-up" },
      { id: "2", identifier: "egg" },
      { id: "4", identifier: "machine" },
    ],
    moves: MOVES.map(([id, identifier, type_id, power, accuracy, damage_class_id]) => ({
      id,
      identifier,
      type_id,
      power,
      accuracy,
      damage_class_id,
    })),
    move_names: MOVES.map(([id, ident]) => ({
      move_id: id,
      local_language_id: "9",
      name: ident.toUpperCase(),
    })),
    move_damage_classes: [
      { id: "1", identifier: "status" },
      { id: "2", identifier: "physical" },
      { id: "3", identifier: "special" },
    ],
    types: TYPE_IDS.map(([id, identifier]) => ({ id, identifier })),
    version_groups: [
      { id: "1", order: "1" },
      { id: "2", order: "3" },
      { id: "3", order: "2" },
    ],
  };
}

describe("buildMovesets selection rule", () => {
  it("caps a type at two picks and ranks null accuracy above 100, catching a pick of three STAB fire moves", () => {
    const doc = buildMovesets(
      fixture("10", [
        ["blaze-a", "blaze-b", "blaze-c", "rock-sure", "rock-null", "tackle"].map((m): Learn => [
          "2",
          "1",
          m,
        ]),
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["blaze-a", "blaze-b", "rock-null", "rock-sure"]);
  });

  it("orders version groups by their order column, not their id, so a stale learnset never wins", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ["3", "1", "blaze-c"],
          ["3", "1", "tackle"],
          ["3", "1", "rock-sure"],
          ["3", "1", "blaze-b"],
          ["2", "1", "old-kick"],
          ["2", "1", "tackle"],
          ["2", "1", "rock-sure"],
          ["2", "1", "blaze-a"],
        ],
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["blaze-a", "rock-sure", "old-kick", "tackle"]);
  });

  it("extends to earlier level-up groups and then the newest machine group, keeping the newest tier first", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ["2", "1", "tackle"],
          ["3", "1", "old-kick"],
          ["1", "4", "tm-weak"],
          ["3", "4", "tm-wave"],
          ["3", "4", "tm-weak"],
        ],
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["tackle", "old-kick", "tm-wave", "tm-weak"]);
  });

  it("fills open slots with canon non-damaging moves and keeps variable power null, never inventing a move", () => {
    const doc = buildMovesets(
      fixture("11", [
        [
          ["2", "1", "splash"],
          ["2", "1", "tackle"],
          ["2", "1", "flail"],
        ],
      ]),
      1,
    );
    expect(doc.species[0]).toEqual({
      id: 1,
      moves: ["tackle", "splash", "flail"],
      keeperMove: null,
    });
    expect(doc.moves.flail).toEqual({
      name: "FLAIL",
      type: "normal",
      damageClass: "physical",
      power: null,
    });
    expect(doc.moves.splash).toEqual({
      name: "SPLASH",
      type: "normal",
      damageClass: "status",
      power: null,
    });
  });

  it("picks the keeper move by list priority across any method, catching a pick by move id, name, or level-up only", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ["2", "1", "tackle"],
          ["1", "2", "baneful-bunker"],
          ["2", "4", "wide-guard"],
        ],
      ]),
      1,
    );
    expect(doc.species[0].keeperMove).toBe("wide-guard");
  });
});
