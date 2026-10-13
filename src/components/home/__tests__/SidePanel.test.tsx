// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HomeScreen } from "../HomeScreen";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => cleanup());

const challengeSwitch = () => screen.getByRole("switch", { name: /Show ratings \(challenges\)/ });
const builderSwitch = () => screen.getByRole("switch", { name: /Show ratings \(builder\)/ });
const saved = () => JSON.parse(localStorage.getItem("pokedraft:panel") ?? "{}");

describe("the Show ratings (challenges) switch (catches a challenge setting that does not persist, or flips the builder one)", () => {
  it("starts off with the blind hint, and the hint text in the Play card is the unchanged sentence", () => {
    render(<HomeScreen />);
    expect(challengeSwitch().getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Off keeps challenges blind")).toBeTruthy();
    expect(screen.getByText("Challenge runs keep ratings hidden.")).toBeTruthy();
  });

  it("turns on, saves showChallengeRatings to pokedraft:panel, and says challenges show ratings", () => {
    render(<HomeScreen />);
    act(() => {
      fireEvent.click(challengeSwitch());
    });
    expect(challengeSwitch().getAttribute("aria-checked")).toBe("true");
    expect(saved().showChallengeRatings).toBe(true);
    expect(saved().showRatings).toBe(false);
    expect(
      screen.getByText("Challenge runs show ratings. Turn them off in Settings to play blind."),
    ).toBeTruthy();
    expect(screen.queryByText("Challenge runs keep ratings hidden.")).toBeNull();
  });

  it("turns back off and restores the blind sentence", () => {
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
    render(<HomeScreen />);
    expect(challengeSwitch().getAttribute("aria-checked")).toBe("true");
    act(() => {
      fireEvent.click(challengeSwitch());
    });
    expect(saved().showChallengeRatings).toBe(false);
    expect(screen.getByText("Challenge runs keep ratings hidden.")).toBeTruthy();
  });

  it("leaves the builder switch alone in both directions", () => {
    render(<HomeScreen />);
    act(() => {
      fireEvent.click(builderSwitch());
    });
    expect(saved()).toMatchObject({ showRatings: true, showChallengeRatings: false });
    expect(challengeSwitch().getAttribute("aria-checked")).toBe("false");
    act(() => {
      fireEvent.click(challengeSwitch());
    });
    expect(saved()).toMatchObject({ showRatings: true, showChallengeRatings: true });
    expect(builderSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("renders the Trainer Dugout eyebrow on the Play module card", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Trainer Dugout")).toBeTruthy();
  });
});
