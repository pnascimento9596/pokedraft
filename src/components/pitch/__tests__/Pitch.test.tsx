// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Pitch } from "@/components/pitch/Pitch";
import { applyAction, createDraft, type Seed, type SpeciesId } from "@/engine";

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
  document.elementFromPoint = realElementFromPoint;
});

const fresh = createDraft(
  { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
  "t" as Seed,
);
const empty = fresh.lineup;

// Bulbasaur (#001) at LCB, Charmander (#004) at ST.
const twoPlaced = applyAction(
  applyAction(fresh, {
    type: "place",
    species: 1 as SpeciesId,
    slot: { kind: "starter", index: 2 },
  }),
  { type: "place", species: 4 as SpeciesId, slot: { kind: "starter", index: 9 } },
).lineup;

// A finger drag past the slop: the browser sends no click after it, unlike a mouse drag.
function touchDrag(from: HTMLElement, to: HTMLElement) {
  document.elementFromPoint = () => to;
  const touch = { pointerId: 7, pointerType: "touch", button: 0 };
  fireEvent.pointerDown(from, { ...touch, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(from, { ...touch, clientX: 120, clientY: 140 });
  fireEvent.pointerUp(from, { ...touch, clientX: 120, clientY: 140 });
}

// A finger tap: down, up, then the click the browser sends for it (detail 1).
function tap(el: HTMLElement) {
  const touch = { pointerId: 8, pointerType: "touch", button: 0, clientX: 5, clientY: 5 };
  fireEvent.pointerDown(el, touch);
  fireEvent.pointerUp(el, touch);
  fireEvent.click(el, { detail: 1 });
}

describe("Pitch", () => {
  it("labels every starter and bench slot so taps reach the right SlotRef", () => {
    const onSlotTap = vi.fn();
    render(<Pitch formation="4-3-3" lineup={empty} onSlotTap={onSlotTap} />);
    fireEvent.click(screen.getByRole("button", { name: "Empty LCB slot" }));
    fireEvent.click(screen.getByRole("button", { name: "Empty SUB 2 slot" }));
    expect(onSlotTap.mock.calls).toEqual([
      [{ kind: "starter", index: 2 }],
      [{ kind: "bench", index: 1 }],
    ]);
  });

  it("still takes the next tap after a touch drag, which ends with no click (SF-02: a stuck drag flag swallowed it)", () => {
    const onSlotTap = vi.fn();
    const onSwap = vi.fn();
    render(<Pitch formation="4-3-3" lineup={twoPlaced} onSlotTap={onSlotTap} onSwap={onSwap} />);
    touchDrag(
      screen.getByRole("button", { name: "LCB Bulbasaur" }),
      screen.getByRole("button", { name: "ST Charmander" }),
    );
    tap(screen.getByRole("button", { name: "Empty GK slot" }));
    expect({ swaps: onSwap.mock.calls, taps: onSlotTap.mock.calls }).toEqual({
      swaps: [
        [
          { kind: "starter", index: 2 },
          { kind: "starter", index: 9 },
        ],
      ],
      taps: [[{ kind: "starter", index: 0 }]],
    });
  });

  it("still takes Enter or Space on a slot after a touch drag (the keyboard click has no pointer events)", () => {
    const onSlotTap = vi.fn();
    render(<Pitch formation="4-3-3" lineup={twoPlaced} onSlotTap={onSlotTap} onSwap={() => {}} />);
    touchDrag(
      screen.getByRole("button", { name: "LCB Bulbasaur" }),
      screen.getByRole("button", { name: "ST Charmander" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Empty GK slot" }), { detail: 0 });
    expect(onSlotTap.mock.calls).toEqual([[{ kind: "starter", index: 0 }]]);
  });

  it("drops the click a mouse drag ends with, so a drag never also opens the slot", () => {
    const onSlotTap = vi.fn();
    render(<Pitch formation="4-3-3" lineup={twoPlaced} onSlotTap={onSlotTap} onSwap={() => {}} />);
    const from = screen.getByRole("button", { name: "LCB Bulbasaur" });
    document.elementFromPoint = () => screen.getByRole("button", { name: "ST Charmander" });
    const mouse = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(from, { ...mouse, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(from, { ...mouse, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(from, { ...mouse, clientX: 120, clientY: 140 });
    fireEvent.click(from, { detail: 1 });
    expect(onSlotTap.mock.calls).toEqual([]);
  });

  it("marks the token picked for a tap swap as pressed, and only the filled ones as toggles", () => {
    render(
      <Pitch
        formation="4-3-3"
        lineup={twoPlaced}
        onSlotTap={() => {}}
        selected={{ kind: "starter", index: 9 }}
      />,
    );
    expect({
      st: screen.getByTestId("slot-s9").getAttribute("aria-pressed"),
      lcb: screen.getByTestId("slot-s2").getAttribute("aria-pressed"),
      gk: screen.getByTestId("slot-s0").getAttribute("aria-pressed"),
    }).toEqual({ st: "true", lcb: "false", gk: null });
  });
});
