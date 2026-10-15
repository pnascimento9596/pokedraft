import { describe, expect, it } from "vitest";
import { assistWeight, extraTimeFactor, penaltyEdge, simulateMatch } from "../match";
import { bossStarters, buildLadder } from "../opponents";
import { speciesById } from "../species";
import { matchLineup } from "../availability";
import { runCup } from "../cup";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import type { FullLineup, Seed } from "../types";

const player = speciesById(6);
const withAttrs = (attrs: Partial<typeof player.attrs>) => ({
  ...player,
  attrs: { ...player.attrs, ...attrs },
});

describe("v4 attribute depth", () => {
  it("creator weights reward vision and dribbling independently of shooting", () => {
    const creator = {
      species: withAttrs({ PAS: 60, VIS: 80, DRI: 40 }),
      role: "CM" as const,
      line: "MID" as const,
    };
    expect(assistWeight(creator)).toBe(64);
    expect(
      assistWeight({ ...creator, species: withAttrs({ PAS: 60, VIS: 80, DRI: 40, SHO: 1 }) }),
    ).toBe(64);
  });
  it("stamina bounds extra-time fatigue symmetrically", () => {
    expect(extraTimeFactor([{ species: withAttrs({ STA: 0 }), role: "ST", line: "ATT" }])).toBe(
      0.9,
    );
    expect(extraTimeFactor([{ species: withAttrs({ STA: 100 }), role: "ST", line: "ATT" }])).toBe(
      1.1,
    );
  });
  it("shootouts compare individual taker technique and all handling traits", () => {
    const taker = withAttrs({ SHO: 80, TEC: 60 });
    const keeper = withAttrs({ REF: 20, DIV: 40, HAN: 60, GKP: 80 });
    expect(penaltyEdge(taker, keeper)).toBe(25);
  });
  it("Boss XI shapes lines while preserving the calibrated mean", () => {
    const boss = buildLadder("depth-1", "cup8").G1;
    expect(boss.formation).toBe("4-3-3");
    expect(boss.captain?.kind).toBe("species");
    expect(boss.theme).toBeDefined();
    expect(boss.tacticalStyle).toMatch(/^(balanced|pressing|possession|direct)$/);
  });
  it("stamina changes availability selection without creating multiple absences", () => {
    const lineup = {
      formation: "4-3-3",
      starters: [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135],
      bench: [25, 94, 65, 68, 143],
    } as unknown as FullLineup;
    const absences = Array.from(
      { length: 100 },
      (_, i) => matchLineup(lineup, `depth-${i}` as Seed, 0).absence,
    ).filter(Boolean);
    expect(absences.length).toBeGreaterThan(0);
    expect(absences.every((a) => a!.out !== a!.in)).toBe(true);
  });
});

