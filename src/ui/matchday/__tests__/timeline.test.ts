import { describe, expect, it } from "vitest";
import { movesetFor } from "@/data/movesets";
import type { FullLineup, Incident, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { ambientBall, buildTimeline, driftPoint, goalBall, slotPoint, xiAt } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const BENCH = [130, 131, 132, 133, 134].map(id);
const LINEUP = { formation: "4-3-3", starters: XI, bench: BENCH } as unknown as FullLineup;
const ROSTER = [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
  kind: "species" as const,
  id: id(n),
}));
const OPPONENT = {
  id: "o",
  name: "Opp",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: ROSTER,
} as unknown as Opponent;

function match(extra: Partial<PlayedMatch> = {}): PlayedMatch {
  const incidents: Incident[] = [
    { kind: "yellow", side: "opp", minute: 20, slot: 3, player: id(144), secondYellow: false },
    { kind: "tactic", side: "user", minute: 30, tactic: "attack", by: "manager" },
    { kind: "injury", side: "user", minute: 50, slot: 9, player: id(6) },
    {
      kind: "sub",
      side: "user",
      minute: 50,
      slot: 9,
      out: id(6),
      in: id(130),
      reason: "injury",
      by: "auto",
    },
  ];
  return {
    status: "played",
    round: "G1",
    opponent: OPPONENT,
    regulation: { user: 2, opp: 1 },
    extraTime: null,
    shootout: null,
    outcome: "W",
    goals: [
      {
        side: "user",
        minute: 12,
        penalty: false,
        kind: "open-play",
        scorer: id(6),
        assist: id(25),
      },
      {
        side: "opp",
        minute: 40,
        penalty: false,
        kind: "header",
        scorer: { kind: "species", id: id(149) },
        assist: null,
      },
      { side: "user", minute: 70, penalty: false, kind: "solo", scorer: id(130), assist: null },
    ],
    saves: [{ kind: "save", side: "opp", minute: 12, attacker: id(25), keeper: id(143) }],
    incidents,
    windows: Array.from({ length: 18 }, (_, w) => ({
      minute: (w + 1) * 5,
      score: { user: 0, opp: 0 },
      tactic: {
        user: (w + 1) * 5 > 30 ? ("attack" as const) : ("balanced" as const),
        opp: "defend" as const,
      },
      energy: XI.map(() => 90),
      onPitch: XI,
    })),
    absences: [],
    rating: 500,
    recap: [],
    ...extra,
  };
}

const input = { matchIndex: 2, seed: "tl", lineup: LINEUP, movesOf: movesetFor };

