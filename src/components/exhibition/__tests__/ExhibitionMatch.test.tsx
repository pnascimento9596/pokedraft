// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FullLineup, Seed } from "@/engine";
import { ExhibitionMatch } from "../ExhibitionMatch";

// Pokedex 1 to 16 on both sides on seed opponent-0, as the old replay tests played it.
const lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  bench: [12, 13, 14, 15, 16],
} as unknown as FullLineup;

function Harness({ initialLegs = 1 }: { readonly initialLegs?: 1 | 2 }) {
  const [legs, setLegs] = useState<1 | 2>(initialLegs);
  const [rematch, setRematch] = useState(0);
  return (
    <ExhibitionMatch
      home={lineup}
      away={lineup}
      seed={"opponent-0" as Seed}
      rematch={rematch}
      legs={legs}
      awayName="Their squad"
      mirror={false}
      onLegs={setLegs}
      onRematch={() => setRematch((n) => n + 1)}
    />
  );
}

function managerMode(on: boolean) {
  localStorage.setItem("pokedraft:panel", JSON.stringify({ managerMode: on, matchView: "quick" }));
}

async function kickOff() {
  fireEvent.click(screen.getByTestId("exhibition-kickoff"));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"],
  });
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

describe("one match on the Broadcast", () => {
  it("opens the touchline in manager mode, and a sub confirmed there reaches the full-time result (catches an exhibition with no manager controls)", async () => {
    managerMode(true);
    render(<Harness />);
    expect(screen.queryByTestId("match-player")).toBeNull();
    await kickOff();
    expect(screen.getByTestId("match-player").getAttribute("data-view")).toBe("live");
    expect(screen.getByTestId("touchline-sheet")).not.toBeNull();
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 0 of 5");
    fireEvent.click(screen.getByTestId("sub-confirm"));
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 1 of 5");
    fireEvent.click(screen.getByTestId("skip-ft"));
    fireEvent.click(screen.getByTestId("skip-confirm"));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4-0");
    expect(screen.getByTestId("exhibition-fulltime").textContent).toBe(
      "Full time, 4-0. Your squad wins.Play rematch",
    );
    expect(screen.getByTestId("ticker").textContent).toContain(
      "0' Butterfree on for Metapod (tactical, your call)",
    );
    expect(localStorage.getItem("pokedraft:history:v1")).toBeNull();
  });

  it("plays like a sim with no touchline when manager mode is off (catches stops forced on a player who turned them off)", async () => {
    managerMode(false);
    render(<Harness />);
    await kickOff();
    expect(screen.getByTestId("match-player").getAttribute("data-view")).toBe("quick");
    expect(screen.queryByTestId("touchline-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.queryByTestId("skip-warning")).toBeNull();
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4-0");
  });

  it("goes back to Kick off for a rematch", async () => {
    managerMode(false);
    render(<Harness />);
    await kickOff();
    fireEvent.click(screen.getByTestId("skip-ft"));
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.queryByTestId("match-player")).toBeNull();
    expect(screen.getByTestId("exhibition-kickoff").textContent).toBe("Kick off");
  });

  it("moves keyboard focus to Kick off after a rematch (catches a rematch that drops focus to the page)", async () => {
    managerMode(false);
    render(<Harness />);
    await kickOff();
    fireEvent.click(screen.getByTestId("skip-ft"));
    const rematch = screen.getByRole("button", { name: "Play rematch" });
    rematch.focus();
    fireEvent.click(rematch);
    expect(document.activeElement).toBe(screen.getByTestId("exhibition-kickoff"));
  });
});

describe("two legs on the Broadcast", () => {
  it("shows no stop and no touchline in either leg, even in manager mode (catches a leg-one decision moving the tie-break seed)", async () => {
    managerMode(true);
    render(<Harness initialLegs={2} />);
    expect(screen.getByTestId("exhibition-manager-note").textContent).toBe(
      "Manager controls in one match only.",
    );
    await kickOff();
    expect(screen.getByTestId("match-player").getAttribute("data-view")).toBe("live");
    expect(screen.queryByTestId("touchline-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.queryByTestId("skip-warning")).toBeNull();
    expect(screen.getByTestId("exhibition-leg-1-score").textContent).toBe("2-2");
    fireEvent.click(screen.getByRole("button", { name: "Play leg 2" }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(screen.queryByTestId("touchline-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.getByTestId("exhibition-leg-2-score").textContent).toBe("2-1");
    expect(screen.getByTestId("exhibition-aggregate").textContent).toBe("4-3");
    expect(screen.getByTestId("exhibition-decided").textContent).toBe("On aggregate");
    expect(screen.getByRole("region", { name: "Aggregate" }).textContent).toBe(
      "Leg 1 2-2. Leg 2 2-1. Aggregate 4-3. On aggregate. Your squad wins the tie.",
    );
  });
});
