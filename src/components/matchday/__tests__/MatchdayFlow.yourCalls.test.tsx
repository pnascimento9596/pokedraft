// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { runCup } from "@/engine/cup";
import type { FullLineup, ManagerAction, Seed } from "@/engine/types";
import { MatchdayFlow } from "../MatchdayFlow";

// The cup8 4-2-3-1 squad src/ui/manager/__tests__/your-calls.test.ts pins for seed calls-3.
const CTX = {
  lineup: {
    formation: "4-2-3-1",
    starters: [286, 310, 758, 523, 789, 727, 187, 166, 400, 410, 793],
    bench: [819, 147, 826, 711, 677],
  } as unknown as FullLineup,
  seed: "calls-3" as Seed,
  mode: "cup8" as const,
};
const ACTIONS: ManagerAction[] = [
  { type: "tactic", match: 0, minute: 12, tactic: "attack" },
  { type: "tactic", match: 0, minute: 80, tactic: "defend" },
];
const CUP = runCup(CTX.lineup, CTX.seed, CTX.mode, undefined, ACTIONS);

beforeEach(() => {
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

const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));

async function frames(ms: number, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  }
}

describe("your calls card (catches a card shown before full time, or one that never shows)", () => {
  it("is absent at 89' and reads Assistant 1-0, You 3-1 with the Attack switch at full time", async () => {
    render(
      <MatchdayFlow
        ctx={CTX}
        initialCup={CUP}
        initialActions={ACTIONS}
        view="quick"
        managerMode={false}
        onFinish={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("prematch-go"));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    for (let i = 0; i < 900 && minute() < 89; i++) await frames(16, 1);
    expect(minute()).toBe(89);
    expect(screen.queryByTestId("fulltime")).toBeNull();
    expect(screen.queryByTestId("your-calls")).toBeNull();

    fireEvent.click(screen.getByTestId("skip-ft"));
    expect(screen.getByTestId("your-calls")).toBeTruthy();
    await frames(0, 1);
    expect(screen.getByTestId("your-calls-score").textContent).toBe("Assistant 1-0, You 3-1");
    expect(screen.queryByTestId("your-calls-call")).toBeNull();
    await frames(16, 4);
    expect(screen.getByTestId("your-calls-call").textContent).toBe(
      "Biggest swing: your Attack switch at 12'.",
    );
    expect(screen.getByTestId("your-calls-later").textContent).toBe(
      "Later results are the same without your calls here.",
    );
  });
});
