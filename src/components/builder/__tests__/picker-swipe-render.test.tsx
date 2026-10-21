// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createDraft, type Seed, type SlotRef } from "@/engine";
import { Picker } from "../Picker";
import * as lineupModule from "@/ui/lineup";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  HTMLElement.prototype.setPointerCapture = () => {};
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventShim extends MouseEvent {
      readonly pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("picker swipe render efficiency (4j)", () => {
  it("pointer move during swipe modifies transform directly on the dialog without re-rendering", () => {
    const state = createDraft(
      { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
      "test" as Seed,
    );
    const slot: SlotRef = { kind: "starter", index: 0 };
    render(
      <Picker
        state={state}
        slot={slot}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const head = dialog.querySelector("header")!;

    const renderSpy = vi.spyOn(lineupModule, "valueAt");
    renderSpy.mockClear();

    fireEvent.pointerDown(head, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(head, { pointerId: 1, clientY: 140 });
    expect(dialog.style.transform).toBe("translateY(40px)");
    fireEvent.pointerMove(head, { pointerId: 1, clientY: 160 });
    expect(dialog.style.transform).toBe("translateY(60px)");

    // React state was not updated on move, so component did not re-render
    expect(renderSpy).not.toHaveBeenCalled();

    fireEvent.pointerUp(head, { pointerId: 1, clientY: 160 });
    expect(dialog.style.transform).toBe("");
  });
});
