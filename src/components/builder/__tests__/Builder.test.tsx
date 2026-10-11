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

  it("a search for a species the settings hide says why instead of a bare No matches (Mewtwo is Legendary, Legendaries is off by default)", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "mewtwo" } });
    expect(
      within(dialog).getByText(
        "No matches. Your Generations or Legendaries setting hides some Pokémon.",
      ),
    ).toBeTruthy();
  });

  it("a search that matches no Pokémon at all still says just No matches", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "zzzz" } });
    expect(within(dialog).getByText("No matches")).toBeTruthy();
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

  // Below an 800 px pitch the token pill is the number alone (the "vs other <role>s" line is
  // hidden by CSS), so phone players saw a bare number with nothing saying what it compares
  // against. One legend line under the pitch says it; the CSS hides it where the labels show.
  it("with Show ratings on, a legend under the pitch says what the number compares against, and it is absent with ratings off", async () => {
    openWithBenchToo();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    expect(screen.queryByText(/Ratings are 0 to 100/)).toBeNull();
    showRatings();
    expect(screen.getByTestId("ratings-legend").textContent).toBe(
      "Ratings are 0 to 100, vs other players in the same role.",
    );
    showRatings();
    expect(screen.queryByTestId("ratings-legend")).toBeNull();
  });
});

// The ?b= token of openWithTwoPlaced() under engine 3. It decodes to
// [["b","4-3-3","1",0],"builder",[["l",1,"s2"],["l",4,"s9"]]]: Bulbasaur at LCB, Charmander at ST.
const TWO_PLACED_TOKEN =
  "pd3.W1siYiIsIjQtMy0zIiwiMSIsMF0sImJ1aWxkZXIiLFtbImwiLDEsInMyIl0sWyJsIiw0LCJzOSJdXV0";

function filledSlots() {
  return document.querySelectorAll('[data-testid^="slot-"][data-filled="true"]').length;
}

describe("builder toolbar (catches buttons that stop doing what they say)", () => {
  it("picking a species fills the empty slot and closes the picker", () => {
    render(<HomeScreen />);
    const dialog = openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });
    fireEvent.click(within(dialog).getByTestId("pick-25"));

    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Pikachu");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(filledSlots()).toBe(1);
  });

  it("Clear all empties every slot and then disables itself", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    expect(filledSlots()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(filledSlots()).toBe(0);
    expect(screen.getByRole("button", { name: "Empty LCB slot" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Clear all" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("Reset restores the default panel and an empty 4-3-3 lineup", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });
    const style = screen.getByRole("group", { name: "Draft style" });
    fireEvent.click(within(style).getByRole("button", { name: "Classic" }));
    fireEvent.change(screen.getByLabelText("Formation"), { target: { value: "3-5-2" } });
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("3-5-2");
    expect(filledSlots()).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("4-3-3");
    expect(within(style).getByRole("button", { name: "Open" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    const gens = screen.getByRole("group", { name: "Generations" });
    expect(within(gens).getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(filledSlots()).toBe(0);
    expect(screen.getByRole("button", { name: "Empty LCB slot" })).toBeTruthy();
  });

  it("Copy link writes the share URL and says so, and says when the copy fails", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(writeText.mock.calls).toEqual([[`http://localhost:3000/?b=${TWO_PLACED_TOKEN}`]]);
    expect(screen.getByRole("status").textContent).toBe("Link copied");

    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(screen.getByRole("status").textContent).toBe("Could not copy the link");
  });

  it("Download image requests the builder card and saves it as pokedraft-lineup.png", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" },
      }),
    );
    URL.createObjectURL = vi.fn(() => "blob:card");
    URL.revokeObjectURL = vi.fn();
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push(`${this.download} ${this.href}`);
    });
    openWithTwoPlaced();
    await screen.findByRole("button", { name: "LCB Bulbasaur" });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Download image" }));
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`/card?b=${TWO_PLACED_TOKEN}`]);
    expect(saved).toEqual(["pokedraft-lineup.png blob:card"]);
  });
});
