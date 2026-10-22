// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";

const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const CTX = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };

// Each test imports the flow after `vi.resetModules()`, so the sound module starts with no context.
// A context the browser created outside a tap: suspended until a gesture resumes it.
class LockedContext {
  state: AudioContextState = "suspended";
  onstatechange: (() => void) | null = null;
  resume(): Promise<void> {
    this.state = "running";
    this.onstatechange?.();
    return Promise.resolve();
  }
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal("AudioContext", LockedContext);
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
});

it("tap-for-sound chip appears while audio is locked and disappears after the first tap anywhere on the matchday", async () => {
  localStorage.setItem("pokedraft:sound", "true");
  const { MatchdayFlow } = await import("../MatchdayFlow");
  render(
    <MatchdayFlow ctx={CTX} initialCup={cup} view="live" managerMode={false} onFinish={() => {}} />,
  );
  const chip = screen.getByTestId("tap-for-sound");
  expect(chip.textContent).toBe("Tap for sound");
  await act(async () => {
    fireEvent.pointerDown(screen.getByTestId("matchday-title"));
    fireEvent.pointerUp(screen.getByTestId("matchday-title"));
  });
  expect(screen.queryByTestId("tap-for-sound")).toBeNull();
});

it("shows no tap-for-sound chip with sound off", async () => {
  const { MatchdayFlow } = await import("../MatchdayFlow");
  render(
    <MatchdayFlow ctx={CTX} initialCup={cup} view="live" managerMode={false} onFinish={() => {}} />,
  );
  expect(screen.queryByTestId("tap-for-sound")).toBeNull();
});
