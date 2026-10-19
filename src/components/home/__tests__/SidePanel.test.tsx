// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "../HomeScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));

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

describe("the home Matchday settings with manager mode (catches a Quick choice a manager can make but cannot coach)", () => {
  // The builder's friendly card shows the same settings, so read the Control desk's own copy.
  const desk = () => within(screen.getByRole("complementary", { name: "Control desk" }));
  const managerSwitch = () => desk().getByRole("switch", { name: /Manager mode/ });
  const quick = () => desk().getByRole("button", { name: "Quick sim" }) as HTMLButtonElement;
  const live = () => desk().getByRole("button", { name: "Live match" });
  const builderQuick = () =>
    within(screen.getByRole("button", { name: "Play a friendly cup" }).parentElement!).getByTestId(
      "match-view-quick",
    ) as HTMLButtonElement;

  it("treats the view as Live and disables Quick with the hint, keeping the saved Quick choice", () => {
    localStorage.setItem(
      "pokedraft:panel",
      JSON.stringify({ managerMode: true, matchView: "quick" }),
    );
    render(<HomeScreen />);
    expect(quick().disabled).toBe(true);
    expect(quick().getAttribute("aria-pressed")).toBe("false");
    expect(live().getAttribute("aria-pressed")).toBe("true");
    expect(desk().getByText("Manager mode plays live")).toBeTruthy();
    expect(builderQuick().disabled).toBe(true);
    expect(saved().matchView).toBe("quick");
  });

  it("restores the saved Quick choice when manager mode goes off", () => {
    render(<HomeScreen />);
    act(() => {
      fireEvent.click(managerSwitch());
    });
    expect(saved()).toMatchObject({ managerMode: true, matchView: "quick" });
    expect(live().getAttribute("aria-pressed")).toBe("true");
    act(() => {
      fireEvent.click(managerSwitch());
    });
    expect(quick().disabled).toBe(false);
    expect(quick().getAttribute("aria-pressed")).toBe("true");
    expect(builderQuick().getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Manager mode plays live")).toBeNull();
  });
});
