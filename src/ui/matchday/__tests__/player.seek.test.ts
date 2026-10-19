import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, type Stop } from "../clock";
import { START, activeBeat, landed, play, type PlayEnv, type PlayState } from "../player";
import { buildTimeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
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
const replayEnv: PlayEnv = { timeline, stops: [], pace: PACE.live };
const HALF: Stop = { key: "halftime", kind: "halftime", minute: 45 };
const managed: PlayEnv = { ...replayEnv, stops: [HALF] };
const GOAL = timeline.beats.find((b) => b.kind === "goal")!;

function run(state: PlayState, env: PlayEnv, ms: number, from: number): PlayState {
  let now = from;
  for (let t = 0; t < ms; t += 16) {
    now += 16;
    state = play(state, { type: "tick", now, dt: 16, env });
  }
  return state;
}

describe("seek (catches a seek that replays old beats, leaves later ones fired, or answers a stop)", () => {
  it("from full time to 29', the 30' goal's pip: the clock runs from 29' with only the kickoff fired, an hour back", () => {
    const done = play({ ...START, running: true }, { type: "skip", env: replayEnv });
    const sought = play(done, { type: "seek", minute: 29, now: 100_000, env: replayEnv });
    expect(sought).toMatchObject({
      minute: 29,
      stage: "play",
      running: true,
      stop: null,
      hold: null,
      kicks: 0,
    });
    expect(sought.fired).toEqual({ "whistle:0": -3_500_000 });
    const after = run(sought, replayEnv, 600, 100_000);
    expect(after.minute).toBe(30);
    expect(after.hold?.key).toBe("goal:30:user:Charizard");
    expect(after.fired["goal:30:user:Charizard"]).toBeGreaterThan(100_000);
  });

  it("forward from kickoff to 59': the 30' goal and the half-time whistle are fired an hour back, so the goal has landed and nothing stages", () => {
    const sought = play(
      { ...START, running: true },
      { type: "seek", minute: 59, now: 100_000, env: replayEnv },
    );
    expect(sought.minute).toBe(59);
    expect(sought.fired).toEqual({
      "whistle:0": -3_500_000,
      "goal:30:user:Charizard": -3_500_000,
      "whistle:45": -3_500_000,
    });
    expect(landed(GOAL, sought.fired, 100_000, true, 1)).toBe(true);
    expect(activeBeat(timeline, sought.fired, 100_000, true, 59, 1)).toBeNull();
    expect(run(sought, replayEnv, 600, 100_000).hold).toBeNull();
  });

  it("is refused past a manager stop nobody answered, and allowed short of it", () => {
    const at10: PlayState = { ...START, running: true, minute: 10 };
    expect(play(at10, { type: "seek", minute: 59, now: 5_000, env: managed })).toBe(at10);
    expect(play(at10, { type: "seek", minute: 40, now: 5_000, env: managed }).minute).toBe(40);
    const answered = { ...at10, answered: ["halftime"] };
    expect(play(answered, { type: "seek", minute: 59, now: 5_000, env: managed }).minute).toBe(59);
  });

  it("clamps the target to the match: -5 seeks to 0' and 500 to 90'", () => {
    const at10: PlayState = { ...START, running: true, minute: 10 };
    expect(play(at10, { type: "seek", minute: -5, now: 0, env: replayEnv }).minute).toBe(0);
    expect(play(at10, { type: "seek", minute: 500, now: 0, env: replayEnv }).minute).toBe(90);
  });
});
