// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IsoDate } from "@/engine";
import { dailySettings } from "@/leaderboard/daily";
import { freshSeed } from "@/ui/settings";
import { Challenge, PlayScreen } from "../PlayScreen";
import { DAILY_2026_10_10_CUP8, GOLDEN_1_KANTO151 } from "./ladders";

const query = { current: "" };
const fresh = { seed: "golden-1" };

// A fresh run draws its seed at Start; the tests pin it so the drawn ladder has a literal value.
vi.mock("@/ui/settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/ui/settings")>()),
  freshSeed: vi.fn(() => fresh.seed),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fresh.seed = "golden-1";
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
  localStorage.clear();
});

// Start loads the draft (and the species data) with import(), so the board appears a tick later.
// The first import in a file transforms the data modules, which can pass 1 s on a busy machine.
async function start(): Promise<void> {
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
}

describe("challenge run screen", () => {
  it("places the selected candidate into the tapped open slot and advances the round, so Squad First picks reach the engine", async () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    await start();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");

    const gulpin = screen.getByTestId("candidate-316");
    fireEvent.click(gulpin);
    expect(gulpin.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));

    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
  });

  it("clears the hint for a tap that did nothing after 4 seconds, and not before", async () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    await start();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
      act(() => vi.advanceTimersByTime(3999));
      expect(screen.queryByTestId("draft-hint")?.textContent).toBe(
        "Choose a player first, then tap a slot.",
      );
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByTestId("draft-hint")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the rolled Hoenn poison list without any fit or rating, so ranked runs stay blind", async () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    await start();
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

  it("never picks into a filled slot: with a player chosen, a tap on a placed one picks it for a swap", async () => {
    query.current = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(screen.getByRole("button", { name: "ST Gulpin" }));
    expect({
      hint: screen.getByTestId("draft-hint").textContent,
      st: screen.getByTestId("slot-s9").getAttribute("aria-label"),
      round: screen.getByTestId("round-header").textContent,
    }).toEqual({
      hint: "Tap another slot to swap Gulpin, or tap it again to cancel.",
      st: "ST Gulpin",
      round: "Round 2 of 16",
    });
  });

  it("shows a friendly message for a broken challenge link instead of a blank page", () => {
    query.current = "mode=cup9&f=4-3-3";
    render(<PlayScreen />);
    expect(screen.getByRole("heading").textContent).toBe("That challenge link does not work");
    expect(screen.getByRole("link", { name: "Back home" }).getAttribute("href")).toBe("/");
  });
});

const CUP8_SQUAD_FIRST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";

function savePanelJson(panel: Record<string, unknown>): void {
  localStorage.setItem("pokedraft:panel", JSON.stringify(panel));
}

const fitTexts = () => screen.queryAllByTestId(/^fit-/).map((el) => el.textContent);

