// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BenchIndex, FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import type { Touchline as TouchlineState } from "@/ui/manager/touchline";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";
import { MatchPlayer } from "../MatchPlayer";
import { Touchline } from "../Touchline";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;
const ROSTER = [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
  kind: "species" as const,
  id: id(n),
}));
const OPPONENT = {
  id: "o",
  name: "Opp",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: ROSTER,
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
    {
      side: "user",
      minute: 12,
      penalty: false,
      kind: "open-play",
      scorer: id(6),
      assist: id(25),
    },
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

const TIMELINE = buildTimeline(MATCH, { matchIndex: 0, seed: "bc-test", lineup: LINEUP });

describe("Broadcast (catches a pitch that renders a plain circle instead of a paneled soccer ball SVG, or hides the ball carrier and shot trail)", () => {
  it("renders a paneled SVG soccer ball, the active ball carrier badge and yellow-card pips on the pitch", () => {
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
    const ball = screen.getByTestId("broadcast-ball");
    const svg = screen.getByTestId("soccer-ball-svg");
    expect(ball.contains(svg)).toBe(true);
    expect(svg.querySelectorAll("polygon, path").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByTestId("ball-carrier").textContent?.length).toBeGreaterThan(0);
    expect(screen.getByTestId("pitch-card-user-2")).not.toBeNull();
  });

  it("draws the active shot trajectory trail during a goal beat", () => {
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
    const trails = screen.getByTestId("pitch-trails");
    expect(trails.getAttribute("data-kind")).toBe("shot");
  });
});

describe("pitch nameplates (catches a long name whose plate spans a third of a phone pitch)", () => {
  const crab = Array.from({ length: 11 }, () => id(740));
  const lineup = { ...LINEUP, starters: crab } as unknown as FullLineup;
  const match: PlayedMatch = {
    ...MATCH,
    opponent: {
      ...OPPONENT,
      roster: crab.map((n) => ({ kind: "species" as const, id: n })),
    } as unknown as Opponent,
    goals: [],
    saves: [],
    incidents: [],
    regulation: { user: 0, opp: 0 },
    outcome: "D",
    windows: MATCH.windows!.map((w) => ({ ...w, onPitch: crab })),
  };
  const timeline = buildTimeline(match, { matchIndex: 0, seed: "bc-test", lineup });

  it("shows Crabominable's plate as Crabomina…", () => {
    render(
      <Broadcast
        match={match}
        timeline={timeline}
        lineup={lineup}
        clock={6.5}
        now={1000}
        fired={{}}
        kicks={0}
        motion={true}
        speed={1}
      />,
    );
    expect(screen.getByTestId("ball-carrier").textContent).toBe("Crabomina…");
  });

  it("draws the trails in the pitch's own 100 by 64 box, so a trail origin stays round", () => {
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
    const trails = screen.getByTestId("pitch-trails");
    expect(trails.getAttribute("viewBox")).toBe("0 0 100 64");
    expect(trails.getAttribute("preserveAspectRatio")).toBeNull();
  });
});

describe("MatchPlayer and Touchline UX (catches a match screen with no sound toggle, no tactical HUD, or no click-to-sub on energy rows)", () => {
  it("renders the live tactical HUD and toggles match sound from the control bar", () => {
    render(
      <MatchPlayer
        match={MATCH}
        matchIndex={0}
        seed="mp-test"
        lineup={LINEUP}
        view="quick"
        manager={{ actions: [], decide: () => null }}
      />,
    );
    const hud = screen.getByTestId("match-hud");
    expect(hud.textContent).toContain("Balanced");
    expect(hud.textContent).toContain("Defend");

    const soundBtn = screen.getByTestId("sound-toggle");
    expect(soundBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(soundBtn);
    expect(soundBtn.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(localStorage.getItem("pokedraft:sound")!)).toBe(true);
  });

  it("selects a player for substitution when their row in the energy list is clicked", () => {
    const seat = (index: number, species: number) => ({
      index: index as BenchIndex,
      species: id(species),
      available: true,
    });
    const line: TouchlineState = {
      minute: 45,
      tactic: "balanced",
      managed: false,
      subsUsed: 0,
      onPitch: XI,
      energy: [95, 88, 84, 82, 58, 80, 79, 77, 75, 74, 72],
      bench: [seat(0, 130), seat(1, 131), seat(2, 132), seat(3, 133), seat(4, 134)],
      open: true,
    };
    const onDecide = vi.fn();
    render(<Touchline line={line} formation="4-3-3" onDecide={onDecide} error={null} />);
    const offSelect = screen.getByTestId("sub-off") as HTMLSelectElement;
    expect(offSelect.value).toBe("10");
    fireEvent.click(screen.getByTestId("energy-slot-4"));
    expect(offSelect.value).toBe("4");
  });
});
