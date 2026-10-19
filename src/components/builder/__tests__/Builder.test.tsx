// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/components/home/HomeScreen";
import {
  applyAction,
  createDraft,
  type DraftSettings,
  type SlotRef,
  type SpeciesId,
} from "@/engine";
import { builderToken, draftFromBuilderToken } from "@/ui/builder-token";
import { BUILDER_URL_SEED } from "@/ui/lineup";

// The home Play buttons navigate with the app router.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));

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

// The first tap on an idle builder loads the engine with import(), so the sheet opens a tick later.
async function openPicker(slotName: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${slotName}(?: |$)`) }));
  return screen.findByRole("dialog", undefined, { timeout: 10_000 });
}

describe("builder drag and swap", () => {
  it("dragging one filled token onto another swaps them instead of dropping or duplicating", async () => {
    openWithTwoPlaced();
    const from = await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    const to = screen.getByRole("button", { name: /ST Charmander/ });
    document.elementFromPoint = () => to;

    fireEvent.pointerDown(from, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(from, { pointerId: 1, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(from, { pointerId: 1, clientX: 120, clientY: 140 });

    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Charmander");
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Bulbasaur");
  });

  it("picking a species already on the field into another slot swaps the two, never duplicates it", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    const dialog = await openPicker("ST Charmander");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "bulba" } });
    fireEvent.click(within(dialog).getByTestId("pick-1"));

    // The pick lands once the sheet's history entry is gone (see "the picker sheet" below).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Bulbasaur");
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Charmander");
  });
});

describe("the picker sheet", () => {
  const onSheetEntry = () => {
    const state: unknown = window.history.state;
    return typeof state === "object" && state !== null && "pokedraftSheet" in state;
  };

  it("owns one history entry, so the browser Back button closes it and the page stays on /", async () => {
    render(<HomeScreen />);
    await openPicker("Empty LCB slot");
    expect(onSheetEntry()).toBe(true);

    act(() => window.history.back());

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect({ path: window.location.pathname, sheet: onSheetEntry() }).toEqual({
      path: "/",
      sheet: false,
    });
  });

  it("writes a pick's ?b= link on the page's own entry, not on the sheet's entry that Back drops", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });
    fireEvent.click(within(dialog).getByTestId("pick-25"));

    await waitFor(() =>
      expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Pikachu"),
    );
    expect({ sheet: onSheetEntry(), link: window.location.search.startsWith("?b=") }).toEqual({
      sheet: false,
      link: true,
    });
  });

  it("closes on a downward swipe of more than 80 px on its header, and not on a shorter one", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    const head = within(dialog).getByRole("heading").closest("header")!;

    fireEvent.pointerDown(head, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(head, { pointerId: 1, clientY: 160 });
    fireEvent.pointerUp(head, { pointerId: 1, clientY: 160 });
    expect(screen.queryByRole("dialog")).not.toBeNull();

    fireEvent.pointerDown(head, { pointerId: 2, button: 0, clientY: 100 });
    fireEvent.pointerMove(head, { pointerId: 2, clientY: 200 });
    fireEvent.pointerUp(head, { pointerId: 2, clientY: 200 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("gives focus back to the tapped slot when it closes", async () => {
    render(<HomeScreen />);
    await openPicker("Empty LCB slot");
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(screen.getByTestId("slot-s2"));
  });
});

describe("builder picker", () => {
  it("search by name narrows the list to matches (pika shows Pikachu #025, hides Bulbasaur)", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    expect(within(dialog).getByRole("heading").textContent).toBe("Pick for LCB");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    const row = within(dialog).getByTestId("pick-25");
    expect(within(row).getByText("Pikachu")).toBeTruthy();
    expect(within(row).getByText("#025")).toBeTruthy();
    expect(within(dialog).queryByText("Bulbasaur")).toBeNull();
  });

  it("type filter keeps only that type (fire shows Charmander, hides Squirtle)", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.click(within(dialog).getByRole("button", { name: "Fire" }));

    expect(within(dialog).getByText("Charmander")).toBeTruthy();
    expect(within(dialog).queryByText("Squirtle")).toBeNull();
  });

  it("a search for a species the settings hide says why instead of a bare No matches (Mewtwo is Legendary, Legendaries is off by default)", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "mewtwo" } });
    expect(
      within(dialog).getByText(
        "No matches. Your Generations or Legendaries setting hides some Pokémon.",
      ),
    ).toBeTruthy();
  });

  it("a search that matches no Pokémon at all still says just No matches", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "zzzz" } });
    expect(within(dialog).getByText("No matches")).toBeTruthy();
  });
  it("the rating stays hidden with Show ratings off, so the blind default never leaks a number, a label or the raw fit", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });

    const row = within(dialog).getByTestId("pick-25");
    expect(row).toBeTruthy();
    expect(within(dialog).queryByTestId("fit-25")).toBeNull();
    expect(within(dialog).queryByText("30")).toBeNull();
    expect(within(dialog).queryByText(/vs other/)).toBeNull();
    expect(within(dialog).queryByText(/Raw fit/)).toBeNull();
    expect(row.hasAttribute("aria-describedby")).toBe(false);
  });

  it("with Show ratings on, a slot's row says where the player ranks for that role (Pikachu at CB: 7 vs other CBs, raw fit 30 on the row's description)", async () => {
    render(<HomeScreen />);
    showRatings();
    const dialog = await openPicker("Empty LCB slot");
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

  it("a bench slot keeps Best: <role> and rates the player at that role (Pikachu: Best W, 75 vs other wingers, raw fit 72)", async () => {
    render(<HomeScreen />);
    showRatings();
    const dialog = await openPicker("Empty SUB 1 slot");
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
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    expect(screen.getByTestId("slot-s2").textContent).toBe("DF  LCB  Bulbasaur Grass Poison ");
    expect(screen.getByTestId("slot-s9").textContent).toBe("FW  ST  Charmander Fire ");
    expect(screen.getByTestId("slot-b0").textContent).toBe("SUB  SUB 1  Pikachu Electric ");
  });

  it("with Show ratings on, print the same number and label as the picker (Bulbasaur at CB 23, Charmander at ST 43, Pikachu on the bench 75)", async () => {
    openWithBenchToo();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    showRatings();
    expect(screen.getByTestId("slot-s2").textContent).toBe(
      "DF 23 vs other CBs LCB  Bulbasaur Grass Poison ",
    );
    expect(screen.getByTestId("slot-s9").textContent).toBe(
      "FW 43 vs other strikers ST  Charmander Fire ",
    );
    expect(screen.getByTestId("slot-b0").textContent).toBe(
      "SUB 75 vs other wingers SUB 1  Pikachu Electric ",
    );
  });

  // Below an 800 px pitch the token pill is the number alone (the "vs other <role>s" line is
  // hidden by CSS), so phone players saw a bare number with nothing saying what it compares
  // against. One legend line under the pitch says it; the CSS hides it where the labels show.
  it("with Show ratings on, a legend under the pitch says what the number compares against, and it is absent with ratings off", async () => {
    openWithBenchToo();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
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
  "pd6.W1siYiIsIjQtMy0zIiwiMSIsMF0sImJ1aWxkZXIiLFtbImwiLDEsInMyIl0sWyJsIiw0LCJzOSJdXV0";

function filledSlots() {
  return document.querySelectorAll('[data-testid^="slot-"][data-filled="true"]').length;
}

const OWN_BUILDER_TOKEN = "pd6.W1siYiIsIjQtMy0zIiwiMSIsMF0sImJ1aWxkZXIiLFtbImwiLDI1LCJzMiJdXV0";
const EDITED_BUILDER_TOKEN =
  "pd6.W1siYiIsIjQtMy0zIiwiMSIsMF0sImJ1aWxkZXIiLFtbImwiLDI1LCJzMiJdLFsibCIsNCwiczkiXV1d";
const POOL_BUILDER_TOKEN =
  "pd6.W1siYiIsIjMtNS0yIiwiMTIiLDFdLCJidWlsZGVyIixbWyJsIiwyNSwiczIiXSxbImwiLDQsImIwIl1dXQ";

async function replaceBulbasaurWithPikachu() {
  const dialog = await openPicker("LCB Bulbasaur");
  fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });
  fireEvent.click(within(dialog).getByTestId("pick-25"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Pikachu");
}

describe("browser builder checkpoints (catches drafts lost when reopening the plain home page)", () => {
  it("checkpoints Randomize synchronously before React commits, so immediate close cannot lose the squad", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    try {
      openWithTwoPlaced();
      await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Randomize" }));
        const raw = localStorage.getItem("pokedraft.builder");
        expect(raw).not.toBeNull();
        const saved = draftFromBuilderToken(JSON.parse(raw!));
        expect([
          saved?.lineup.starters.filter((id) => id !== null).length,
          saved?.lineup.bench.filter((id) => id !== null).length,
        ]).toEqual([11, 5]);
      });
      expect(filledSlots()).toBe(16);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("Randomize from the idle builder saves the edited squad rather than consuming its checkpoint on the initial empty draft", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    try {
      render(<HomeScreen />);
      fireEvent.click(screen.getByRole("button", { name: "Randomize" }));
      await waitFor(() => expect(filledSlots()).toBe(16));
      const raw = localStorage.getItem("pokedraft.builder");
      expect(raw).not.toBeNull();
      const saved = draftFromBuilderToken(JSON.parse(raw!));
      expect([
        saved?.lineup.starters.filter((id) => id !== null).length,
        saved?.lineup.bench.filter((id) => id !== null).length,
      ]).toEqual([11, 5]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("restores the exact saved formation, pool, starters and bench without a shared URL", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(POOL_BUILDER_TOKEN));
    render(<HomeScreen />);

    await screen.findByRole("button", { name: /CB Pikachu/ }, { timeout: 10_000 });
    expect(screen.getByTestId("slot-b0").getAttribute("aria-label")).toBe("SUB 1 Charmander");
    expect(filledSlots()).toBe(2);
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("3-5-2");
    expect(screen.getByRole("switch", { name: /Legendaries/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    const gens = screen.getByRole("group", { name: "Generations" });
    expect(within(gens).getByRole("button", { name: /Gen 1/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(within(gens).getByRole("button", { name: /Gen 3/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("saves a player edit and restores that squad after closing and reopening plain home", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    await replaceBulbasaurWithPikachu();
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(EDITED_BUILDER_TOKEN));

    cleanup();
    window.history.replaceState(null, "", "/");
    render(<HomeScreen />);
    await screen.findByRole("button", { name: /LCB Pikachu/ }, { timeout: 10_000 });
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Charmander");
    expect(filledSlots()).toBe(2);
  });

  it("opens the explicit shared squad while viewing, ratings and Reset preserve the player's other saved squad", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(OWN_BUILDER_TOKEN));
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Charmander");
    showRatings();
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(OWN_BUILDER_TOKEN));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(filledSlots()).toBe(0);
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(OWN_BUILDER_TOKEN));

    cleanup();
    window.history.replaceState(null, "", "/");
    render(<HomeScreen />);
    await screen.findByRole("button", { name: /LCB Pikachu/ }, { timeout: 10_000 });
    expect(filledSlots()).toBe(1);
  });

  it("adopts an edited shared squad as the player's checkpoint and Reset clears it", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(OWN_BUILDER_TOKEN));
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    await replaceBulbasaurWithPikachu();
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(EDITED_BUILDER_TOKEN));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(filledSlots()).toBe(0);
    expect(JSON.parse(localStorage.getItem("pokedraft.builder") ?? "null")).toBeNull();

    cleanup();
    window.history.replaceState(null, "", "/");
    render(<HomeScreen />);
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("Empty LCB slot");
    expect(filledSlots()).toBe(0);
  });

  it("Clear all clears the checkpoint when the URL is the player's own saved squad", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(TWO_PLACED_TOKEN));
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(filledSlots()).toBe(0);
    expect(JSON.parse(localStorage.getItem("pokedraft.builder") ?? "null")).toBeNull();
  });

  it("Reset cannot erase a newer squad checkpoint saved by another tab", async () => {
    localStorage.setItem("pokedraft.builder", JSON.stringify(TWO_PLACED_TOKEN));
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    localStorage.setItem("pokedraft.builder", JSON.stringify(OWN_BUILDER_TOKEN));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(filledSlots()).toBe(0);
    expect(localStorage.getItem("pokedraft.builder")).toBe(JSON.stringify(OWN_BUILDER_TOKEN));
  });

  it("a formation edit checkpoints the rebuilt squad and survives a plain-home reopen", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    fireEvent.change(screen.getByLabelText("Formation"), { target: { value: "3-5-2" } });
    cleanup();
    window.history.replaceState(null, "", "/");
    render(<HomeScreen />);
    await screen.findByRole("button", { name: /CB Bulbasaur/ }, { timeout: 10_000 });
    expect((screen.getByLabelText("Formation") as HTMLSelectElement).value).toBe("3-5-2");
    expect(filledSlots()).toBe(2);
  });

  it("still plays and edits when browser storage reads and writes throw", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    await replaceBulbasaurWithPikachu();
    expect(screen.getByTestId("slot-s9").getAttribute("aria-label")).toBe("ST Charmander");
    expect(filledSlots()).toBe(2);
  });

  it.each(["{", '{"token":42}', '"pd99.invalid"', '"pd3.invalid"'])(
    "an invalid checkpoint %s leaves the empty builder usable",
    async (raw) => {
      localStorage.setItem("pokedraft.builder", raw);
      render(<HomeScreen />);
      const dialog = await openPicker("Empty LCB slot");
      fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });
      fireEvent.click(within(dialog).getByTestId("pick-25"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Pikachu");
      expect(filledSlots()).toBe(1);
    },
  );

  it("an initial home with no checkpoint keeps its empty idle pitch and does not save a draft on picker open", async () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("Empty LCB slot");
    expect(filledSlots()).toBe(0);
    expect(localStorage.getItem("pokedraft.builder")).toBeNull();
    const dialog = await openPicker("Empty LCB slot");
    expect(within(dialog).getByRole("heading").textContent).toBe("Pick for LCB");
    expect(localStorage.getItem("pokedraft.builder")).toBeNull();
  });
});

describe("builder toolbar (catches buttons that stop doing what they say)", () => {
  it("picking a species fills the empty slot and closes the picker", async () => {
    render(<HomeScreen />);
    const dialog = await openPicker("Empty LCB slot");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "pika" } });
    fireEvent.click(within(dialog).getByTestId("pick-25"));

    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("Empty LCB slot");
    // The pick lands once the sheet's history entry is gone (see "the picker sheet" above).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("slot-s2").getAttribute("aria-label")).toBe("LCB Pikachu");
    expect(filledSlots()).toBe(1);
  });

  it("Clear all empties every slot and then disables itself", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    expect(filledSlots()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(filledSlots()).toBe(0);
    expect(screen.getByRole("button", { name: /Empty LCB slot/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Clear all" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("Reset restores the default panel and an empty 4-3-3 lineup", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
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
    expect(screen.getByRole("button", { name: /Empty LCB slot/ })).toBeTruthy();
  });

  it("Copy link writes the share URL and says so, and says when the copy fails", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(writeText.mock.calls).toEqual([[`http://localhost:3000/?b=${TWO_PLACED_TOKEN}`]]);
    expect(
      within(screen.getByRole("toolbar", { name: "Builder actions" })).getByRole("status")
        .textContent,
    ).toBe("Link copied");

    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(
      within(screen.getByRole("toolbar", { name: "Builder actions" })).getByRole("status")
        .textContent,
    ).toBe("Could not copy the link");
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
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Download image" }));
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`/card?b=${TWO_PLACED_TOKEN}`]);
    expect(saved).toEqual(["pokedraft-lineup.png blob:card"]);
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
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
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