describe("buildTimeline (catches choreography that changes between two viewings of the same match)", () => {
  it("builds the same timeline from the same match, seed and index", () => {
    expect(buildTimeline(match(), input)).toEqual(buildTimeline(match(), input));
  });

  it("draws different ambient drift for another match index", () => {
    const a = buildTimeline(match(), input).drift.user;
    const b = buildTimeline(match(), { ...input, matchIndex: 3 }).drift.user;
    expect(a).not.toEqual(b);
  });

  it("orders whistles, goals and incidents by minute, goals first within a minute", () => {
    const t = buildTimeline(match(), input);
    expect(t.beats.map((b) => `${b.minute}:${b.kind}`)).toEqual([
      "0:whistle",
      "12:goal",
      "12:save",
      "20:card",
      "30:tactic",
      "40:goal",
      "45:whistle",
      "50:injury",
      "50:sub",
      "70:goal",
      "90:whistle",
    ]);
  });

  it("puts each scorer in the slot they play at that minute, a substitute in the slot he took", () => {
    const goals = buildTimeline(match(), input).beats.filter((b) => b.kind === "goal");
    expect(
      goals.map((g) => (g.kind === "goal" ? [g.scorer.name, g.scorer.slot, g.score] : null)),
    ).toEqual([
      ["Charizard", 9, { user: 1, opp: 0 }],
      ["Dragonite", 8, { user: 1, opp: 1 }],
      ["Gyarados", 9, { user: 2, opp: 1 }],
    ]);
  });

  it("leans the ball toward the side making chances and shifts lines with the tactic", () => {
    const t = buildTimeline(match(), input);
    expect(t.frames).toHaveLength(18);
    expect(t.frames[2]).toEqual({ from: 10, to: 15, ball: 2 / 3, line: { user: 0, opp: -7 } });
    expect(t.frames[7]).toEqual({ from: 35, to: 40, ball: -0.5, line: { user: 7, opp: -7 } });
  });

  it("tracks who stands in each slot through injuries and substitutions", () => {
    const t = buildTimeline(match(), input);
    expect(xiAt(t, "user", 49)[9]).toBe(6);
    expect(xiAt(t, "user", 50)[9]).toBe(130);
  });

  it("falls back to a goals-only timeline for a retained run with no windows or incidents", () => {
    const t = buildTimeline(
      match({ windows: undefined, incidents: undefined, saves: undefined }),
      input,
    );
    expect(t.goalsOnly).toBe(true);
    expect(t.beats.filter((b) => b.kind !== "whistle" && b.kind !== "goal")).toEqual([]);
    expect(t.frames.every((f) => f.line.user === 0 && f.line.opp === 0)).toBe(true);
  });

  it("stages extra time and every shootout kick with the running score", () => {
    const t = buildTimeline(
      match({
        extraTime: { user: 0, opp: 0 },
        shootout: {
          user: 1,
          opp: 0,
          keeper: id(9),
          kicks: [
            { side: "user", taker: id(6), scored: true },
            { side: "opp", taker: { kind: "species", id: id(149) }, scored: false },
          ],
          decider: "kicks",
          coinWinner: null,
        },
      }),
      input,
    );
    expect(t.finalMinute).toBe(120);
    expect(
      t.beats.filter((b) => b.kind === "whistle").map((b) => b.kind === "whistle" && b.label),
    ).toEqual([
      "Kick off",
      "Half time",
      "End of normal time",
      "Extra time half time",
      "End of extra time",
    ]);
    expect(t.kicks.map((k) => [k.taker.name, k.scored, k.score])).toEqual([
      ["Charizard", true, { user: 1, opp: 0 }],
      ["Dragonite", false, { user: 1, opp: 0 }],
    ]);
  });
});

describe("pitch geometry (catches sprites that leave the pitch or move with reduced motion)", () => {
  it("puts the user's keeper on the left and the opponent's on the right", () => {
    expect(slotPoint("user", { x: 50, y: 5 }, 0)).toEqual({ x: 8.3, y: 50 });
    expect(slotPoint("opp", { x: 50, y: 5 }, 0)).toEqual({ x: 91.7, y: 50 });
  });

  it("pushes outfield lines up for attack and never the keeper", () => {
    expect(slotPoint("user", { x: 50, y: 88 }, 7).x).toBeCloseTo(86.68, 9);
    expect(slotPoint("user", { x: 50, y: 5 }, 7).x).toBe(8.3);
  });

  it("holds still with motion off", () => {
    const home = { x: 30, y: 40 };
    expect(driftPoint(home, { phase: 1, amp: 3, speed: 0.5 }, 33.3, false)).toBe(home);
    const t = buildTimeline(match(), input);
    expect(ambientBall(t, 12, false)).toEqual({ x: 50, y: 50 });
  });

  it("runs a goal from the assist to the scorer to the net", () => {
    const from = { x: 50, y: 20 };
    const scorer = { x: 80, y: 40 };
    const mouth = { x: 98, y: 50 };
    expect(goalBall(from, scorer, mouth, 0)).toEqual(from);
    expect(goalBall(from, scorer, mouth, 0.35)).toEqual(scorer);
    expect(goalBall(from, scorer, mouth, 0.9)).toEqual(mouth);
  });
});

describe("beatLine (catches ticker copy that drops the scorer, the team or who made a change)", () => {
  it("writes each beat the way the ticker shows it", async () => {
    const { beatLine } = await import("../copy");
    const t = buildTimeline(match(), input);
    expect(t.beats.map((b) => beatLine(b, { user: "Your XI", opp: "Opp" }))).toEqual([
      "Kick off",
      "12' Goal for Your XI! Charizard, assist Pikachu",
      "12' Snorlax saves from Pikachu",
      "20' Yellow card for Articuno (Opp)",
      "30' You switch to Attack",
      "40' Goal for Opp! Dragonite",
      "45' Half time",
      "50' Charizard is injured",
      "50' Gyarados on for Charizard (injury, assistant)",
      "70' Goal for Your XI! Gyarados",
      "90' Full time",
    ]);
  });
});
