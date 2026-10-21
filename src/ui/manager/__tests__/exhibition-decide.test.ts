import { describe, expect, it } from "vitest";
import type { FullLineup, Lineup, Seed } from "@/engine";
import { simulateMatch } from "@/engine/match";
import { exhibitionFixture, playSingle } from "@/components/results/exhibition";
import { finalScore, goalLine } from "@/components/results/format";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { decideExhibition, type ExhibitionContext } from "../exhibition-decide";

const lineup: Lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as unknown as Lineup["starters"],
  bench: [12, 13, 14, 15, 16] as unknown as Lineup["bench"],
};
const settings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
} as const;
const own = draftFromBuilderToken(builderToken(settings, lineup, "builder" as Seed))!
  .lineup as FullLineup;
const opponent = draftFromBuilderToken(builderToken(settings, lineup, "opponent-0" as Seed))!;
const other = opponent.lineup as FullLineup;
const fixture = exhibitionFixture(own, other, "Their squad")!;
const scope = { seed: opponent.seed, own, other, rematch: 0 };
const seed = JSON.stringify([opponent.seed, own, other, 0]) as Seed;
const ctx: ExhibitionContext = { fixture, seed };
// Without decisions: 4-0, Metapod (11) injured at 19' and replaced by Beedrill (15).
const assistant = playSingle(fixture, scope);

function userCalls(match: typeof assistant): string[] {
  return (match.incidents ?? []).flatMap((i) => {
    if (i.side !== "user") return [];
    if (i.kind === "sub") return [`${i.minute}' ${i.by} sub ${i.out} for ${i.in}`];
    if (i.kind === "tactic") return [`${i.minute}' ${i.by} ${i.tactic}`];
    return [];
  });
}

describe("exhibition decide", () => {
  it("re-runs the match with the decision, equal to a direct simulateMatch with the same actions (catches a touchline call the exhibition result ignores)", () => {
    const verdict = decideExhibition(ctx, assistant, [], 45, { kind: "tactic", tactic: "attack" });
    if (!verdict.ok) throw new Error(verdict.reason);
    expect(verdict.actions).toEqual([{ type: "tactic", match: 0, minute: 45, tactic: "attack" }]);
    const direct = simulateMatch({
      ...fixture,
      phase: "group",
      seed,
      manager: [{ type: "tactic", match: 0, minute: 45, tactic: "attack" }],
    });
    expect(JSON.stringify(verdict.match)).toBe(JSON.stringify(direct));
    expect(finalScore(verdict.match)).toEqual({ user: 5, opp: 0 });
    expect(verdict.match.goals.map(goalLine)).toEqual([
      "23' Charizard (solo run)",
      "44' Venusaur",
      "70' Blastoise, assist Charizard",
      "78' Beedrill",
      "85' Beedrill (solo run)",
    ]);
  });

  it("puts a sub made at the half-time stop into the result (catches a bench that cannot come on in an exhibition)", () => {
    const verdict = decideExhibition(ctx, assistant, [], 45, { kind: "sub", slot: 2, bench: 0 });
    if (!verdict.ok) throw new Error(verdict.reason);
    expect(verdict.actions).toEqual([{ type: "sub", match: 0, minute: 45, slot: 2, bench: 0 }]);
    expect(userCalls(verdict.match)).toEqual([
      "19' auto sub 11 for 15",
      "45' manager sub 3 for 12",
      "75' auto defend",
    ]);
    expect(finalScore(verdict.match)).toEqual({ user: 4, opp: 0 });
  });

  it("refuses a bench player who already came on, with the touchline's reason", () => {
    const verdict = decideExhibition(ctx, assistant, [], 45, { kind: "sub", slot: 2, bench: 3 });
    expect(verdict).toEqual({ ok: false, reason: "That bench player cannot come on." });
  });

  it("refuses a decision before one already taken", () => {
    const first = decideExhibition(ctx, assistant, [], 45, { kind: "tactic", tactic: "attack" });
    if (!first.ok) throw new Error(first.reason);
    const verdict = decideExhibition(ctx, first.match, first.actions, 30, {
      kind: "tactic",
      tactic: "defend",
    });
    expect(verdict).toEqual({ ok: false, reason: "That moment has already been played." });
  });
});
