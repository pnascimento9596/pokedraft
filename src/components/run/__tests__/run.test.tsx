// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IsoDate } from "@/engine";
import { dailySettings } from "@/leaderboard/daily";
import { Challenge, PlayScreen } from "../PlayScreen";
import { DAILY_2026_10_10_CUP8, GOLDEN_1_KANTO151 } from "./ladders";

const query = { current: "" };
const fresh = { seed: "golden-1" };

// A fresh run draws its seed at Start; the tests pin it so the drawn ladder has a literal value.
vi.mock("@/ui/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui/settings")>()),
  freshSeed: () => fresh.seed,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("challenge run screen", () => {
  it("places the selected candidate into the tapped open slot and advances the round, so Squad First picks reach the engine", () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");

    const gulpin = screen.getByTestId("candidate-316");
    fireEvent.click(gulpin);
    expect(gulpin.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));

    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
  });

  it("clears the hint for a tap that did nothing after 4 seconds, and not before", () => {
    vi.useFakeTimers();
    try {
      query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
      render(<PlayScreen />);
      fireEvent.click(screen.getByTestId("run-start"));
      fireEvent.click(screen.getByTestId("candidate-316"));
      fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
      fireEvent.click(screen.getByRole("button", { name: "ST Gulpin" }));
      act(() => vi.advanceTimersByTime(3999));
      expect(screen.queryAllByRole("status").length).toBe(1);
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryAllByRole("status").length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the rolled Hoenn poison list without any fit or rating, so ranked runs stay blind", () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    const names = screen.getAllByTestId(/^candidate-/).map((el) => el.getAttribute("data-testid"));
    expect(names).toEqual([
      "candidate-269",
      "candidate-315",
      "candidate-316",
      "candidate-317",
      "candidate-336",
    ]);
    expect(screen.getByTestId("candidate-269").textContent).toBe("Dustox#269BugPoison");
  });

  it("refuses a pick into a filled slot with a message instead of crashing", () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    fireEvent.click(screen.getByRole("button", { name: "ST Gulpin" }));
    expect(screen.getByRole("status").textContent).toBe(
      "That slot is taken. Drag one player onto another to swap them.",
    );
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
  });

  it("shows a friendly message for a broken challenge link instead of a blank page", () => {
    query.current = "mode=cup9&f=4-3-3";
    render(<PlayScreen />);
    expect(screen.getByRole("heading").textContent).toBe("That challenge link does not work");
    expect(screen.getByRole("link", { name: "Back home" }).getAttribute("href")).toBe("/");
  });
});

describe("road to the final on the run screens", () => {
  const ratings = () => screen.queryAllByText(/, rating \d+$/).map((el) => el.textContent);
  const SHARED = "mode=kanto151&f=4-4-2&order=squadFirst&seed=golden-1";
  const FRESH = "mode=kanto151&f=4-4-2&order=squadFirst";

  it("shows a shared link's exact ladder on the start screen and again on the draft board (catches a strip fed a different seed than the run)", () => {
    query.current = SHARED;
    render(<PlayScreen />);
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    fireEvent.click(screen.getByTestId("run-start"));
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
  });

  it("shows no rating on a fresh start screen, then the ladder of the seed Start drew (catches a nominal or guessed number before the seed exists)", () => {
    query.current = FRESH;
    fresh.seed = "golden-1";
    render(<PlayScreen />);
    expect(ratings()).toEqual([]);
    expect(screen.getByText("Your opponents are set the moment you start the run.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("run-start"));
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
  });

  it("returns to no ratings after New run, because the next Start draws a new seed (catches the old link's ladder staying on a run that will not use it)", () => {
    query.current = SHARED;
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    fireEvent.click(screen.getByTestId("new-run"));
    expect(screen.getByTestId("run-start")).toBeTruthy();
    expect(ratings()).toEqual([]);
  });

  it("shows the daily seed's exact ladder on the Daily start screen and on its draft board", () => {
    render(
      <Challenge
        settings={dailySettings("4-3-3")}
        querySeed={null}
        daily={"2026-10-10" as IsoDate}
      />,
    );
    expect(ratings()).toEqual(DAILY_2026_10_10_CUP8);
    fireEvent.click(screen.getByTestId("run-start"));
    expect(ratings()).toEqual(DAILY_2026_10_10_CUP8);
  });
});
