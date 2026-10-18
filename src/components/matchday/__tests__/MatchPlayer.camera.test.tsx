// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
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
  name: "Opp",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
    kind: "species" as const,
    id: id(n),
  })),
} as unknown as Opponent;

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

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

/** A screen `width` px wide, with or without a reduced-motion preference. */
function screenOf(width: number, reducedMotion = false) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches =
      min !== null
        ? width >= Number(min[1])
        : query.includes("prefers-reduced-motion")
          ? reducedMotion
          : false;
    return { matches, media: query, addEventListener: () => {}, removeEventListener: () => {} };
  });
}

async function mount(view: MatchView = "live") {
  render(<MatchPlayer match={MATCH} matchIndex={0} seed="camera" lineup={LINEUP} view={view} />);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

const cameraOf = () => screen.getByTestId("broadcast").dataset.camera;
const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("follow camera default (catches a phone that opens on the full pitch, or a desktop that opens zoomed in)", () => {
  it("Follow is the default at 390: the broadcast follows and the Follow button is pressed", async () => {
    screenOf(390);
    await mount();
    expect(cameraOf()).toBe("follow");
    expect(pressed("Follow")).toBe("true");
    expect(pressed("Full pitch")).toBe("false");
  });

  it("Full is the default at 1280: the broadcast shows the full pitch", async () => {
    screenOf(1280);
    await mount();
    expect(cameraOf()).toBe("full");
    expect(pressed("Full pitch")).toBe("true");
  });

  it("with reduced motion a phone opens on the full pitch, and Follow can still be chosen", async () => {
    screenOf(390, true);
    await mount();
    expect(cameraOf()).toBe("full");
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(cameraOf()).toBe("follow");
  });

  it("the choice is kept: Full pitch at 390 is stored and wins on the next match", async () => {
    screenOf(390);
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Full pitch" }));
    expect(cameraOf()).toBe("full");
    expect(window.localStorage.getItem("pokedraft:camera")).toBe('"full"');
    cleanup();
    await mount();
    expect(cameraOf()).toBe("full");
  });

  it("Quick has no camera and no toggle", async () => {
    screenOf(390);
    await mount("quick");
    expect(cameraOf()).toBe("full");
    expect(screen.queryByRole("button", { name: "Follow" })).toBeNull();
  });
});
