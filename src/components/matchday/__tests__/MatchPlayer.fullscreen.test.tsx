// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, PenKick, SpeciesId } from "@/engine/types";
import { MatchPlayer } from "../MatchPlayer";

const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;
const OPPONENT = {
  id: "o",
  name: "Goldenrod United",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
    kind: "species" as const,
    id: id(n),
  })),
} as unknown as Opponent;

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

function matchWith(kicks: readonly PenKick[] | null): PlayedMatch {
  const user = kicks?.filter((k) => k.side === "user" && k.scored).length ?? 0;
  const opp = kicks?.filter((k) => k.side === "opp" && k.scored).length ?? 0;
  return {
    status: "played",
    round: "F",
    opponent: OPPONENT,
    regulation: { user: 0, opp: 0 },
    extraTime: kicks === null ? null : { user: 0, opp: 0 },
    shootout:
      kicks === null
        ? null
        : { user, opp, keeper: id(9), kicks, decider: "kicks", coinWinner: null },
    outcome: kicks === null ? "D" : user > opp ? "W" : "L",
    goals: [],
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
}

const u = (n: number, scored: boolean): PenKick => ({ side: "user", taker: id(n), scored });
const o = (n: number, scored: boolean): PenKick => ({
  side: "opp",
  taker: { kind: "species", id: id(n) },
  scored,
});

// 3-2 to the user after five kicks each, decided on the last kick.
const PENS = [
  u(6, true),
  o(149, false),
  u(25, true),
  o(142, true),
  u(19, false),
  o(148, true),
  u(16, true),
  o(147, false),
  u(13, false),
  o(146, false),
];

/** The browser's full-screen element, as the stubbed Fullscreen API reports it. */
const fs = { element: null as Element | null };

function change(element: Element | null, event = "fullscreenchange") {
  act(() => {
    fs.element = element;
    document.dispatchEvent(new Event(event));
  });
}

function define(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
}

/** A browser with the standard Fullscreen API, like Chrome on Android. */
function standardApi() {
  define(document, "fullscreenEnabled", true);
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fs.element,
  });
  define(
    HTMLElement.prototype,
    "requestFullscreen",
    vi.fn(function (this: HTMLElement) {
      change(this);
      return Promise.resolve();
    }),
  );
  define(
    document,
    "exitFullscreen",
    vi.fn(() => {
      change(null);
      return Promise.resolve();
    }),
  );
}

async function mount(match: PlayedMatch = matchWith(null)) {
  render(<MatchPlayer match={match} matchIndex={0} seed="bug" lineup={LINEUP} view="live" />);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

const bugCells = () =>
  [...screen.getByTestId("score-bug").children].map((c) => c.textContent ?? "");
const toggle = () => screen.getByTestId("fullscreen-toggle");

beforeEach(() => {
  fs.element = null;
  window.localStorage.clear();
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
  for (const key of [
    "fullscreenEnabled",
    "fullscreenElement",
    "exitFullscreen",
    "webkitFullscreenEnabled",
    "webkitFullscreenElement",
    "webkitExitFullscreen",
  ])
    Reflect.deleteProperty(document, key);
  Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
  Reflect.deleteProperty(HTMLElement.prototype, "webkitRequestFullscreen");
});

describe("score bug present only when fullscreen (catches a bug drawn on the page, or a button left on iPhone Safari where it cannot work)", () => {
  it("no bug before full screen; the button puts the broadcast in full screen and the bug reads Your XI 0-0 Goldenrod KO", async () => {
    standardApi();
    await mount();
    expect(screen.queryByTestId("score-bug")).toBeNull();
    expect(toggle().textContent).toBe("Full screen");

    fireEvent.click(toggle());
    expect(fs.element).not.toBeNull();
    expect(fs.element!.contains(screen.getByTestId("broadcast"))).toBe(true);
    expect(bugCells()).toEqual(["Your XI", "0-0", "Goldenrod", "KO"]);
    expect(toggle().textContent).toBe("Exit full screen");
    expect(fs.element!.contains(toggle())).toBe(true);
  });

  it("the bug sits in the camera's window, not in the zoomed pitch", async () => {
    standardApi();
    await mount();
    fireEvent.click(toggle());
    const bug = screen.getByTestId("score-bug");
    expect(bug.parentElement).toBe(screen.getByTestId("pitch-view"));
    expect(screen.getByTestId("pitch").contains(bug)).toBe(false);
  });

  it("the same button leaves full screen, and the bug goes", async () => {
    standardApi();
    await mount();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(fs.element).toBeNull();
    expect(screen.queryByTestId("score-bug")).toBeNull();
    expect(toggle().textContent).toBe("Full screen");
  });

  it("Esc (the browser leaving full screen by itself) takes the bug away", async () => {
    standardApi();
    await mount();
    fireEvent.click(toggle());
    expect(screen.queryByTestId("score-bug")).not.toBeNull();
    change(null);
    expect(screen.queryByTestId("score-bug")).toBeNull();
    expect(toggle().textContent).toBe("Full screen");
  });

  it("after a shootout the bug reads FT and Pens 3-2 with hyphens", async () => {
    standardApi();
    await mount(matchWith(PENS));
    fireEvent.click(screen.getByTestId("skip-ft"));
    fireEvent.click(toggle());
    expect(bugCells()).toEqual(["Your XI", "0-0", "Goldenrod", "FT", "Pens 3-2"]);
    // The scoreboard above the pitch reads the same, with no spaces (catches "Pens 3 - 2").
    expect(screen.getByTestId("matchday-score").textContent).toBe("0-0");
    expect(screen.getByTestId("matchday-pens").textContent).toBe("Pens 3-2");
  });

  it("no Fullscreen API (iPhone Safari): no button and no bug", async () => {
    await mount();
    expect(screen.queryByTestId("fullscreen-toggle")).toBeNull();
    expect(screen.queryByTestId("score-bug")).toBeNull();
  });

  it("fullscreenEnabled false (full screen blocked by the page's host): no button", async () => {
    standardApi();
    define(document, "fullscreenEnabled", false);
    await mount();
    expect(screen.queryByTestId("fullscreen-toggle")).toBeNull();
  });

  it("the webkit-prefixed API (older Safari on iPad) works the same way", async () => {
    define(document, "webkitFullscreenEnabled", true);
    Object.defineProperty(document, "webkitFullscreenElement", {
      configurable: true,
      get: () => fs.element,
    });
    define(
      HTMLElement.prototype,
      "webkitRequestFullscreen",
      vi.fn(function (this: HTMLElement) {
        change(this, "webkitfullscreenchange");
      }),
    );
    define(
      document,
      "webkitExitFullscreen",
      vi.fn(() => change(null, "webkitfullscreenchange")),
    );
    await mount();
    fireEvent.click(toggle());
    expect(bugCells()).toEqual(["Your XI", "0-0", "Goldenrod", "KO"]);
    fireEvent.click(toggle());
    expect(screen.queryByTestId("score-bug")).toBeNull();
  });
});
