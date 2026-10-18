// @vitest-environment jsdom
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { frameSource } from "@/ui/matchday/feed";
import { buildTimeline, SHOW } from "@/ui/matchday/timeline";
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
  it("at 6.5' the user's slot 5 stands at origin/main's 25.10%, 50.00% of the pitch", () => {
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
    // origin/main (458c56e): left 25.099000022671863%, top 49.99705573093594%. The pitch is 64
    // units tall per 100 wide, so 50.00% of its height is 32.00 units of its width.
    expect(style(USER_5)).toBe(
      "transform: translate3d(25.10cqi, 32.00cqi, 0) translate(-50%, -70%)",
    );
    // origin/main (458c56e): left 8.700000000000001%, top 49.3994%.
    expect(style('[data-side="user"][data-slot="0"]')).toBe(
      "transform: translate3d(8.70cqi, 31.62cqi, 0) translate(-50%, -70%)",
    );
  });

  it("at 12' with the goal 1.2 s in, the ball sits in the net at 89.89%, 50.39%, lofted 0.78", () => {
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
    // origin/main (458c56e): left 89.8912138965073%, top 50.38581060153981%, shadow scale 0.80.
    expect(style('[data-testid="broadcast-ball"]')).toBe(
      "transform: translate3d(89.89cqi, 32.25cqi, 0) translate(-50%, -50%); --loft: 0.78; --spin: 3480",
    );
    // origin/main (458c56e): M 83.35913620202706 32.445825584001554 Q 86.62517504926717
    // 30.106372184493516 89.8912138965073 32.24691878498548.
    expect(document.querySelector('[data-testid="pitch-trails"] path')?.getAttribute("d")).toBe(
      "M 83.36 32.45 Q 86.63 30.11 89.89 32.25",
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
  const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));

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
    // The clock holds at kickoff until the movesets chunk settles; run on into open play, where
    // no beat fires until the 5' card.
    for (let i = 0; i < 2_000 && minute() < 1; i++) await frames(1);
    expect(minute()).toBe(1);
  }

  it("commits about 12 times in a second of open play, not once per frame (62)", async () => {
    let commits = 0;
    await mountLive(() => commits++);
    commits = 0;
    await frames(62);
    // 62 frames is 992 ms of live play, 1.8 match minutes: the clock ran and no beat fired.
    expect(minute()).toBe(2);
    // A render per 100 ms gap, restarted by each render that cannot wait: the minute on the clock
    // (1 to 2), the next play, a pass trail coming and going, a new carrier. Measured on this
    // fixture: 5 on the gap alone, 2 on the clock or play alone, 3 asked for by the pitch alone,
    // 2 on both. Per frame was 62.
    expect(commits).toBe(12);
  });

  it("rolls the ball on every frame between commits", async () => {
    let commits = 0;
    await mountLive(() => commits++);
    const balls: (string | null)[] = [];
    const before = commits;
    for (let i = 0; i < 5; i++) {
      await frames(1);
      balls.push(style('[data-testid="broadcast-ball"]'));
    }
    expect(commits - before).toBeLessThanOrEqual(1);
    expect(balls.every((b) => b?.startsWith("transform: translate3d("))).toBe(true);
    expect(new Set(balls).size).toBe(5);
    expect(style(USER_5)?.startsWith("transform: translate3d(")).toBe(true);
  });
});

describe("cut-in timing (catches a goal card that waits up to 100 ms for the next gap render)", () => {
  const GOAL = { "goal:12:user:Charizard": 1000 };
  const at = (share: number) => 1000 + share * SHOW.goal;

  it("the frame where the goal reaches 0.25 of its staging asks for a render; the rendered one does not", () => {
    const feed = frameSource();
    render(
      <Broadcast
        match={MATCH}
        timeline={TIMELINE}
        lineup={LINEUP}
        clock={12}
        now={at(0.2)}
        fired={GOAL}
        kicks={0}
        motion={true}
        speed={1}
        feed={feed}
        cutIns
      />,
    );
    expect(screen.queryByTestId("cut-in")).toBeNull();
    const frame = (now: number) => ({ clock: 12, now, fired: GOAL, kicks: 0, speed: 1 });
    expect(feed.publish(frame(at(0.2)))).toBe(false);
    expect(feed.publish(frame(at(0.26)))).toBe(true);
  });
});
