// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/components/home/HomeScreen";
import {
  applyAction,
  createDraft,
  type DraftSettings,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
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

// The same two starters plus Pikachu (#025) on the first bench slot.
function openWithBenchToo() {
  let state = createDraft(GEN1, BUILDER_URL_SEED);
  const place = (species: number, slot: SlotRef) => {
    state = applyAction(state, { type: "place", species: species as SpeciesId, slot });
  };
  place(1, { kind: "starter", index: 2 });
  place(4, { kind: "starter", index: 9 });
  place(25, { kind: "bench", index: 0 });
  window.history.replaceState(
    null,
    "",
    `/?b=${builderToken(GEN1, state.lineup, BUILDER_URL_SEED)}`,
  );
  render(<HomeScreen />);
}

function showRatings() {
  act(() => {
    fireEvent.click(screen.getByRole("switch", { name: /Show ratings \(builder\)/ }));
  });
}

function openPicker(slotName: string) {
  fireEvent.click(screen.getByRole("button", { name: slotName }));
  return screen.getByRole("dialog");
}

describe("builder drag and swap", () => {
  it("dragging one filled token onto another swaps them instead of dropping or duplicating", async () => {
    openWithTwoPlaced();
    const from = await screen.findByRole("button", { name: "LCB Bulbasaur" });
    const to = screen.getByRole("button", { name: "ST Charmander" });
    document.elementFromPoint = () => to;

    fireEvent.pointerDown(from, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(from, { pointerId: 1, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(from, { pointerId: 1, clientX: 120, clientY: 140 });

    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Charmander");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Bulbasaur");
  });

  it("picking a species already on the field into another slot swaps the two, never duplicates it", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    const dialog = openPicker("ST Charmander");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "bulba" } });
    fireEvent.click(within(dialog).getByTestId("pick-1"));

    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Bulbasaur");
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Charmander");
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

  it("the rating stays hidden with Show ratings off, so the blind default never leaks a number, a label or the raw fit", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    const row = within(dialog).getByTestId("pick-25");
    expect(row).toBeTruthy();
    expect(within(dialog).queryByTestId("fit-25")).toBeNull();
    expect(within(dialog).queryByText("30")).toBeNull();
    expect(within(dialog).queryByText(/vs other/)).toBeNull();
    expect(within(dialog).queryByText(/Raw fit/)).toBeNull();
    expect(row.hasAttribute("aria-describedby")).toBe(false);
  });

  it("with Show ratings on, a slot's row says where the player ranks for that role (Pikachu at CB: 7 vs other CBs, raw fit 30 on the row's description)", () => {
    render(<HomeScreen />);
    showRatings();
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    expect(within(dialog).getByTestId("fit-25").textContent).toBe("7 vs other CBs");
    // The row stays one button; the raw fit rides on its accessible description.
    expect(
      within(dialog).getByRole("button", {
        name: /Pikachu/,
        description: "Raw fit 30 of 100 for LCB",
      }),
    ).toBeTruthy();
  });

  it("a bench slot keeps Best: <role> and rates the player at that role (Pikachu: Best W, 75 vs other wingers, raw fit 72)", () => {
    render(<HomeScreen />);
    showRatings();
    const dialog = openPicker("Empty SUB 1 slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    expect(within(dialog).getByTestId("fit-25").textContent).toBe("Best: W 75 vs other wingers");
    expect(
      within(dialog).getByRole("button", {
        name: /Pikachu/,
        description: "Raw fit 72 of 100 for W",
      }),
    ).toBeTruthy();
  });
});

describe("builder pitch token notes", () => {
  it("show no rating on any token with Show ratings off", async () => {
    openWithBenchToo();
    expect((await screen.findByTestId("slot-s2")).textContent).toBe("LCB Bulbasaur");
    expect(screen.getByTestId("slot-s9").textContent).toBe("ST Charmander");
    expect(screen.getByTestId("slot-b0").textContent).toBe("SUB 1 Pikachu");
  });

  it("with Show ratings on, print the same number and label as the picker (Bulbasaur at CB 23, Charmander at ST 43, Pikachu on the bench 75)", async () => {
    openWithBenchToo();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    showRatings();
    expect(screen.getByTestId("slot-s2").textContent).toBe("LCB Bulbasaur 23 vs other CBs");
    expect(screen.getByTestId("slot-s9").textContent).toBe("ST Charmander 43 vs other strikers");
    expect(screen.getByTestId("slot-b0").textContent).toBe("SUB 1 Pikachu 75 vs other wingers");
  });
});

describe("builder Download image feedback (SA-20, SB-05)", () => {
  const png = () =>
    ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/png" }),
      blob: async () => new Blob(["png"], { type: "image/png" }),
    }) as unknown as Response;

  const tools = async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    return screen.getByRole("toolbar", { name: "Builder actions" });
  };

  it("says Preparing image and disables the button while the card renders, so a second tap cannot start a second request", async () => {
    vi.stubGlobal("fetch", () => new Promise<Response>(() => {}));
    const bar = await tools();
    const button = within(bar).getByRole("button", { name: "Download image" });
    fireEvent.click(button);
    expect(within(bar).getByRole("status").textContent).toBe("Preparing image");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    vi.unstubAllGlobals();
  });

  it("tells the player the download failed when the card request fails, instead of an unhandled rejection and a button that did nothing", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 500, headers: new Headers() }));
    const bar = await tools();
    fireEvent.click(within(bar).getByRole("button", { name: "Download image" }));
    expect((await within(bar).findByRole("alert")).textContent).toBe("Download failed. Try again.");
    expect(
      (within(bar).getByRole("button", { name: "Download image" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    vi.unstubAllGlobals();
  });

  it("says Image saved after the PNG is handed to the browser as pokedraft-lineup.png", async () => {
    vi.stubGlobal("fetch", async () => png());
    const created = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:card");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const bar = await tools();
    fireEvent.click(within(bar).getByRole("button", { name: "Download image" }));
    await act(async () => {});
    expect(within(bar).getByRole("status").textContent).toBe("Image saved");
    expect(names).toEqual(["pokedraft-lineup.png"]);
    expect(created).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
