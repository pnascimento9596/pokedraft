import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE } from "../clock";
import { START, play, stageFrame, type PlayEnv, type PlayState } from "../player";
import { buildTimeline, type Point } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// The golden cup8 draft under engine 6. Match 0 has a save at 59' that pulls the user's slot 3 up
// to the shot and parries the ball back toward open play near the user's own goal.
const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
// One 60 Hz frame of real time.
const STEP = 1000 / 60;
// The broadcast keeps staging for 3 s after the final whistle stops the clock.
const TAIL_FRAMES = 180;
const PLAYED = [0, 1, 2, 3, 4, 5];
// The broadcast seeds rows 2b, 2c and 2d swept beside the golden one.
const SWEEP = [
  "sweep-0",
  "sweep-1",
  "sweep-2",
  "sweep-3",
  "sweep-4",
  "sweep-5",
  "sweep-6",
  "sweep-7",
  "sweep-8",
  "sweep-9",
  "sweep-10",
  "sweep-11",
  "sweep-12",
  "sweep-13",
  "sweep-14",
  "sweep-15",
  "sweep-16",
  "sweep-17",
  "sweep-18",
  "sweep-19",
];

function matchAt(index: number): PlayedMatch {
  const m = cup.matches[index];
  if (m?.status !== "played") throw new Error(`match ${index} was not played`);
  return m;
}

/** Distance in percent of the pitch length: the pitch is drawn 100 long by 64 wide. */
function lengthwise(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
}

/**
 * The largest move of the ball and of any one player between two 60 Hz frames, kickoff to full
 * time at live pace and `speed`, staged as the broadcast stages it (with the match's windows).
 */
function largestMoves(index: number, seed: string, speed: 1 | 2): { ball: number; player: number } {
  const match = matchAt(index);
  const timeline = buildTimeline(match, { matchIndex: index, seed, lineup: LINEUP });
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true, speed };
  let now = 0;
  let tail = 0;
  let ball = 0;
  let player = 0;
  let lastBall: Point | null = null;
  let last = new Map<string, Point>();
  while (tail < TAIL_FRAMES) {
    now += STEP;
    state = play(state, { type: "tick", now, dt: STEP, env });
    // The shootout is its own scene, staged kick by kick.
    if (state.stage === "pens") break;
    if (state.stage === "done") tail++;
    const { stage } = stageFrame(timeline, {
      clock: state.minute,
      fired: state.fired,
      now,
      kicks: 0,
      motion: true,
      speed,
      userSlots: LINEUP.formation,
      oppSlots: match.opponent.formation ?? "4-3-3",
      oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
      windows: match.windows,
    });
    const b = { x: stage.ball.x, y: stage.ball.y };
    if (lastBall !== null) ball = Math.max(ball, lengthwise(lastBall, b));
    lastBall = b;
    const next = new Map<string, Point>();
    for (const p of [...stage.players.user, ...stage.players.opp, ...(stage.leaving ?? [])]) {
      if (p == null) continue;
      const key = `${p.side}:${p.slot}:${p.species ?? p.name}`;
      const before = last.get(key);
      if (before !== undefined) player = Math.max(player, lengthwise(before, p.point));
      next.set(key, p.point);
    }
    last = next;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return { ball, player };
}

describe("motion bounds (catches the 59' save and duel passes jumping further in one frame than the 4% bound, 4.94% at 1x and 9.85% at 2x before)", () => {
  for (const seed of SWEEP) {
    it(`never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed ${seed} (catches a duel pass riding its sprinting winner, 4.41% before)`, () => {
      const balls = PLAYED.map((i) => largestMoves(i, seed, 1).ball);
      expect(balls.flatMap((ball, i) => (ball >= 4 ? [{ match: i, ball }] : []))).toEqual([]);
      // Play carries the ball over 2.69% in some frame of every swept match, so a run that staged
      // no play cannot pass.
      expect(Math.min(...balls)).toBeGreaterThan(2);
    });
  }

  it("never moves a player 4% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup (catches the 59' save settle, 4.94% before)", () => {
    const players = PLAYED.map((i) => largestMoves(i, cup.seed, 1).player);
    expect(players.flatMap((player, i) => (player >= 4 ? [{ match: i, player }] : []))).toEqual([]);
    expect(Math.min(...players)).toBeGreaterThan(2);
  });

  it("at 2x never moves the ball or a player 8% of the pitch length or more in one 60 Hz frame, in any match of the golden cup (catches the 59' save, ball 8.84% and player 9.85% before)", () => {
    // At 2x the clock and every staging run twice as fast, so 4% of the pitch per 1x frame is 8%
    // per real frame: the same speed on the pitch per match minute.
    const moves = PLAYED.map((i) => largestMoves(i, cup.seed, 2));
    expect(
      moves.flatMap(({ ball, player }, i) =>
        ball >= 8 || player >= 8 ? [{ match: i, ball, player }] : [],
      ),
    ).toEqual([]);
    // Every golden match tops 3% at 1x, so over 4% shows the run really played at twice the speed.
    expect(Math.min(...moves.map((m) => Math.min(m.ball, m.player)))).toBeGreaterThan(4);
  });
});
