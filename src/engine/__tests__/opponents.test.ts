import { describe, expect, it } from "vitest";
import { buildLadder } from "../opponents";
import { speciesById } from "../species";
import { CUP_ROUNDS, type Species } from "../types";

const members = (
  ladder: ReturnType<typeof buildLadder>,
  round: (typeof CUP_ROUNDS)[number],
): readonly Species[] =>
  ladder[round].roster.map((ref) => {
    if (ref.kind !== "species") throw new Error(`expected a species roster in ${round}`);
    return speciesById(ref.id);
  });

const meanAttrs = (roster: readonly Species[]): number =>
  roster.reduce((sum, s) => sum + Object.values(s.attrs).reduce((a, b) => a + b, 0), 0) /
  (roster.length * Object.keys(roster[0]!.attrs).length);

describe("engine-4 themed Boss Club rosters (catches opponents without actual Pokemon lineups)", () => {
  it("fields a single-type themed eleven for every rung, with the best goalkeeper first", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    for (const round of CUP_ROUNDS) {
      const roster = members(ladder, round);
      expect(roster).toHaveLength(11);
      expect(new Set(roster.map((s) => s.id)).size).toBe(11);
      const shared = roster[0]!.types.filter((t) =>
        roster.every((s) => (s.types as readonly string[]).includes(t)),
      );
      expect(shared.length).toBeGreaterThan(0);
      const keeper = roster[0]!;
      for (const s of roster.slice(1)) expect(keeper.fits.GK).toBeGreaterThanOrEqual(s.fits.GK);
    }
  });

  it("keeps the engine-3 club names and score ladder untouched", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    expect(CUP_ROUNDS.map((r) => [ladder[r].id, ladder[r].score])).toEqual([
      ["celadon-city", 267],
      ["fuchsia-united", 302],
      ["pallet-town", 346],
      ["indigo-plateau-united", 489],
      ["viridian-fc", 601],
      ["pewter-united", 749],
      ["vermilion-fc", 859],
      ["cinnabar-fc", 994],
    ]);
  });

  it("draws kanto151 rosters from Kanto Pokemon only", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    for (const round of CUP_ROUNDS)
      for (const s of members(ladder, round)) expect(s.id).toBeLessThanOrEqual(151);
  });

  it("scales roster strength with the rung, so the final boss fields the strongest eleven", () => {
    const ladder = buildLadder("golden-177", "cup8");
    expect(meanAttrs(members(ladder, "F"))).toBeGreaterThan(meanAttrs(members(ladder, "G1")));
  });

  it("is deterministic for the same seed and mode", () => {
    expect(buildLadder("golden-177", "cup8")).toEqual(buildLadder("golden-177", "cup8"));
  });
});
