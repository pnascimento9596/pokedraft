import { describe, expect, it } from "vitest";
import {
  canonicalSortBy,
  createEngineRng,
  dailySeed,
  deriveSubseed,
  rngFromUint32,
  toIsoDate,
  type Substream,
} from "../rng";
import { chiSquarePValue, chiSquareUniform } from "./stats-helpers";

function stream(values: readonly number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("stub stream exhausted");
    return values[i++]!;
  };
}

describe("createEngineRng golden stream (pins the seeded sequence against drift)", () => {
  it("emits the pinned uint32, int(7), int(1025) and sample sequence for pokedraft-golden", () => {
    const rng = createEngineRng("pokedraft-golden");
    expect(Array.from({ length: 5 }, () => rng.uint32())).toEqual([
      3130447590, 4077833383, 1045291787, 3721503400, 4082624081,
    ]);
    expect(Array.from({ length: 10 }, () => rng.int(7))).toEqual([3, 5, 2, 3, 3, 4, 3, 2, 5, 1]);
    expect(Array.from({ length: 10 }, () => rng.int(1025))).toEqual([
      694, 614, 601, 986, 994, 959, 514, 318, 900, 936,
    ]);
    expect(rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([7, 9, 1, 2]);
  });

  it("next() is the first uint32 scaled into [0, 1)", () => {
    expect(createEngineRng("pokedraft-golden").next()).toBe(3130447590 / 4294967296);
  });
});

describe("int() rejection sampling (catches modulo bias in the top tail)", () => {
  it("rejects u = 4294967295 for n = 3 and uses the next draw", () => {
    const rng = rngFromUint32(stream([4294967295, 4294967294]));
    expect(rng.int(3)).toBe(4294967294 % 3);
  });

  it("accepts u = 4294967294 for n = 3, the last value below the limit", () => {
    expect(rngFromUint32(stream([4294967294])).int(3)).toBe(2);
  });

  it("n = 2^32 accepts every draw and returns it unchanged", () => {
    expect(rngFromUint32(stream([4294967295])).int(4294967296)).toBe(4294967295);
  });

  it.each([0, -1, 1.5, 4294967297, Number.NaN])("throws RangeError for n = %s", (n) => {
    expect(() => rngFromUint32(stream([0])).int(n)).toThrow(RangeError);
  });

  it.each([2, 3, 7, 9, 18, 151, 1025])(
    "int(%i) passes a chi-square uniformity test over 200k draws (p > 0.001)",
    (n) => {
      const rng = createEngineRng(`chi-square:${n}`);
      const counts = new Array<number>(n).fill(0);
      for (let i = 0; i < 200_000; i++) counts[rng.int(n)]! += 1;
      expect(chiSquareUniform(counts).p).toBeGreaterThan(0.001);
    },
  );
});

describe("chi-square helper matches published critical values", () => {
  it.each([
    [18.307, 10, 0.05],
    [22.458, 6, 0.001],
    [124.342, 100, 0.05],
  ])("stat %f at df %i gives p near %f", (stat, df, p) => {
    expect(chiSquarePValue(stat, df)).toBeCloseTo(p, 3);
  });

  it("flags a lopsided count vector", () => {
    expect(chiSquareUniform([600, 400]).p).toBeLessThan(0.001);
  });
});

describe("pick and sample", () => {
  it("pick uses int over the array length", () => {
    expect(rngFromUint32(stream([5])).pick(["a", "b", "c"])).toBe("c");
  });

  it("pick throws on an empty array", () => {
    expect(() => createEngineRng("x").pick([])).toThrow(RangeError);
  });

  it("sample swaps in draw order (partial Fisher-Yates)", () => {
    expect(rngFromUint32(stream([2, 0])).sample(["a", "b", "c", "d"], 2)).toEqual(["c", "b"]);
  });

  it("sample does not mutate its input and k = 0 draws nothing", () => {
    const arr = [1, 2, 3];
    expect(rngFromUint32(stream([])).sample(arr, 0)).toEqual([]);
    expect(createEngineRng("y").sample(arr, 3).sort()).toEqual([1, 2, 3]);
    expect(arr).toEqual([1, 2, 3]);
  });

  it.each([-1, 4, 1.5])("sample throws for k = %s on a 3-element array", (k) => {
    expect(() => createEngineRng("z").sample([1, 2, 3], k)).toThrow(RangeError);
  });
});

describe("deriveSubseed", () => {
  it("emits the pinned sub-seed for seed-1 / draft_roll / round:0:reroll:0", () => {
    expect(deriveSubseed("seed-1", "draft_roll", "round:0:reroll:0")).toBe(
      "pokedraft:draft_roll:v1:8804c9bc41271097ed84ad3e199d1f5a",
    );
  });

  it("separates scopes and substreams", () => {
    const base = deriveSubseed("seed-1", "draft_roll", "round:0:reroll:0");
    expect(deriveSubseed("seed-1", "draft_roll", "round:0:reroll:1")).not.toBe(base);
    expect(deriveSubseed("seed-1", "match_sim", "round:0:reroll:0").slice(-32)).not.toBe(
      base.slice(-32),
    );
    expect(deriveSubseed("seed-1", "draft_roll").slice(-32)).not.toBe(base.slice(-32));
  });

  it.each([
    ["", "draft_roll", undefined],
    ["  ", "draft_roll", undefined],
    ["seed", "draft", undefined],
    ["seed", "draft_roll", ""],
    ["seed", "draft_roll", " "],
  ])("throws RangeError for (%j, %j, %j)", (seed, sub, scope) => {
    expect(() => deriveSubseed(seed, sub as Substream, scope)).toThrow(RangeError);
  });
});

describe("dailySeed and toIsoDate", () => {
  it("pins the daily seed for 2026-10-09", () => {
    expect(dailySeed(toIsoDate("2026-10-09"))).toBe(
      "pokedraft:daily:v1:5f4bbc30a398c4922a7f62f3dbb5b0bb",
    );
  });

  it("accepts a leap day and rejects malformed or impossible dates", () => {
    expect(toIsoDate("2028-02-29")).toBe("2028-02-29");
    for (const bad of [
      "2026-2-01",
      "2026-13-01",
      "2026-00-10",
      "2026-02-29",
      "2026-04-31",
      "20261009",
      "2026-10-09T00:00",
    ]) {
      expect(() => toIsoDate(bad)).toThrow(RangeError);
    }
  });
});

describe("canonicalSortBy", () => {
  it("orders numbers numerically, strings by code point, numbers before strings, then stable", () => {
    const items = [
      { k: ["b", 2], tag: "1" },
      { k: ["B", 10], tag: "2" },
      { k: ["b", 10], tag: "3" },
      { k: [5], tag: "4" },
      { k: ["b", 2], tag: "5" },
      { k: ["b"], tag: "6" },
    ] as const;
    const sorted = canonicalSortBy(items, (i) => i.k).map((i) => i.tag);
    expect(sorted).toEqual(["4", "2", "6", "1", "5", "3"]);
  });

  it("does not mutate the input", () => {
    const items = [3, 1, 2];
    expect(canonicalSortBy(items, (n) => [n])).toEqual([1, 2, 3]);
    expect(items).toEqual([3, 1, 2]);
  });
});
