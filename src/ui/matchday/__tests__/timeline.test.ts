import { describe, expect, it } from "vitest";
import { movesetFor } from "@/data/movesets";
import type { FullLineup, Incident, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import {
  ambientBall,
  buildTimeline,
  driftPoint,
  frameAt,
  goalBall,
  saveBall,
  slotPoint,
  stagePitch,
  xiAt,
} from "../timeline";

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

  it("plays the same phases with and without the canon movesets (catches sprites that jump when movesets load)", () => {
    const shape = (movesOf: typeof movesetFor | null) =>
      buildTimeline(match(), { ...input, movesOf }).plays.map((p) => ({
        side: p.side,
        fromSlot: p.fromSlot,
        toSlot: p.toSlot,
        kind: p.kind,
      }));
    const generic = shape(null);
    const canon = shape(movesetFor);
    expect(canon).toEqual(generic);
    expect([canon[3], canon[10], canon[30]]).toEqual([
      { side: "opp", fromSlot: 9, toSlot: 10, kind: "cross" },
      { side: "user", fromSlot: 9, toSlot: 10, kind: "pass" },
      { side: "user", fromSlot: 9, toSlot: 10, kind: "through" },
    ]);
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

  it("leans the ball toward the side that made chances in the last window and shifts lines with the tactic", () => {
    const t = buildTimeline(match(), input);
    expect(t.frames).toHaveLength(18);
    expect(t.frames[2]).toEqual({ from: 10, to: 15, ball: 0, line: { user: 0, opp: -7 } });
    expect(t.frames[3]).toEqual({ from: 15, to: 20, ball: 2 / 3, line: { user: 0, opp: -7 } });
    expect(t.frames[7]).toEqual({ from: 35, to: 40, ball: 0, line: { user: 7, opp: -7 } });
    expect(t.frames[8]).toEqual({ from: 40, to: 45, ball: -0.5, line: { user: 7, opp: -7 } });
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

describe("momentum (catches a lean that shows a goal or a save before it happens)", () => {
  const goalAt4 = (seed = "tl") =>
    buildTimeline(
      match({
        regulation: { user: 1, opp: 0 },
        goals: [
          { side: "user", minute: 4, penalty: false, kind: "solo", scorer: id(6), assist: null },
        ],
        saves: [],
        incidents: [],
      }),
      { ...input, seed },
    );

  it("reads 0 at kickoff even when the first window holds a goal", () => {
    expect(frameAt(goalAt4(), 0)?.ball).toBe(0);
  });

  it("does not move the lean for a goal at 4' before 5'", () => {
    const t = goalAt4();
    expect([0, 1, 3.9, 4, 4.5, 4.99].map((m) => frameAt(t, m)?.ball)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(frameAt(t, 5.01)?.ball).toBe(0.5);
    expect(frameAt(t, 10.01)?.ball).toBe(0);
  });

  it("keeps possession before a goal free of the goal later in the same window", () => {
    const quiet = (seed: string) =>
      buildTimeline(match({ goals: [], saves: [], incidents: [] }), { ...input, seed });
    const leaked = Array.from({ length: 24 }, (_, k) => `s${k}`).filter((seed) => {
      const before = (t: ReturnType<typeof buildTimeline>) =>
        t.plays.slice(0, 3).map((p) => p.side);
      return before(goalAt4(seed)).join() !== before(quiet(seed)).join();
    });
    expect(leaked).toEqual([]);
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

  it("runs a save from the shooter to the keeper and parries the ball clear", () => {
    const attacker = { x: 76, y: 38 };
    const mouth = { x: 98, y: 50 };
    const deflect = { x: 84, y: 24 };
    expect(saveBall(attacker, mouth, deflect, 0)).toEqual(attacker);
    expect(saveBall(attacker, mouth, deflect, 0.45)).toEqual(mouth);
    expect(saveBall(attacker, mouth, deflect, 1)).toEqual(deflect);
  });

  it("chains open-play phases with connected passes and canon move callouts", () => {
    const t = buildTimeline(match(), input);
    expect(t.plays.length).toBe(72);
    for (let k = 0; k < t.plays.length - 1; k++) {
      const cur = t.plays[k]!;
      const next = t.plays[k + 1]!;
      expect(cur.to).toBe(next.from);
      if (cur.side === next.side) expect(cur.toSlot).toBe(next.fromSlot);
    }
    const abilities = t.plays.filter((p) => p.callout !== null);
    expect(abilities.length).toBeGreaterThan(10);
    expect(abilities[0]!.callout!.text).toMatch(/ used .+!$/);
  });

  it("stages active ball carriers, supporting runs, save trajectories and shootout spots on the pitch", () => {
    const t = buildTimeline(match(), input);
    const open = stagePitch(t, {
      clock: 6.5,
      active: null,
      kicks: 0,
      motion: true,
      userSlots: LINEUP.formation,
      oppSlots: "4-3-3",
    });
    expect(open.ball.carrier).not.toBeNull();
    const carrierSide = open.ball.carrier!.side;
    const carrierSlot = open.ball.carrier!.slot!;
    expect(open.players[carrierSide][carrierSlot]?.hasBall).toBe(true);

    const still = stagePitch(t, {
      clock: 6.5,
      active: null,
      kicks: 0,
      motion: false,
      userSlots: LINEUP.formation,
      oppSlots: "4-3-3",
    });
    expect(still.ball.x).toBe(50);
    expect(still.ball.y).toBe(50);
    expect(still.trail).toBeNull();

    const saveBeat = t.beats.find((b) => b.kind === "save")!;
    const onSave = stagePitch(t, {
      clock: 12,
      active: { beat: saveBeat, progress: 0.2 },
      kicks: 0,
      motion: true,
      userSlots: LINEUP.formation,
      oppSlots: "4-3-3",
    });
    expect(onSave.ball.x).toBeLessThan(98);
    expect(onSave.trail?.kind).toBe("save");

    const shoot = buildTimeline(
      match({
        extraTime: { user: 0, opp: 0 },
        shootout: {
          user: 1,
          opp: 0,
          keeper: id(9),
          kicks: [{ side: "user", taker: id(6), scored: true }],
          decider: "kicks",
          coinWinner: null,
        },
      }),
      input,
    );
    const pens = stagePitch(shoot, {
      clock: 120,
      active: null,
      kicks: 1,
      motion: true,
      userSlots: LINEUP.formation,
      oppSlots: "4-3-3",
    });
    // The taker stands on the drawn penalty spot (Broadcast's cx 89), not 3 units short of it.
    expect(pens.players.user[9]?.point).toEqual({ x: 89, y: 50 });
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

  it("writes an opponent tactic at kickoff as the shape they start in, not a 0' switch", async () => {
    const { beatLine } = await import("../copy");
    expect(
      beatLine(
        { kind: "tactic", minute: 0, side: "opp", tactic: "counter", by: "auto" },
        { user: "Your XI", opp: "Opp" },
      ),
    ).toBe("Kick off: Opp play Counter");
  });
});
