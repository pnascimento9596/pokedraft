import { describe, expect, it } from "vitest";
import { runCup } from "../cup";
import { FORMATIONS } from "../formations";
import { buildLadder } from "../opponents";
import * as engine from "..";
import { CUP_ROUNDS, type CupResult, type FullLineup, type Role, type Seed } from "../types";

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

const MIDDLING = {
  formation: "4-3-3",
  starters: [79, 52, 54, 60, 63, 66, 69, 72, 74, 77, 84],
  bench: [86, 88, 90, 92, 96],
} as unknown as FullLineup;
const WEAK = {
  formation: "4-3-3",
  starters: [10, 11, 13, 14, 16, 19, 21, 23, 27, 29, 32],
  bench: [41, 43, 46, 48, 50],
} as unknown as FullLineup;

const SEEDS = Array.from({ length: 200 }, (_, i) => `cup-${i}` as Seed);
const RUNS = SEEDS.map((seed) => runCup(KANTO, seed, "cup8"));
const MIDDLING_RUNS = SEEDS.map((seed) => runCup(MIDDLING, seed, "cup8"));

describe("runCup", () => {
  it("always returns the eight rounds in order (a short list would break the bracket UI)", () => {
    for (const r of RUNS) expect(r.matches.map((m) => m.round)).toEqual([...CUP_ROUNDS]);
  });

  it("stops playing after elimination and plays nothing past the first non-win in the knockout", () => {
    const finishes = new Set<string>();
    for (const r of [...RUNS, ...MIDDLING_RUNS]) {
      finishes.add(r.finish);
      const knockout = r.matches.slice(3);
      const firstOut =
        r.finish === "group"
          ? 0
          : knockout.findIndex((m) => m.status === "played" && m.outcome !== "W") + 1;
      const cut = r.finish === "champion" ? 5 : firstOut;
      knockout.forEach((m, i) => {
        expect(m.status).toBe(i < cut ? "played" : "notPlayed");
        if (m.status === "notPlayed") {
          expect(m.opponent).toEqual(buildLadder(r.seed, r.mode)[m.round]);
        }
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
    expect(flawless).toBe(50);
  });

  it("replays identically from the same lineup and seed", () => {
    expect(runCup(P75, "golden-4" as Seed, "cup8")).toEqual(
      runCup(P75, "golden-4" as Seed, "cup8"),
    );
  });

  it("pins a cup run where the group is decided past points, GD and GF", () => {
    const r = runCup(WEAK, "golden-177" as Seed, "cup8");
    expect([r.rating.score, r.wins, r.draws, r.losses, r.finish, r.flawless]).toEqual([
      220,
      1,
      0,
      3,
      "R32",
      false,
    ]);
    expect(r.group.map((g) => [g.team, g.points, g.goalsFor, g.goalsAgainst])).toEqual([
      ["motostoke-united", 9, 3, 0],
      ["user", 3, 2, 3],
      ["mesagoza-fc", 3, 2, 3],
      ["canalave-athletic", 3, 1, 2],
    ]);
    expect(r.awards).toEqual({
      goldenBoot: { species: 29, goals: 2, assists: 0, appearances: 4 },
      topAssister: { species: 32, goals: 1, assists: 2, appearances: 4 },
      playerOfTournament: { species: 32, goals: 1, assists: 2, appearances: 4 },
    });
  });

  it("pins a run with an absence and counts the replacement's appearance, not the absentee's", () => {
    const r = runCup(P75, "golden-4" as Seed, "cup8");
    expect([r.wins, r.draws, r.losses, r.finish]).toEqual([5, 0, 1, "QF"]);
    const absences = r.matches.flatMap((m) => (m.status === "played" ? m.absences : []));
    expect(absences).toEqual([{ slot: "4-3-3.LW", out: 25, in: 4 }]);
    const appearances = Object.fromEntries(r.players.map((p) => [p.species, p.appearances]));
    expect([appearances[25], appearances[4], appearances[1]]).toEqual([5, 1, 0]);
    expect(r.awards.goldenBoot).toEqual({ species: 38, goals: 7, assists: 2, appearances: 6 });
  });
});

describe("buildLadder", () => {
  it("draws kanto151 opponents from Kanto towns only, with the per-round score ladder", () => {
    const ladder = buildLadder("golden-1", "kanto151");
    expect(CUP_ROUNDS.map((r) => [ladder[r].id, ladder[r].score])).toEqual([
      ["celadon-city", 287],
      ["fuchsia-united", 322],
      ["pallet-town", 331],
      ["indigo-plateau-united", 369],
      ["viridian-fc", 476],
      ["pewter-united", 779],
      ["vermilion-fc", 854],
      ["cinnabar-fc", 994],
    ]);
    expect(ladder.F.lines).toEqual({ GK: 103.4, DEF: 103.4, MID: 96.4, ATT: 99.4 });
  });
});

describe("exact ladder (catches the UI showing a nominal ladder or a nameless unplayed match)", () => {
  it("exports buildLadder from the engine index, the same ladder the cup plays", () => {
    expect(engine.buildLadder("golden-1", "kanto151")).toEqual(buildLadder("golden-1", "kanto151"));
  });

  it("names every unplayed match's opponent and rating, matching the run's ladder", () => {
    const r = runCup(WEAK, "golden-177" as Seed, "cup8");
    const ladder = buildLadder("golden-177", "cup8");
    const unplayed = r.matches.filter((m) => m.status === "notPlayed");
    expect(unplayed.map((m) => m.round)).toEqual(["R16", "QF", "SF", "F"]);
    for (const m of unplayed) expect(m.opponent).toEqual(ladder[m.round]);
  });
});

// User goals by the role of the slot the scorer filled (a replacement takes the absent starter's slot).
function goalRoles(lineup: FullLineup, cups: readonly CupResult[]): Partial<Record<Role, number>> {
  const slots = FORMATIONS[lineup.formation].slots;
  const out: Partial<Record<Role, number>> = {};
  for (const m of cups.flatMap((r) => r.matches)) {
    if (m.status !== "played") continue;
    const role = new Map(lineup.starters.map((id, i) => [id, slots[i]!.role]));
    for (const a of m.absences) {
      role.delete(a.out);
      if (a.in !== null) role.set(a.in, slots.find((s) => s.id === a.slot)!.role);
    }
    for (const g of m.goals) {
      if (g.side === "user") out[role.get(g.scorer)!] = (out[role.get(g.scorer)!] ?? 0) + 1;
    }
  }
  return out;
}

const attackingShare = (byRole: Partial<Record<Role, number>>): number => {
  const total = Object.values(byRole).reduce((a, b) => a + b, 0);
  return ((byRole.ST ?? 0) + (byRole.W ?? 0) + (byRole.AM ?? 0)) / total;
};

describe("scorer roles (catches defenders and holding midfielders scoring like forwards)", () => {
  // Three hand squads in two formations, pooled: one squad alone swings with who takes its
  // penalties (KANTO's CB Dragonite, SHO 99, takes all of them). The line factors this replaced
  // pool to 53.0%.
  const squads = [P75, KANTO, MIDDLING].flatMap((l) =>
    (["4-3-3", "4-2-3-1"] as const).map((formation) => ({ ...l, formation }) as FullLineup),
  );

  it("gives ST, W and AM 70 to 80% of user goals", () => {
    const pooled: Partial<Record<Role, number>> = {};
    for (const l of squads) {
      const byRole = goalRoles(
        l,
        SEEDS.map((seed) => runCup(l, seed, "cup8")),
      );
      for (const [r, n] of Object.entries(byRole) as [Role, number][]) {
        pooled[r] = (pooled[r] ?? 0) + n;
      }
    }
    const share = attackingShare(pooled);
    expect(share >= 0.7 && share <= 0.8).toBe(true);
  });

  it("never lets the goalkeeper score from open play", () => {
    for (const l of squads) {
      const keeper = l.starters[0];
      const goals = SEEDS.slice(0, 50)
        .map((seed) => runCup(l, seed, "cup8"))
        .flatMap((r) => r.matches)
        .flatMap((m) => (m.status === "played" ? m.goals : []))
        .filter((g) => g.side === "user" && !g.penalty && g.scorer === keeper);
      expect(goals).toEqual([]);
    }
  });
});

describe("player of the tournament contribution (catches an opaque or role-blind award)", () => {
  // Independent recompute: goals 3, assists 2, a clean sheet 2 in goal and 1 at CB, FB or DM
  // (by the slot filled that match, so a WB or CM earns none), and 1 point per 180 minutes
  // (90 a match, 120 after extra time).
  const SHEET: Partial<Record<Role, number>> = { GK: 2, CB: 1, FB: 1, DM: 1 };
  const round2 = (x: number) => Math.round(x * 100) / 100;

  function recompute(l: FullLineup, r: CupResult) {
    const slots = FORMATIONS[l.formation].slots;
    const acc = new Map<
      number,
      { goals: number; assists: number; cs: number; csPts: number; min: number }
    >();
    const get = (id: number) => {
      if (!acc.has(id)) acc.set(id, { goals: 0, assists: 0, cs: 0, csPts: 0, min: 0 });
      return acc.get(id)!;
    };
    for (const m of r.matches) {
      if (m.status !== "played") continue;
      const role = new Map<number, Role>(l.starters.map((id, i) => [id, slots[i]!.role]));
      for (const a of m.absences) {
        role.delete(a.out);
        if (a.in !== null) role.set(a.in, slots.find((s) => s.id === a.slot)!.role);
      }
      const conceded = m.goals.filter((g) => g.side === "opp").length;
      for (const [id, rl] of role) {
        const p = get(id);
        p.min += m.extraTime === null ? 90 : 120;
        if (conceded === 0 && SHEET[rl] !== undefined) {
          p.cs += 1;
          p.csPts += SHEET[rl]!;
        }
      }
      for (const g of m.goals) {
        if (g.side !== "user") continue;
        get(g.scorer).goals += 1;
        if (g.assist !== null) get(g.assist).assists += 1;
      }
    }
    return [...acc].map(([species, p]) => ({
      species,
      goals: p.goals,
      assists: p.assists,
      cleanSheets: p.cs,
      minutes: p.min,
      points: {
        goals: 3 * p.goals,
        assists: 2 * p.assists,
        cleanSheets: p.csPts,
        minutes: round2(p.min / 180),
      },
      total: round2(3 * p.goals + 2 * p.assists + p.csPts + p.min / 180),
    }));
  }

  const squads = [
    KANTO,
    { ...P75, formation: "4-2-3-1" } as FullLineup,
    { ...MIDDLING, formation: "3-5-2" } as FullLineup,
  ];

  it("exports the winner's breakdown, and no player out-scores the winner", () => {
    for (const l of squads) {
      for (const seed of SEEDS.slice(0, 60)) {
        const r = runCup(l, seed, "cup8");
        const all = recompute(l, r);
        const pot = r.awards.potContribution;
        expect(pot).toEqual(all.find((p) => p.species === r.awards.playerOfTournament.species));
        expect(Math.max(...all.map((p) => p.total))).toBe(pot!.total);
      }
    }
  });
});
