// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CupResult,
  OpponentPlayerRef,
  PenKick,
  Seed,
  Shirt,
  SpeciesId,
  TeamRating,
} from "@/engine";
import { MatchdayLive } from "../MatchdayLive";
import type { PlayedMatch } from "../format";

const audio = vi.hoisted(() => ({ events: [] as string[] }));
vi.mock("@/components/wheel/sound", () => ({
  unlockAudio: () => audio.events.push("unlock"),
  playGoalHorn: () => audio.events.push("goal"),
}));

const match: PlayedMatch = {
  status: "played",
  round: "G1",
  opponent: {
    id: "test",
    name: "Test Rovers",
    score: 700,
    lines: { GK: 70, DEF: 70, MID: 70, ATT: 70 },
    roster: Array.from({ length: 11 }, (_, i): OpponentPlayerRef => ({
      kind: "shirt",
      number: (i + 1) as Shirt,
    })),
  },
  regulation: { user: 2, opp: 0 },
  extraTime: null,
  shootout: null,
  outcome: "W",
  goals: [3, 6].map((minute) => ({
    side: "user" as const,
    minute,
    penalty: false,
    scorer: 1 as SpeciesId,
    assist: null,
  })),
  absences: [],
  rating: 800,
  recap: [],
};

function cup(matches: readonly PlayedMatch[] = [match]): CupResult {
  const player = { species: 1 as SpeciesId, goals: 2, assists: 0, appearances: 1 };
  return {
    engine: "pokedraft-engine-4",
    seed: "broadcast-test" as Seed,
    mode: "cup8",
    rating: { score: 800 } as TeamRating,
    group: [],
    matches,
    wins: 1,
    draws: 0,
    losses: 0,
    finish: "champion",
    flawless: false,
    players: [player],
    awards: {
      goldenBoot: player,
      topAssister: null,
      playerOfTournament: player,
      potContribution: null,
    },
  };
}

function penalties(decider: "kicks" | "coin" | "decree" = "kicks"): PlayedMatch {
  const pairs = decider === "coin" ? 205 : decider === "decree" ? 26 : 8;
  const kicks: PenKick[] = [];
  for (let i = 0; i < pairs; i++) {
    kicks.push({ side: "user", taker: 1 as SpeciesId, scored: true });
    kicks.push({
      side: "opp",
      taker: { kind: "shirt", number: 9 as Shirt },
      scored: decider === "coin" || i < pairs - 1,
    });
  }
  return {
    ...match,
    round: "F",
    regulation: { user: 0, opp: 0 },
    extraTime: { user: 0, opp: 0 },
    goals: [],
    outcome: decider === "coin" ? "L" : "W",
    shootout: {
      user: pairs,
      opp: decider === "coin" ? pairs : pairs - 1,
      keeper: 1 as SpeciesId,
      kicks,
      decider,
      coinWinner: decider === "coin" ? "opp" : null,
    },
  };
}

function tick(count = 1) {
  for (let i = 0; i < count; i++) act(() => vi.advanceTimersByTime(80));
}

