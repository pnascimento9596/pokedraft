// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
import { setSoundEnabled } from "@/components/wheel/sound";
import { MatchPlayer } from "../MatchPlayer";

const sound = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return {
    ...real,
    playAbilitySound: (effect: string) => sound.calls.push(`ability:${effect}`),
    playKickPass: () => sound.calls.push("kick"),
    playGoalHorn: () => sound.calls.push("horn"),
    playOppGoal: () => sound.calls.push("opp-goal"),
    playSaveSound: () => sound.calls.push("save"),
    playWhistle: (kind: string) => sound.calls.push(`whistle:${kind}`),
    startCrowdBed: () => sound.calls.push("bed:start"),
    stopCrowdBed: () => sound.calls.push("bed:stop"),
    setCrowdLevel: () => sound.calls.push("bed:level"),
    crowdRoar: (r: { attackMs: number; holdMs: number; releaseMs: number }) =>
      sound.calls.push(`roar:${r.attackMs + r.holdMs + r.releaseMs}`),
  };
});

const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;
const OPPONENT = {
  id: "o",
  name: "Opp",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
    kind: "species" as const,
    id: id(n),
  })),
} as unknown as Opponent;

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

const WINDOWS = Array.from({ length: 18 }, (_, w) => ({
  minute: (w + 1) * 5,
  score: { user: 0, opp: 0 },
  tactic: { user: "balanced" as const, opp: "balanced" as const },
  energy: XI.map(() => 90),
  onPitch: XI,
}));

const LATE_GOAL: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 1, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(6), assist: null },
  ],
  saves: [],
  incidents: [],
  windows: WINDOWS,
  absences: [],
  rating: 500,
  recap: [],
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  sound.calls.length = 0;
  localStorage.clear();
  setSoundEnabled(true);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const FRAME = 16;
const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));

async function playTo(view: MatchView, target: number, seed = "quick-test"): Promise<void> {
  render(
    <MatchPlayer
      match={LATE_GOAL}
      matchIndex={0}
      seed={seed}
      lineup={LINEUP}
      view={view}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  for (let i = 0; i < 8_000 && minute() < target; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
  expect(minute()).toBe(target);
}

const count = (call: string) => sound.calls.filter((c) => c === call).length;

// Seed "audio-26": phases 0 to 16 have six kick-eligible passes (no callout, not a dribble), at
// phases 0, 5, 6, 8, 12 and 16. Phases 5 and 6 back to back is the thud-every-phase bug.
describe("kick pass (catches a kick thud on back-to-back phases: 6 thuds where 5 are allowed)", () => {
  it("over phases 0 to 16 the thud sounds 5 times: 0, 5, 8, 12, 16, never twice within three phases", async () => {
    await playTo("live", 20, "audio-26");
    expect(count("kick")).toBe(5);
  });
});

describe("crowd bed (catches a broadcast with no crowd, or one that leaks or plays when it should be silent)", () => {
  it("Live with sound on starts one crowd bed and moves its level with the ball", async () => {
    await playTo("live", 20);
    expect(count("bed:start")).toBe(1);
    expect(count("bed:stop")).toBe(0);
    expect(count("bed:level")).toBeGreaterThan(0);
  });

  it("is silent in Quick: no bed, no level, no kick thud", async () => {
    await playTo("quick", 20);
    expect(count("bed:start")).toBe(0);
    expect(count("bed:level")).toBe(0);
    expect(count("kick")).toBe(0);
  });

  it("is silent with sound off", async () => {
    setSoundEnabled(false);
    await playTo("live", 20);
    expect(count("bed:start")).toBe(0);
  });

  it("stops on pause and starts again on resume", async () => {
    await playTo("live", 5);
    fireEvent.click(screen.getByTestId("play-toggle"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(sound.calls.filter((c) => c.startsWith("bed:s"))).toEqual(["bed:start", "bed:stop"]);
    fireEvent.click(screen.getByTestId("play-toggle"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(sound.calls.filter((c) => c.startsWith("bed:s"))).toEqual([
      "bed:start",
      "bed:stop",
      "bed:start",
    ]);
  });

  it("stops at full time", async () => {
    await playTo("live", 5);
    fireEvent.click(screen.getByTestId("skip-ft"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(screen.getByTestId("match-player").getAttribute("data-stage")).toBe("done");
    expect(sound.calls.filter((c) => c.startsWith("bed:s"))).toEqual(["bed:start", "bed:stop"]);
  });

  it("stops when the player unmounts", async () => {
    await playTo("live", 5);
    cleanup();
    expect(sound.calls.filter((c) => c.startsWith("bed:s"))).toEqual(["bed:start", "bed:stop"]);
  });

  it("roars once for the 30' goal, a normal 2250 ms roar", async () => {
    await playTo("live", 33);
    expect(sound.calls.filter((c) => c.startsWith("roar:"))).toEqual(["roar:2250"]);
  });
});
