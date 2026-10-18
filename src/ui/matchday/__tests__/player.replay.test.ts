import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, SpeciesId } from "@/engine/types";
import { PACE } from "../clock";
import { START, play, replayProgress, staged, type PlayEnv, type PlayState } from "../player";
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
  regulation: { user: 1, opp: 1 },
  extraTime: null,
  shootout: null,
  outcome: "D",
  goals: [
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(6), assist: null },
    {
      side: "opp",
      minute: 60,
      penalty: false,
      kind: "open-play",
      scorer: { kind: "species", id: id(150) },
      assist: null,
    },
  ],
  saves: [],
  incidents: [],
  windows: [],
  absences: [],
  rating: 1,
  recap: [],
} as unknown as PlayedMatch;

const timeline = buildTimeline(MATCH, { matchIndex: 0, seed: "p", lineup: LINEUP });
const replays: PlayEnv = { timeline, stops: [], pace: PACE.live, replays: true };
const still: PlayEnv = { ...replays, replays: false };
const GOAL = "goal:30:user:Charizard";

// Ticks every 16 ms until `until` (real ms) or until `stop` holds.
function runTo(
  state: PlayState,
  env: PlayEnv,
  from: number,
  until: number,
  stop: (s: PlayState) => boolean = () => false,
): { state: PlayState; now: number } {
  let now = from;
  while (now < until && !stop(state)) {
    now += 16;
    state = play(state, { type: "tick", now, dt: 16, env });
  }
  return { state, now };
}

const toReplay = () =>
  runTo({ ...START, running: true }, replays, 0, 60_000, (s) => s.replay !== null);

describe("instant replay of a user goal at 0.5x (catches a replay that never ends or moves the live clock)", () => {
  it("starts when the 30' goal's hold ends and stages the goal at 0.5x from 0", () => {
    const { state, now } = toReplay();
    expect(state.replay).toEqual({ key: GOAL, minute: 30, at: now });
    expect(state.minute).toBe(30);
    expect(replayProgress(state.replay!, now)).toBe(0);
    expect(replayProgress(state.replay!, now + 2_600)).toBe(0.5);
    const frame = staged(state, now + 2_600);
    expect(frame).toMatchObject({ clock: 30, now: now + 2_600, speed: 0.5 });
    expect(frame.fired[GOAL]).toBe(now);
  });

  it("instant replay ends at progress 1 and returns to the live clock: 30' throughout the 5.2 s replay, then the clock runs on", () => {
    const start = toReplay();
    const during = runTo(start.state, replays, start.now, start.now + 5_184);
    expect(during.state.replay).not.toBeNull();
    expect(during.state.minute).toBe(30);
    expect(replayProgress(during.state.replay!, during.now)).toBeLessThan(1);
    const end = runTo(during.state, replays, during.now, during.now + 16);
    expect(replayProgress(start.state.replay!, end.now)).toBe(1);
    expect(end.state).toMatchObject({ replay: null, pausedAt: null, minute: 30 });
    const after = runTo(end.state, replays, end.now, end.now + 1_000);
    expect(after.state.minute).toBeGreaterThan(30);
    expect(after.state.replay).toBeNull();
  });

  it("Skip replay ends it at once and the clock runs on", () => {
    const { state, now } = toReplay();
    const skipped = play(state, { type: "endReplay", now: now + 500 });
    expect(skipped).toMatchObject({ replay: null, pausedAt: null });
    expect(runTo(skipped, replays, now + 500, now + 1_500).state.minute).toBeGreaterThan(30);
  });

  it("is off with motion off or in Quick, and never runs for the opponent's 60' goal", () => {
    const plain = runTo(
      { ...START, running: true },
      still,
      0,
      60_000,
      (s) => s.minute >= 61 || s.replay !== null,
    );
    expect(plain.state.replay).toBeNull();
    expect(plain.state.minute).toBeGreaterThanOrEqual(61);
    const past = runTo(
      { ...START, running: true, minute: 31, held: [GOAL] },
      replays,
      0,
      60_000,
      (s) => s.minute >= 61 || s.replay !== null,
    );
    expect(past.state.replay).toBeNull();
    expect(past.state.minute).toBeGreaterThanOrEqual(61);
  });
});
