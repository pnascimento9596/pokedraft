import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, stopsFor, type Stop } from "../clock";
import {
  START,
  beatKey,
  decisionMinute,
  play,
  revealed,
  type PlayEnv,
  type PlayState,
} from "../player";
import { buildTimeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;
const ROSTER = [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
  kind: "species" as const,
  id: id(n),
}));

const MATCH = {
  status: "played",
  round: "G1",
  opponent: {
    id: "o",
    name: "Opp",
    score: 1,
    lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
    roster: ROSTER,
  },
  regulation: { user: 1, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(6), assist: null },
  ],
  saves: [],
  incidents: [
    { kind: "tactic", side: "user", minute: 60, tactic: "defend", by: "auto" },
    { kind: "yellow", side: "user", minute: 60, slot: 2, player: id(4), secondYellow: false },
  ],
  windows: [],
  absences: [],
  rating: 1,
  recap: [],
} as unknown as PlayedMatch;

const timeline = buildTimeline(MATCH, { matchIndex: 0, seed: "p", lineup: LINEUP });
const HALF: Stop = { key: "halftime", kind: "halftime", minute: 45 };
const live: PlayEnv = { timeline, stops: [HALF], pace: PACE.live };

function run(state: PlayState, env: PlayEnv, ms: number, from = 0): PlayState {
  let now = from;
  for (let t = 0; t < ms; t += 16) {
    now += 16;
    state = play(state, { type: "tick", now, dt: 16, env });
  }
  return state;
}

describe("play (catches a broadcast clock that runs through a manager stop or a goal)", () => {
  it("holds the clock on a live goal for the staging time, then plays on", () => {
    const s = run({ ...START, running: true }, live, 30 * PACE.live.regulation + 32);
    expect(s.minute).toBe(30);
    expect(s.hold?.key).toBe("goal:30:user:Charizard");
    const after = run(s, live, PACE.live.holdGoal + 400, 30 * PACE.live.regulation + 32);
    expect(after.minute).toBeGreaterThan(30);
  });

  it("stops at half-time until the player answers", () => {
    const s = run({ ...START, running: true, held: ["goal:30:user:Charizard"] }, live, 60_000);
    expect(s).toMatchObject({ minute: 45, stop: HALF });
    const resumed = play(s, { type: "answer", key: "halftime" });
    expect(resumed).toMatchObject({ stop: null, running: true, answered: ["halftime"] });
    expect(run(resumed, live, 1000, 60_000).minute).toBeGreaterThan(45);
  });

  it("Kick off starts the clock with no stop at 0' (catches a managed match held at a kickoff stop)", () => {
    const managed: PlayEnv = { ...live, stops: stopsFor(MATCH, LINEUP) };
    const first = play(
      { ...START, running: true },
      { type: "tick", now: 16, dt: 16, env: managed },
    );
    expect(first.stop).toBeNull();
    expect(first.running).toBe(true);
    expect(first.minute).toBeCloseTo(16 / PACE.live.regulation, 9);
  });

  it("does not move while the player has paused", () => {
    expect(run(START, live, 5000).minute).toBe(0);
  });

  it("skips to full time with every stop answered and the match done", () => {
    expect(play({ ...START, running: true }, { type: "skip", env: live })).toMatchObject({
      minute: 90,
      stage: "done",
      answered: ["halftime"],
    });
  });

  it("runs twice as far at 2x", () => {
    const env: PlayEnv = { ...live, timeline: { ...timeline, beats: [] }, stops: [] };
    const one = run({ ...START, running: true }, env, 1000);
    const two = run({ ...START, running: true, speed: 2 }, env, 1000);
    expect(two.minute).toBeCloseTo(one.minute * 2, 6);
  });
});

describe("revealed and decisionMinute (catches a decision that erases a change already on screen)", () => {
  const assistant = timeline.beats.find((b) => b.kind === "tactic")!;
  const card = timeline.beats.find((b) => b.kind === "card")!;

  it("hides the assistant's boundary change while the clock sits on its minute", () => {
    expect(revealed(assistant, 60)).toBe(false);
    expect(revealed(card, 60)).toBe(true);
    expect(revealed(assistant, 60.2)).toBe(true);
  });

  it("records at the stopped minute, or the next one once the assistant's change is showing", () => {
    expect(decisionMinute(timeline, 60)).toBe(60);
    expect(decisionMinute(timeline, 60.4)).toBe(61);
    expect(decisionMinute(timeline, 37.6)).toBe(37);
  });

  it("names beats the same way across replays", () => {
    expect(beatKey(card)).toBe("card:60:user:2:yellow");
  });
});
