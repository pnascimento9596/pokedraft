import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE, stopsFor, type Stop } from "../clock";
import {
  START,
  beatKey,
  decisionMinute,
  frameNow,
  play,
  revealed,
  type PlayEnv,
  type PlayState,
} from "../player";
import { kickProgress } from "../shootout";
import { buildTimeline, type Kick } from "../timeline";

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

describe("the touchline sheet holds the clock apart from the player's own pause", () => {
  // 5,600 ms of live play is 5,600 * 45 / 25,000 = 10.08 minutes.
  const atTen = () => run({ ...START, running: true }, live, 5600);

  it("opening the sheet freezes the clock (catches a sheet that lets the match run while the manager decides): 10.08' before and 2 s after", () => {
    const before = atTen();
    expect(before.minute).toBeCloseTo(10.08, 9);
    const open = play(before, { type: "sheet", open: true, now: 5600 });
    const after = run(open, live, 2000, 5600);
    expect(after.minute).toBeCloseTo(10.08, 9);
    expect(after.running).toBe(true);
  });

  it("closing the sheet once the sub is confirmed resumes the clock (catches a sheet that leaves the match stopped): 13.68' 2 s later", () => {
    const open = play(atTen(), { type: "sheet", open: true, now: 5600 });
    const closed = play(run(open, live, 2000, 5600), { type: "sheet", open: false, now: 7600 });
    expect(closed.uiHold).toBe(false);
    expect(run(closed, live, 2000, 7600).minute).toBeCloseTo(13.68, 9);
  });

  it("a player who paused stays paused after the sheet closes (catches a sheet that reuses the play toggle)", () => {
    const paused = play(atTen(), { type: "toggle", now: 5600 });
    const open = play(paused, { type: "sheet", open: true, now: 6000 });
    const closed = play(open, { type: "sheet", open: false, now: 7000 });
    expect(closed.running).toBe(false);
    expect(run(closed, live, 2000, 7000).minute).toBeCloseTo(10.08, 9);
  });
});

describe("a pause stops the broadcast where it is (catches the 2e carryover: a paused kick plays out and the next starts on resume)", () => {
  const kicks = Array.from({ length: 10 }, (_, index) => ({ index }) as unknown as Kick);
  const pens: PlayEnv = { ...live, timeline: { ...timeline, kicks } };
  const kicking: PlayState = { ...START, running: true, stage: "pens", kickAt: 1000 };

  it("pause at kick progress 0.4 resumes at 0.4: kickAt moves from 1000 to 11000 after a 10 s pause", () => {
    const paused = play(kicking, { type: "toggle", now: 1480 });
    const resumed = play(paused, { type: "toggle", now: 11480 });
    expect(resumed.kickAt).toBe(11000);
    expect(kickProgress(resumed, 11480, PACE.live)).toBeCloseTo(0.4, 9);
    expect(play(resumed, { type: "tick", now: 11496, dt: 16, env: pens }).kicks).toBe(0);
    expect(play(resumed, { type: "tick", now: 12200, dt: 16, env: pens }).kicks).toBe(1);
  });

  it("while paused the broadcast's frame stays at the pause: kick progress 0.4 at 1480, and still 0.4 at 5000", () => {
    const paused = play(kicking, { type: "toggle", now: 1480 });
    expect(frameNow(paused, 5000)).toBe(1480);
    expect(kickProgress(paused, frameNow(paused, 5000), PACE.live)).toBeCloseTo(0.4, 9);
    expect(frameNow(kicking, 5000)).toBe(5000);
  });

  it("the sheet pauses a kick the same way: open at 1480, close at 4480, kickAt 4000", () => {
    const open = play(kicking, { type: "sheet", open: true, now: 1480 });
    expect(frameNow(open, 3000)).toBe(1480);
    expect(play(open, { type: "sheet", open: false, now: 4480 }).kickAt).toBe(4000);
  });

  it("a goal's hold and its staging resume where the pause left them: hold until 19272 becomes 29272", () => {
    // The 30' goal fires on the tick at 16,672 ms (the first 16 ms tick past 30 * 25,000 / 45) and
    // holds the clock 2,600 ms.
    const held = run({ ...START, running: true }, live, 30 * PACE.live.regulation + 32);
    expect(held.hold).toEqual({ key: "goal:30:user:Charizard", until: 19272 });
    expect(held.fired["goal:30:user:Charizard"]).toBe(16672);
    const paused = play(held, { type: "toggle", now: 17000 });
    const resumed = play(paused, { type: "toggle", now: 27000 });
    expect(resumed.hold).toEqual({ key: "goal:30:user:Charizard", until: 29272 });
    expect(resumed.fired["goal:30:user:Charizard"]).toBe(26672);
    expect(resumed.pausedAt).toBeNull();
  });
});
