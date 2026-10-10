import { describe, expect, it } from "vitest";
import { rollFor, type RolledSettings } from "../draft";
import { SPECIES } from "../species";
import type { Roll, Seed } from "../types";
import { chiSquarePValue, chiSquareUniform } from "./stats-helpers";

const DRAWS = 200_000;
const THRESHOLD = 0.001;

const ALL_REGIONS = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
];
const KANTO_TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "fairy",
];

function freshRoll(settings: RolledSettings, seed: string): Roll {
  return rollFor({
    settings,
    seed: seed as Seed,
    round: 0,
    rerollsInRound: 0,
    drafted: [],
    reroll: null,
  });
}

function countBy(keys: readonly string[], draw: (i: number) => string): number[] {
  const counts = new Map(keys.map((k) => [k, 0]));
  for (let i = 0; i < DRAWS; i++) {
    const key = draw(i);
    const prev = counts.get(key);
    if (prev === undefined) throw new Error(`rolled ${key}, outside the expected categories`);
    counts.set(key, prev + 1);
  }
  return keys.map((k) => counts.get(k)!);
}

function combo(roll: Roll): Extract<Roll, { kind: "combo" }> {
  if (roll.kind !== "combo") throw new Error("expected a combo roll");
  return roll;
}

describe("roll fairness, chi-square over 200,000 seeded draws", { timeout: 60_000 }, () => {
  it("region roll is uniform over all 9 regions (catches a region weighted by species count)", () => {
    const settings: RolledSettings = {
      mode: "cup8",
      formation: "4-3-3",
      gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      style: "open",
      order: "squadFirst",
    };
    const counts = countBy(
      ALL_REGIONS,
      (i) => combo(freshRoll(settings, `fair-region-${i}`)).region,
    );
    expect(chiSquareUniform(counts).p).toBeGreaterThan(THRESHOLD);
  });

  it("type roll in kanto is uniform over its 17 non-empty types (catches a type weighted by species count)", () => {
    const settings: RolledSettings = {
      mode: "cup8",
      formation: "4-3-3",
      gens: [1],
      style: "open",
      order: "squadFirst",
    };
    const counts = countBy(KANTO_TYPES, (i) => combo(freshRoll(settings, `fair-type-${i}`)).type);
    expect(chiSquareUniform(counts).p).toBeGreaterThan(THRESHOLD);
  });

  it("classic3 offer positions are each uniform over the combo (catches sorted or biased offer order)", () => {
    const settings: RolledSettings = {
      mode: "cup8",
      formation: "4-3-3",
      gens: [1],
      style: "classic3",
      order: "squadFirst",
    };
    const counts = new Map<string, number[][]>();
    for (let i = 0; i < DRAWS; i++) {
      const roll = combo(freshRoll(settings, `fair-offer-${i}`));
      const members = SPECIES.filter(
        (s) => s.region === "kanto" && (s.types as readonly string[]).includes(roll.type),
      ).map((s) => s.id as number);
      if (members.length < 2) continue;
      const table =
        counts.get(roll.type) ??
        Array.from({ length: Math.min(3, members.length) }, () => members.map(() => 0));
      counts.set(roll.type, table);
      roll.offers!.forEach((offered, position) => {
        table[position]![members.indexOf(offered)]! += 1;
      });
    }
    expect([...counts.keys()].sort()).toEqual([...KANTO_TYPES].sort());
    for (const position of [0, 1, 2]) {
      let stat = 0;
      let df = 0;
      for (const table of counts.values()) {
        const row = table[position];
        if (row === undefined) continue;
        const fit = chiSquareUniform(row);
        stat += fit.stat;
        df += fit.df;
      }
      expect(chiSquarePValue(stat, df)).toBeGreaterThan(THRESHOLD);
    }
  });

  it("kanto151 roll is uniform over ids 1 to 151 (catches an off-by-one or weighted species pool)", () => {
    const settings: RolledSettings = { mode: "kanto151", formation: "4-3-3", order: "squadFirst" };
    const ids = Array.from({ length: 151 }, (_, i) => String(i + 1));
    const counts = countBy(ids, (i) => {
      const roll = freshRoll(settings, `fair-151-${i}`);
      if (roll.kind !== "species") throw new Error("expected a species roll");
      return String(roll.species);
    });
    expect(chiSquareUniform(counts).p).toBeGreaterThan(THRESHOLD);
  });
});
