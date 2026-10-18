// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { MatchPlayer } from "../MatchPlayer";

const gate = vi.hoisted(() => {
  let open: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { ready, open: () => open() };
});

vi.mock("@/data/movesets", async (importOriginal) => {
  await gate.ready;
  return importOriginal();
});

const sound = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return {
    ...real,
    playGoalHorn: () => sound.calls.push("horn"),
    playAbilitySound: (effect: string) => sound.calls.push(`ability:${effect}`),
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

const MATCH: Extract<MatchResult, { status: "played" }> = {
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
  windows: Array.from({ length: 18 }, (_, w) => ({
    minute: (w + 1) * 5,
    score: { user: 0, opp: 0 },
    tactic: { user: "balanced" as const, opp: "balanced" as const },
    energy: XI.map(() => 90),
    onPitch: XI,
  })),
  absences: [],
  rating: 500,
  recap: [],
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  sound.calls.length = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));

async function advance(ms: number) {
  for (let t = 0; t < ms; t += 16) {
    await act(async () => {
      vi.advanceTimersByTime(16);
    });
  }
}

describe("MatchPlayer movesets (catches a clock that runs before the canon movesets load, and goal SFX stuck on the generic impact)", () => {
  it("holds the clock at kickoff until the movesets resolve", async () => {
    render(
      <MatchPlayer
        match={MATCH}
        matchIndex={0}
        seed="mp-test"
        lineup={LINEUP}
        view="quick"
        autoStart
      />,
    );
    await advance(1_000);
    expect(minute()).toBe(0);
    expect(screen.getByTestId("matchday-clock").textContent).toBe("KO");

    gate.open();
    // The real movesets module can still be loading under a busy test run, so keep the import
    // flushing while the fake clock runs instead of assuming it settles in one pass.
    for (let i = 0; i < 100 && minute() === 0; i++) {
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      await advance(48);
    }
    expect(minute()).toBeGreaterThan(0);
  });

  it("plays the scorer's typed move sound with the goal horn once movesets load", async () => {
    gate.open();
    render(
      <MatchPlayer
        match={MATCH}
        matchIndex={0}
        seed="mp-test"
        lineup={LINEUP}
        view="quick"
        autoStart
      />,
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await advance(1_000);
    const horn = sound.calls.indexOf("horn");
    expect(horn).toBeGreaterThanOrEqual(0);
    expect(sound.calls[horn + 1]).toBe("ability:fire");
  });
});
