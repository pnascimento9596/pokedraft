import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ON_TARGET_SHARE, saveProbability, simulateMatch, type MatchInput } from "../match";
import { bossStarters, buildLadder } from "../opponents";
import { simulateMatch as simulateV4 } from "../versions/v4/src/engine/match";
import type { MatchResult, Seed, Species } from "../types";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

function guardInput(): MatchInput {
  const boss = buildLadder("save-guard", "cup8").F;
  const starters = bossStarters(boss);
  return {
    seed: "save-guard" as Seed,
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
  };
}

// Two different Boss Clubs meeting in a semifinal that this seed takes to a shootout.
function shootoutInput(): MatchInput {
  const rungs = Object.values(buildLadder("ko-1", "cup8"));
  const user = rungs[1]!;
  const opp = rungs[2]!;
  const starters = bossStarters(user);
  return {
    seed: "ko-1" as Seed,
    matchIndex: 5,
    round: "SF",
    phase: "knockout",
    rating: 700,
    userLines: user.lines,
    starters,
    keeper: starters[0]!.species,
    opponent: opp,
    opponentStarters: bossStarters(opp),
    absences: [],
  };
}

function played(input: MatchInput): PlayedMatch {
  const match = simulateMatch(input);
  if (match.status !== "played") throw new Error("expected a played match");
  return match;
}

const keeperOf = (input: MatchInput, side: "user" | "opp") =>
  side === "user"
    ? input.keeper.id
    : input.opponentStarters.find((s) => s.role === "GK")!.species.id;

describe("recorded goalkeeper saves (catches invented, misattributed, or scoring-coupled saves)", () => {
  it("records the exact save events the save stream draws for the guard match", () => {
    const match = played(guardInput());
    expect(match.regulation).toEqual({ user: 0, opp: 1 });
    expect(match.saves).toEqual([
      { kind: "save", side: "user", minute: 5, attacker: 862, keeper: 486 },
      { kind: "save", side: "opp", minute: 10, attacker: 428, keeper: 486 },
      { kind: "save", side: "opp", minute: 46, attacker: 967, keeper: 486 },
      { kind: "save", side: "opp", minute: 56, attacker: 967, keeper: 486 },
      { kind: "save", side: "opp", minute: 68, attacker: 862, keeper: 486 },
      { kind: "save", side: "opp", minute: 85, attacker: 463, keeper: 486 },
    ]);
  });

  it("names each side's own keeper and an outfield shooter from the other side", () => {
    for (const input of [guardInput(), shootoutInput()]) {
      const match = played(input);
      for (const save of match.saves!) {
        expect(save.keeper).toBe(keeperOf(input, save.side));
        const shooters = (save.side === "user" ? input.opponentStarters : input.starters).filter(
          (s) => ENGINE_COEFFICIENTS.match.roleFactor[s.role] > 0,
        );
        expect(shooters.map((s) => s.species.id)).toContain(save.attacker);
      }
    }
  });

  it("keeps saves inside open play: no shootout kick, missed or not, becomes a save", () => {
    const input = shootoutInput();
    const match = played(input);
    expect(match.extraTime).toEqual({ user: 0, opp: 0 });
    expect(match.shootout!.kicks).toHaveLength(8);
    expect(match.shootout!.kicks.filter((k) => !k.scored)).toHaveLength(4);
    expect(match.saves!.map((s) => [s.side, s.minute])).toEqual([
      ["opp", 1],
      ["opp", 4],
      ["user", 49],
      ["user", 65],
      ["opp", 74],
      ["user", 100],
      ["opp", 102],
      ["opp", 104],
      ["user", 105],
    ]);
    expect(Math.max(...match.saves!.map((s) => s.minute))).toBeLessThanOrEqual(120);
  });

  it("replays identically from the same input", () => {
    expect(played(shootoutInput()).saves).toEqual(played(shootoutInput()).saves);
  });

  it("leaves every engine-4 output unchanged except the added saves", () => {
    for (const input of [guardInput(), shootoutInput()]) {
      const { saves, ...rest } = played(input);
      expect(saves!.length).toBeGreaterThan(0);
      expect(rest).toEqual(simulateV4(input as never));
    }
  });

  it("scales the save chance with keeper handling against the shooter's finishing", () => {
    const species = (attrs: Partial<Species["attrs"]>) => ({ attrs }) as Species;
    const wall = species({ REF: 100, DIV: 100, HAN: 100, GKP: 100 });
    const sieve = species({ REF: 0, DIV: 0, HAN: 0, GKP: 0 });
    expect(ON_TARGET_SHARE).toBe(0.15);
    expect(saveProbability(species({ SHO: 50 }), wall)).toBeCloseTo(0.0825, 12);
    expect(saveProbability(species({ SHO: 100 }), sieve)).toBeCloseTo(0.015, 12);
    expect(saveProbability(species({ SHO: 0 }), wall)).toBeCloseTo(0.105, 12);
  });
});
