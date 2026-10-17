// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MatchdaySettings } from "../MatchdaySettings";

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
    render(<MatchdaySettings />);
    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("match-view-quick").getAttribute("aria-pressed")).toBe("true");

    otherTabSaves({ managerMode: true, matchView: "live" });

    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");
  });

  it("still follows another tab after a change made on this screen", () => {
    render(<MatchdaySettings />);
    fireEvent.click(screen.getByTestId("manager-mode"));
    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("true");
    expect(JSON.parse(localStorage.getItem(KEY)!).managerMode).toBe(true);

    otherTabSaves({ managerMode: false, matchView: "live" });

    expect(screen.getByTestId("manager-mode").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("match-view-live").getAttribute("aria-pressed")).toBe("true");
  });
});
