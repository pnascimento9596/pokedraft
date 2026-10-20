import { describe, expect, it } from "vitest";
import type { FullLineup, Lineup, Seed } from "@/engine";
import { simulateMatch } from "@/engine/match";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { exhibitionFixture, playSingle, playTwoLegs } from "../exhibition";
import { finalScore, goalLine, shootoutLine } from "../format";

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
const scope = (rematch: number) => ({ seed: opponent.seed, own, other, rematch });

describe("one-match exhibition", () => {
  it("fields the bench, so the same squads replay 4-0 with the 19' injury replaced (re-pinned from 4-1 when exhibitions gained subs and injuries; catches an exhibition with no bench)", () => {
    const match = playSingle(fixture, scope(0));
    expect(finalScore(match)).toEqual({ user: 4, opp: 0 });
    expect(match.extraTime).toBeNull();
    expect(match.goals.map(goalLine)).toEqual([
      "23' Charizard (solo run)",
      "44' Venusaur",
      "78' Beedrill",
      "85' Charizard (pen)",
    ]);
    expect(
      (match.incidents ?? [])
        .filter((i) => i.side === "user" && (i.kind === "injury" || i.kind === "sub"))
        .map((i) =>
          i.kind === "sub" ? `${i.minute}' sub ${i.out} for ${i.in}` : `${i.minute}' injury`,
        ),
    ).toEqual(["19' injury", "19' sub 11 for 15", "60' sub 4 for 12", "75' sub 10 for 16"]);
  });

  it("is byte-identical to the group-phase match on the seed the modal always used", () => {
    const original = simulateMatch({
      ...fixture,
      phase: "group",
      seed: JSON.stringify([opponent.seed, own, other, 0]) as Seed,
    });
    expect(JSON.stringify(playSingle(fixture, scope(0)))).toBe(JSON.stringify(original));
  });
});

describe("two-leg exhibition", () => {
  it("plays each leg in its own scope instead of replaying the one-match result as leg 1", () => {
    const tie = playTwoLegs(fixture, scope(0));
    expect(tie.legs.map((leg) => leg.regulation)).toEqual([
      { user: 2, opp: 2 },
      { user: 2, opp: 1 },
    ]);
  });

  it("decides a won aggregate after 90 minutes of leg 2 with no extra time", () => {
    const tie = playTwoLegs(fixture, scope(6));
    expect(tie.legs.map((leg) => leg.regulation)).toEqual([
      { user: 0, opp: 0 },
      { user: 2, opp: 0 },
    ]);
    expect(tie.aggregate).toEqual({ user: 2, opp: 0 });
    expect(tie.decidedBy).toBe("aggregate");
    expect(tie.winner).toBe("user");
    expect(tie.leg2.extraTime).toBe(false);
    expect(tie.decider).toBeNull();
  });

  it("does not send a drawn leg 2 to extra time when the aggregate is already decided", () => {
    const tie = playTwoLegs(fixture, scope(20));
    expect(tie.legs.map((leg) => leg.regulation)).toEqual([
      { user: 1, opp: 0 },
      { user: 1, opp: 1 },
    ]);
    expect(tie.leg2.score).toEqual({ user: 1, opp: 1 });
    expect(tie.leg2.extraTime).toBe(false);
    expect(tie.aggregate).toEqual({ user: 2, opp: 1 });
    expect(tie.decidedBy).toBe("aggregate");
    expect(tie.winner).toBe("user");
  });

  it("sends a level aggregate to extra time even when leg 2 alone was won (re-pinned from rematch 1 to 24 with subs and injuries on)", () => {
    const tie = playTwoLegs(fixture, scope(24));
    expect(tie.legs.map((leg) => leg.regulation)).toEqual([
      { user: 0, opp: 1 },
      { user: 1, opp: 0 },
    ]);
    expect(tie.leg2.extraTime).toBe(true);
    expect(tie.aggregate).toEqual({ user: 1, opp: 1 });
    expect(tie.decidedBy).toBe("penalties");
    expect(shootoutLine(tie.decider!)).toBe("4-2 on pens");
    expect(tie.winner).toBe("user");
  });

  it("adds extra-time goals to leg 2 and the aggregate when extra time settles the tie (re-pinned from rematch 24 to 26 with subs and injuries on)", () => {
    const tie = playTwoLegs(fixture, scope(26));
    expect(tie.legs.map((leg) => leg.regulation)).toEqual([
      { user: 0, opp: 0 },
      { user: 2, opp: 2 },
    ]);
    expect(tie.leg2.score).toEqual({ user: 3, opp: 2 });
    expect(tie.leg2.goals.map(goalLine)).toEqual([
      "26' Metapod",
      "46' Caterpie (solo run)",
      "57' Blastoise, assist Wartortle",
      "72' Charizard (pen)",
      "118' Charizard (pen)",
    ]);
    expect(tie.aggregate).toEqual({ user: 3, opp: 2 });
    expect(tie.decidedBy).toBe("extra-time");
    expect(tie.leg2.shootout).toBeNull();
    expect(tie.winner).toBe("user");
  });

  it("goes to penalties when extra time leaves the aggregate level", () => {
    const tie = playTwoLegs(fixture, scope(7));
    expect(tie.leg2.score).toEqual({ user: 2, opp: 2 });
    expect(tie.aggregate).toEqual({ user: 2, opp: 2 });
    expect(tie.decidedBy).toBe("penalties");
    expect(shootoutLine(tie.decider!)).toBe("2-4 on pens");
    expect(tie.winner).toBe("opp");
  });

  it("is deterministic for the same squads and rematch number", () => {
    expect(JSON.stringify(playTwoLegs(fixture, scope(5)))).toBe(
      JSON.stringify(playTwoLegs(fixture, scope(5))),
    );
  });
});
