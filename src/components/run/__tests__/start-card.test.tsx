// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IsoDate } from "@/engine";
import { dailySettings } from "@/leaderboard/daily";
import { Challenge, PlayScreen } from "../PlayScreen";

const query = { current: "" };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const KANTO = "mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151";

beforeEach(() => {
  query.current = KANTO;
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

function summary(): string[][] {
  return [...document.querySelectorAll("dl > div")].map((row) => [
    row.querySelector("dt")!.textContent!,
    row.querySelector("dd")!.textContent!,
  ]);
}

async function draftSixteen(): Promise<void> {
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
  for (let round = 1; round <= 16; round++) {
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      )!,
    );
  }
}

describe("the start card summary (catches a pre-run summary that hides how the cup plays)", () => {
  it("lists Matchday: Sim, Quick by default", async () => {
    render(<PlayScreen />);
    await act(async () => {});
    expect(summary()).toEqual([
      ["Formation", "4-3-3"],
      ["Order", "Squad First"],
      ["Matchday", "Sim, Quick"],
    ]);
  });

  it("reads Matchday: Manager, Live from the saved panel", async () => {
    localStorage.setItem(
      "pokedraft:panel",
      JSON.stringify({ managerMode: true, matchView: "quick" }),
    );
    render(<PlayScreen />);
    await act(async () => {});
    expect(summary().at(-1)).toEqual(["Matchday", "Manager, Live"]);
  });

  it("follows the start card's own Manager mode switch", async () => {
    render(<PlayScreen />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId("manager-mode"));
    expect(summary().at(-1)).toEqual(["Matchday", "Manager, Live"]);
    expect(JSON.parse(localStorage.getItem("pokedraft:panel")!)).toMatchObject({
      managerMode: true,
      matchView: "quick",
    });
    fireEvent.click(screen.getByTestId("manager-mode"));
    fireEvent.click(screen.getByTestId("match-view-live"));
    expect(summary().at(-1)).toEqual(["Matchday", "Sim, Live"]);
  });
});

describe("the start card Edit link (catches a summary the player cannot change from /play)", () => {
  it("links Edit settings to the home settings anchor", async () => {
    render(<PlayScreen />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: "Edit settings" }).getAttribute("href")).toBe(
      "/#settings",
    );
  });

  it("has no Edit link on the Daily, whose settings are fixed", async () => {
    render(
      <Challenge
        settings={dailySettings("4-3-3")}
        querySeed={null}
        daily={"2026-10-10" as IsoDate}
      />,
    );
    await act(async () => {});
    expect(screen.queryByRole("link", { name: "Edit settings" })).toBeNull();
  });
});

describe("the draft-complete button (catches See results on a cup that plays a matchday)", () => {
  it("draft complete with manager on says Kick off", async () => {
    localStorage.setItem("pokedraft:panel", JSON.stringify({ managerMode: true }));
    render(<PlayScreen />);
    await draftSixteen();
    expect(screen.getByTestId("see-results").textContent).toBe("Kick off");
  });

  it("says Kick off for a live match without manager mode", async () => {
    localStorage.setItem("pokedraft:panel", JSON.stringify({ matchView: "live" }));
    render(<PlayScreen />);
    await draftSixteen();
    expect(screen.getByTestId("see-results").textContent).toBe("Kick off");
  });

  it("still says See results for a quick sim, which goes straight to the results", async () => {
    render(<PlayScreen />);
    await draftSixteen();
    expect(screen.getByTestId("see-results").textContent).toBe("See results");
  });
});
