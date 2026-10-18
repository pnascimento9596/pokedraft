// @vitest-environment jsdom
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";
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
  regulation: { user: 1, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 12, penalty: false, kind: "open-play", scorer: id(6), assist: id(25) },
  ],
  saves: [{ kind: "save", side: "opp", minute: 12, attacker: id(25), keeper: id(143) }],
  incidents: [
    { kind: "yellow", side: "user", minute: 5, slot: 2, player: id(4), secondYellow: false },
  ],
  windows: Array.from({ length: 18 }, (_, w) => ({
    minute: (w + 1) * 5,
    score: { user: 0, opp: 0 },
    tactic: { user: "balanced" as const, opp: "defend" as const },
    energy: XI.map(() => 90),
    onPitch: XI,
  })),
  absences: [],
  rating: 500,
  recap: [],
};

// The fixture and seed of Broadcast.test.tsx, so the pinned spots below are the ones origin/main
// drew with `left` and `top` before the frame loop moved them into transforms.
const TIMELINE = buildTimeline(MATCH, { matchIndex: 0, seed: "bc-test", lineup: LINEUP });

beforeEach(() => {
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

const style = (sel: string) => document.querySelector(sel)?.getAttribute("style") ?? null;
const USER_5 = '[data-side="user"][data-slot="5"]';

describe("pitch transforms (catches a frame loop that moves the players somewhere stagePitch did not put them)", () => {
  it("at 6.5' the user's slot 5 stands at origin/main's 26.60%, 45.01% of the pitch", () => {
    render(
      <Broadcast
        match={MATCH}
        timeline={TIMELINE}
        lineup={LINEUP}
        clock={6.5}
        now={1000}
        fired={{}}
        kicks={0}
        motion={true}
        speed={1}
      />,
    );
    // origin/main: left 26.597464022671865%, top 45.00745573093594%. The pitch is 64 units tall
    // per 100 wide, so 45.01% of its height is 28.80 units of its width.
    expect(style(USER_5)).toBe(
      "transform: translate3d(26.60cqi, 28.80cqi, 0) translate(-50%, -70%)",
    );
    // origin/main: left 8.700000000000001%, top 44.8256%.
    expect(style('[data-side="user"][data-slot="0"]')).toBe(
      "transform: translate3d(8.70cqi, 28.69cqi, 0) translate(-50%, -70%)",
    );
  });

  it("at 12' with the goal 1.2 s in, the ball sits in the net at 89.89%, 50%, lofted 0.78", () => {
    render(
      <Broadcast
        match={MATCH}
        timeline={TIMELINE}
        lineup={LINEUP}
        clock={12}
        now={2200}
        fired={{ "goal:12:user:Charizard": 1000 }}
        kicks={0}
        motion={true}
        speed={1}
      />,
    );
    // origin/main: left 89.88828402366863%, top 50%, shadow scale 0.80, spin 3480deg.
    expect(style('[data-testid="broadcast-ball"]')).toBe(
      "transform: translate3d(89.89cqi, 32.00cqi, 0) translate(-50%, -50%); --loft: 0.78; --spin: 3480",
    );
    // origin/main: M 83.35384615384615 32 Q 86.62106508875739 29.76 89.88828402366863 32.
    expect(document.querySelector('[data-testid="pitch-trails"] path')?.getAttribute("d")).toBe(
      "M 83.35 32.00 Q 86.62 29.76 89.89 32.00",
    );
  });

  it("with motion off the user's slot 5 stands on its formation spot, 36.68%, 50%", () => {
    render(
      <Broadcast
        match={MATCH}
        timeline={TIMELINE}
        lineup={LINEUP}
        clock={6.5}
        now={1000}
        fired={{}}
        kicks={0}
        motion={false}
        speed={1}
      />,
    );
    expect(style(USER_5)).toBe(
      "transform: translate3d(36.68cqi, 32.00cqi, 0) translate(-50%, -70%)",
    );
  });
});

describe("frame loop (catches a live match that re-renders the whole match screen in React on every animation frame)", () => {
  const FRAME = 16;

  async function frames(n: number) {
    for (let i = 0; i < n; i++) {
      await act(async () => {
        vi.advanceTimersByTime(FRAME);
      });
    }
  }

  async function mountLive(onCommit: () => void) {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
    });
    render(
      <Profiler id="match" onRender={onCommit}>
        <MatchPlayer
          match={MATCH}
          matchIndex={0}
          seed="frame-loop"
          lineup={LINEUP}
          view="live"
          autoStart
        />
      </Profiler>,
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    // Past the kickoff whistle and into open play, where no beat fires until the 5' card.
    await frames(30);
  }

  it("commits about 10 times in a second of open play, not once per frame (62)", async () => {
    let commits = 0;
    await mountLive(() => commits++);
    commits = 0;
    await frames(62);
    expect(Number(screen.getByTestId("match-player").getAttribute("data-minute"))).toBeLessThan(5);
    expect(commits).toBeLessThanOrEqual(12);
    expect(commits).toBeGreaterThanOrEqual(9);
  });

  it("moves the players on every frame between commits", async () => {
    let commits = 0;
    await mountLive(() => commits++);
    const spots: (string | null)[] = [];
    const before = commits;
    for (let i = 0; i < 5; i++) {
      await frames(1);
      spots.push(style(USER_5));
    }
    expect(commits - before).toBeLessThanOrEqual(1);
    expect(spots.every((s) => s?.startsWith("transform: translate3d("))).toBe(true);
    expect(new Set(spots).size).toBe(5);
  });
});
