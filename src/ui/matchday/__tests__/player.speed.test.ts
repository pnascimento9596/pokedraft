import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, type Stop } from "../clock";
import { START, activeBeat, play, type PlayEnv, type PlayState } from "../player";
import { kickProgress } from "../shootout";
import { buildTimeline, type Kick } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const LINEUP = {
  formation: "4-3-3",
  starters: [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id),
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;

const MATCH = {
  status: "played",
  round: "G1",
  opponent: {
    id: "o",
    name: "Opp",
    score: 1,
    lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
    roster: [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
      kind: "species" as const,
      id: id(n),
    })),
  },
  regulation: { user: 1, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(6), assist: null },
  ],
  saves: [],
  incidents: [],
  windows: [],
  absences: [],
  rating: 1,
  recap: [],
} as unknown as PlayedMatch;

const timeline = buildTimeline(MATCH, { matchIndex: 0, seed: "p", lineup: LINEUP });
const HALF: Stop = { key: "halftime", kind: "halftime", minute: 45 };
const live: PlayEnv = { timeline, stops: [HALF], pace: PACE.live };
const GOAL = "goal:30:user:Charizard";

function run(state: PlayState, env: PlayEnv, ms: number): PlayState {
  let now = 0;
  for (let t = 0; t < ms; t += 16) {
    now += 16;
    state = play(state, { type: "tick", now, dt: 16, env });
  }
  return state;
}

const progress = (st: PlayState, now: number) =>
  activeBeat(timeline, st.fired, now, true, st.minute, st.speed)?.progress;

// The 30' goal fires on the tick at 16,672 ms and holds the clock 2,600 ms, to 19,272.
const held = run({ ...START, running: true }, live, 30 * PACE.live.regulation + 32);

describe("a speed change keeps the staging where it is (catches the 1e carryover: toggling 2x mid-beat jumps the goal, the hold and the penalty)", () => {
  it("beat progress is identical immediately before and after a speed toggle: 0.5 at 1x becomes 0.5 at 2x, and 0.75 at 2x stays 0.75 back at 1x", () => {
    expect(held.fired[GOAL]).toBe(16672);
    expect(progress(held, 17972)).toBe(0.5);

    const fast = play(held, { type: "speed", now: 17972 });
    expect(fast.speed).toBe(2);
    expect(fast.fired[GOAL]).toBe(17322);
    expect(progress(fast, 17972)).toBe(0.5);
    expect(progress(fast, 18297)).toBe(0.75);

    const slow = play(fast, { type: "speed", now: 18297 });
    expect(slow.speed).toBe(1);
    expect(slow.fired[GOAL]).toBe(16347);
    expect(progress(slow, 18297)).toBe(0.75);
  });

  it("the goal's hold keeps its remaining share: 1,300 ms left at 1x is 650 ms at 2x, so the hold ends at 18,622, not 19,272", () => {
    expect(held.hold).toEqual({ key: GOAL, until: 19272 });
    const fast = play(held, { type: "speed", now: 17972 });
    expect(fast.hold).toEqual({ key: GOAL, until: 18622 });
    expect(play(fast, { type: "tick", now: 18621, dt: 16, env: live }).hold).not.toBeNull();
    expect(play(fast, { type: "tick", now: 18622, dt: 16, env: live }).hold).toBeNull();
    const slow = play(fast, { type: "speed", now: 18297 });
    expect(slow.hold).toEqual({ key: GOAL, until: 18947 });
  });

  it("a penalty at 0.4 stays at 0.4: kickAt moves from 1,000 to 1,240 at 2x and the next kick comes at 1,840", () => {
    const kicks = Array.from({ length: 10 }, (_, index) => ({ index }) as unknown as Kick);
    const pens: PlayEnv = { ...live, timeline: { ...timeline, kicks } };
    const kicking: PlayState = { ...START, running: true, stage: "pens", kickAt: 1000 };
    expect(kickProgress(kicking, 1480, PACE.live)).toBeCloseTo(0.4, 9);

    const fast = play(kicking, { type: "speed", now: 1480 });
    expect(fast.kickAt).toBe(1240);
    expect(kickProgress(fast, 1480, PACE.live)).toBeCloseTo(0.4, 9);
    expect(play(fast, { type: "tick", now: 1839, dt: 16, env: pens }).kicks).toBe(0);
    expect(play(fast, { type: "tick", now: 1840, dt: 16, env: pens }).kicks).toBe(1);
  });

  it("a speed change while paused keeps the frozen frame: 0.5 at the pause, and 0.5 again on resume", () => {
    const paused = play(held, { type: "toggle", now: 17972 });
    const fast = play(paused, { type: "speed", now: 20000 });
    expect(progress(fast, 17972)).toBe(0.5);
    expect(fast.hold).toEqual({ key: GOAL, until: 18622 });

    const resumed = play(fast, { type: "toggle", now: 30000 });
    expect(progress(resumed, 30000)).toBe(0.5);
    expect(resumed.hold).toEqual({ key: GOAL, until: 30650 });
  });
});
