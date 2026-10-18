// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
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

// No goal, save or card before 30': up to then the only beat with a sound is the kickoff whistle.
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

/** Plays the match in `view` to 20', counting the frames that showed a move badge on the pitch. */
async function playTo20(view: MatchView): Promise<number> {
  render(
    <MatchPlayer
      match={LATE_GOAL}
      matchIndex={0}
      seed="quick-test"
      lineup={LINEUP}
      view={view}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  let badges = 0;
  for (let i = 0; i < 4_000 && minute() < 20; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    if (screen.queryByTestId("pitch-ability") !== null) badges++;
  }
  expect(minute()).toBe(20);
  return badges;
}

describe("Quick view (catches a Quick sim that runs the broadcast: a phase sound and a move badge every 61 ms)", () => {
  it("in Quick no per-phase SFX call: only the kickoff whistle sounds before the first beat", async () => {
    await playTo20("quick");
    expect(sound.calls).toEqual(["whistle:kickoff"]);
  });

  it("in Quick the pitch is still and shows no move badge", async () => {
    const badges = await playTo20("quick");
    expect(screen.getByTestId("broadcast").getAttribute("data-motion")).toBe("off");
    expect(badges).toBe(0);
  });

  it("Live keeps its phase sounds and its moving pitch", async () => {
    await playTo20("live");
    expect(screen.getByTestId("broadcast").getAttribute("data-motion")).toBe("on");
    expect(sound.calls).toContain("whistle:kickoff");
    expect(sound.calls.filter((c) => c === "kick").length).toBeGreaterThan(0);
  });
});
