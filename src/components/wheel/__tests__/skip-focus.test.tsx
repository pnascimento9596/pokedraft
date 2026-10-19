// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftSettings, Roll } from "@/engine";
import { RollReveal } from "../RollReveal";
import { stagesFor } from "../reel";

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const COMBO: Roll = { kind: "combo", region: "hoenn", type: "water", offers: null };

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("wheel skip focus", () => {
  for (const speed of ["normal", "fast"] as const) {
    it(`focus after a keyboard skip lands on the reveal region, not the body, at ${speed} speed (catches focus lost when Tap to skip unmounts)`, () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 100),
      );
      vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
      const onDone = vi.fn();
      render(
        <RollReveal
          stages={stagesFor(COMBO, CUP8, "new")}
          instant={false}
          speed={speed}
          onDone={onDone}
        />,
      );
      const skip = screen.getByRole("button", { name: "Tap to skip" });
      skip.focus();
      fireEvent.click(skip);
      expect(screen.queryByRole("button", { name: "Tap to skip" })).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("group", { name: "Roll" }));
      act(() => vi.advanceTimersByTime(1_000));
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  }

  it("leaves focus alone when the skip came from a tap on the wheel, not the focused button", () => {
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    render(
      <>
        <button type="button">Elsewhere</button>
        <RollReveal
          stages={stagesFor(COMBO, CUP8, "new")}
          instant={false}
          speed="normal"
          onDone={() => {}}
        />
      </>,
    );
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    elsewhere.focus();
    fireEvent.click(screen.getByTestId("wheel"));
    expect(document.activeElement).toBe(elsewhere);
  });
});
