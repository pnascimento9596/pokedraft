// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  it("stretches a dragged starter's vertical move by 1/cos(26deg) so it stays under the pointer on the tilted field (catches drag drift)", () => {
    render(
      <Pitch formation="4-3-3" lineup={twoPlaced} speciesOf={speciesById} onSwap={() => {}} />,
    );
    document.elementFromPoint = () => null;
    const card = screen.getByTestId("slot-s2");
    const mouse = { pointerId: 3, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(card, { ...mouse, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(card, { ...mouse, clientX: 10, clientY: 110 });
    expect(card.style.translate).toBe("0px 111.26px");
  });

  it("keeps filled tactical slot labels visible instead of hiding LCB behind a generic DF label", () => {
    render(<Pitch formation="4-3-3" lineup={twoPlaced} speciesOf={speciesById} />);
    const card = screen.getByTestId("slot-s2");
    expect(card.querySelector('[id$="-slot"]')?.className).not.toContain("visually-hidden");
    expect(card.querySelector('[id$="-slot"]')?.textContent).toBe("LCB");
  });

  it("includes visible filled tactical labels in the accessible name on scoutable results", () => {
    render(
      <Pitch formation="4-3-3" lineup={twoPlaced} speciesOf={speciesById} onSlotTap={() => {}} />,
    );
    const card = screen.getByTestId("slot-s2");
    const label = card.querySelector('[id$="-slot"]')!;
    expect(card.getAttribute("aria-labelledby")?.split(" ")).toContain(label.id);
  });

  it("labels every starter and bench slot so taps reach the right SlotRef", () => {
    const onSlotTap = vi.fn();
    render(
      <Pitch formation="4-3-3" lineup={empty} speciesOf={speciesById} onSlotTap={onSlotTap} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Empty LCB slot/ }));
    fireEvent.click(screen.getByRole("button", { name: /Empty SUB 2 slot/ }));
    expect(onSlotTap.mock.calls).toEqual([
      [{ kind: "starter", index: 2 }],
      [{ kind: "bench", index: 1 }],
    ]);
  });

  it("still takes the next tap after a touch drag, which ends with no click (SF-02: a stuck drag flag swallowed it)", () => {
    const onSlotTap = vi.fn();
    const onSwap = vi.fn();
    render(
      <Pitch
        formation="4-3-3"
        lineup={twoPlaced}
        speciesOf={speciesById}
        onSlotTap={onSlotTap}
        onSwap={onSwap}
      />,
    );
    touchDrag(
      screen.getByRole("button", { name: /LCB Bulbasaur/ }),
      screen.getByRole("button", { name: /ST Charmander/ }),
    );
    tap(screen.getByRole("button", { name: /Empty GK slot/ }));
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
    render(
      <Pitch
        formation="4-3-3"
        lineup={twoPlaced}
        speciesOf={speciesById}
        onSlotTap={onSlotTap}
        onSwap={() => {}}
      />,
    );
    touchDrag(
      screen.getByRole("button", { name: /LCB Bulbasaur/ }),
      screen.getByRole("button", { name: /ST Charmander/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Empty GK slot/ }), { detail: 0 });
    expect(onSlotTap.mock.calls).toEqual([[{ kind: "starter", index: 0 }]]);
  });

  it("drops the click a mouse drag ends with, so a drag never also opens the slot", () => {
    const onSlotTap = vi.fn();
    render(
      <Pitch
        formation="4-3-3"
        lineup={twoPlaced}
        speciesOf={speciesById}
        onSlotTap={onSlotTap}
        onSwap={() => {}}
      />,
    );
    const from = screen.getByRole("button", { name: /LCB Bulbasaur/ });
    document.elementFromPoint = () => screen.getByRole("button", { name: /ST Charmander/ });
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
        speciesOf={speciesById}
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

  it("renders the Poké Ball midfield markings with red top, white bottom, and center band", () => {
    const { container } = render(
      <Pitch formation="4-3-3" lineup={empty} speciesOf={speciesById} />,
    );
    const mark = container.querySelector('[data-testid="pitch-pokeball-mark"]');
    expect(mark).not.toBeNull();
    expect(mark?.querySelector("path")).not.toBeNull();
    expect(mark?.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3);
  });

  it("applies position suitability attributes to empty slots", () => {
    render(
      <Pitch
        formation="4-3-3"
        lineup={empty}
        speciesOf={speciesById}
        suitabilityOf={(ref) => {
          if (ref.kind === "starter" && ref.index === 9) return "recommended";
          if (ref.kind === "starter" && ref.index === 0) return "bad";
          return "ok";
        }}
      />,
    );
    expect(screen.getByTestId("slot-s9").getAttribute("data-suitability")).toBe("recommended");
    expect(screen.getByTestId("slot-s0").getAttribute("data-suitability")).toBe("bad");
    expect(screen.getByTestId("slot-s2").getAttribute("data-suitability")).toBe("ok");
  });
});

it("orders a visible rating before the tactical label in a filled card accessible name", () => {
  render(
    <Pitch
      formation="4-3-3"
      lineup={twoPlaced}
      speciesOf={speciesById}
      onSlotTap={() => {}}
      tokenNote={(_ref, id) => <span id={`${id}-score`}>42</span>}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "LCB Bulbasaur DF 42 LCB Bulbasaur Grass Poison" })
      .getAttribute("data-testid"),
  ).toBe("slot-s2");
});
