// @vitest-environment jsdom
// Theme 7F: builder outcomes reach a screen reader (SC-14), and a pick or a clear in the Picker
// gives focus back to the slot that opened it (SC-12).
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Announcer } from "@/components/Announcer";
import { HomeScreen } from "@/components/home/HomeScreen";
import { applyAction, createDraft, type DraftSettings, type SpeciesId } from "@/engine";
import { BUILDER_URL_SEED, builderToken } from "@/ui/lineup";

const GEN1: DraftSettings = { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false };
const realElementFromPoint = document.elementFromPoint;

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
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.elementFromPoint = realElementFromPoint;
});

const said = () => screen.getByTestId("announcer").textContent;

async function flush() {
  await act(async () => {});
}

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
  render(
    <>
      <HomeScreen />
      <Announcer />
    </>,
  );
}

describe("builder announcements", () => {
  it("Randomize says the Team Score the screen shows", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    fireEvent.click(screen.getByRole("button", { name: "Randomize" }));
    await flush();
    const shown = screen.getByTestId("team-score").querySelector(".scorebug__value")?.textContent;
    expect(shown).toMatch(/^\d+$/);
    expect(said()).toBe(`Randomized. Team Score ${shown}.`);
  });

  it("Clear all says the slots are empty", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await flush();
    expect(said()).toBe("Cleared all slots.");
  });

  it("Reset says what it did", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    await flush();
    expect(said()).toBe("Reset the builder settings and cleared all slots.");
  });

  it("a drag swap says who moved where", async () => {
    openWithTwoPlaced();
    const from = await screen.findByRole("button", { name: "LCB Bulbasaur" });
    const to = screen.getByRole("button", { name: "ST Charmander" });
    document.elementFromPoint = () => to;
    fireEvent.pointerDown(from, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(from, { pointerId: 1, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(from, { pointerId: 1, clientX: 120, clientY: 140 });
    await flush();
    expect(said()).toBe("Moved Bulbasaur to ST and Charmander to LCB.");
  });
});

describe("Picker focus return (SC-12)", () => {
  it("a pick gives focus back to the slot that opened the Picker", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    fireEvent.click(screen.getByRole("button", { name: "Empty GK slot" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pikachu" } });
    fireEvent.click(within(dialog).getByTestId("pick-25"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("GK Pikachu");
  });

  it("Clear slot gives focus back to the slot that opened the Picker", async () => {
    openWithTwoPlaced();
    fireEvent.click(await screen.findByRole("button", { name: "ST Charmander" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear slot" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Empty ST slot");
  });
});
