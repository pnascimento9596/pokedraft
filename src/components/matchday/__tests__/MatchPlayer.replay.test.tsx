// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
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
    startCrowdBed: () => {},
    stopCrowdBed: () => {},
    setCrowdLevel: () => {},
    crowdRoar: () => sound.calls.push("roar"),
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

const ONE_GOAL: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 1, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(9), assist: null },
  ],
  saves: [],
  incidents: [],
  windows: WINDOWS,
  absences: [],
  rating: 500,
  recap: [],
};

let reduced = false;

let buzzes: unknown[] = [];

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  sound.calls.length = 0;
  buzzes = [];
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: (pattern: unknown) => {
      buzzes.push(pattern);
      return true;
    },
  });
  reduced = false;
  localStorage.clear();
  setSoundEnabled(true);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  delete (navigator as { vibrate?: unknown }).vibrate;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));

async function mount() {
  render(
    <MatchPlayer
      match={ONE_GOAL}
      matchIndex={0}
      seed="replay-test"
      lineup={LINEUP}
      view="live"
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

async function frameUntil(done: () => boolean, max = 8_000) {
  for (let i = 0; i < max && !done(); i++) {
    await act(async () => {
      vi.advanceTimersByTime(16);
    });
  }
}

describe("instant replay on the pitch (catches a replay with no REPLAY bug, or one that cannot be skipped)", () => {
  it("after the 30' goal the pitch shows the REPLAY bug, and Skip replay returns to the live clock", async () => {
    await mount();
    await frameUntil(() => screen.queryByTestId("instant-replay") !== null);
    const bug = screen.getByTestId("instant-replay");
    expect(bug.textContent).toContain("REPLAY");
    expect(minute()).toBe(30);
    expect(screen.getByTestId("matchday-score").textContent).toBe("1-0");
    fireEvent.click(screen.getByRole("button", { name: "Skip replay" }));
    await frameUntil(() => minute() > 30, 200);
    expect(screen.queryByTestId("instant-replay")).toBeNull();
    expect(minute()).toBe(31);
  });

  it("the instant replay neither sounds nor buzzes the 30' goal again: one horn and one [120] buzz through the replay to 31'", async () => {
    await mount();
    await frameUntil(() => screen.queryByTestId("instant-replay") !== null);
    await frameUntil(() => screen.queryByTestId("instant-replay") === null);
    await frameUntil(() => minute() > 30, 200);
    expect(minute()).toBe(31);
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
    expect(buzzes).toEqual([[120]]);
  });

  it("with reduced motion the goal gets no instant replay", async () => {
    reduced = true;
    await mount();
    await frameUntil(() => minute() >= 32 || screen.queryByTestId("instant-replay") !== null);
    expect(screen.queryByTestId("instant-replay")).toBeNull();
    expect(minute()).toBe(32);
  });
});
