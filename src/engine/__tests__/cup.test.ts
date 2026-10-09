import { describe, expect, it } from "vitest";
import { runCup } from "../cup";
import { buildLadder } from "../opponents";
import { CUP_ROUNDS, type FullLineup, type Seed } from "../types";

const P75 = {
  formation: "4-3-3",
  starters: [31, 123, 28, 139, 181, 6, 59, 121, 25, 38, 136],
  bench: [1, 4, 7, 10, 13],
} as unknown as FullLineup;
const KANTO = {
  formation: "4-3-3",
  starters: [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135],
  bench: [25, 94, 65, 68, 143],
} as unknown as FullLineup;

const SEEDS = Array.from({ length: 200 }, (_, i) => `cup-${i}` as Seed);
const RUNS = SEEDS.map((seed) => runCup(KANTO, seed, "cup8"));

describe("runCup", () => {
  it("always returns the eight rounds in order (a short list would break the bracket UI)", () => {
    for (const r of RUNS) expect(r.matches.map((m) => m.round)).toEqual([...CUP_ROUNDS]);
  });

  it("stops playing after elimination and plays nothing past the first non-win in the knockout", () => {
    const finishes = new Set<string>();
    for (const r of RUNS) {
      finishes.add(r.finish);
      const knockout = r.matches.slice(3);
      const firstOut =
        r.finish === "group"
          ? 0
          : knockout.findIndex((m) => m.status === "played" && m.outcome !== "W") + 1;
      const cut = r.finish === "champion" ? 5 : firstOut;
      knockout.forEach((m, i) => {
        expect(m.status).toBe(i < cut ? "played" : "notPlayed");
        if (m.status === "notPlayed") expect(m.opponent).toBeNull();
      });
    }
    expect([...finishes].sort()).toEqual(["F", "QF", "R16", "R32", "SF", "champion", "group"]);
  });

  it("builds a consistent group table (each match counted once from both sides)", () => {
    for (const r of RUNS) {
      const sum = (k: "played" | "won" | "lost" | "goalsFor" | "goalsAgainst"): number =>
        r.group.reduce((s, row) => s + row[k], 0);
      expect(sum("played")).toBe(12);
      expect(sum("won")).toBe(sum("lost"));
      expect(sum("goalsFor")).toBe(sum("goalsAgainst"));
      for (const row of r.group) {
        expect(row.points).toBe(3 * row.won + row.drawn);
        expect(row.won + row.drawn + row.lost).toBe(3);
      }
      const points = r.group.map((row) => row.points);
      expect(points).toEqual([...points].sort((a, b) => b - a));
    }
  });

  it("marks flawless exactly when all eight matches are wins", () => {
    let flawless = 0;
    for (const r of RUNS) {
      expect(r.flawless).toBe(r.wins === 8);
      expect(r.wins + r.draws + r.losses).toBe(
        r.matches.filter((m) => m.status === "played").length,
      );
      if (r.flawless) flawless++;
    }
    expect(flawless).toBe(19);
  });

  it("replays identically from the same lineup and seed", () => {
    expect(runCup(P75, "golden-4" as Seed, "cup8")).toEqual(
      runCup(P75, "golden-4" as Seed, "cup8"),
    );
  });

  it("pins a cup run where the group is decided past points, GD and GF", () => {
    const r = runCup(P75, "golden-1" as Seed, "cup8");
    expect([r.rating.score, r.wins, r.draws, r.losses, r.finish, r.flawless]).toEqual([
      738,
      3,
      0,
      2,
      "R16",
      false,
    ]);
    expect(r.group.map((g) => [g.team, g.points, g.goalsFor, g.goalsAgainst])).toEqual([
      ["vermilion-athletic", 6, 3, 1],
      ["user", 6, 3, 1],
      ["coumarine-united", 3, 3, 5],
      ["veilstone-united", 3, 3, 5],
    ]);
    expect(r.awards).toEqual({
      goldenBoot: { species: 6, goals: 2, assists: 0, appearances: 5 },
      topAssister: { species: 28, goals: 0, assists: 1, appearances: 5 },
      playerOfTournament: { species: 6, goals: 2, assists: 0, appearances: 5 },
    });
  });

  it("pins a run with an absence and counts the replacement's appearance, not the absentee's", () => {
    const r = runCup(P75, "golden-4" as Seed, "cup8");
    expect([r.wins, r.draws, r.losses, r.finish]).toEqual([3, 1, 2, "QF"]);
    const absences = r.matches.flatMap((m) => (m.status === "played" ? m.absences : []));
    expect(absences).toEqual([{ slot: "4-3-3.LW", out: 25, in: 4 }]);
    const appearances = Object.fromEntries(r.players.map((p) => [p.species, p.appearances]));
    expect([appearances[25], appearances[4], appearances[1]]).toEqual([5, 1, 0]);
    expect(r.awards.goldenBoot).toEqual({ species: 136, goals: 3, assists: 1, appearances: 6 });
  });
});

describe("buildLadder", () => {
  it("draws kanto151 opponents from Kanto towns only, with the per-round score ladder", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    expect(CUP_ROUNDS.map((r) => [ladder[r].id, ladder[r].score])).toEqual([
      ["celadon-city", 587],
      ["fuchsia-united", 652],
      ["pallet-town", 691],
      ["indigo-plateau-united", 759],
      ["viridian-fc", 796],
      ["pewter-united", 869],
      ["vermilion-fc", 904],
      ["cinnabar-fc", 964],
    ]);
    expect(ladder.F.lines).toEqual({ GK: 100.4, DEF: 100.4, MID: 93.4, ATT: 96.4 });
  });
});
