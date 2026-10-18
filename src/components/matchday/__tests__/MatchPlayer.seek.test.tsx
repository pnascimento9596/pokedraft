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

const TWO_GOALS: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 2, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 12, penalty: false, kind: "open-play", scorer: id(6), assist: null },
    { side: "user", minute: 30, penalty: false, kind: "open-play", scorer: id(9), assist: null },
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
const goalSounds = () =>
  sound.calls.filter((c) => c === "horn" || c === "opp-goal" || c === "roar");

async function frames(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
}

async function mountReplay(manager?: Parameters<typeof MatchPlayer>[0]["manager"]) {
  render(
    <MatchPlayer
      match={TWO_GOALS}
      matchIndex={0}
      seed="seek-test"
      lineup={LINEUP}
      view="live"
      manager={manager}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

describe("goal pips seek the replay (catches a seek that replays every old goal's sound)", () => {
  it("seek to a pip lands the clock at minute - 1 with no goal SFX fired: the 30' pip lands on 29', the 12' goal stays silent, and only the 30' goal sounds", async () => {
    await mountReplay();
    fireEvent.click(screen.getByTestId("skip-ft"));
    await frames(2);
    sound.calls.length = 0;

    fireEvent.click(screen.getByRole("button", { name: "Watch the 30' goal" }));
    await frames(2);
    expect(minute()).toBe(29);
    expect(screen.getByTestId("matchday-score").textContent).toBe("1 - 0");
    expect(goalSounds()).toEqual([]);

    for (let i = 0; i < 2_000 && screen.getByTestId("matchday-score").textContent !== "2 - 0"; i++)
      await frames(1);
    expect(screen.getByTestId("matchday-score").textContent).toBe("2 - 0");
    expect(sound.calls.filter((c) => c === "horn")).toEqual(["horn"]);
  });

  it("a replay offers one pip per goal, named by its minute", async () => {
    await mountReplay();
    const pips = screen.getAllByTestId("goal-pip");
    expect(pips.map((p) => p.getAttribute("aria-label"))).toEqual([
      "Watch the 12' goal",
      "Watch the 30' goal",
    ]);
  });

  it("manager mode offers no pips until full time, so a seek can never skip a stop", async () => {
    await mountReplay({ actions: [], decide: () => null });
    expect(screen.queryAllByTestId("goal-pip")).toEqual([]);
    fireEvent.click(screen.getByTestId("skip-ft"));
    await frames(2);
    expect(screen.getAllByTestId("goal-pip")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Watch the 12' goal" }));
    await frames(2);
    expect(minute()).toBe(11);
    expect(screen.queryByTestId("touchline-sheet")).toBeNull();
  });
});
