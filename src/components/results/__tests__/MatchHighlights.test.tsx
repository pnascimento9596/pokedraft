// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { replayAnyVersion as replay } from "@/engine/versions";
import { MatchHighlights } from "../MatchHighlights";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

describe("MatchHighlights", () => {
  it("cancels the old strike when the match list changes selectedRound", async () => {
    vi.useFakeTimers();
    const { draft, cup } = await replay(FLAWLESS);
    const view = render(<MatchHighlights cup={cup} draft={draft} selectedRound="G1" />);
    fireEvent.click(screen.getByTestId("strike-btn"));
    act(() => vi.advanceTimersByTime(100));
    view.rerender(<MatchHighlights cup={cup} draft={draft} selectedRound="G3" />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 3");
    expect(screen.queryByTestId("goal-overlay")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows a defensive illustration, not a fictional goal, for a scoreless match", async () => {
    vi.useFakeTimers();
    const { draft, cup } = await replay(FLAWLESS);
    const defensive = {
      ...cup,
      matches: cup.matches.map((m) =>
        m.status === "played"
          ? {
              ...m,
              regulation: { user: 0, opp: 0 },
              extraTime: null,
              shootout: null,
              goals: [],
              outcome: "D" as const,
            }
          : m,
      ),
    };
    render(<MatchHighlights cup={defensive} draft={draft} />);
    expect(screen.getByTestId("strike-btn").textContent).toContain("Defensive drill");
    fireEvent.click(screen.getByTestId("strike-btn"));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByText("⚽ GOAL!")).toBeNull();
    expect(screen.getByTestId("goal-overlay").textContent).toContain("BLOCK!");
    expect(screen.getByTestId("match-highlights").textContent).toContain("Illustrated highlights");
  });

  it("does not celebrate an old strike after selecting another match", async () => {
    vi.useFakeTimers();
    const { draft, cup } = await replay(FLAWLESS);
    render(<MatchHighlights cup={cup} draft={draft} />);
    fireEvent.click(screen.getByTestId("strike-btn"));
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByTestId("highlight-chip-G3"));
    const announcement = screen
      .getByTestId("match-highlights")
      .querySelector("[aria-live]")!.textContent;
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 3");
    expect(screen.queryByTestId("goal-overlay")).toBeNull();
    expect(screen.getByTestId("match-highlights").querySelector("[aria-live]")!.textContent).toBe(
      announcement,
    );
  });

  it.each(["selection", "reset"])("an old %s reset cannot clear a later strike", async (action) => {
    vi.useFakeTimers();
    const { draft, cup } = await replay(FLAWLESS);
    render(<MatchHighlights cup={cup} draft={draft} />);
    fireEvent.click(screen.getByTestId("strike-btn"));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByTestId("goal-overlay").textContent).toContain("GOAL!");
    if (action === "selection") fireEvent.click(screen.getByTestId("highlight-chip-G3"));
    else fireEvent.click(screen.getByRole("button", { name: "Continue Dribbling" }));
    fireEvent.click(screen.getByTestId("strike-btn"));
    act(() => vi.advanceTimersByTime(2200));
    expect((screen.getByTestId("strike-btn") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("goal-overlay").textContent).toContain("GOAL!");
    act(() => vi.advanceTimersByTime(600));
    expect((screen.getByTestId("strike-btn") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("goal-overlay")).toBeNull();
  });

  it("cancels pending strike callbacks on unmount", async () => {
    vi.useFakeTimers();
    const { draft, cup } = await replay(FLAWLESS);
    const { unmount } = render(<MatchHighlights cup={cup} draft={draft} />);
    fireEvent.click(screen.getByTestId("strike-btn"));
    expect(vi.getTimerCount()).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders the interactive stadium stage with Star player, soccer ball, and ability activation", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    render(<MatchHighlights cup={cup} draft={draft} />);

    expect(screen.getByTestId("match-highlights")).toBeTruthy();
    expect(screen.getByTestId("highlights-stage")).toBeTruthy();
    expect(screen.getByTestId("star-name").textContent).toBeTruthy();
    expect(screen.getByTestId("star-headline").textContent).toBeTruthy();
    expect(screen.getByTestId("star-ability").textContent).toContain("Activated Ability");
    expect(screen.getByTestId("soccer-ball")).toBeTruthy();
  });

  it("navigates through tournament matches and reveals match stars", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    render(<MatchHighlights cup={cup} draft={draft} />);

    const chipG2 = screen.getByTestId("highlight-chip-G2");
    fireEvent.click(chipG2);

    expect(chipG2.getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("highlight-title").textContent).toContain("Group match 2");

    const chipMvp = screen.getByTestId("highlight-chip-mvp");
    fireEvent.click(chipMvp);

    expect(chipMvp.getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("star-headline").textContent).toContain("Player of the Tournament");
  });

  it("triggers strike animation and goal celebration overlay when clicking unleash strike", async () => {
    vi.useFakeTimers();
    try {
      const { draft, cup } = await replay(FLAWLESS);
      render(<MatchHighlights cup={cup} draft={draft} />);

      const strikeBtn = screen.getByTestId("strike-btn");
      fireEvent.click(strikeBtn);

      // Goal overlay appears after windup delay
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId("goal-overlay")).toBeTruthy();
      expect(screen.getByText("⚽ GOAL!")).toBeTruthy();

      // Goal celebration resets back to dribble mode
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.queryByTestId("goal-overlay")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("toggles animation paused state", async () => {
    const { draft, cup } = await replay(ELIMINATED);
    render(<MatchHighlights cup={cup} draft={draft} />);

    const toggle = screen.getByRole("button", { name: "⏸ Pause Motion" });
    fireEvent.click(toggle);

    expect(toggle.textContent).toBe("▶ Play Motion");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
