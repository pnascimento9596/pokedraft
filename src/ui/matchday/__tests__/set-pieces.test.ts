import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { FullLineup, MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5, GOLDEN_KANTO151_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE } from "../clock";
import {
  START,
  beatKey,
  landed,
  play,
  stageFrame,
  type FrameView,
  type PlayEnv,
  type PlayState,
} from "../player";
import { buildTimeline, type Beat, type PitchStage, type Point, type Timeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
type GoalBeat = Extract<Beat, { kind: "goal" }>;

// The golden runs under engine 7. Their goals of each kind:
//   cup8 match 0, 49': Talonflame's solo run (user).
//   kanto151 match 1, 83': Magmar's header from Rapidash's cross (user).
//   cup8 match 4, 81': Zeraora's penalty (user).
//   cup8 match 5, 37': Talonflame's header for the opponent.
//   kanto151 match 3, 17': Bulbasaur's free kick (user).
const RUNS = {
  cup8: replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`),
  kanto: replay(`pd8.${GOLDEN_KANTO151_V5.slice("pd5.".length)}`),
} as const;
type Run = keyof typeof RUNS;

// The goal is shown from this real time on; ages below are milliseconds into its 2,600 ms staging.
const FIRED_AT = 10_000;

interface Scene {
  readonly timeline: Timeline;
  readonly goal: GoalBeat;
  readonly at: (age: number, motion?: boolean) => PitchStage;
}

function matchOf(run: Run, index: number): { match: PlayedMatch; lineup: FullLineup } {
  const { draft, cup } = RUNS[run];
  const match = cup.matches[index];
  if (match?.status !== "played") throw new Error(`${run} match ${index} was not played`);
  return { match, lineup: toFullLineup(draft) };
}

function viewOf(match: PlayedMatch, lineup: FullLineup, at: Partial<FrameView>): FrameView {
  return {
    clock: 0,
    fired: {},
    now: 0,
    kicks: 0,
    motion: true,
    speed: 1,
    userSlots: lineup.formation,
    oppSlots: match.opponent.formation ?? "4-3-3",
    oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
    ...at,
  };
}

function scene(run: Run, index: number, minute: number): Scene {
  const { match, lineup } = matchOf(run, index);
  const timeline = buildTimeline(match, { matchIndex: index, seed: RUNS[run].cup.seed, lineup });
  const goal = timeline.beats.find((b): b is GoalBeat => b.kind === "goal" && b.minute === minute);
  if (goal === undefined) throw new Error(`no goal at ${minute}'`);
  const fired = { [beatKey(goal)]: FIRED_AT };
  const at = (age: number, motion = true) =>
    stageFrame(
      timeline,
      viewOf(match, lineup, { clock: minute, fired, now: FIRED_AT + age, motion }),
    ).stage;
  return { timeline, goal, at };
}

function point(stage: PitchStage, side: "user" | "opp", slot: number): Point {
  const p = stage.players[side][slot];
  if (p == null) throw new Error(`no ${side} player in slot ${slot}`);
  return p.point;
}

function ballOf(stage: PitchStage): Point {
  return { x: stage.ball.x, y: stage.ball.y };
}

function expectNear(actual: Point | undefined, expected: Point, digits = 6): void {
  expect(actual).toBeDefined();
  expect(actual!.x).toBeCloseTo(expected.x, digits);
  expect(actual!.y).toBeCloseTo(expected.y, digits);
}

const lengthwise = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);

