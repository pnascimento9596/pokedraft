// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { MatchdayFlow } from "../MatchdayFlow";

const audio = vi.hoisted(() => ({ unlocks: 0 }));

vi.mock("@/components/wheel/sound", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/wheel/sound")>();
  return { ...real, unlockAudio: () => audio.unlocks++ };
});

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const CTX = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };

beforeEach(() => {
  audio.unlocks = 0;
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

it("Go to the match unlocks audio inside the tap (catches an autostarted match that never unlocks sound)", () => {
  render(
    <MatchdayFlow ctx={CTX} initialCup={cup} view="live" managerMode={false} onFinish={() => {}} />,
  );
  expect(audio.unlocks).toBe(0);
  fireEvent.click(screen.getByTestId("prematch-go"));
  expect(audio.unlocks).toBe(1);
});
