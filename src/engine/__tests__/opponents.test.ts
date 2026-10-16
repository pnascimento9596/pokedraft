import { describe, expect, it } from "vitest";
import { bossStarters, buildLadder } from "../opponents";
import { speciesById } from "../species";
import { CUP_ROUNDS, type Opponent, type Shirt, type Species } from "../types";

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

  it("pins seeded club names and the calibrated engine-4 score ladder", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    expect(CUP_ROUNDS.map((r) => [ladder[r].id, ladder[r].score])).toEqual([
      ["celadon-city", 267],
      ["fuchsia-united", 302],
      ["pallet-town", 346],
      ["indigo-plateau-united", 489],
      ["viridian-fc", 601],
      ["pewter-united", 749],
      ["vermilion-fc", 859],
      ["cinnabar-fc", 999],
    ]);
  });

  it("draws kanto151 rosters from Kanto Pokemon only", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    for (const round of CUP_ROUNDS)
      for (const s of members(ladder, round)) expect(s.id).toBeLessThanOrEqual(151);
  });

  it("fields a stronger final XI than the opener for golden-177", () => {
    const ladder = buildLadder("golden-177", "cup8");
    expect(meanAttrs(members(ladder, "F"))).toBeGreaterThan(meanAttrs(members(ladder, "G1")));
  });

  it("is deterministic for the same seed and mode", () => {
    expect(buildLadder("golden-177", "cup8")).toEqual(buildLadder("golden-177", "cup8"));
  });

  it("rejects incomplete, oversized, duplicate and retained-shirt XIs before fielding a club", () => {
    const club = buildLadder("golden-1", "kanto151").G1;
    const malformed: readonly Opponent[] = [
      { ...club, roster: club.roster.slice(1) },
      { ...club, roster: [...club.roster, club.roster[0]!] },
      { ...club, roster: club.roster.map(() => club.roster[0]!) },
      { ...club, roster: club.roster.map((_, i) => ({ kind: "shirt", number: (i + 1) as Shirt })) },
    ];
    for (const opponent of malformed) {
      expect(() => bossStarters(opponent)).toThrow(RangeError);
    }
    expect(bossStarters(club).map((s) => s.role)).toEqual([
      "GK",
      "FB",
      "CB",
      "CB",
      "FB",
      "DM",
      "CM",
      "CM",
      "W",
      "ST",
      "W",
    ]);
  });

  it("fields complete eligible themed XIs across 24 seeds and all three modes", () => {
    let checked = 0;
    for (const mode of ["kanto151", "cup8", "builder"] as const) {
      for (let seed = 0; seed < 24; seed++) {
        const ladder = buildLadder(`roster-contract-${seed}`, mode);
        for (const round of CUP_ROUNDS) {
          const roster = members(ladder, round);
          expect(roster).toHaveLength(11);
          expect(new Set(roster.map((s) => s.id)).size).toBe(11);
          expect(
            roster[0]!.types.some((type) =>
              roster.every((s) => (s.types as readonly string[]).includes(type)),
            ),
          ).toBe(true);
          if (mode === "kanto151") expect(roster.every((s) => s.id <= 151)).toBe(true);
          expect(bossStarters(ladder[round])[0]!.role).toBe("GK");
          checked++;
        }
      }
    }
    expect(checked).toBe(576);
  });
});
