// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { MatchPlayer } from "../MatchPlayer";

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  const silent = () => {};
  return {
    ...real,
    playAbilitySound: silent,
    playKickPass: silent,
    playGoalHorn: silent,
    playOppGoal: silent,
    playSaveSound: silent,
    playCardSound: silent,
    playSubSound: silent,
    playWhistle: silent,
    startCrowdBed: silent,
    stopCrowdBed: silent,
    setCrowdLevel: silent,
    crowdRoar: silent,
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

// Wartortle (slot 4) goes off injured at 20'; the assistant sends Gyarados on.
const MATCH: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 0, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "D",
  goals: [],
  saves: [],
  incidents: [
    { kind: "injury", side: "user", minute: 20, slot: 4, player: XI[4]! },
    {
      kind: "sub",
      side: "user",
      minute: 20,
      slot: 4,
      out: XI[4]!,
      in: id(130),
      reason: "injury",
      by: "auto",
    },
  ],
  windows: WINDOWS,
  absences: [],
  rating: 500,
  recap: [],
} as unknown as PlayedMatch;

const FRAME = 100;
const STEP = 1_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["performance", "setTimeout", "clearTimeout"] });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), FRAME),
  );
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => clearTimeout(handle));
  localStorage.clear();
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

const player = () => screen.getByTestId("match-player");
const toggle = () => screen.getByTestId("play-toggle");
const speed = () => screen.getByTestId("speed-toggle");

async function mount(managed: boolean): Promise<void> {
  render(
    <MatchPlayer
      match={MATCH}
      matchIndex={0}
      seed="a11y-test"
      lineup={LINEUP}
      view="live"
      manager={managed ? { actions: [], decide: () => null } : undefined}
      autoStart
    />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

async function until(done: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !done(); i++) {
    await act(async () => {
      vi.advanceTimersByTime(STEP);
    });
  }
  expect(done()).toBe(true);
}

describe("match keys (catches a player with no keyboard pause or speed, and keys that fight a focused control)", () => {
  it("Space toggles running: Pause, then Resume, then Pause, and the page does not scroll", async () => {
    await mount(false);
    await until(() => Number(player().getAttribute("data-minute")) >= 1);
    expect(toggle().textContent).toBe("Pause");
    expect(fireEvent.keyDown(player(), { key: " " })).toBe(false);
    expect(toggle().textContent).toBe("Resume");
    expect(fireEvent.keyDown(player(), { key: " " })).toBe(false);
    expect(toggle().textContent).toBe("Pause");
  });

  it("2 toggles speed on and off", async () => {
    await mount(false);
    expect(speed().getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(player(), { key: "2" });
    expect(speed().getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(player(), { key: "2" });
    expect(speed().getAttribute("aria-pressed")).toBe("false");
  });

  it("Space on a focused button is left to the button, so it clicks once and never toggles twice", async () => {
    await mount(false);
    expect(fireEvent.keyDown(speed(), { key: " " })).toBe(true);
    expect(toggle().textContent).toBe("Pause");
    expect(fireEvent.keyDown(screen.getByTestId("sound-toggle"), { key: " " })).toBe(true);
    expect(toggle().textContent).toBe("Pause");
  });

  it("keys typed with a modifier or held down do nothing", async () => {
    await mount(false);
    fireEvent.keyDown(player(), { key: " ", ctrlKey: true });
    fireEvent.keyDown(player(), { key: "2", metaKey: true });
    fireEvent.keyDown(player(), { key: " ", repeat: true });
    expect(toggle().textContent).toBe("Pause");
    expect(speed().getAttribute("aria-pressed")).toBe("false");
  });
});

describe("momentum meter (catches a momentum bar a screen reader reads as two bare numbers)", () => {
  it("is a meter from 0 to 100 named Match momentum, at 50 and 'Your side 50%' at kickoff", async () => {
    await mount(false);
    const meter = player().querySelector('[role="meter"]');
    expect(meter?.getAttribute("aria-label")).toBe("Match momentum");
    expect(meter?.getAttribute("aria-valuemin")).toBe("0");
    expect(meter?.getAttribute("aria-valuemax")).toBe("100");
    expect(meter?.getAttribute("aria-valuenow")).toBe("50");
    expect(meter?.getAttribute("aria-valuetext")).toBe("Your side 50%");
  });
});

describe("stop focus (catches a stop that opens where a keyboard user cannot reach it, and focus lost when it closes)", () => {
  it("focus is on the injury prompt after it opens: the assistant's pick, Gyarados, and back on 2x speed once answered", async () => {
    await mount(true);
    speed().focus();
    await until(() => screen.queryByTestId("stop-injury") !== null);
    const focused = document.activeElement as HTMLInputElement;
    expect(screen.getByTestId("stop-injury").contains(focused)).toBe(true);
    expect(focused.type).toBe("radio");
    expect(focused.checked).toBe(true);
    expect(focused.closest("label")?.textContent).toBe("Gyarados (assistant's pick)");

    fireEvent.click(screen.getByTestId("injury-confirm"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(screen.queryByTestId("stop-injury")).toBeNull();
    expect(document.activeElement).toBe(speed());
  });

  it("the half-time stop takes focus on its button, and a stop opened with nothing focused hands focus to Pause on close", async () => {
    await mount(true);
    await until(() => screen.queryByTestId("stop-injury") !== null);
    fireEvent.click(screen.getByTestId("injury-confirm"));
    (document.activeElement as HTMLElement | null)?.blur();
    await until(() => screen.queryByTestId("stop-halftime") !== null);
    expect(document.activeElement).toBe(screen.getByTestId("stop-go"));

    fireEvent.click(screen.getByTestId("stop-go"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(document.activeElement).toBe(toggle());
    expect(toggle().textContent).toBe("Pause");
  });
});

describe("skip warning (catches a manager Skip that answers the remaining stops without saying so)", () => {
  it("in manager mode Skip warns inline first; Keep watching keeps the match on, Skip anyway ends it", async () => {
    await mount(true);
    fireEvent.click(screen.getByTestId("skip-ft"));
    const warning = screen.getByTestId("skip-warning");
    expect(warning.textContent).toContain(
      "Skip to full time? Your assistant answers every stop left in this match, injuries included.",
    );
    expect(player().getAttribute("data-stage")).toBe("play");
    expect(document.activeElement).toBe(screen.getByTestId("skip-confirm"));

    fireEvent.click(screen.getByTestId("skip-cancel"));
    expect(screen.queryByTestId("skip-warning")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("skip-ft"));
    expect(player().getAttribute("data-stage")).toBe("play");

    fireEvent.click(screen.getByTestId("skip-ft"));
    fireEvent.click(screen.getByTestId("skip-confirm"));
    expect(player().getAttribute("data-stage")).toBe("done");
    expect(screen.queryByTestId("skip-warning")).toBeNull();
  });

  it("without manager mode Skip ends the match at once, with no warning", async () => {
    await mount(false);
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.queryByTestId("skip-warning")).toBeNull();
    expect(player().getAttribute("data-stage")).toBe("done");
  });
});
