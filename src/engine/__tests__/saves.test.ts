import { describe, expect, it } from "vitest";
import { simulateMatch } from "../match";
import { bossStarters, buildLadder } from "../opponents";
import type { Seed } from "../types";

const boss = buildLadder("save-guard", "cup8").F;
const starters = bossStarters(boss);
const input = {
  seed: "save-guard" as Seed,
  matchIndex: 0,
  round: "G1" as const,
  phase: "group" as const,
  rating: 700,
  userLines: boss.lines,
  starters,
  keeper: starters[0]!.species,
  opponent: boss,
  opponentStarters: starters,
  absences: [],
};

describe("recorded goalkeeper saves", () => {
  it("records named saves on both sides instead of discarding every non-goal chance", () => {
    const match = simulateMatch(input);
    expect(match).toHaveProperty("saves");
    const saves = (match as unknown as { saves: readonly { side: string }[] }).saves;
    expect(new Set(saves.map((event) => event.side))).toEqual(new Set(["user", "opp"]));
  });
});
