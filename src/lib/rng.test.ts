import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("createRng", () => {
  it("matches the wcdraft reference stream for seed 'pokedraft', so a port drift is caught", () => {
    const r = createRng("pokedraft");
    expect([r.next(), r.next(), r.int(1025), r.int(1000)]).toEqual([
      0.5760818067938089, 0.3525180579163134, 901, 719,
    ]);
  });

  it("rejects a non-positive bound instead of returning NaN", () => {
    expect(() => createRng(1).int(0)).toThrow(RangeError);
  });
});
