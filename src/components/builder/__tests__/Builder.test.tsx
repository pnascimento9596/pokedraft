// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/components/home/HomeScreen";
import { applyAction, createDraft, type DraftSettings, type SpeciesId } from "@/engine";
import { BUILDER_URL_SEED, builderToken } from "@/ui/lineup";

const GEN1: DraftSettings = { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false };

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

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Bulbasaur (#001) at LCB, Charmander (#004) at ST, shared through the ?b= URL token.
function openWithTwoPlaced() {
  let state = createDraft(GEN1, BUILDER_URL_SEED);
  state = applyAction(state, {
    type: "place",
    species: 1 as SpeciesId,
    slot: { kind: "starter", index: 2 },
  });
  state = applyAction(state, {
    type: "place",
    species: 4 as SpeciesId,
    slot: { kind: "starter", index: 9 },
  });
  window.history.replaceState(
    null,
    "",
    `/?b=${builderToken(GEN1, state.lineup, BUILDER_URL_SEED)}`,
  );
  render(<HomeScreen />);
}

function openPicker(slotName: string) {
  fireEvent.click(screen.getByRole("button", { name: slotName }));
  return screen.getByRole("dialog");
}

describe("builder drag and swap", () => {
  it("dragging one filled token onto another swaps them instead of dropping or duplicating", async () => {
    openWithTwoPlaced();
    const from = await screen.findByRole("button", { name: "Bulbasaur, LCB" });
    const to = screen.getByRole("button", { name: "Charmander, ST" });
    document.elementFromPoint = () => to;

    fireEvent.pointerDown(from, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(from, { pointerId: 1, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(from, { pointerId: 1, clientX: 120, clientY: 140 });

    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("Charmander, LCB");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("Bulbasaur, ST");
  });

  it("picking a species already on the field into another slot swaps the two, never duplicates it", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "Bulbasaur, LCB" });
    const dialog = openPicker("Charmander, ST");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "bulba" } });
    fireEvent.click(within(dialog).getByTestId("pick-1"));

    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("Bulbasaur, ST");
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("Charmander, LCB");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("builder picker", () => {
  it("search by name narrows the list to matches (pika shows Pikachu #025, hides Bulbasaur)", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    expect(within(dialog).getByRole("heading").textContent).toBe("Pick for LCB");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    const row = within(dialog).getByTestId("pick-25");
    expect(within(row).getByText("Pikachu")).toBeTruthy();
    expect(within(row).getByText("#025")).toBeTruthy();
    expect(within(dialog).queryByText("Bulbasaur")).toBeNull();
  });

  it("type filter keeps only that type (fire shows Charmander, hides Squirtle)", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.click(within(dialog).getByRole("button", { name: "Fire" }));

    expect(within(dialog).getByText("Charmander")).toBeTruthy();
    expect(within(dialog).queryByText("Squirtle")).toBeNull();
  });

  it("fit stays hidden with Show ratings off, so the blind default never leaks a rating", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    expect(within(dialog).getByTestId("pick-25")).toBeTruthy();
    expect(within(dialog).queryByTestId("fit-25")).toBeNull();
    expect(within(dialog).queryByText("30")).toBeNull();
  });

  it("fit shows the slot role's scouting number with Show ratings on (Pikachu at CB is 30)", () => {
    render(<HomeScreen />);
    act(() => {
      fireEvent.click(screen.getByRole("switch", { name: /Show ratings \(builder\)/ }));
    });
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    const fit = within(dialog).getByTestId("fit-25");
    expect(fit.textContent).toBe("CB fit30");
  });
});
