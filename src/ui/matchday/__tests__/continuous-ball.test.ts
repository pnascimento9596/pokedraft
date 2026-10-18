import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE } from "../clock";
import {
  START,
  beatKey,
  play,
  stageFrame,
  type FrameView,
  type PlayEnv,
  type PlayState,
} from "../player";
import { SHOW, buildTimeline, type Beat, type Point, type Timeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
type GoalBeat = Extract<Beat, { kind: "goal" }>;

// The golden cup8 draft under engine 6: six played matches, 27 goals, extra time and a shootout in
// the quarter-final.
const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
// One 60 Hz frame at 1x.
const STEP = 1000 / 60;
// The broadcast keeps staging for 3 s after the final whistle stops the clock.
const TAIL_FRAMES = 180;

function matchAt(index: number): PlayedMatch {
  const m = cup.matches[index];
  if (m?.status !== "played") throw new Error(`match ${index} was not played`);
  return m;
}

function timelineAt(index: number): Timeline {
  return buildTimeline(matchAt(index), { matchIndex: index, seed: cup.seed, lineup: LINEUP });
}

function viewFor(index: number, at: Pick<FrameView, "clock" | "fired" | "now">): FrameView {
  const match = matchAt(index);
  return {
    ...at,
    kicks: 0,
    motion: true,
    speed: 1,
    userSlots: LINEUP.formation,
    oppSlots: match.opponent.formation ?? "4-3-3",
    oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
  };
}

function goalAt(timeline: Timeline, minute: number): GoalBeat {
  const goal = timeline.beats.find((b): b is GoalBeat => b.kind === "goal" && b.minute === minute);
  if (goal === undefined) throw new Error(`no goal at ${minute}'`);
  return goal;
}

/** Distance in percent of the pitch length: the pitch is drawn 100 long by 64 wide. */
function lengthwise(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
}

/** The largest ball move between two consecutive frames, kickoff to final whistle at live pace. */
function maxBallJump(index: number): number {
  const timeline = timelineAt(index);
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true };
  let now = 0;
  let prev: Point | null = null;
  let max = 0;
  let tail = 0;
  while (tail < TAIL_FRAMES) {
    now += STEP;
    state = play(state, { type: "tick", now, dt: STEP, env });
    // The shootout is its own scene, staged kick by kick.
    if (state.stage === "pens") break;
    if (state.stage === "done") tail++;
    const { stage } = stageFrame(
      timeline,
      viewFor(index, { clock: state.minute, fired: state.fired, now }),
    );
    const ball = { x: stage.ball.x, y: stage.ball.y };
    if (prev !== null) max = Math.max(max, lengthwise(prev, ball));
    prev = ball;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return max;
}

describe("continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before)", () => {
  it("never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup", () => {
    const played = cup.matches.flatMap((m, i) => (m.status === "played" ? [i] : []));
    expect(played).toEqual([0, 1, 2, 3, 4, 5]);
    const jumps = played.map((i) => ({ match: i, over: maxBallJump(i) >= 4 }));
    expect(jumps.filter((j) => j.over)).toEqual([]);
  });

  it("starts a penalty's flight where the ball is, then sets it on the drawn spot at 89 (catches a penalty run from the centre spot)", () => {
    const timeline = timelineAt(3);
    const goal = goalAt(timeline, 84);
    expect(goal.goalKind).toBe("penalty");
    const key = beatKey(goal);
    const ballAt = (fired: Record<string, number>, now: number) => {
      const b = stageFrame(timeline, viewFor(3, { clock: 84, fired, now })).stage.ball;
      return { x: b.x, y: b.y };
    };
    const live = ballAt({}, 10_000);
    expect(live).not.toEqual({ x: 50, y: 50 });
    expect(ballAt({ [key]: 10_000 }, 10_000)).toEqual(live);
    const set = ballAt({ [key]: 10_000 }, 10_000 + 0.35 * SHOW.goal);
    expect(set.x).toBeCloseTo(89, 6);
    expect(set.y).toBeCloseTo(50, 6);
  });

  it("restarts from the centre spot with the conceding side's central midfielder on the ball (catches play that carries on in the box after a goal)", () => {
    const timeline = timelineAt(0);
    goalAt(timeline, 49);
    const restart = timeline.plays[40]!;
    expect(restart).toMatchObject({ from: 50, side: "opp", fromSlot: 5, kickoff: 49 });
    const waiting = stageFrame(timeline, viewFor(0, { clock: 49.5, fired: {}, now: 0 })).stage;
    expect({ x: waiting.ball.x, y: waiting.ball.y }).toEqual({ x: 50, y: 50 });
    expect({ side: waiting.ball.carrier?.side, slot: waiting.ball.carrier?.slot }).toEqual({
      side: "opp",
      slot: 5,
    });
    const kickoff = stageFrame(timeline, viewFor(0, { clock: 50, fired: {}, now: 0 })).stage.ball;
    expect(kickoff.x).toBeCloseTo(50, 6);
    expect(kickoff.y).toBeCloseTo(50, 6);
  });

  it("walks both teams back to kickoff shape over 600 ms after the goal (catches players snapping from the celebration)", () => {
    const timeline = timelineAt(0);
    const key = beatKey(goalAt(timeline, 49));
    const at = (now: number, clock: number) =>
      stageFrame(timeline, viewFor(0, { clock, fired: { [key]: 0 }, now })).stage;
    const midway = at(SHOW.goal + 300, 49.5);
    expect({ x: midway.ball.x, y: midway.ball.y }).toEqual({ x: 74, y: 50 });
    const settled = at(SHOW.goal + 600, 49.9);
    expect({ x: settled.ball.x, y: settled.ball.y }).toEqual({ x: 50, y: 50 });
    const xs = (side: "user" | "opp") =>
      settled.players[side].flatMap((p) => (p === null ? [] : [p.point.x]));
    expect(xs("user").filter((x) => x > 50)).toEqual([]);
    expect(xs("opp").filter((x) => x < 50)).toEqual([]);
  });
});
