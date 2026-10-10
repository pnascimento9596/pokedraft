// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
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
  sessionStorage.clear();
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

describe("a run survives a reload (SA-08, SB-06)", () => {
  const RUN_TEST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
  const E2E_151 = "mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151";

  // Unmounting and mounting again is what a reload, a discarded tab or Back then Forward does to
  // the screen: React state is gone and only what the tab stored can bring the run back.
  const reload = (ui: ReactElement) => {
    cleanup();
    render(ui);
  };

  const pickGulpinAtStriker = () => {
    fireEvent.click(screen.getByTestId("run-start"));
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
  };

  const draftSixteen = () => {
    for (let round = 1; round <= 16; round++) {
      expect(screen.getByTestId("round-header").textContent).toBe(`Round ${round} of 16`);
      fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
      fireEvent.click(
        document.querySelector<HTMLElement>(
          '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
        )!,
      );
    }
  };

  it("brings a draft in progress back at the same round with the same squad after a reload (catches a run that lives only in React state)", () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    pickGulpinAtStriker();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(<PlayScreen />);

    expect(screen.queryByTestId("run-start")).toBeNull();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
  });

  it("brings a finished, unsubmitted run back to its results with the same record and the submit form (catches losing the only chance to submit)", () => {
    query.current = E2E_151;
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    draftSixteen();
    fireEvent.click(screen.getByTestId("see-results"));
    expect(screen.getByTestId("results-record").textContent).toBe("3-0-2");

    reload(<PlayScreen />);

    expect(screen.getByTestId("results-record").textContent).toBe("3-0-2");
    expect(screen.getByTestId("submit-panel")).toBeTruthy();
  });

  it("forgets the run after New run, so the next load starts clean", () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    pickGulpinAtStriker();
    fireEvent.click(screen.getByTestId("new-run"));

    reload(<PlayScreen />);

    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("does not put a stored run on a different shared seed (catches a saved run hijacking another link)", () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    pickGulpinAtStriker();

    query.current = RUN_TEST.replace("seed=run-test", "seed=other-seed");
    reload(<PlayScreen />);

    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("restores a Daily run on the same New York date only", () => {
    const daily = (date: string) => (
      <Challenge settings={dailySettings("4-3-3")} querySeed={null} daily={date as IsoDate} />
    );
    render(daily("2026-10-10"));
    fireEvent.click(screen.getByTestId("run-start"));
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      )!,
    );
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(daily("2026-10-10"));
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(daily("2026-10-11"));
    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("still plays when the browser refuses storage (private windows, blocked site data)", () => {
    const refuse = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(refuse);
    query.current = RUN_TEST;
    render(<PlayScreen />);
    pickGulpinAtStriker();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    fireEvent.click(screen.getByTestId("new-run"));
    expect(screen.getByTestId("run-start")).toBeTruthy();
    vi.restoreAllMocks();
  });
});
