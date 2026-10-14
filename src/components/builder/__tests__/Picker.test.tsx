// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Picker } from "@/components/builder/Picker";
import { createDraft, type DraftSettings, type Seed } from "@/engine";

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
