// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchdayFlow } from "../MatchdayFlow";

// The golden cup8 draft under engine 6. Match 0 is against a pressing side. In match 5 (the
// quarter-final, against a direct side) Roselia goes down in slot 1 (LB) at 42' and the assistant
// sends on Kommo-o.
const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const CTX = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };

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

const STEP = 100;

function mount(initialMatch = 0, managerMode = true): void {
  render(
    <MatchdayFlow
      ctx={CTX}
      initialCup={cup}
      initialMatch={initialMatch}
      view="live"
      managerMode={managerMode}
      onFinish={() => {}}
    />,
  );
}

async function kickOff(): Promise<void> {
  fireEvent.click(screen.getByTestId("prematch-go"));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

/** Plays live time in 100 ms steps until `testId` shows. */
async function until(testId: string): Promise<HTMLElement> {
  for (let i = 0; i < 1_000; i++) {
    const el = screen.queryByTestId(testId);
    if (el !== null) return el;
    await act(async () => {
      vi.advanceTimersByTime(STEP);
    });
  }
  throw new Error(`${testId} never showed`);
}

const tickerKinds = () =>
  [...screen.getByTestId("ticker").querySelectorAll("li")].map((li) => li.dataset.kind);

describe("PreMatch scout line (catches a kickoff scout line that is missing or not from the coefficient table)", () => {
  it("shows the pressing side's edges above the starting tactic, and badges the pills", () => {
    mount();
    expect(screen.getByTestId("scout-line").textContent).toBe(
      "Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend.",
    );
    expect(screen.getByTestId("edge-counter").getAttribute("data-edge")).toBe("favourable");
    expect(screen.getByTestId("edge-defend").getAttribute("data-edge")).toBe("unfavourable");
  });

  it("shows no scout line in sim mode, where nobody picks a tactic", () => {
    mount(0, false);
    expect(screen.queryByTestId("scout-line")).toBeNull();
  });
});

describe("assistant status (catches a status line that keeps claiming the assistant runs the side)", () => {
  it("assistant status reads 'Assistant: subs off, tactics off' after a tactic change", async () => {
    mount();
    await kickOff();
    await act(async () => {
      vi.advanceTimersByTime(1_600);
    });
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs on, tactics on",
    );
    fireEvent.click(screen.getByTestId("tactic-attack"));
    expect(screen.getByTestId("assistant-status").textContent).toBe(
      "Assistant: subs off, tactics off",
    );
  });
});

describe("half-time stop (catches a half-time stop with no scout or fatigue line)", () => {
  it("repeats the scout line and names the two most tired outfield players: Togepi 84 and Croagunk 86", async () => {
    mount();
    await kickOff();
    const stop = await until("stop-halftime");
    expect(stop.querySelector('[data-testid="halftime-scout"]')?.textContent).toBe(
      "Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend.",
    );
    expect(stop.querySelector('[data-testid="halftime-fatigue"]')?.textContent).toBe(
      "Most tired: Togepi (84) and Croagunk (86).",
    );
  });
});

describe("injury stop (catches the 1d carryover: the ticker shows the assistant's sub before the manager answers)", () => {
  it("ticker has no sub line during an unanswered injury stop", async () => {
    mount(5);
    await kickOff();
    const stop = await until("stop-injury");
    expect(screen.getByTestId("match-player").getAttribute("data-minute")).toBe("42");
    expect(tickerKinds()).not.toContain("sub");
    expect(screen.getByTestId("ticker").textContent).not.toContain("Kommo-o on for Roselia");
    expect(stop.querySelector("p")?.textContent).toBe(
      "42' LB Roselia is injured. Choose who comes on.",
    );
    fireEvent.click(screen.getByTestId("injury-confirm"));
    await act(async () => {
      vi.advanceTimersByTime(STEP);
    });
    expect(screen.getByTestId("ticker").textContent).toContain(
      "42' Kommo-o on for Roselia (injury, assistant)",
    );
  });
});
