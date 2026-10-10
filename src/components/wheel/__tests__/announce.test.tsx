// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftSettings, Roll } from "@/engine";
import { RollReveal } from "../RollReveal";
import { stagesFor } from "../reel";

const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const ROLL: Roll = { kind: "combo", region: "hoenn", type: "water", offers: null };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("wheel announcement", () => {
  it("speaks the result once, after the last wheel stops, so a screen reader never hears the region twice", () => {
    const onDone = vi.fn();
    render(
      <RollReveal stages={stagesFor(ROLL, SETTINGS, "new")} instant={false} onDone={onDone} />,
    );
    const spoken: string[] = [];
    for (let t = 0; t < 12_000; t += 50) {
      act(() => {
        vi.advanceTimersByTime(50);
      });
      const text = screen.getByTestId("wheel-announce").textContent ?? "";
      if (text !== "" && spoken[spoken.length - 1] !== text) spoken.push(text);
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual(["Region: Hoenn. Type: Water."]);
  });
});
