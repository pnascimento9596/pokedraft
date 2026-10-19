// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, GoalKind, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { frameSource, type FrameSource } from "@/ui/matchday/feed";
import { buildTimeline, SHOW, type Timeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

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

function matchWith(
  shot: { kind: "goal"; goalKind: GoalKind } | { kind: "save" },
  minute: number,
): PlayedMatch {
  return {
    status: "played",
    round: "G1",
    opponent: OPPONENT,
    regulation: { user: shot.kind === "goal" ? 1 : 0, opp: 0 },
    extraTime: null,
    shootout: null,
    outcome: shot.kind === "goal" ? "W" : "D",
    goals:
      shot.kind === "goal"
        ? [
            {
              side: "user",
              minute,
              penalty: shot.goalKind === "penalty",
              kind: shot.goalKind,
              scorer: id(6),
              assist: shot.goalKind === "open-play" ? id(25) : null,
            },
          ]
        : [],
    saves:
      shot.kind === "save"
        ? [{ kind: "save", side: "opp", minute, attacker: id(25), keeper: id(143) }]
        : [],
    incidents: [],
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
  } as PlayedMatch;
}

afterEach(cleanup);

const FRAME = 1000 / 60;
// Live pace: 45 minutes in 25 s.
const MINUTE_MS = 25_000 / 45;

function mount(match: PlayedMatch, camera: "follow" | "full", motion = true) {
  const timeline = buildTimeline(match, { matchIndex: 0, seed: "bc-test", lineup: LINEUP });
  const feed = frameSource();
  render(
    <Broadcast
      match={match}
      timeline={timeline}
      lineup={LINEUP}
      clock={1}
      now={0}
      fired={{}}
      kicks={0}
      motion={motion}
      speed={1}
      feed={feed}
      camera={camera}
    />,
  );
  return { timeline, feed };
}

/** Plays open play from `from` minutes for `ms` of 60 Hz frames, starting at real time `now`. */
function openPlay(feed: FrameSource, from: number, now: number, ms: number): number {
  let t = now;
  for (; t < now + ms; t += FRAME) {
    feed.publish({
      clock: from + (t - now) / MINUTE_MS,
      now: t,
      fired: {},
      kicks: 0,
      kickProgress: 0,
      speed: 1,
    });
  }
  return t;
}

function firstShot(timeline: Timeline) {
  const beat = timeline.beats.find((b) => b.kind === "goal" || b.kind === "save")!;
  const key =
    beat.kind === "goal"
      ? `goal:${beat.minute}:${beat.side}:${beat.scorer.name}`
      : beat.kind === "save"
        ? `save:${beat.minute}:${beat.side}:${beat.keeper.name}:${beat.attacker.name}`
        : "";
  return { beat, key, show: SHOW[beat.kind] };
}

const camera = () => screen.getByTestId("pitch").getAttribute("style") ?? "";

describe("follow camera zoom (catches a camera that stays zoomed in on goals and saves)", () => {
  it("zoom is 1.6 in open play: after a second of open play at 6' the pitch reads scale(1.600)", () => {
    const { feed } = mount(matchWith({ kind: "goal", goalKind: "open-play" }, 30), "follow");
    openPlay(feed, 6, 0, 1000);
    expect(camera()).toMatch(
      /^transform: translate\(-?\d+\.\d\d%, -?\d+\.\d\d%\) scale\(1\.600\)$/,
    );
  });

  it.each([
    ["an open-play goal", { kind: "goal", goalKind: "open-play" }],
    ["a penalty goal", { kind: "goal", goalKind: "penalty" }],
    ["a free-kick goal", { kind: "goal", goalKind: "free-kick" }],
    ["a save", { kind: "save" }],
  ] as const)(
    "zoom is 1.0 during a pinned goal beat: halfway through %s at 30' the pitch is at scale(1.000) with no translation",
    (_, shot) => {
      const { timeline, feed } = mount(matchWith(shot, 30), "follow");
      const at = openPlay(feed, 29, 0, 1000);
      const { key, show } = firstShot(timeline);
      for (let t = at; t <= at + show / 2; t += FRAME) {
        feed.publish({
          clock: 30,
          now: t,
          fired: { [key]: at },
          kicks: 0,
          kickProgress: 0,
          speed: 1,
        });
      }
      expect(camera()).toBe("transform: translate(0.00%, 0.00%) scale(1.000)");
    },
  );

  it("zooms back in to 1.6 once the goal and its settle are over", () => {
    const { timeline, feed } = mount(
      matchWith({ kind: "goal", goalKind: "open-play" }, 30),
      "follow",
    );
    const at = openPlay(feed, 29, 0, 1000);
    const { key } = firstShot(timeline);
    // The goal stages for 2,600 ms and settles for 600 ms more; the zoom then eases back over 400.
    let t = at;
    for (; t <= at + 4_000; t += FRAME) {
      feed.publish({
        clock: 30 + Math.max(0, t - at - 3_200) / MINUTE_MS,
        now: t,
        fired: { [key]: at },
        kicks: 0,
        kickProgress: 0,
        speed: 1,
      });
    }
    expect(camera()).toMatch(/ scale\(1\.600\)$/);
  });

  it("Full pitch writes no camera transform", () => {
    const { feed } = mount(matchWith({ kind: "goal", goalKind: "open-play" }, 30), "full");
    openPlay(feed, 6, 0, 1000);
    expect(camera()).toBe("");
    expect(screen.getByTestId("broadcast").dataset.camera).toBe("full");
  });

  it("with motion off, Follow cuts to the ball at 1.6 without easing", () => {
    mount(matchWith({ kind: "goal", goalKind: "open-play" }, 30), "follow", false);
    expect(camera()).toMatch(
      /^transform: translate\(-?\d+\.\d\d%, -?\d+\.\d\d%\) scale\(1\.600\)$/,
    );
    expect(screen.getByTestId("broadcast").dataset.camera).toBe("follow");
  });
});