describe("set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot)", () => {
  it("penalty: the shape freezes, Zeraora walks the ball to the spot, steps up, pauses, then kicks from 89 (catches a penalty struck on the run before the taker reaches the ball)", () => {
    const { goal, at } = scene("cup8", 4, 81);
    expect(goal.goalKind).toBe("penalty");
    expect(goal.scorer).toMatchObject({ side: "user", slot: 10 });
    const start = at(0);
    const ages = [260, 520, 780, 900];
    for (const side of ["user", "opp"] as const) {
      for (let slot = 0; slot < 11; slot++) {
        if ((side === "user" && slot === 10) || (side === "opp" && slot === 0)) continue;
        for (const age of ages) {
          expect({ side, slot, age, point: point(at(age), side, slot) }).toEqual({
            side,
            slot,
            age,
            point: point(start, side, slot),
          });
        }
      }
    }
    expectNear(ballOf(at(520)), { x: 89, y: 50 });
    expectNear(ballOf(at(780)), { x: 89, y: 50 });
    expectNear(ballOf(at(900)), { x: 89, y: 50 });
    expect(point(at(260), "user", 10).x).toBeLessThan(85);
    expectNear(point(at(780), "user", 10), { x: 87.4, y: 50 });
    expectNear(point(at(900), "user", 10), { x: 87.4, y: 50 });
    const kick = at(1040);
    expect(kick.trail?.kind).toBe("shot");
    expectNear(kick.trail?.from, { x: 89, y: 50 });
    expect(kick.ball.x).toBeGreaterThan(89);
  });

  it("free kick: exactly three defenders form a wall between the spot at 75 and goal, and the shot curls (catches a free kick flying straight through the defence)", () => {
    const { goal, at } = scene("kanto", 3, 17);
    expect(goal.goalKind).toBe("free-kick");
    const set = at(780);
    const inWall = set.players.opp.flatMap((p) =>
      p !== null &&
      p.slot !== 0 &&
      p.point.x > 75 &&
      p.point.x < 98 &&
      Math.abs(p.point.y - 50) <= 4
        ? [p.slot]
        : [],
    );
    expect(inWall).toEqual([3, 5, 9]);
    expectNear(point(set, "opp", 3), { x: 84, y: 46 });
    expectNear(point(set, "opp", 9), { x: 84, y: 50 });
    expectNear(point(set, "opp", 5), { x: 84, y: 54 });
    expectNear(ballOf(set), { x: 75, y: 50 });
    // Halfway through the flight the ball is 7 off the straight line from (75, 50) to (98, 50).
    const mid = at(1235);
    expect(mid.trail?.kind).toBe("shot");
    expectNear(ballOf(mid), { x: 86.5, y: 43 }, 5);
    expectNear(mid.trail?.via, { x: 80.75, y: 43 }, 5);
  });

  it("header: Rapidash's cross from the wing, and Magmar meets it at loft 0.85 (catches a header struck off the grass)", () => {
    const { goal, at } = scene("kanto", 1, 83);
    expect(goal.goalKind).toBe("header");
    expect(goal.scorer).toMatchObject({ side: "user", slot: 5 });
    expect(goal.assist).toMatchObject({ side: "user", slot: 4 });
    expect(at(400).ball.carrier).toMatchObject({ side: "user", slot: 4 });
    const cross = at(650);
    expect(cross.trail?.kind).toBe("cross");
    expectNear(cross.trail?.from, { x: 84, y: 88 });
    expect(cross.ball.carrier).toMatchObject({ side: "user", slot: 5 });
    const meet = at(910);
    expect(meet.ball.loft).toBeCloseTo(0.85, 6);
    expect(meet.ball.x).toBeCloseTo(88, 6);
    expect(meet.ball.y).toBeCloseTo(52.46, 2);
    expectNear(point(meet, "user", 5), ballOf(meet));
  });

  it("solo: Talonflame dribbles a chain of touches past the defender who steps in (catches a solo goal staged as a pass)", () => {
    const { goal, at } = scene("cup8", 0, 49);
    expect(goal.goalKind).toBe("solo");
    expect(goal.scorer).toMatchObject({ side: "user", slot: 8 });
    const early = at(260);
    expect(point(early, "opp", 3).x).toBeGreaterThan(point(early, "user", 8).x);
    for (const age of [260, 520, 780]) {
      const s = at(age);
      expect(s.trail?.kind).toBe("dribble");
      expect(s.ball.carrier).toMatchObject({ side: "user", slot: 8 });
      expect(lengthwise(ballOf(s), point(s, "user", 8))).toBeLessThan(3);
    }
    expect(at(520).players.opp[3]?.pose).toBe("press");
    const past = at(910);
    expect(point(past, "user", 8).x).toBeGreaterThan(point(past, "opp", 3).x);
  });

  it("every kind puts the ball in the net and the score on the board at GOAL_LANDS, 1,560 ms in (catches a set piece that lands the score before the ball)", () => {
    const cases = [
      { run: "cup8", index: 0, minute: 49, kind: "solo", mouth: { x: 98, y: 50 } },
      { run: "kanto", index: 1, minute: 83, kind: "header", mouth: { x: 98, y: 50 } },
      { run: "cup8", index: 4, minute: 81, kind: "penalty", mouth: { x: 98, y: 50 } },
      { run: "cup8", index: 5, minute: 37, kind: "header", mouth: { x: 2, y: 50 } },
      { run: "kanto", index: 3, minute: 17, kind: "free-kick", mouth: { x: 98, y: 50 } },
    ] as const;
    for (const c of cases) {
      const { goal, at } = scene(c.run, c.index, c.minute);
      expect(goal.goalKind).toBe(c.kind);
      const fired = { [beatKey(goal)]: FIRED_AT };
      expect(landed(goal, fired, FIRED_AT + 1_534, true, 1)).toBe(false);
      expect(ballOf(at(1_534))).not.toEqual(c.mouth);
      expect(landed(goal, fired, FIRED_AT + 1_560, true, 1)).toBe(true);
      expect(ballOf(at(1_560))).toEqual(c.mouth);
    }
  });

  it("Quick and reduced motion stay still for every kind: no wall, no trail, the ball in the net (catches set pieces animating with motion off)", () => {
    const cases = [
      ["cup8", 0, 49, { x: 98, y: 50 }],
      ["kanto", 1, 83, { x: 98, y: 50 }],
      ["cup8", 4, 81, { x: 98, y: 50 }],
      ["kanto", 3, 17, { x: 98, y: 50 }],
    ] as const;
    for (const [run, index, minute, mouth] of cases) {
      const { at } = scene(run, index, minute);
      const a = at(300, false);
      const b = at(900, false);
      expect(a.trail).toBeNull();
      expect(ballOf(a)).toEqual(mouth);
      expect(b).toEqual(a);
    }
  });

  it("keeps the ball continuous through the free kick's match: under 4% of the pitch per 60 Hz frame at 1x (catches the ball jumping onto the spot)", () => {
    const { match, lineup } = matchOf("kanto", 3);
    const timeline = buildTimeline(match, { matchIndex: 3, seed: RUNS.kanto.cup.seed, lineup });
    const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
    const STEP = 1000 / 60;
    let state: PlayState = { ...START, running: true };
    let now = 0;
    let prev: Point | null = null;
    let max = 0;
    let tail = 0;
    while (tail < 180) {
      now += STEP;
      state = play(state, { type: "tick", now, dt: STEP, env });
      if (state.stage === "pens") break;
      if (state.stage === "done") tail++;
      const { stage } = stageFrame(
        timeline,
        viewOf(match, lineup, { clock: state.minute, fired: state.fired, now }),
      );
      const ball = ballOf(stage);
      if (prev !== null) max = Math.max(max, lengthwise(prev, ball));
      prev = ball;
      if (now > 400_000) throw new Error("the match never reached the final whistle");
    }
    expect(max).toBeLessThan(4);
  });
});
