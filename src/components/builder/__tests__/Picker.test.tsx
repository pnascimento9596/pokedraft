// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Picker } from "@/components/builder/Picker";
import {
  applyAction,
  createDraft,
  type DraftSettings,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "@/engine";

const ALL_GENS: DraftSettings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  HTMLElement.prototype.setPointerCapture = () => {};
});

afterEach(() => {
  cleanup();
});

describe("Picker", () => {
  it("shows exact target role and chemistry deltas when scouting a replacement", () => {
    const slot: SlotRef = { kind: "starter", index: 0 };
    let draft = applyAction(createDraft(ALL_GENS, "test" as Seed), {
      type: "place",
      slot,
      species: 9 as SpeciesId,
    });
    draft = applyAction(draft, {
      type: "place",
      slot: { kind: "starter", index: 1 },
      species: 8 as SpeciesId,
    });
    render(
      <Picker
        state={draft}
        slot={slot}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
    expect(screen.getByLabelText("Slot role rating comparison").textContent).toBe(
      "GK ROLE RATING 24 vs 98 (-74)",
    );
    expect(screen.getByLabelText("Chemistry comparison").textContent).toBe(
      "Chemistry 1.9% vs 3.8% (-1.9 percentage points).",
    );
    expect(screen.getByRole("region", { name: "Role fit mini pitch" }).textContent).toContain("W");
  });

  it("previews both sides of an existing starter swap rather than duplicating the candidate", () => {
    const slot: SlotRef = { kind: "starter", index: 0 };
    let draft = createDraft(ALL_GENS, "test" as Seed);
    for (const [index, species] of [
      [0, 9],
      [1, 8],
      [2, 25],
      [3, 7],
    ] as const) {
      draft = applyAction(draft, {
        type: "place",
        slot: { kind: "starter", index },
        species: species as SpeciesId,
      });
    }
    render(
      <Picker
        state={draft}
        slot={slot}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
    expect(screen.getByLabelText("Chemistry comparison").textContent).toBe(
      "Chemistry 13.3% vs 13.3% (0 percentage points).",
    );
    expect(draft.lineup.starters.slice(0, 4)).toEqual([9, 8, 25, 7]);
  });

  it("keeps swap suitability qualitative and hides comparison numbers with ratings off", () => {
    const slot: SlotRef = { kind: "starter", index: 0 };
    let draft = applyAction(createDraft(ALL_GENS, "test" as Seed), {
      type: "place",
      slot,
      species: 9 as SpeciesId,
    });
    draft = applyAction(draft, {
      type: "place",
      slot: { kind: "bench", index: 0 },
      species: 25 as SpeciesId,
    });
    render(
      <Picker
        state={draft}
        slot={slot}
        showRatings={false}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
    expect(screen.getByLabelText("Swap suitability for Pikachu").textContent).toBe(
      "Pikachu to GK: bad fit. Blastoise to SUB 1: ok fit.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
    expect(screen.queryByLabelText("Slot role rating comparison")).toBeNull();
    expect(screen.queryByLabelText("Chemistry comparison")).toBeNull();
    expect(
      screen.getByRole("region", { name: "Role fit mini pitch" }).querySelectorAll(".num"),
    ).toHaveLength(0);
  });

  it.each(["starter", "bench"] as const)(
    "Scout compares the target %s occupant without replacing or clearing the placement",
    (kind) => {
      const slot: SlotRef = { kind, index: 0 };
      const draft = applyAction(createDraft(ALL_GENS, "test" as Seed), {
        type: "place",
        slot,
        species: 9 as SpeciesId,
      });
      const onPick = vi.fn();
      const onClear = vi.fn();
      const onClose = vi.fn();
      render(
        <Picker
          state={draft}
          slot={slot}
          showRatings={true}
          onPick={onPick}
          onClear={onClear}
          onClose={onClose}
        />,
      );
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
      fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
      const dossier = screen.getByRole("dialog", { name: "Pikachu" });
      expect(within(dossier).getByLabelText("Incumbent comparison").textContent).toContain(
        "Blastoise",
      );
      expect(within(dossier).getByLabelText("PAC difference versus Blastoise").textContent).toBe(
        "+7",
      );
      fireEvent.click(within(dossier).getByRole("button", { name: "Close" }));
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Blastoise" } });
      const incumbent = screen.getByTestId("pick-9") as HTMLButtonElement;
      expect(incumbent.disabled).toBe(true);
      expect(incumbent.textContent).toContain("In this slot");
      expect(onPick).toHaveBeenCalledTimes(0);
      expect(onClear).toHaveBeenCalledTimes(0);
      expect(onClose).toHaveBeenCalledTimes(0);
    },
  );

  it("omits comparisons for an empty target and when scouting the incumbent itself", () => {
    const slot: SlotRef = { kind: "starter", index: 0 };
    const empty = createDraft(ALL_GENS, "test" as Seed);
    const occupied = applyAction(empty, { type: "place", slot, species: 9 as SpeciesId });
    const view = render(
      <Picker
        state={empty}
        slot={slot}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Pikachu" } });
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
    expect(screen.queryByLabelText("Incumbent comparison")).toBeNull();
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Pikachu" })).getByRole("button", {
        name: "Close",
      }),
    );
    view.rerender(
      <Picker
        state={occupied}
        slot={slot}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Scout Pikachu" }));
    expect(screen.getByLabelText("Incumbent comparison").textContent).toContain("Blastoise");
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Pikachu" })).getByRole("button", {
        name: "Close",
      }),
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Blastoise" } });
    fireEvent.click(screen.getByRole("button", { name: "Scout Blastoise" }));
    const self = screen.getByRole("dialog", { name: "Blastoise" });
    expect(within(self).queryByLabelText("Incumbent comparison")).toBeNull();
    expect(self.querySelectorAll("[data-delta]").length).toBe(0);
    expect(
      within(self).getByRole("img", { name: "Blastoise attribute radar" }).tagName.toLowerCase(),
    ).toBe("svg");
  });

  it("provides a Clear filters button when a search filter is active and resets it", () => {
    const draft = createDraft(ALL_GENS, "test" as Seed);
    render(
      <Picker
        state={draft}
        slot={{ kind: "starter", index: 0 }}
        showRatings={false}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Pikachu" } });
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("shows a Load more button when matches exceed limit to reach all eligible species", () => {
    const draft = createDraft(ALL_GENS, "test" as Seed);
    render(
      <Picker
        state={draft}
        slot={{ kind: "starter", index: 0 }}
        showRatings={false}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const loadMoreBtn = screen.getByRole("button", { name: /Load more/i });
    expect(loadMoreBtn).toBeDefined();
    const initialItems = screen.getAllByTestId(/^pick-/);
    expect(initialItems.length).toBe(120);
    fireEvent.click(loadMoreBtn);
    const expandedItems = screen.getAllByTestId(/^pick-/);
    expect(expandedItems.length).toBe(240);
  });

  it("sorts candidates by role rating, filters by recommended fit, and opens the Scouting Dossier", () => {
    const draft = createDraft(ALL_GENS, "test" as Seed);
    render(
      <Picker
        state={draft}
        slot={{ kind: "starter", index: 0 }}
        showRatings={true}
        onPick={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const sortSelect = screen.getByTestId("picker-sort");
    fireEvent.change(sortSelect, { target: { value: "rating" } });
    const firstPick = screen.getAllByTestId(/^pick-/)[0]!;
    expect(firstPick.getAttribute("data-testid")).toBe("pick-249");

    const recToggle = screen.getByTestId("picker-recommended");
    fireEvent.click(recToggle);
    expect(recToggle.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(recToggle);
    fireEvent.change(sortSelect, { target: { value: "dex" } });
    fireEvent.click(screen.getByTestId("inspect-25"));
    const dossier = screen.getByTestId("scouting-dossier");
    expect(dossier.textContent).toContain("Pikachu");
    expect(dossier.textContent).toContain("PAC");
    expect(dossier.textContent).toContain("SHO");
    expect(dossier.textContent).toContain("Static");
  });
});
