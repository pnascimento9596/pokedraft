// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lineup, Seed, SpeciesId } from "@/engine";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { ExhibitionMatchModal } from "../ExhibitionMatchModal";

const lineup: Lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as SpeciesId[] as Lineup["starters"],
  bench: [12, 13, 14, 15, 16] as SpeciesId[] as Lineup["bench"],
};
const settings = { mode: "builder", formation: "4-3-3", gens: [1, 2, 3, 4, 5, 6, 7, 8, 9], legendaries: true } as const;
const saved = builderToken(settings, lineup, "builder" as Seed);
const opponent = draftFromBuilderToken(builderToken(settings, lineup, "opponent-0" as Seed))!;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem("pokedraft.builder", JSON.stringify(saved));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("exhibition highlights", () => {
  it("replays only genuine goals when their minutes arrive and restores the recorded final score", () => {
    render(<ExhibitionMatchModal opponent={opponent} onClose={() => {}} />);
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 2");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toContain("75' Blastoise, assist Caterpie");
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 0");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("");
    for (let i = 0; i < 25; i++) act(() => { vi.advanceTimersByTime(80); });
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 1");
    expect(screen.getByRole("list", { name: "Exhibition goals" }).textContent).toBe("Shared squad75' Blastoise, assist Caterpie");
    fireEvent.click(screen.getByRole("button", { name: "Pause highlights" }));
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 1");
    fireEvent.click(screen.getByRole("button", { name: "Show full time" }));
    expect(screen.getByTestId("exhibition-score").textContent).toBe("0 - 2");
    expect(screen.getByRole("status").textContent).toBe("Full time. Shared squad wins.");
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(saved));
  });

  it("resets highlights for rematches and clears a running replay on unmount", () => {
    const view = render(<ExhibitionMatchModal opponent={opponent} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    expect(screen.getByRole("status").textContent).toBe("0' / 90' Replay of recorded goals.");
    fireEvent.click(screen.getByRole("button", { name: "Play rematch" }));
    expect(screen.getByRole("button", { name: "Replay highlights" }).textContent).toBe("Replay highlights");
    expect(screen.getByRole("status").textContent).toContain("Full time.");
    fireEvent.click(screen.getByRole("button", { name: "Replay highlights" }));
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
