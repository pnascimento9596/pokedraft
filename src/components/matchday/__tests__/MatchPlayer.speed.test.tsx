// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { MatchPlayer } from "../MatchPlayer";

const sound = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return {
    ...real,
    playGoalHorn: () => sound.calls.push("horn"),
    playOppGoal: () => sound.calls.push("opp-goal"),
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
    { side: "user", minute: 12, penalty: false, kind: "open-play", scorer: id(6), assist: null },
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
const score = () => screen.getByTestId("matchday-score").textContent;
const staging = () => screen.queryByTestId("move-callout") !== null;

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
}

/** Mounts a live match at 2x and runs to the frame the 12' goal fires on. */
async function toGoalAt2x() {
  render(
    <MatchPlayer
      match={ONE_GOAL}
      matchIndex={0}
      seed="speed-test"
      lineup={LINEUP}
      view="live"
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  fireEvent.click(screen.getByTestId("speed-toggle"));
  expect(screen.getByTestId("speed-toggle").getAttribute("aria-pressed")).toBe("true");
  for (let i = 0; i < 2_000 && minute() < 12; i++) await frames(1);
  expect(minute()).toBe(12);
}

describe("speed-aware staging (catches a 2x goal staging that outlives its hold and a score that lands after the ball)", () => {
  it("at 2x the goal beat ends when its hold ends", async () => {
    await toGoalAt2x();
    // 80 frames is 1280 ms of the 1300 ms hold at 2x: the goal is still on the pitch.
    await frames(80);
    expect(staging()).toBe(true);

    // 2 more frames is 1312 ms: the hold is over, and the goal staging is gone with it.
    await frames(2);
    expect(staging()).toBe(false);
  });

  it("at 2x the score lands with the ball: 0-0 at progress 0.49, 1-0 at 0.62", async () => {
    await toGoalAt2x();
    // 40 frames is 640 ms of the 1300 ms staging at 2x: progress 0.49, the ball still in flight.
    await frames(40);
    expect(score()).toBe("0 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual([]);

    // 10 more frames is 800 ms: progress 0.62, past GOAL_LANDS (0.6).
    await frames(10);
    expect(score()).toBe("1 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });
});
