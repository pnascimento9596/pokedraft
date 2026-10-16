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
  ["13", "detect", "2", "", "", "1"],
  ["14", "reflect", "14", "", "", "1"],
  ["15", "light-screen", "14", "", "", "1"],
  ["16", "barrier", "14", "", "", "1"],
  ["17", "iron-defense", "9", "", "", "1"],
  ["18", "harden", "1", "", "", "1"],
  ["19", "withdraw", "11", "", "", "1"],
  ["20", "defense-curl", "1", "", "", "1"],
  ["21", "agility", "14", "", "", "1"],
];

const TYPE_IDS: [string, string][] = [
  ["1", "normal"],
  ["2", "fighting"],
  ["6", "rock"],
  ["9", "steel"],
  ["10", "fire"],
  ["11", "water"],
  ["14", "psychic"],
];

// Version group ids deliberately disagree with their order: 1 is oldest, 3 is middle, 2 is newest.
const OLDEST = "1";
const MIDDLE = "3";
const NEWEST = "2";

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
      { id: OLDEST, order: "1" },
      { id: NEWEST, order: "3" },
      { id: MIDDLE, order: "2" },
    ],
  };
}

const levelUp = (vg: string, moves: string[]): Learn[] => moves.map((m) => [vg, "1", m]);

describe("buildMovesets selection rule", () => {
  it("caps a type at two picks and ranks null accuracy above 100, catching a pick of three STAB fire moves", () => {
    const doc = buildMovesets(
      fixture("10", [
        levelUp(NEWEST, ["blaze-a", "blaze-b", "blaze-c", "rock-sure", "rock-null", "tackle"]),
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["blaze-a", "blaze-b", "rock-null", "rock-sure"]);
  });

  it("takes the debut group by order, not id, over a stronger newest group, catching a newest-first pick", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ...levelUp(MIDDLE, ["blaze-c", "tackle", "old-kick", "rock-sure"]),
          ...levelUp(NEWEST, ["blaze-a", "blaze-b", "rock-null"]),
        ],
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["blaze-c", "rock-sure", "old-kick", "tackle"]);
  });

  it("fills from the newest level-up group and then the newest machine group, skipping middle groups", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ...levelUp(OLDEST, ["tackle"]),
          ...levelUp(MIDDLE, ["blaze-a"]),
          ...levelUp(NEWEST, ["old-kick"]),
          [OLDEST, "4", "rock-sure"],
          [MIDDLE, "4", "tm-wave"],
          [MIDDLE, "4", "tm-weak"],
        ],
      ]),
      1,
    );
    expect(doc.species[0].moves).toEqual(["tackle", "old-kick", "tm-wave", "tm-weak"]);
  });

  it("fills open slots with canon non-damaging moves and keeps variable power null, never inventing a move", () => {
    const doc = buildMovesets(fixture("11", [levelUp(NEWEST, ["splash", "tackle", "flail"])]), 1);
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

  it("prefers a keeper move from the debut group, then the newest group, ignoring middle groups", () => {
    const doc = buildMovesets(
      fixture("10", [
        [
          ...levelUp(OLDEST, ["tackle"]),
          ...levelUp(NEWEST, ["tackle"]),
          [OLDEST, "2", "harden"],
          [NEWEST, "4", "protect"],
        ],
        [
          ...levelUp(OLDEST, ["tackle"]),
          ...levelUp(NEWEST, ["tackle"]),
          [MIDDLE, "2", "protect"],
          [NEWEST, "4", "agility"],
          [NEWEST, "2", "detect"],
        ],
        [...levelUp(OLDEST, ["tackle"]), [MIDDLE, "4", "reflect"]],
      ]),
      3,
    );
    expect(doc.species.map((s: { keeperMove: string | null }) => s.keeperMove)).toEqual([
      "harden",
      "detect",
      null,
    ]);
  });
});