beforeEach(() => {
  audio.events.length = 0;
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MatchdayLive regression guards", () => {
  it.each(["pokedraft-engine-1", "pokedraft-engine-2"] as const)(
    "uses the recorded FT score for %s when goal events are unavailable",
    (engine) => {
      const recorded = {
        ...match,
        regulation: { user: 2, opp: 1 },
        extraTime: { user: 1, opp: 0 },
        goals: [],
      };
      render(<MatchdayLive cup={{ ...cup([recorded]), engine }} onClose={() => {}} />);
      expect(screen.getByTestId("broadcast-score").textContent).toBe("3 - 1");
      expect(
        screen.getByText("Goal timeline unavailable for this recorded match.").textContent,
      ).toBe("Goal timeline unavailable for this recorded match.");
      expect((screen.getByTestId("broadcast-replay-btn") as HTMLButtonElement).disabled).toBe(true);
    },
  );

  it("shows a recorded save in the feed once the clock reaches its minute, with no goal horn", () => {
    const saved: PlayedMatch = {
      ...match,
      saves: [
        {
          kind: "save",
          side: "user",
          minute: 4,
          attacker: 25 as SpeciesId,
          keeper: 7 as SpeciesId,
        },
      ],
    };
    render(<MatchdayLive cup={cup([saved])} onClose={() => {}} />);
    expect(screen.getByTestId("broadcast-save").textContent).toBe(
      "Save for Your XI4' Squirtle saves Pikachu's shot",
    );
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    tick();
    expect(screen.queryByTestId("broadcast-save")).toBeNull();
    tick();
    expect(screen.getByTestId("broadcast-save").textContent).toBe(
      "Save for Your XI4' Squirtle saves Pikachu's shot",
    );
    expect(audio.events).toEqual(["unlock", "goal", "goal"]);
  });

  it("unlocks audio in the replay click before a timer can play the first horn", () => {
    render(<MatchdayLive cup={cup()} onClose={() => {}} />);
    expect(screen.getByTestId("broadcast-score").textContent).toBe("2 - 0");
    expect(audio.events).toEqual([]);
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    expect(audio.events).toEqual(["unlock"]);
    tick();
    expect(screen.getByTestId("broadcast-score").textContent).toBe("1 - 0");
    expect(audio.events).toEqual(["unlock", "goal"]);
  });

  it("does not duplicate goal horns when Strict Mode rechecks state updaters", () => {
    render(
      <StrictMode>
        <MatchdayLive cup={cup()} onClose={() => {}} />
      </StrictMode>,
    );
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    tick(2);
    expect(screen.getByTestId("broadcast-score").textContent).toBe("2 - 0");
    expect(audio.events.filter((event) => event === "goal")).toEqual(["goal", "goal"]);
    tick(28);
    expect(screen.getByText("FT").textContent).toBe("FT");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses the replay clock and resumes from the same minute rather than restarting", () => {
    render(<MatchdayLive cup={cup()} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    tick(2);
    expect(screen.getByText("6'").textContent).toBe("6'");
    fireEvent.click(screen.getByRole("button", { name: "Pause Replay" }));
    tick(5);
    expect(screen.getByText("6'").textContent).toBe("6'");
    fireEvent.click(screen.getByRole("button", { name: "Resume Replay" }));
    tick();
    expect(screen.getByText("9'").textContent).toBe("9'");
    expect(audio.events).toEqual(["unlock", "goal", "goal", "unlock"]);
    fireEvent.click(screen.getByRole("button", { name: "Skip to Full Time" }));
    expect(screen.getByTestId("broadcast-score").textContent).toBe("2 - 0");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels replay ticks on round selection and unmount", () => {
    const other: PlayedMatch = {
      ...match,
      round: "G2",
      goals: [],
      regulation: { user: 0, opp: 0 },
      outcome: "D",
    };
    const { unmount } = render(<MatchdayLive cup={cup([match, other])} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    fireEvent.click(screen.getByTestId("broadcast-round-G2"));
    tick(3);
    expect(screen.getByTestId("broadcast-score").textContent).toBe("0 - 0");
    expect(screen.getByText("FT").textContent).toBe("FT");
    expect(audio.events.filter((event) => event === "goal")).toEqual([]);
    fireEvent.click(screen.getByTestId("broadcast-replay-btn"));
    tick();
    expect(screen.getByText("3'").textContent).toBe("3'");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows every sudden-death kick including the decisive miss without inventing a save", () => {
    render(<MatchdayLive cup={cup([penalties()])} onClose={() => {}} />);
    const shootout = screen.getByTestId("broadcast-shootout");
    expect(within(shootout).getAllByRole("listitem")).toHaveLength(16);
    expect(within(shootout).getAllByRole("listitem")[15]!.textContent).toContain("Not scored");
    expect(shootout.textContent).not.toContain("Saved");
    expect(shootout.textContent).toContain("Your XI won. 8-7 on pens");
  });

  it("lets the user step through shootout kicks without leaking the final outcome", () => {
    render(<MatchdayLive cup={cup([penalties()])} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Replay Shootout" }));
    const shootout = screen.getByTestId("broadcast-shootout");
    expect(within(shootout).queryAllByRole("listitem")).toHaveLength(0);
    expect(shootout.textContent).toContain("Your XI 0 - 0 Test Rovers");
    expect(shootout.textContent).not.toContain("Your XI won.");
    fireEvent.click(screen.getByRole("button", { name: "Next Kick" }));
    expect(within(shootout).getAllByRole("listitem")).toHaveLength(1);
    expect(shootout.textContent).toContain("Your XI 1 - 0 Test Rovers");
    fireEvent.click(screen.getByRole("button", { name: "Show All Kicks" }));
    expect(within(shootout).getAllByRole("listitem")).toHaveLength(16);
    expect(shootout.textContent).toContain("Your XI won. 8-7 on pens");
  });

  it("discloses a coin-toss loss after all 410 capped kicks instead of suggesting a drawn outcome", () => {
    render(<MatchdayLive cup={cup([penalties("coin")])} onClose={() => {}} />);
    const shootout = screen.getByTestId("broadcast-shootout");
    expect(within(shootout).getAllByRole("listitem")).toHaveLength(410);
    expect(shootout.textContent).toContain(
      "Your XI lost. Lost on a coin toss after 200 sudden-death rounds",
    );
    expect(shootout.textContent).toContain("Your XI 205 - 205 Test Rovers");
  });

  it("discloses the retained-engine decree rather than presenting its synthetic pair as a natural win", () => {
    render(<MatchdayLive cup={cup([penalties("decree")])} onClose={() => {}} />);
    const shootout = screen.getByTestId("broadcast-shootout");
    expect(within(shootout).getAllByRole("listitem")).toHaveLength(52);
    expect(shootout.textContent).toContain("Won on penalties (decided after 20 rounds)");
  });
});
