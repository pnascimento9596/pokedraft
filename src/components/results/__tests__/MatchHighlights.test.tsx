// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { replayAnyVersion as replay } from "@/engine/versions";
import { MatchHighlights } from "../MatchHighlights";

afterEach(cleanup);

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

describe("MatchHighlights", () => {
  it("renders the interactive stadium stage with Star player, soccer ball, and ability activation", () => {
    const { draft, cup } = replay(FLAWLESS);
    render(<MatchHighlights cup={cup} draft={draft} />);

    expect(screen.getByTestId("match-highlights")).toBeTruthy();
    expect(screen.getByTestId("highlights-stage")).toBeTruthy();
    expect(screen.getByTestId("star-name").textContent).toBeTruthy();
    expect(screen.getByTestId("star-headline").textContent).toBeTruthy();
    expect(screen.getByTestId("star-ability").textContent).toContain("Activated Ability");
    expect(screen.getByTestId("soccer-ball")).toBeTruthy();
  });

  it("navigates through tournament matches and reveals match stars", () => {
    const { draft, cup } = replay(FLAWLESS);
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

  it("triggers strike animation and goal celebration overlay when clicking unleash strike", () => {
    vi.useFakeTimers();
    try {
      const { draft, cup } = replay(FLAWLESS);
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

  it("toggles animation paused state", () => {
    const { draft, cup } = replay(ELIMINATED);
    render(<MatchHighlights cup={cup} draft={draft} />);

    const toggle = screen.getByRole("button", { name: "⏸ Pause Motion" });
    fireEvent.click(toggle);

    expect(toggle.textContent).toBe("▶ Play Motion");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
