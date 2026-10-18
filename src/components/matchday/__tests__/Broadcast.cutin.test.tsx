// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { movesetFor } from "@/data/movesets";
import type { FullLineup, MatchResult, Opponent, SpeciesId } from "@/engine/types";
import { buildTimeline } from "@/ui/matchday/timeline";
import { Broadcast } from "../Broadcast";

afterEach(cleanup);

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
  regulation: { user: 2, opp: 1 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [
    { side: "user", minute: 12, penalty: false, kind: "open-play", scorer: id(6), assist: id(25) },
    {
      side: "opp",
      minute: 40,
      penalty: false,
      kind: "header",
      scorer: { kind: "species", id: id(149) },
      assist: null,
    },
    { side: "user", minute: 70, penalty: false, kind: "solo", scorer: id(25), assist: null },
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

const TIMELINE = buildTimeline(MATCH, {
  matchIndex: 0,
  seed: "bc-test",
  lineup: LINEUP,
  movesOf: movesetFor,
});

function show(
  clock: number,
  fired: Record<string, number>,
  now: number,
  cutIns: boolean,
  motion = true,
) {
  render(
    <Broadcast
      match={MATCH}
      timeline={TIMELINE}
      lineup={LINEUP}
      clock={clock}
      now={now}
      fired={fired}
      kicks={0}
      motion={motion}
      speed={1}
      cutIns={cutIns}
    />,
  );
  return screen.queryByTestId("cut-in");
}

describe("cut-ins (catches a big lower-third card that is missing on a goal, or shows for an ordinary pass)", () => {
  it("shows the scorer's sprite, move and type on a goal", () => {
    const card = show(12, { "goal:12:user:Charizard": 1000 }, 2200, true)!;
    expect(card.getAttribute("data-kind")).toBe("goal");
    expect(card.querySelector("img")).not.toBeNull();
    expect(screen.getByTestId("move-callout").textContent).toBe("Charizard used Slash!");
    expect(screen.getByTestId("cut-in-type").getAttribute("data-type")).toBe("normal");
    expect(screen.getByTestId("cut-in-type").textContent).toBe("Normal");
  });

  it("shows the keeper's move on a save, a shot on target", () => {
    const card = show(12, { "save:12:opp:Snorlax:Pikachu": 1000 }, 1500, true)!;
    expect(card.getAttribute("data-kind")).toBe("save");
    expect(card.getAttribute("data-side")).toBe("opp");
    expect(screen.getByTestId("save-callout").textContent).toBe("Snorlax used Reflect!");
    expect(screen.getByTestId("cut-in-type").textContent).toBe("Psychic");
  });

  it("shows the duel winner on the key duel that sets up the 40' goal", () => {
    const card = show(39.2, {}, 1000, true)!;
    expect(card.getAttribute("data-kind")).toBe("duel");
    expect(card.getAttribute("data-side")).toBe("opp");
    expect(screen.getByTestId("duel-callout").textContent).toBe("Moltres used Peck!");
    expect(screen.getByTestId("cut-in-type").getAttribute("data-type")).toBe("flying");
  });

  it("keeps an ordinary open-play callout on the pitch with no cut-in", () => {
    expect(show(5.5, {}, 1000, true)).toBeNull();
    expect(screen.getByTestId("pitch-ability").textContent).toBe("Dragonite used Hurricane!");
  });

  it("shows no cut-in for a card", () => {
    expect(show(5.5, { "card:5:user:2:yellow": 1000 }, 1500, true)).toBeNull();
    expect(screen.getByTestId("card-flash")).not.toBeNull();
  });

  it("shows no cut-in in Quick, where the goal keeps its plain line", () => {
    expect(show(12, { "goal:12:user:Charizard": 1000 }, 2200, false, false)).toBeNull();
    expect(screen.getByTestId("move-callout").textContent).toBe("Charizard used Slash!");
  });

  it("still shows the goal card, unanimated, with reduced motion in a live match", () => {
    const card = show(12, { "goal:12:user:Charizard": 1000 }, 2200, true, false)!;
    expect(card.getAttribute("data-kind")).toBe("goal");
    expect(screen.getByTestId("broadcast").getAttribute("data-motion")).toBe("off");
  });
});
