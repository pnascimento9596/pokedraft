// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lineup, Seed } from "@/engine";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { ExhibitionMatchModal } from "../ExhibitionMatchModal";

const lineup: Lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as unknown as Lineup["starters"],
  bench: [12, 13, 14, 15, 16] as unknown as Lineup["bench"],
};
const settings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
} as const;
const saved = builderToken(settings, lineup, "builder" as Seed);
const opponent = draftFromBuilderToken(builderToken(settings, lineup, "opponent-0" as Seed))!;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem("pokedraft.builder", JSON.stringify(saved));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("exhibition highlights", () => {
  it("replays only genuine goals when their minutes arrive and restores the recorded final score", () => {
    render(<ExhibitionMatchModal opponent={opponent} onClose={() => {}} />);
    // Engine 6: 4 - 1, goals at 23', 37' (Shared squad), 44', 78' and 85'.
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4 - 1");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toContain(
      "37' Caterpie, assist Charmeleon",
    );
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 0");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("");
    for (let i = 0; i < 25; i++)
      act(() => {
        vi.advanceTimersByTime(80);
      });
    // 25 ticks of 3 minutes reach 75': the 78' and 85' goals are not revealed yet.
    expect(screen.getByTestId("exhibition-score").textContent).toBe("2 - 1");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe(
      "Your squad23' Charizard (solo run)Shared squad37' Caterpie, assist CharmeleonYour squad44' Venusaur",
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause highlights" }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByTestId("exhibition-score").textContent).toBe("2 - 1");
    fireEvent.click(screen.getByRole("button", { name: "Show full time" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("4 - 1");
    expect(screen.getByRole("status").textContent).toBe("Full time. Your squad wins.");
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(saved));
  });

  it("resets highlights for rematches and clears a running replay on unmount", () => {
    const view = render(<ExhibitionMatchModal opponent={opponent} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByRole("status").textContent).toBe("0' / 90' Replay of recorded goals.");
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.getByRole("button", { name: "Replay highlights" }).textContent).toBe(
      "Replay highlights",
    );
    expect(screen.getByRole("status").textContent).toContain("Full time.");
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it.each([
  null,
  "bad-json",
  JSON.stringify("bad-token"),
  JSON.stringify(
    builderToken(settings, { ...lineup, bench: [null, null, null, null, null] }, "builder" as Seed),
  ),
])(
  "shows an honest Builder requirement for absent, corrupt or incomplete saved squads (%s)",
  (savedSquad) => {
    if (savedSquad === null) localStorage.removeItem("pokedraft.builder");
    else localStorage.setItem("pokedraft.builder", savedSquad);
    render(<ExhibitionMatchModal opponent={opponent} onClose={() => {}} />);
    expect(screen.getByRole("link", { name: "Build your squad" }).getAttribute("href")).toBe("/");
    expect(screen.getByTestId("exhibition-modal").textContent).toContain(
      "Save a complete squad in the Builder",
    );
    expect(screen.queryByTestId("exhibition-score")).toBeNull();
    expect(screen.queryByRole("button", { name: "Replay highlights" })).toBeNull();
  },
);

it("keeps scoreless draws honest and finishes the replay without creating events", () => {
  // Engine 6 has no goalless mirror match; opponent seed scoreless-9 is the first 0 - 0.
  const scoreless = draftFromBuilderToken(builderToken(settings, lineup, "scoreless-9" as Seed))!;
  render(<ExhibitionMatchModal opponent={scoreless} onClose={() => {}} />);
  expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 0");
  expect(screen.getByRole("status").textContent).toBe("Full time. Honours even.");
  fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
  for (let i = 0; i < 30; i++)
    act(() => {
      vi.advanceTimersByTime(80);
    });
  expect(screen.getByRole("status").textContent).toBe("Full time. Honours even.");
  expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("");
  expect(screen.getByText("No goals in this match.").textContent).toBe("No goals in this match.");
  expect(vi.getTimerCount()).toBe(0);
});

it("closes on native Escape, clears replay timers and restores the invoking control on unmount", () => {
  const trigger = document.createElement("button");
  trigger.textContent = "Open exhibition";
  document.body.append(trigger);
  trigger.focus();
  vi.runOnlyPendingTimers();
  const onClose = vi.fn();
  const view = render(<ExhibitionMatchModal opponent={opponent} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
  const dialog = screen.getByRole("dialog") as HTMLDialogElement;
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(dialog.open).toBe(false);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
