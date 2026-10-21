import { describe, expect, it, vi } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { cupMatchInput } from "../cup";
import { playMatchCore } from "../match";
import type { Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

// Counts every draw taken from a set_pieces stream, keyed by the stream's scope.
const draws = vi.hoisted(() => ({ byScope: new Map<string, number>() }));

vi.mock("../rng", async (importOriginal) => {
  const real = await importOriginal<typeof import("../rng")>();
  const scopes = new Map<string, string>();
  return {
    ...real,
    deriveSubseed: (...args: Parameters<typeof real.deriveSubseed>) => {
      const seed = real.deriveSubseed(...args);
      if (args[1] === "set_pieces") scopes.set(seed, args[2] ?? "");
      return seed;
    },
    createEngineRng: (seed: string) => {
      const scope = scopes.get(seed);
      if (scope === undefined) return real.createEngineRng(seed);
      draws.byScope.set(scope, draws.byScope.get(scope) ?? 0);
      const inner = real.createEngineRng(seed);
      return real.rngFromUint32(() => {
        draws.byScope.set(scope, draws.byScope.get(scope)! + 1);
        return inner.uint32();
      });
    },
  };
});

function playOnce(c: typeof ENGINE_COEFFICIENTS, seed: string, match: number) {
  draws.byScope.clear();
  const lineup = draftLineup(CUP8, seed as Seed);
  const result = playMatchCore(cupMatchInput(lineup, seed as Seed, "cup8", match, [], c), c);
  return { result, byScope: new Map(draws.byScope) };
}

describe("engine 7 set_pieces draws (catches a draw count that depends on what happened)", () => {
  // panel-7 match 1 is 18 regulation windows with a penalty awarded in windows 1 and 2.
  it("panel-7 match 1: exactly two draws per side per window, awarded or not", () => {
    const { byScope } = playOnce(ENGINE_COEFFICIENTS_V7, "panel-7", 1);
    const expected = new Map<string, number>();
    for (let w = 0; w < 18; w++) {
      expected.set(`match:1:w${w}:user`, 2);
      expected.set(`match:1:w${w}:opp`, 2);
    }
    expect(byScope).toEqual(expected);
  });

  it("panel-24 match 4 with extra time: two draws per side in each of its 24 windows", () => {
    const { result, byScope } = playOnce(ENGINE_COEFFICIENTS_V7, "panel-24", 4);
    expect(result.extraTime).toEqual({ user: 0, opp: 0 });
    expect(byScope.size).toBe(48);
    expect([...new Set(byScope.values())]).toEqual([2]);
  });
});
