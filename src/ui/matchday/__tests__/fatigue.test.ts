import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult, WindowSnapshot } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE } from "../clock";
import { START, play, stageFrame, type FrameView, type PlayEnv, type PlayState } from "../player";
import { buildTimeline, type PitchStage, type Point, type Timeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// The golden cup8 draft under engine 6. Match 0: the assistant takes Togepi (175) off for Kommo-o
// (784) in slot 7 at 60'. Its real windows never fall below 65, so the slowdown guards pass
// windows with the same lineups and chosen energies.
const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
const STEP = 1000 / 60;
const TAIL_FRAMES = 180;

function matchAt(index: number): PlayedMatch {
  const m = cup.matches[index];
  if (m?.status !== "played") throw new Error(`match ${index} was not played`);
  return m;
}

function timelineAt(index: number): Timeline {
  return buildTimeline(matchAt(index), { matchIndex: index, seed: cup.seed, lineup: LINEUP });
}

/** The match's own windows, with every recorded energy replaced by `energy(slot)`. */
function windowsWith(index: number, energy: (slot: number) => number): WindowSnapshot[] {
  return (matchAt(index).windows ?? []).map((w) => ({
    ...w,
    energy: w.energy.map((e, slot) => (e === null ? null : energy(slot))),
  }));
}

function viewFor(
  index: number,
  at: Pick<FrameView, "clock" | "fired" | "now"> & Partial<FrameView>,
): FrameView {
  const match = matchAt(index);
  return {
    kicks: 0,
    motion: true,
    speed: 1,
    userSlots: LINEUP.formation,
    oppSlots: match.opponent.formation ?? "4-3-3",
    oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
    ...at,
  };
}

function stageAt(
  index: number,
  clock: number,
  extra: Partial<FrameView> = {},
  timeline = timelineAt(index),
): PitchStage {
  return stageFrame(timeline, viewFor(index, { clock, fired: {}, now: 0, ...extra })).stage;
}

function round(p: Point | undefined): { x: number; y: number } | undefined {
  return p && { x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)) };
}

function lengthwise(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
}

/** The largest one-frame move of the ball and of any player, kickoff to full time at 1x. */
function maxSteps(
  index: number,
  windows: readonly WindowSnapshot[],
): { ball: number; player: number } {
  const timeline = timelineAt(index);
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true };
  let now = 0;
  let tail = 0;
  let ball = 0;
  let player = 0;
  let prevBall: Point | null = null;
  let prev = new Map<string, Point>();
  while (tail < TAIL_FRAMES) {
    now += STEP;
    state = play(state, { type: "tick", now, dt: STEP, env });
    if (state.stage === "pens") break;
    if (state.stage === "done") tail++;
    const { stage } = stageFrame(
      timeline,
      viewFor(index, { clock: state.minute, fired: state.fired, now, windows }),
    );
    if (prevBall !== null) ball = Math.max(ball, lengthwise(prevBall, stage.ball));
    prevBall = { x: stage.ball.x, y: stage.ball.y };
    const next = new Map<string, Point>();
    for (const p of [...stage.players.user, ...stage.players.opp, ...(stage.leaving ?? [])]) {
      if (p == null) continue;
      const key = `${p.side}:${p.slot}:${p.species ?? p.name}`;
      const before = prev.get(key);
      if (before !== undefined) player = Math.max(player, lengthwise(before, p.point));
      next.set(key, p.point);
    }
    prev = next;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return { ball, player };
}

describe("fatigue on the pitch (catches tired players moving like fresh ones, and energy read from the wrong player)", () => {
  it("moves a slot at energy 60 0.85 of the way a slot at energy 90 goes over the same phase (catches no slowdown below 65)", () => {
    // Phase 4 runs 5' to 6.25'. User slot 6 starts it at (28.94, 58.21) and a rested player ends
    // it at (36.48, 65.40); 0.85 of that step ends at (35.35, 64.32).
    const timeline = timelineAt(0);
    const start = stageAt(0, 5, { windows: windowsWith(0, (s) => (s === 6 ? 60 : 90)) }, timeline);
    const fresh = stageAt(0, 6.25, { windows: windowsWith(0, () => 90) }, timeline);
    const tired = stageAt(
      0,
      6.25,
      { windows: windowsWith(0, (s) => (s === 6 ? 60 : 90)) },
      timeline,
    );
    expect(round(start.players.user[6]?.point)).toEqual({ x: 28.94, y: 58.21 });
    expect(round(fresh.players.user[6]?.point)).toEqual({ x: 36.48, y: 65.4 });
    expect(round(tired.players.user[6]?.point)).toEqual({ x: 35.35, y: 64.32 });
    expect(tired.players.user[6]?.energy).toBe(60);
    expect(fresh.players.user[6]?.energy).toBe(90);
  });

  it("stages a slot with no recorded energy at full pace and with no energy (catches made-up energy)", () => {
    const timeline = timelineAt(0);
    const none = stageAt(0, 6.25, {}, timeline);
    expect(round(none.players.user[6]?.point)).toEqual({ x: 36.48, y: 65.4 });
    expect(none.players.user.map((p) => p?.energy)).toEqual(new Array(11).fill(null));
    // Before the first window closes at 5' nobody has a recorded energy yet.
    const early = stageAt(0, 4, { windows: windowsWith(0, () => 40) }, timeline);
    expect(early.players.user.map((p) => p?.energy)).toEqual(new Array(11).fill(null));
    expect(
      stageAt(0, 30, { windows: windowsWith(0, () => 40) }).players.opp.map((p) => p?.energy),
    ).toEqual(new Array(11).fill(null));
  });

  it("reads slot 7's energy from the player standing in it after the 60' substitution (catches Togepi's energy pinned on Kommo-o)", () => {
    const windows = matchAt(0).windows;
    const timeline = timelineAt(0);
    const at = (clock: number) => stageAt(0, clock, { windows }, timeline).players.user[7];
    expect(at(59)?.species).toBe(175);
    expect(at(59)?.energy).toBe(81);
    // The 60' window recorded Togepi; Kommo-o has no window of their own until 65'.
    expect(at(61)?.species).toBe(784);
    expect(at(61)?.energy).toBe(null);
    expect(at(65)?.energy).toBe(99);
  });

  it("keeps Quick and reduced motion still: a tired slot stands on its formation spot (catches the slowdown moving a still pitch)", () => {
    const timeline = timelineAt(0);
    const still = stageAt(0, 70, { motion: false }, timeline);
    const tired = stageAt(0, 70, { motion: false, windows: windowsWith(0, () => 50) }, timeline);
    expect(tired.players.user.map((p) => round(p?.point))).toEqual(
      still.players.user.map((p) => round(p?.point)),
    );
    expect(tired.players.user[6]?.energy).toBe(50);
  });

  it("keeps the ball under 4% of the pitch length per 60 Hz frame with every slot tired from 5' (catches the slowdown making the ball jump)", () => {
    for (const index of [0, 1, 2, 3, 4, 5]) {
      const { ball, player } = maxSteps(
        index,
        windowsWith(index, () => 50),
      );
      expect(ball, `match ${index} ball`).toBeLessThan(4);
      // The worst player step is the 300 ms save settle at 59.27' of match 0 that row 2c measured
      // at 4.94 fresh; tired it reads 5.19. A seam in the tired path would read far more.
      expect(player, `match ${index} player`).toBeLessThan(5.5);
    }
  });
});
