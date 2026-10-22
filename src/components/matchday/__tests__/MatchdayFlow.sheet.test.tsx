// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchdayFlow } from "../MatchdayFlow";

const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
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

const FRAME = 16;
const minute = () => Number(screen.getByTestId("match-player").getAttribute("data-minute"));
const toggle = () => screen.getByTestId("sheet-toggle");

async function playFor(ms: number): Promise<void> {
  for (let t = 0; t < ms; t += FRAME) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
}

/** Kicks off the first managed match and plays 1600 ms of live time, which reaches 2'. */
async function kickOff(): Promise<void> {
  render(<MatchdayFlow ctx={CTX} initialCup={cup} view="live" managerMode onFinish={() => {}} />);
  fireEvent.click(screen.getByTestId("prematch-go"));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await playFor(1600);
}

describe("touchline sheet (catches a sheet that lets the clock run while the manager decides)", () => {
  it("opening the sheet freezes the clock: 2' before and still 2' 2 s after", async () => {
    await kickOff();
    expect(minute()).toBe(2);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    await playFor(2000);
    expect(minute()).toBe(2);
    expect(screen.getByTestId("play-toggle").textContent).toBe("Pause");
  });

  // From 2.88', the replayed match's 3' save holds the clock 1,100 ms, so 2,400 ms reaches
  // 3 + (2,400 - 67 - 1,100) * 45 / 25,000 = 5.22'.
  it("confirming a sub resumes the clock: 5' after 2400 ms more", async () => {
    await kickOff();
    fireEvent.click(toggle());
    await playFor(2000);
    fireEvent.click(screen.getByTestId("sub-confirm"));
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("subs-count").textContent).toBe("Subs 1 of 5");
    await playFor(2400);
    expect(minute()).toBe(5);
  });

  it("a player who paused stays paused after the sheet closes", async () => {
    await kickOff();
    fireEvent.click(screen.getByTestId("play-toggle"));
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("play-toggle").textContent).toBe("Resume");
    await playFor(2000);
    expect(minute()).toBe(2);
  });
});
