// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import type { MatchView } from "@/ui/settings";
import { MatchdayFlow } from "../MatchdayFlow";

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

const FRAME = 16;
const player = () => screen.getByTestId("match-player");

/** Kicks off the first match from the pre-match card and plays 1600 ms of real time. */
async function kickOffAndPlay(view: MatchView, managerMode: boolean): Promise<number> {
  render(
    <MatchdayFlow
      ctx={CTX}
      initialCup={cup}
      view={view}
      managerMode={managerMode}
      onFinish={() => {}}
    />,
  );
  fireEvent.click(screen.getByTestId("prematch-go"));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  for (let i = 0; i < 100; i++) {
    await act(async () => {
      vi.advanceTimersByTime(FRAME);
    });
  }
  return Number(player().getAttribute("data-minute"));
}

describe("manager pace (catches a managed match clocked at Quick pace, about 5 s for 90 minutes)", () => {
  it("with manager on, pace is live regardless of saved matchView: 1600 ms reaches 2', not 32'", async () => {
    const minute = await kickOffAndPlay("quick", true);
    expect(player().getAttribute("data-view")).toBe("live");
    expect(minute).toBe(2);
  });

  it("with manager off, Quick keeps its pace", async () => {
    const minute = await kickOffAndPlay("quick", false);
    expect(player().getAttribute("data-view")).toBe("quick");
    expect(minute).toBe(32);
  });
});
