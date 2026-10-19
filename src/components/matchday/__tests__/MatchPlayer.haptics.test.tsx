// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
import { setSoundEnabled } from "@/components/wheel/sound";
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

// Your goal at 20', theirs at 40', your red card at 50', theirs at 60'.
const MATCH: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: OPPONENT,
  regulation: { user: 1, opp: 1 },
  extraTime: null,
  shootout: null,
  outcome: "D",
  goals: [
    { side: "user", minute: 20, penalty: false, kind: "open-play", scorer: id(6), assist: null },
    {
      side: "opp",
      minute: 40,
      penalty: false,
      kind: "open-play",
      scorer: { kind: "species", id: id(142) },
      assist: null,
    },
  ],
  saves: [],
  incidents: [
    { kind: "red", side: "user", minute: 50, slot: 3, player: id(7), secondYellow: false },
    { kind: "red", side: "opp", minute: 60, slot: 2, player: id(151), secondYellow: false },
  ],
  windows: WINDOWS,
  absences: [],
  rating: 500,
  recap: [],
};

let buzzes: unknown[] = [];
const FRAME = 100;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  buzzes = [];
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: (pattern: unknown) => {
      buzzes.push(pattern);
      return true;
    },
  });
  // Whole matches run in 100 ms frames, the largest dt the frame loop takes. Stepping 16 ms frames
  // timed out at 15 s on a hosted runner.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), FRAME),
  );
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => clearTimeout(handle));
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
  delete (navigator as { vibrate?: unknown }).vibrate;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const player = () => screen.getByTestId("match-player");
const minute = () => Number(player().getAttribute("data-minute"));
const stage = () => player().getAttribute("data-stage");

function mount(view: MatchView): void {
  render(
    <MatchPlayer
      match={MATCH}
      matchIndex={0}
      seed="haptics-test"
      lineup={LINEUP}
      view={view}
      autoStart
    />,
  );
}

async function frames(until: () => boolean): Promise<void> {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  for (let i = 0; i < 2_000 && !until(); i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
  expect(until()).toBe(true);
}

describe("haptics (catches a phone that buzzes for the wrong side, twice for one event, or with sound and haptics off)", () => {
  it("vibrate called once with the goal pattern on a user goal, never on an opponent goal", async () => {
    mount("live");
    await frames(() => minute() >= 45);
    expect(buzzes).toEqual([[120]]);
  });

  it("a red card for your team buzzes two short pulses; the opponent's red card does not", async () => {
    mount("live");
    await frames(() => minute() >= 65);
    expect(buzzes).toEqual([[120], [70, 90, 70]]);
  });

  it("the final whistle buzzes one long pulse, once, and a pause and resume buzzes nothing again", async () => {
    mount("live");
    await frames(() => minute() >= 65);
    fireEvent.click(screen.getByTestId("play-toggle"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    fireEvent.click(screen.getByTestId("play-toggle"));
    await frames(() => stage() === "done");
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(buzzes).toEqual([[120], [70, 90, 70], [400]]);
  });

  it("a skip to full time buzzes nothing: like its sounds, the goals, cards and whistle it skips past never fire", async () => {
    mount("live");
    await frames(() => minute() >= 5);
    fireEvent.click(screen.getByTestId("skip-ft"));
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
    expect(stage()).toBe("done");
    expect(buzzes).toEqual([]);
  });

  it("no vibrate when the toggle is off", async () => {
    setSoundEnabled(false);
    mount("live");
    await frames(() => stage() === "done");
    expect(buzzes).toEqual([]);
  });

  it("no vibrate in Quick", async () => {
    mount("quick");
    await frames(() => stage() === "done");
    expect(buzzes).toEqual([]);
  });

  it("does nothing where the browser has no navigator.vibrate", async () => {
    delete (navigator as { vibrate?: unknown }).vibrate;
    mount("live");
    await frames(() => minute() >= 45);
    expect("vibrate" in navigator).toBe(false);
  });
});

describe("sound and haptics toggle (catches a matchday toggle that hides its haptics or its state)", () => {
  it("reads Sound and haptics on or off, keeps aria-pressed, and says haptics are Android only", () => {
    mount("live");
    const toggle = screen.getByTestId("sound-toggle");
    expect(toggle.textContent).toBe("Sound and haptics on");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const hint = document.getElementById(toggle.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe("Haptics work on Android phones only.");
    fireEvent.click(toggle);
    expect(toggle.textContent).toBe("Sound and haptics off");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