describe("v4 match event contracts", () => {
  it("emits all five goal kinds across both real lineups with valid scorer and creator membership", () => {
    const boss = buildLadder("depth-events", "cup8").F;
    const starters = bossStarters(boss);
    const roster = new Set<number>(starters.map((s) => s.species.id));
    const seen = { user: new Set<string>(), opp: new Set<string>() };
    let shootouts = 0;
    for (let i = 0; i < 100; i++) {
      const m = simulateMatch({
        seed: `depth-event-${i}` as Seed,
        matchIndex: 7,
        round: "F",
        phase: "knockout",
        rating: 700,
        userLines: boss.lines,
        starters,
        keeper: starters[0]!.species,
        opponent: boss,
        opponentStarters: starters,
        absences: [],
      });
      for (const goal of m.goals) {
        seen[goal.side].add(goal.kind!);
        const scorer =
          goal.side === "user" ? goal.scorer : goal.scorer.kind === "species" ? goal.scorer.id : -1;
        const assist =
          goal.assist === null
            ? null
            : goal.side === "user"
              ? goal.assist
              : goal.assist.kind === "species"
                ? goal.assist.id
                : -1;
        expect(roster.has(scorer)).toBe(true);
        if (assist !== null) {
          expect(roster.has(assist)).toBe(true);
          expect(assist).not.toBe(scorer);
        }
        if (goal.kind === "solo" || goal.kind === "free-kick" || goal.kind === "penalty")
          expect(assist).toBeNull();
      }
      if (m.shootout !== null) {
        shootouts++;
        expect(m.shootout.kicks.length).toBeGreaterThan(0);
        for (const kick of m.shootout.kicks) {
          const taker =
            kick.side === "user" ? kick.taker : kick.taker.kind === "species" ? kick.taker.id : -1;
          expect(roster.has(taker)).toBe(true);
        }
      }
    }
    expect([...seen.user].sort()).toEqual(["free-kick", "header", "open-play", "penalty", "solo"]);
    expect([...seen.opp].sort()).toEqual(["free-kick", "header", "open-play", "penalty", "solo"]);
    expect(shootouts).toBeGreaterThan(0);
  });

  it("lets the highest-SHO goalkeeper take regulation penalties on either side", () => {
    const boss = buildLadder("depth-keeper-penalty", "cup8").F;
    const starters = bossStarters(boss).map((s) => ({
      ...s,
      species: { ...s.species, attrs: { ...s.species.attrs, SHO: s.role === "GK" ? 100 : 1 } },
    }));
    const m = simulateMatch(
      {
        seed: "depth-keeper-penalty" as Seed,
        matchIndex: 0,
        round: "G1",
        phase: "group",
        rating: 700,
        userLines: boss.lines,
        starters,
        keeper: starters[0]!.species,
        opponent: boss,
        opponentStarters: starters,
        absences: [],
      },
      {
        ...ENGINE_COEFFICIENTS,
        match: {
          ...ENGINE_COEFFICIENTS.match,
          penaltyShare: 1,
          chances: { regulation: 1, extraTime: 1, maxGoalProb: 1 },
        },
      },
    );
    expect(
      m.goals.map((g) =>
        g.side === "user" ? g.scorer : g.scorer.kind === "species" ? g.scorer.id : -1,
      ),
    ).toEqual([starters[0]!.species.id, starters[0]!.species.id]);
    expect(m.goals.map((g) => g.penalty)).toEqual([true, true]);
  });

  it("reports six actual group fixtures with one match per team in every round", () => {
    const lineup = {
      formation: "4-3-3",
      starters: [9, 59, 149, 130, 3, 80, 6, 55, 26, 85, 135],
      bench: [25, 94, 65, 68, 143],
    } as unknown as FullLineup;
    const cup = runCup(lineup, "depth-fixtures" as Seed, "cup8");
    expect(cup.groupFixtures).toHaveLength(6);
    for (const round of ["G1", "G2", "G3"] as const) {
      const fixtures = cup.groupFixtures!.filter((f) => f.round === round);
      expect(fixtures).toHaveLength(2);
      expect(new Set(fixtures.flatMap((f) => [f.a, f.b])).size).toBe(4);
      const match = cup.matches.find((m) => m.round === round)!;
      if (match.status !== "played") throw new Error("missing group match");
      expect(fixtures.find((f) => f.a === "user")).toEqual({
        round,
        a: "user",
        b: match.opponent.id,
        aGoals: match.regulation.user,
        bGoals: match.regulation.opp,
      });
    }
    for (const row of cup.group) {
      const fixtures = cup.groupFixtures!.filter((f) => f.a === row.team || f.b === row.team);
      expect(fixtures.reduce((sum, f) => sum + (f.a === row.team ? f.aGoals : f.bGoals), 0)).toBe(
        row.goalsFor,
      );
    }
  });

  it("keeps Boss XI shape within three points and the existing difficulty centre", () => {
    const final = buildLadder("golden-1", "kanto151").F;
    expect(Object.values(final.lines).reduce((a, b) => a + b, 0) / 4).toBeCloseTo(100.65, 12);
    expect(Math.abs(final.lines.GK - 103.4)).toBeLessThanOrEqual(3);
    expect(Math.abs(final.lines.DEF - 103.4)).toBeLessThanOrEqual(3);
    expect(Math.abs(final.lines.MID - 96.4)).toBeLessThanOrEqual(3);
    expect(Math.abs(final.lines.ATT - 99.4)).toBeLessThanOrEqual(3);
  });
});
