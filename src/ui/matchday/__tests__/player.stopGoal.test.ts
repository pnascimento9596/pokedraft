import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, type Stop } from "../clock";
import {
  START,
  beatKey,
  frameNow,
  play,
  shotOnPitch,
  type PlayEnv,
  type PlayState,
} from "../player";
import { GOAL_LANDS, SHOW, buildTimeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const LINEUP = {
  formation: "4-3-3",
  starters: [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id),
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;

// A user goal on the half-time whistle's minute, the shape of seed stopgoal-1's match 0 (45').
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
    { side: "user", minute: 45, penalty: false, kind: "open-play", scorer: id(6), assist: null },
  ],
  saves: [],
  incidents: [],
  windows: [],
  absences: [],
  rating: 1,
  recap: [],
} as unknown as PlayedMatch;

const timeline = buildTimeline(MATCH, { matchIndex: 0, seed: "p", lineup: LINEUP });
const HALFTIME: Stop = { key: "halftime", kind: "halftime", minute: 45 };
const GOAL = "goal:45:user:Charizard";

/**
 * Plays the match the way MatchPlayer's frame loop does: a tick every 100 ms, no ticks while a
 * stop is open, and the stop answered 5 s after it opens. Returns what the screen shows, in order:
 * the goal coming on, its ball crossing the line, the instant replay and the stop.
 */
function watch(replays: boolean): string[] {
  const env: PlayEnv = { timeline, stops: [HALFTIME], pace: PACE.live, replays };
  let state: PlayState = { ...START, running: true };
  let now = 0;
  let staged = false;
  let landed = false;
  let replaying = false;
  const seen: string[] = [];
  while (state.stage === "play" && state.minute < 60) {
    if (state.stop !== null) {
      seen.push(`stop ${state.stop.key}`);
      now += 5_000;
      state = play(state, { type: "answer", key: state.stop.key });
      seen.push("answered");
      continue;
    }
    now += 100;
    state = play(state, { type: "tick", now, dt: 100, env });
    const shot = shotOnPitch(timeline, state.fired, frameNow(state, now), 1, state.minute);
    if (shot !== null && beatKey(shot.beat) === GOAL) {
      if (!staged) seen.push(`goal from ${shot.age} ms`);
      if (!landed && shot.age >= GOAL_LANDS * SHOW.goal) seen.push("goal lands");
      staged = true;
      landed = shot.age >= GOAL_LANDS * SHOW.goal;
    }
    if ((state.replay !== null) !== replaying) seen.push(replaying ? "replay ends" : "replay");
    replaying = state.replay !== null;
  }
  return seen;
}

describe("goal on a stop minute plays once (catches the 45' goal frozen under the half-time stop, then shown only as a replay after it)", () => {
  it("with instant replays, the 45' goal plays live and lands, then replays, before the half-time stop opens, and nothing replays after the answer", () => {
    expect(watch(true)).toEqual([
      "goal from 0 ms",
      "goal lands",
      "replay",
      "replay ends",
      "stop halftime",
      "answered",
    ]);
  });

  it("without instant replays, the 45' goal plays live and lands before the half-time stop opens", () => {
    expect(watch(false)).toEqual(["goal from 0 ms", "goal lands", "stop halftime", "answered"]);
  });
});
