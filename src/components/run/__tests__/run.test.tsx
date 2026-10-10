// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "../PlayScreen";

const query = { current: "" };

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