describe("Show ratings (challenges) on the draft screen", () => {
  it("shows the best-role rating on an offered player and the legend when the setting is on (Dustox: Best FB, 51 vs other FBs, raw fit 57)", async () => {
    savePanelJson({ showChallengeRatings: true });
    query.current = CUP8_SQUAD_FIRST;
    render(<PlayScreen />);
    await start();
    expect(screen.getByTestId("fit-269").textContent).toBe("Best: FB 51 vs other FBs");
    expect(
      screen.getByRole("button", { name: /Dustox/, description: "Raw fit 57 of 100 for FB" }),
    ).toBeTruthy();
    expect(screen.getByTestId("ratings-legend").textContent).toBe(
      "Ratings are 0 to 100, vs other players in the same role.",
    );
  });

  it("keeps the raw fit out of the button's own name, so the offered player is still announced by name only", async () => {
    savePanelJson({ showChallengeRatings: true });
    query.current = CUP8_SQUAD_FIRST;
    render(<PlayScreen />);
    await start();
    expect(screen.getByTestId("candidate-269").textContent).not.toContain("Raw fit");
  });

  it("shows a placed player's rating on the pitch token (Gulpin at ST: 5 vs other strikers)", async () => {
    savePanelJson({ showChallengeRatings: true });
    query.current = CUP8_SQUAD_FIRST;
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    expect(screen.getByTestId("slot-s9").textContent).toBe("ST Gulpin 5 vs other strikers");
  });

  it("rates every offered player at the committed slot's role in Position First, with no Best label (ST: Roselia 52, Gulpin 5, Seviper 71)", async () => {
    savePanelJson({ showChallengeRatings: true });
    query.current = "mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=open&seed=run-test";
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    expect(fitTexts()).toEqual([
      "24 vs other strikers",
      "52 vs other strikers",
      "5 vs other strikers",
      "38 vs other strikers",
      "71 vs other strikers",
    ]);
    expect(
      screen.getByRole("button", { name: /Gulpin/, description: "Raw fit 27 of 100 for ST" }),
    ).toBeTruthy();
  });

  it("rates a bench-slot offer at the player's best role in the 151 card layout (Magmar: Best ST 92)", async () => {
    savePanelJson({ showChallengeRatings: true });
    query.current = "mode=kanto151&f=4-3-3&order=positionFirst&seed=run-test";
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Empty SUB 1 slot" }));
    expect(fitTexts()).toEqual(["Best: ST 92 vs other strikers"]);
    expect(
      screen.getByRole("button", { name: /Magmar/, description: "Raw fit 85 of 100 for ST" }),
    ).toBeTruthy();
  });

  it("shows nothing extra with the setting off: no rating, no legend, no token note", async () => {
    query.current = CUP8_SQUAD_FIRST;
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    expect(fitTexts()).toEqual([]);
    expect(screen.queryByTestId("ratings-legend")).toBeNull();
    expect(screen.getByTestId("slot-s9").textContent).toBe("ST Gulpin");
    expect(document.body.textContent).not.toMatch(/vs other/);
  });

  it("is not switched on by the builder's Show ratings alone", async () => {
    savePanelJson({ showRatings: true });
    query.current = CUP8_SQUAD_FIRST;
    render(<PlayScreen />);
    await start();
    expect(fitTexts()).toEqual([]);
    expect(screen.queryByTestId("ratings-legend")).toBeNull();
    expect(screen.getByTestId("candidate-269").textContent).toBe("Dustox#269BugPoison");
  });
});

