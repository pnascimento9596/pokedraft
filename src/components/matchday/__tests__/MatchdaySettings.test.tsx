// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MatchdaySettings, useStoredMatchday } from "../MatchdaySettings";

// The start screen's wiring: the selector bound to the stored panel.
function StartScreenSettings() {
  const [value, set] = useStoredMatchday();
  return <MatchdaySettings value={value} onChange={set} />;
}

const KEY = "pokedraft:panel";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Another tab writes the shared panel; the browser tells this tab with a storage event.
function otherTabSaves(panel: Record<string, unknown>): void {
  const value = JSON.stringify(panel);
  localStorage.setItem(KEY, value);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: value }));
  });
}

describe("MatchdaySettings (catches a start screen that misses a change made in another tab)", () => {
  it("follows manager mode and the match view when another tab changes them", () => {
    render(<StartScreenSettings />);
    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("match-view-quick").getAttribute("aria-pressed")).toBe("true");

    otherTabSaves({ managerMode: true, matchView: "live" });

    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");
  });

  it("still follows another tab after a change made on this screen", () => {
    render(<StartScreenSettings />);
    fireEvent.click(screen.getByTestId("manager-mode"));
    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("true");
    expect(JSON.parse(localStorage.getItem(KEY)!).managerMode).toBe(true);

    otherTabSaves({ managerMode: false, matchView: "live" });

    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("MatchdaySettings with manager mode (catches a Quick choice a manager can make but cannot coach)", () => {
  it("treats the view as Live and disables Quick with the hint, keeping the saved Quick choice", () => {
    localStorage.setItem(KEY, JSON.stringify({ managerMode: true, matchView: "quick" }));
    render(<StartScreenSettings />);
    const quick = screen.getByTestId("match-view-quick") as HTMLButtonElement;
    expect(quick.disabled).toBe(true);
    expect(quick.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Manager mode plays live")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(KEY)!).matchView).toBe("quick");
  });

  it("restores the saved Quick choice when manager mode goes off", () => {
    localStorage.setItem(KEY, JSON.stringify({ managerMode: false, matchView: "quick" }));
    render(<StartScreenSettings />);
    fireEvent.click(screen.getByTestId("manager-mode"));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({
      managerMode: true,
      matchView: "quick",
    });
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("manager-mode"));
    const quick = screen.getByTestId("match-view-quick") as HTMLButtonElement;
    expect(quick.disabled).toBe(false);
    expect(quick.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Manager mode plays live")).toBeNull();
  });
});
