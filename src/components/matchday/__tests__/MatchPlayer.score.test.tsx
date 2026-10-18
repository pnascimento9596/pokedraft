// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
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

const TWO_GOALS: PlayedMatch = {
  ...ONE_GOAL,
  regulation: { user: 1, opp: 1 },
  outcome: "D",
  goals: [
    ...ONE_GOAL.goals,
    {
      side: "opp",
      minute: 13,
      penalty: false,
      kind: "open-play",
      scorer: { kind: "species", id: id(150) },
      assist: null,
    },
  ],
};

let reduced = false;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  sound.calls.length = 0;
  reduced = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query === "(prefers-reduced-motion: reduce)",
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
const ticker = () => screen.getByTestId("ticker").textContent;

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
}

async function mount(match: PlayedMatch, view: MatchView) {
  render(
    <MatchPlayer
      match={match}
      matchIndex={0}
      seed="score-test"
      lineup={LINEUP}
      view={view}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

/** Runs frame by frame until the clock reaches the goal minute, the frame the goal fires on. */
async function toGoalMinute(goal: number) {
  for (let i = 0; i < 2_000 && minute() < goal; i++) await frames(1);
  expect(minute()).toBe(goal);
}

describe("MatchPlayer score (catches a scoreboard, ticker and goal horn that call a goal about 1.5 s before the ball goes in)", () => {
  it("score reads 0-0 while progress is 0.5; 1-0 at 0.6", async () => {
    await mount(ONE_GOAL, "live");
    await toGoalMinute(12);

    // 81 frames is 1296 ms of the 2600 ms goal staging: progress 0.498, the ball still in flight.
    await frames(81);
    expect(score()).toBe("0 - 0");
    expect(ticker()).not.toContain("Goal for");
    expect(sound.calls.filter((c) => c === "horn")).toEqual([]);

    // 17 more frames is 1568 ms: progress 0.603, the ball has crossed the line.
    await frames(17);
    expect(score()).toBe("1 - 0");
    expect(ticker()).toContain("12' Goal for Your XI! Charizard");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });

  it("counts the goal at once under reduced motion, where nothing is staged", async () => {
    reduced = true;
    await mount(ONE_GOAL, "live");
    await toGoalMinute(12);
    expect(score()).toBe("1 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });

  it("counts the goal at once in Quick view", async () => {
    await mount(ONE_GOAL, "quick");
    await toGoalMinute(12);
    expect(score()).toBe("1 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });

  it("puts the score in a status region", async () => {
    await mount(ONE_GOAL, "live");
    expect(screen.getByRole("status").textContent).toBe("0 - 0");
  });
});

describe("MatchPlayer pause (catches a goal that plays out and is counted while the match is paused)", () => {
  const toggle = () => fireEvent.click(screen.getByTestId("play-toggle"));

  it("paused at goal progress 0.498 the score stays 0-0 for 5 s; 17 frames after Resume it reads 1-0", async () => {
    await mount(ONE_GOAL, "live");
    await toGoalMinute(12);
    await frames(81);
    toggle();
    await frames(313);
    expect(score()).toBe("0 - 0");
    expect(ticker()).not.toContain("Goal for");
    expect(sound.calls.filter((c) => c === "horn")).toEqual([]);
    toggle();
    await frames(16);
    expect(score()).toBe("0 - 0");
    await frames(1);
    expect(score()).toBe("1 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });

  it("a goal that has landed stays on the scoreboard through a pause and the Resume tap", async () => {
    await mount(ONE_GOAL, "live");
    await toGoalMinute(12);
    await frames(200);
    expect(score()).toBe("1 - 0");
    toggle();
    await frames(200);
    toggle();
    expect(score()).toBe("1 - 0");
    await frames(1);
    expect(score()).toBe("1 - 0");
  });
});

describe("MatchPlayer live region (catches a screen reader flooded several times a second in Quick view)", () => {
  it("announces whole event lines at most once every 1.5 s", async () => {
    await mount(TWO_GOALS, "quick");
    const said: { at: number; text: string }[] = [];
    const live = () => screen.getByTestId("ticker-latest").textContent ?? "";
    for (let i = 0; i < 500; i++) {
      const text = live();
      if (text !== "" && text !== said.at(-1)?.text) said.push({ at: i * FRAME, text });
      await frames(1);
    }
    expect(said.map((s) => s.text)).toEqual([
      "Kick off",
      "12' Goal for Your XI! Charizard 13' Goal for Opp! Mewtwo",
      "45' Half time",
      "90' Full time",
    ]);
    // Sampled once a frame, so a 1500 ms gap can read up to one frame short.
    for (let i = 1; i < said.length; i++) {
      expect(said[i]!.at - said[i - 1]!.at).toBeGreaterThanOrEqual(1_500 - FRAME);
    }
  });
});
