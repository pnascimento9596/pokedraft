// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { FullLineup, MatchResult, Opponent, PenKick, SpeciesId } from "@/engine/types";
import type { MatchView } from "@/ui/settings";
import { setSoundEnabled } from "@/components/wheel/sound";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";
import { MatchPlayer } from "../MatchPlayer";

const sound = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return {
    ...real,
    playAbilitySound: (effect: string) => sound.calls.push(`ability:${effect}`),
    playKickPass: () => sound.calls.push("kick"),
    playGoalHorn: () => sound.calls.push("horn"),
    playOppGoal: () => sound.calls.push("opp-goal"),
    playSaveSound: () => sound.calls.push("save"),
    playWhistle: (kind: string) => sound.calls.push(`whistle:${kind}`),
    startCrowdBed: () => sound.calls.push("bed:start"),
    stopCrowdBed: () => sound.calls.push("bed:stop"),
    setCrowdLevel: () => sound.calls.push("bed:level"),
    crowdRoar: (r: { attackMs: number; holdMs: number; releaseMs: number }) =>
      sound.calls.push(`roar:${r.attackMs + r.holdMs + r.releaseMs}`),
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

const u = (n: number, scored: boolean): PenKick => ({ side: "user", taker: id(n), scored });
const o = (n: number, scored: boolean): PenKick => ({
  side: "opp",
  taker: { kind: "species", id: id(n) },
  scored,
});

function shootoutMatch(kicks: readonly PenKick[]): PlayedMatch {
  const user = kicks.filter((k) => k.side === "user" && k.scored).length;
  const opp = kicks.filter((k) => k.side === "opp" && k.scored).length;
  return {
    status: "played",
    round: "F",
    opponent: OPPONENT,
    regulation: { user: 0, opp: 0 },
    extraTime: { user: 0, opp: 0 },
    shootout: { user, opp, keeper: id(9), kicks, decider: "kicks", coinWinner: null },
    outcome: user > opp ? "W" : "L",
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

// Level 4-4 after ten kicks, then one sudden-death pair.
const TWELVE = shootoutMatch([
  u(6, true),
  o(149, false),
  u(25, true),
  o(142, true),
  u(19, true),
  o(148, true),
  u(16, false),
  o(147, true),
  u(13, true),
  o(146, true),
  u(10, false),
  o(145, true),
]);

const reduced = { value: false };

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
  sound.calls.length = 0;
  reduced.value = false;
  localStorage.clear();
  setSoundEnabled(true);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced.value && query.includes("reduce"),
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

describe("sudden-death banner (catches a shootout that never says it went to sudden death)", () => {
  const timeline = buildTimeline(TWELVE, { matchIndex: 0, seed: "pens", lineup: LINEUP });
  const show = (kicks: number, motion = true) =>
    render(
      <Broadcast
        match={TWELVE}
        timeline={timeline}
        lineup={LINEUP}
        clock={120}
        now={0}
        fired={{}}
        kicks={kicks}
        kickProgress={0.2}
        motion={motion}
        speed={1}
      />,
    );

  it("is absent on kick 10, the last regulation kick", () => {
    show(9);
    expect(screen.queryByTestId("sudden-death")).toBeNull();
  });

  it("shows from kick 11, with or without motion", () => {
    show(10);
    expect(screen.getByTestId("sudden-death").textContent).toBe("Sudden death");
    cleanup();
    show(11, false);
    expect(screen.getByTestId("sudden-death").textContent).toBe("Sudden death");
  });

  it("is gone once the shootout is over", () => {
    show(12);
    expect(screen.queryByTestId("sudden-death")).toBeNull();
  });
});

const stage = () => screen.getByTestId("match-player").getAttribute("data-stage");

async function playOut(view: MatchView, match: PlayedMatch): Promise<string[]> {
  render(
    <MatchPlayer match={match} matchIndex={0} seed="pens" lineup={LINEUP} view={view} autoStart />,
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  for (let i = 0; i < 20_000 && stage() !== "done"; i++) {
    await act(async () => {
      vi.advanceTimersByTime(16);
    });
  }
  expect(stage()).toBe("done");
  const calls = sound.calls.filter((c) => !c.startsWith("bed:"));
  // Everything after the "End of extra time" whistle belongs to the shootout.
  return calls.slice(calls.lastIndexOf("whistle:fulltime") + 1);
}

const TWO = shootoutMatch([u(6, true), o(149, false)]);

describe("shootout sounds (catches penalties played in dead silence)", () => {
  it("Live: whistle, strike, then the crowd roar on a goal and the glove on a save, per kick", async () => {
    expect(await playOut("live", TWO)).toEqual([
      "whistle:foul",
      "kick",
      "roar:1350",
      "whistle:foul",
      "kick",
      "save",
    ]);
  });

  it("Quick: the outcome beat only, the goal horn or the glove, per kick", async () => {
    expect(await playOut("quick", TWO)).toEqual(["horn", "save"]);
  });

  it("Live with reduced motion: the outcome beat only, like Quick", async () => {
    reduced.value = true;
    expect(await playOut("live", TWO)).toEqual(["horn", "save"]);
  });
});
