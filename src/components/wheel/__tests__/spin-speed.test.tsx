// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftSettings, Roll, SpeciesId } from "@/engine";
import type { SpinSpeed } from "@/ui/settings";
import { RollReveal } from "../RollReveal";
import { Wheel } from "../Wheel";
import { stagesFor } from "../reel";

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const KANTO: DraftSettings = { mode: "kanto151", formation: "4-3-3", order: "squadFirst" };
const COMBO: Roll = { kind: "combo", region: "hoenn", type: "water", offers: null };
const SPECIES: Roll = { kind: "species", species: 25 as SpeciesId };

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function captureFrames(): (timestamp: number) => void {
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return (timestamp) => {
    act(() => {
      if (frame === undefined) throw new Error("no frame scheduled");
      const next = frame;
      frame = undefined;
      next(timestamp);
    });
  };
}

function spinLength(roll: Roll, settings: DraftSettings, index: number, speed: SpinSpeed) {
  const advance = captureFrames();
  const onSettle = vi.fn();
  const stage = stagesFor(roll, settings, "new")[index]!;
  render(<Wheel stage={stage} state="spinning" speed={speed} onSettle={onSettle} />);
  advance(0);
  let t = 0;
  while (onSettle.mock.calls.length === 0 && t < 5_000) advance(++t);
  cleanup();
  return { ms: t, calls: onSettle.mock.calls };
}

function pauses(speed: SpinSpeed, regionMs: number, typeMs: number) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const advance = captureFrames();
  const onDone = vi.fn();
  render(
    <RollReveal
      stages={stagesFor(COMBO, CUP8, "new")}
      instant={false}
      speed={speed}
      onDone={onDone}
    />,
  );
  advance(0);
  advance(regionMs);
  expect(screen.getAllByTestId("wheel").map((w) => w.getAttribute("data-state"))).toEqual([
    "settled",
  ]);
  let stagePause = 0;
  while (screen.getAllByTestId("wheel").length === 1 && stagePause < 1_000) {
    act(() => vi.advanceTimersByTime(1));
    stagePause++;
  }
  advance(10_000);
  advance(10_000 + typeMs);
  expect(screen.getAllByTestId("wheel-result").map((r) => r.getAttribute("data-value"))).toEqual([
    "hoenn",
    "water",
  ]);
  let donePause = 0;
  while (onDone.mock.calls.length === 0 && donePause < 1_000) {
    act(() => vi.advanceTimersByTime(1));
    donePause++;
  }
  return { stagePause, donePause, doneCalls: onDone.mock.calls.length };
}

describe("spin speed (catches a Fast setting that leaves the draft spins at their normal length)", () => {
  it("fast spin uses 680/840/920 ms and 128/104 ms pauses", () => {
    expect(spinLength(COMBO, CUP8, 0, "fast")).toEqual({ ms: 680, calls: [["finished"]] });
    expect(spinLength(COMBO, CUP8, 1, "fast")).toEqual({ ms: 840, calls: [["finished"]] });
    expect(spinLength(SPECIES, KANTO, 0, "fast")).toEqual({ ms: 920, calls: [["finished"]] });
    expect(pauses("fast", 680, 840)).toEqual({ stagePause: 128, donePause: 104, doneCalls: 1 });
  });

  it("normal spin keeps 1700/2100/2300 ms and 320/260 ms pauses (regression guard, no RED)", () => {
    expect(spinLength(COMBO, CUP8, 0, "normal")).toEqual({ ms: 1700, calls: [["finished"]] });
    expect(spinLength(COMBO, CUP8, 1, "normal")).toEqual({ ms: 2100, calls: [["finished"]] });
    expect(spinLength(SPECIES, KANTO, 0, "normal")).toEqual({ ms: 2300, calls: [["finished"]] });
    expect(pauses("normal", 1700, 2100)).toEqual({ stagePause: 320, donePause: 260, doneCalls: 1 });
  });

  it("tap to skip still lands both reels at fast speed (regression guard, no RED)", () => {
    render(
      <RollReveal
        stages={stagesFor(COMBO, CUP8, "new")}
        instant={false}
        speed="fast"
        onDone={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tap to skip" }));
    expect(screen.getAllByTestId("wheel-result").map((r) => r.getAttribute("data-value"))).toEqual([
      "hoenn",
      "water",
    ]);
  });

  it("reduced motion still shows the result at once at fast speed (regression guard, no RED)", () => {
    render(
      <RollReveal stages={stagesFor(COMBO, CUP8, "new")} instant speed="fast" onDone={() => {}} />,
    );
    expect(screen.getAllByTestId("wheel").map((w) => w.getAttribute("data-state"))).toEqual([
      "settled",
      "settled",
    ]);
  });
});
