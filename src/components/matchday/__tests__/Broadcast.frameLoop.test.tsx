// @vitest-environment jsdom
import { Profiler } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, PenKick, SpeciesId } from "@/engine/types";
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
  it("at 6.5' the user's slot 5 stands where stagePitch puts it, 25.26%, 50.17% of the pitch", () => {
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
    // stagePitch with smooth movement (row 2c): x 25.261753646265802, y 50.17082478016053. The
    // pitch is 64 units tall per 100 wide, so 50.17% of its height is 32.11 units of its width.
    // origin/main before row 2c (458c56e) drew 25.10%, 50.00%.
    expect(style(USER_5)).toBe(
      "transform: translate3d(25.26cqi, 32.11cqi, 0) translate(-50%, -70%)",
    );
    // stagePitch with smooth movement (row 2c): x 8.507648471302096, y 47.93649973727299.
    expect(style('[data-side="user"][data-slot="0"]')).toBe(
      "transform: translate3d(8.51cqi, 30.68cqi, 0) translate(-50%, -70%)",
    );
  });

  it("at 12' with the goal 1.2 s in, the ball sits in the net at 89.88%, 50.49%, lofted 0.78", () => {
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
    // stagePitch with smooth movement (row 2c): x 89.88173673243108, y 50.494303308207186, loft
    // 0.7819825271100007. origin/main before row 2c (458c56e) drew 89.89%, 50.39%.
    expect(style('[data-testid="broadcast-ball"]')).toBe(
      "transform: translate3d(89.88cqi, 32.32cqi, 0) translate(-50%, -50%); --loft: 0.78; --spin: 3480",
    );
    // stagePitch with smooth movement (row 2c): the trail runs from 83.34202465577835,
    // 50.892492084262976 to the ball, curving 3.5 above their midpoint.
    expect(document.querySelector('[data-testid="pitch-trails"] path')?.getAttribute("d")).toBe(
      "M 83.34 32.57 Q 86.61 30.20 89.88 32.32",
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
    const frame = (now: number) => ({
      clock: 12,
      now,
      fired: GOAL,
      kicks: 0,
      kickProgress: 0,
      speed: 1,
    });
    expect(feed.publish(frame(at(0.2)))).toBe(false);
    expect(feed.publish(frame(at(0.26)))).toBe(true);
  });
});

describe("shootout frames (catches a penalty that only moves at the 10 Hz render)", () => {
  const u = (n: number, scored: boolean): PenKick => ({ side: "user", taker: id(n), scored });
  const o = (n: number, scored: boolean): PenKick => ({
    side: "opp",
    taker: { kind: "species", id: id(n) },
    scored,
  });
  // shootout-staging.test.ts's opening kicks: the user's first taker scores.
  const PENS: PlayedMatch = {
    ...MATCH,
    round: "F",
    regulation: { user: 0, opp: 0 },
    extraTime: { user: 0, opp: 0 },
    shootout: {
      user: 1,
      opp: 0,
      keeper: id(9),
      kicks: [u(6, true), o(149, false)],
      decider: "kicks",
      coinWinner: null,
    },
    outcome: "W",
    goals: [],
    saves: [],
    incidents: [],
  };
  const T = buildTimeline(PENS, { matchIndex: 0, seed: "pens", lineup: LINEUP });
  // Measured from a plain render at kickProgress 0.5: past the strike (0.35), short of the goal
  // (0.6), so the ball is in the air.
  const FLIGHT =
    "transform: translate3d(95.00cqi, 33.92cqi, 0) translate(-50%, -50%); --loft: 0.33; --spin: 324.00000000000006";
  const ball = () => style('[data-testid="broadcast-ball"]');
  const stand = (kickProgress: number) => {
    render(
      <Broadcast
        match={PENS}
        timeline={T}
        lineup={LINEUP}
        clock={T.finalMinute}
        now={5000}
        fired={{}}
        kicks={0}
        kickProgress={kickProgress}
        motion={true}
        speed={1}
      />,
    );
    const seen = ball();
    cleanup();
    return seen;
  };

  it("a frame at kickProgress 0.5 between renders at 0.2 paints the ball in flight, as a render at 0.5 does", () => {
    const flight = stand(0.5);
    const runUp = stand(0.2);
    expect(flight).toBe(FLIGHT);
    expect(runUp).not.toBe(flight);

    const feed = frameSource();
    render(
      <Broadcast
        match={PENS}
        timeline={T}
        lineup={LINEUP}
        clock={T.finalMinute}
        now={5000}
        fired={{}}
        kicks={0}
        kickProgress={0.2}
        motion={true}
        speed={1}
        feed={feed}
      />,
    );
    expect(ball()).toBe(runUp);
    feed.publish({
      clock: T.finalMinute,
      now: 5016,
      fired: {},
      kicks: 0,
      kickProgress: 0.5,
      speed: 1,
    });
    expect(ball()).toBe(flight);
  });

  // The keeper's reaction also starts at 0.6, so this holds with or without the kick dots in the
  // render key; the dots ride on the same render.
  it("the frame where the kick lands asks for a render, so its dot fills on that frame", () => {
    const feed = frameSource();
    render(
      <Broadcast
        match={PENS}
        timeline={T}
        lineup={LINEUP}
        clock={T.finalMinute}
        now={5000}
        fired={{}}
        kicks={0}
        kickProgress={0.5}
        motion={true}
        speed={1}
        feed={feed}
      />,
    );
    const frame = (kickProgress: number) => ({
      clock: T.finalMinute,
      now: 5016,
      fired: {},
      kicks: 0,
      kickProgress,
      speed: 1,
    });
    expect(feed.publish(frame(0.55))).toBe(false);
    expect(feed.publish(frame(0.6))).toBe(true);
  });
});
