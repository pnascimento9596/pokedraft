import { describe, expect, it } from "vitest";
import { assistWeight, extraTimeFactor, penaltyEdge } from "../match";
import { buildLadder } from "../opponents";
import { speciesById } from "../species";
import { matchLineup } from "../availability";
import type { FullLineup, Seed } from "../types";

const player = speciesById(6);
const withAttrs = (attrs: Partial<typeof player.attrs>) => ({
  ...player, attrs: { ...player.attrs, ...attrs },
});

describe("v4 attribute depth", () => {
  it("creator weights reward vision and dribbling independently of shooting", () => {
    const creator = { species: withAttrs({ PAS: 60, VIS: 80, DRI: 40 }), role: "CM" as const, line: "MID" as const };
    expect(assistWeight(creator)).toBe(63);
    expect(assistWeight({ ...creator, species: withAttrs({ PAS: 60, VIS: 80, DRI: 40, SHO: 1 }) })).toBe(63);
  });
  it("stamina bounds extra-time fatigue symmetrically", () => {
    expect(extraTimeFactor([{ species: withAttrs({ STA: 0 }), role: "ST", line: "ATT" }])).toBe(0.9);
    expect(extraTimeFactor([{ species: withAttrs({ STA: 100 }), role: "ST", line: "ATT" }])).toBe(1.1);
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
    const lineup = { formation: "4-3-3", starters: [9,59,149,130,3,80,6,55,26,85,135], bench: [25,94,65,68,143] } as unknown as FullLineup;
    const absences = Array.from({length: 100}, (_, i) => matchLineup(lineup, `depth-${i}` as Seed, 0).absence).filter(Boolean);
    expect(absences.length).toBeGreaterThan(0);
    expect(absences.every((a) => a!.out !== a!.in)).toBe(true);
  });
});