describe("placed squad scouting and live lines", () => {
  it("offers scouting for placed starters and bench with blind numerical gating", async () => {
    openWithBenchToo();
    await screen.findByText("Scout squad (3)", {}, { timeout: 10_000 });
    fireEvent.click(screen.getByText("Scout squad (3)"));
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu at SUB 1" }));
    const dossier = screen.getByRole("dialog");
    expect(within(dossier).getByRole("heading", { name: "Pikachu" }).textContent).toBe("Pikachu");
    expect(within(dossier).queryByRole("region", { name: "Attribute radar" })).toBeNull();
    expect(screen.queryByTestId("live-lines")).toBeNull();
  });

  it("shows filled counts and current line strength only when ratings are enabled", async () => {
    openWithTwoPlaced();
    await screen.findByRole("button", { name: /LCB Bulbasaur/ }, { timeout: 10_000 });
    showRatings();
    expect(screen.getByTestId("live-lines").textContent).toContain("DEF 1/4");
    expect(screen.getByTestId("live-lines").textContent).toContain("ATT 1/3");
    expect(screen.getByTestId("live-lines").textContent).toContain("GK 0/1");
  });
});

it("keeps Builder actions above feedback that appears after the engine loads", async () => {
  openWithTwoPlaced();
  const toolbar = screen.getByRole("toolbar", { name: "Builder actions" });
  const feedback = await screen.findByText(/^Chemistry links \(/, {}, { timeout: 10_000 });
  expect(
    Boolean(toolbar.compareDocumentPosition(feedback) & Node.DOCUMENT_POSITION_FOLLOWING),
  ).toBe(true);
});
