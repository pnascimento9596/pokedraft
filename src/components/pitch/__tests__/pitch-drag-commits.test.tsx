// @vitest-environment jsdom
import { Profiler, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Pitch } from "@/components/pitch/Pitch";
import { applyAction, createDraft, speciesById, type Seed, type SpeciesId } from "@/engine";

const realElementFromPoint = document.elementFromPoint;

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => {};
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventShim extends MouseEvent {
      readonly pointerId: number;
      readonly pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.elementFromPoint = realElementFromPoint;
});

const fresh = createDraft(
  { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
  "t" as Seed,
);

// Bulbasaur (#001) at LCB, Charmander (#004) at ST.
const twoPlaced = applyAction(
  applyAction(fresh, {
    type: "place",
    species: 1 as SpeciesId,
    slot: { kind: "starter", index: 2 },
  }),
  { type: "place", species: 4 as SpeciesId, slot: { kind: "starter", index: 9 } },
).lineup;

const frame = () => act(() => vi.advanceTimersByTime(16));

describe("pitch drag commits", () => {
  it("commits once on drop and once per hovered target, never per pointermove (catches a re-render on every move)", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const commits = { count: 0 };
    const swaps: string[] = [];
    function Board() {
      const [swapCount, setSwapCount] = useState(0);
      return (
        <Profiler id="pitch" onRender={() => commits.count++}>
          <p>{swapCount}</p>
          <Pitch
            formation="4-3-3"
            lineup={twoPlaced}
            speciesOf={speciesById}
            onSwap={(a, b) => {
              swaps.push(`${a.kind}${a.index}>${b.kind}${b.index}`);
              setSwapCount((n) => n + 1);
            }}
          />
        </Profiler>
      );
    }
    render(<Board />);
    const from = screen.getByTestId("slot-s2");
    const to = screen.getByTestId("slot-s9");
    document.elementFromPoint = () => to;
    const mouse = { pointerId: 4, pointerType: "mouse", button: 0 };

    commits.count = 0;
    fireEvent.pointerDown(from, { ...mouse, clientX: 10, clientY: 10 });
    frame();
    const down = commits.count;
    for (let i = 1; i <= 20; i++) {
      fireEvent.pointerMove(from, { ...mouse, clientX: 10 + i * 6, clientY: 10 + i * 7 });
      frame();
    }
    const moves = commits.count - down;
    fireEvent.pointerUp(from, { ...mouse, clientX: 130, clientY: 150 });
    frame();
    const drop = commits.count - down - moves;

    expect({ down, moves, drop, swaps }).toEqual({
      down: 0,
      moves: 1,
      drop: 1,
      swaps: ["starter2>starter9"],
    });
  });
});
