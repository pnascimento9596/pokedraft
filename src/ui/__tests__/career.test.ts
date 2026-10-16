import { expect, it } from "vitest";
import { careerSummary } from "../career";
import { countRun, emptyLifetime } from "../lifetime";
import type { RunRecord } from "../runs";

const base: RunRecord = {
  token: "one",
  bucket: "cup8:open",
  friendly: false,
  formation: "4-3-3",
  score: 600,
  wins: 3,
  draws: 1,
  losses: 2,
  finish: "group",
  flawless: false,
  at: "2026-10-15",
  squadSpeciesIds: [1, 25],
};

it("weights formation win rates by matches and counts bench-inclusive ranked squad membership only", () => {
  const career = careerSummary([
    base,
    {
      ...base,
      token: "two",
      wins: 1,
      draws: 1,
      losses: 0,
      finish: "champion",
      squadSpeciesIds: [25, 1025],
    },
    { ...base, token: "old", wins: 0, draws: 0, losses: 0, squadSpeciesIds: undefined },
    { ...base, token: "friendly", friendly: true, wins: 100, finish: "champion" },
    { ...base, token: "builder", bucket: "builder", wins: 100, finish: "champion" },
  ]);
  expect(career.rankedRuns).toBe(3);
  expect(career.coveredRuns).toBe(2);
  expect(career.formations).toEqual([
    { formation: "4-3-3", runs: 3, wins: 4, matches: 8, winRate: 0.5 },
  ]);
  expect([...career.species]).toEqual([
    [1, { drafted: 1, champion: 0 }],
    [25, { drafted: 2, champion: 1 }],
    [1025, { drafted: 1, champion: 1 }],
  ]);
});

it("keeps the win rate unknown for a formation with no recorded matches", () => {
  expect(
    careerSummary([{ ...base, wins: 0, draws: 0, losses: 0 }]).formations[0]?.winRate,
  ).toBeNull();
});

it("reads formation win rates from lifetime totals that outlive the 50 retained runs", () => {
  const lifetime = Array.from({ length: 60 }, (_, i) => ({
    ...base,
    token: `life-${i}`,
    formation: "3-5-2" as const,
    wins: 2,
    draws: 1,
    losses: 1,
  })).reduce(countRun, emptyLifetime());
  const career = careerSummary([base], lifetime);
  expect(career.formationSource).toBe("lifetime");
  expect(career.formations).toEqual([
    { formation: "3-5-2", runs: 60, wins: 120, matches: 240, winRate: 0.5 },
  ]);
  expect(career.rankedRuns).toBe(1);
});