describe("road to the final on the run screens", () => {
  const ratings = () => screen.queryAllByText(/, rating \d+$/).map((el) => el.textContent);
  const SHARED = "mode=kanto151&f=4-4-2&order=squadFirst&seed=golden-1";
  const FRESH = "mode=kanto151&f=4-4-2&order=squadFirst";

  it("shows a shared link's exact ladder on the start screen and again on the draft board (catches a strip fed a different seed than the run)", async () => {
    query.current = SHARED;
    render(<PlayScreen />);
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    await start();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
  });

  it("shows no rating on a fresh start screen, then the ladder of the seed Start drew (catches a nominal or guessed number before the seed exists)", async () => {
    query.current = FRESH;
    fresh.seed = "golden-1";
    render(<PlayScreen />);
    expect(ratings()).toEqual([]);
    expect(screen.getByText("Your opponents are set the moment you start the run.")).toBeTruthy();
    await start();
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
  });

  it("returns to no ratings after New run, because the next Start draws a new seed (catches the old link's ladder staying on a run that will not use it)", async () => {
    query.current = SHARED;
    render(<PlayScreen />);
    await start();
    expect(ratings()).toEqual(GOLDEN_1_KANTO151);
    fireEvent.click(screen.getByTestId("new-run"));
    expect(screen.getByTestId("run-start")).toBeTruthy();
    expect(ratings()).toEqual([]);
  });

  it("shows the daily seed's exact ladder on the Daily start screen and on its draft board", async () => {
    render(
      <Challenge
        settings={dailySettings("4-3-3")}
        querySeed={null}
        daily={"2026-10-10" as IsoDate}
      />,
    );
    expect(ratings()).toEqual(DAILY_2026_10_10_CUP8);
    await start();
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

  const pickGulpinAtStriker = async () => {
    await start();
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

  it("brings a draft in progress back at the same round with the same squad after a reload (catches a run that lives only in React state)", async () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    await pickGulpinAtStriker();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(<PlayScreen />);

    // The restore loads the draft with import(), so the board appears a tick later.
    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    expect(screen.queryByTestId("run-start")).toBeNull();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
  });

  it("resumes an unseeded route without drawing a different fresh seed and restarting the squad", async () => {
    query.current = RUN_TEST.replace("&seed=run-test", "");
    fresh.seed = "run-test";
    render(<PlayScreen />);
    await pickGulpinAtStriker();
    const saved = sessionStorage.getItem("pokedraft.run.cup8");
    fresh.seed = "other-seed";

    reload(<PlayScreen />);

    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
    expect(sessionStorage.getItem("pokedraft.run.cup8")).toBe(saved);
    expect(freshSeed).toHaveBeenCalledTimes(1);
  });

  it("saves a new unseeded run before its first pick and keeps its seed after reopening", async () => {
    query.current = RUN_TEST.replace("&seed=run-test", "");
    fresh.seed = "run-test";
    render(<PlayScreen />);
    await start();
    expect(localStorage.getItem("pokedraft.run.cup8")).not.toBeNull();
    cleanup();
    sessionStorage.clear();
    fresh.seed = "other-seed";
    render(<PlayScreen />);
    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");
    expect(screen.getByTestId("candidate-316").textContent).toBe("Gulpin#316Poison");
    expect(freshSeed).toHaveBeenCalledTimes(1);
  });

  it("recovers the exact token and squad after the tab closes and only browser storage remains", async () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    await pickGulpinAtStriker();
    const saved = sessionStorage.getItem("pokedraft.run.cup8");
    expect(localStorage.getItem("pokedraft.run.cup8")).toBe(saved);
    cleanup();
    sessionStorage.clear();

    render(<PlayScreen />);

    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Gulpin");
    expect(sessionStorage.getItem("pokedraft.run.cup8")).toBe(saved);
  });

  it("brings a finished, unsubmitted run back to its results with the same record and the submit form (catches losing the only chance to submit)", async () => {
    query.current = E2E_151;
    render(<PlayScreen />);
    await start();
    draftSixteen();
    fireEvent.click(screen.getByTestId("see-results"));
    expect(screen.getByTestId("results-record").textContent).toBe("3-0-2");

    reload(<PlayScreen />);

    await screen.findByTestId("results-record", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("results-record").textContent).toBe("3-0-2");
    expect(screen.getByTestId("submit-panel")).toBeTruthy();
  });

  it("forgets the run after New run, so the next load starts clean", async () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    await pickGulpinAtStriker();
    fireEvent.click(screen.getByTestId("new-run"));

    reload(<PlayScreen />);

    await act(async () => {});
    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("does not put a stored run on a different shared seed (catches a saved run hijacking another link)", async () => {
    query.current = RUN_TEST;
    render(<PlayScreen />);
    await pickGulpinAtStriker();

    query.current = RUN_TEST.replace("seed=run-test", "seed=other-seed");
    reload(<PlayScreen />);

    await act(async () => {});
    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("returns to Start when a different shared seed opens in the same mounted play route", async () => {
    query.current = RUN_TEST;
    const view = render(<PlayScreen />);
    await pickGulpinAtStriker();
    query.current = RUN_TEST.replace("seed=run-test", "seed=other-seed");
    view.rerender(<PlayScreen />);
    await act(async () => {});
    expect(screen.getByTestId("run-start")).toBeTruthy();
    expect(screen.queryByTestId("round-header")).toBeNull();
  });

  it("restores a Daily run on the same New York date only", async () => {
    const daily = (date: string) => (
      <Challenge settings={dailySettings("4-3-3")} querySeed={null} daily={date as IsoDate} />
    );
    render(daily("2026-10-10"));
    await start();
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      )!,
    );
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(daily("2026-10-10"));
    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");

    reload(daily("2026-10-11"));
    await act(async () => {});
    expect(screen.getByTestId("run-start")).toBeTruthy();
  });

  it("forgets its own browser checkpoint after New run even when tab storage is blocked", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    try {
      query.current = RUN_TEST;
      render(<PlayScreen />);
      await pickGulpinAtStriker();
      expect(localStorage.getItem("pokedraft.run.cup8")).not.toBeNull();
      fireEvent.click(screen.getByTestId("new-run"));
      expect(localStorage.getItem("pokedraft.run.cup8")).toBeNull();
      reload(<PlayScreen />);
      await act(async () => {});
      expect(screen.getByTestId("run-start")).toBeTruthy();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("still plays when the browser refuses storage (private windows, blocked site data)", async () => {
    const refuse = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(refuse);
    query.current = RUN_TEST;
    render(<PlayScreen />);
    await pickGulpinAtStriker();
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    fireEvent.click(screen.getByTestId("new-run"));
    expect(screen.getByTestId("run-start")).toBeTruthy();
    vi.restoreAllMocks();
  });
});
