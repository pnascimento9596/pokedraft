// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, ManagerAction, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { MatchPlayer } from "../MatchPlayer";

const id = (n: number) => n as SpeciesId;
// 4-3-3: Weedle (13) plays slot 5 and Rattata (19) slot 7.
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
  tacticalStyle: "possession",
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
    kind: "species" as const,
    id: id(n),
  })),
} as unknown as Opponent;

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// No engine 6 side can be below 65 energy at 65' (Magikarp, STA 19, pressing from kickoff is at
// 67), so this fixture sets the 65' window by hand.
const TIRED_AT_65: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 0, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "D",
  goals: [],
  saves: [],
  incidents: [],
  windows: Array.from({ length: 18 }, (_, w) => ({
    minute: (w + 1) * 5,
    score: { user: 0, opp: 0 },
    tactic: { user: "press" as const, opp: "balanced" as const },
    energy: XI.map((_, s) =>
      (w + 1) * 5 >= 65 && s === 5 ? 60 : (w + 1) * 5 >= 65 && s === 7 ? 62 : 90,
    ),
    onPitch: XI,
  })),
  absences: [],
  rating: 500,
  recap: [],
};

const PRESS_AT_KICKOFF: ManagerAction = { type: "tactic", match: 0, minute: 0, tactic: "press" };

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
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

async function mount(actions: readonly ManagerAction[]) {
  render(
    <MatchPlayer
      match={TIRED_AT_65}
      matchIndex={0}
      seed="fatigue-stop-test"
      lineup={LINEUP}
      view="quick"
      manager={{ actions, decide: () => null }}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

/** Runs 16 ms frames, answering the half-time stop, until `testId` shows or full time. */
async function until(testId: string): Promise<HTMLElement | null> {
  for (let i = 0; i < 2_000; i++) {
    const el = screen.queryByTestId(testId);
    if (el !== null) return el;
    if (screen.getByTestId("match-player").getAttribute("data-stage") === "done") return null;
    if (screen.queryByTestId("stop-halftime") !== null)
      fireEvent.click(screen.getByTestId("stop-go"));
    await act(async () => {
      vi.advanceTimersByTime(16);
    });
  }
  throw new Error(`${testId} never showed and the match never ended`);
}

describe("half-time fatigue line without a 65' stop (catches the interim 65' stop lingering or half-time losing its fatigue line)", () => {
  it("never stops at 65' even after a kickoff tactic when outfield players are below 65 energy", async () => {
    await mount([PRESS_AT_KICKOFF]);
    expect(await until("stop-fatigue")).toBeNull();
  });

  it("excludes missed penalties from Shots on Target while counting saved penalties (catches 6b3 Red SoT bug)", async () => {
    const matchWithPenalties: PlayedMatch = {
      ...TIRED_AT_65,
      incidents: [
        {
          kind: "penalty",
          side: "user",
          minute: 10,
          slot: 8,
          taker: id(25),
          keeper: id(143),
          outcome: "missed",
        },
        {
          kind: "penalty",
          side: "opp",
          minute: 20,
          slot: 8,
          taker: id(149),
          keeper: id(9),
          outcome: "saved",
        },
      ],
    };
    render(
      <MatchPlayer
        match={matchWithPenalties}
        matchIndex={0}
        seed="sot-penalty-test"
        lineup={LINEUP}
        view="quick"
        startAt={90}
      />,
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    const stats = [...screen.getByTestId("match-hud").querySelectorAll("[class*=hudStat]")].map(
      (el) => el.textContent,
    );
    expect(stats).toEqual(["0 SoT", "1 SoT"]);
  });
});
