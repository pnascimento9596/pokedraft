// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "../PlayScreen";
import { computeAccessibleName } from "dom-accessibility-api";

const query = { current: "" };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("scrollTo", () => {});
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

// Round 1 at GK offers Dewott (#502), Basculin (#550) and Tympole (#535).
const POSITION_FIRST =
  "mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=cap-0";
const SQUAD_FIRST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=cap-0";

async function start(q: string, ratings: boolean): Promise<void> {
  if (ratings) {
    localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
  }
  query.current = q;
  render(<PlayScreen />);
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
}

describe("position-first Scout (4f)", () => {
  it("position-first Scout opens with slot context (shows In slot: GK, catches no Scout path in Position First)", async () => {
    await start(POSITION_FIRST, true);
    fireEvent.click(screen.getByTestId("slot-s0"));
    fireEvent.click(screen.getByRole("button", { name: "Scout Dewott" }));
    const dossier = screen.getByRole("dialog", { name: "Dewott" });
    expect(within(dossier).getByTestId("dossier-slot").textContent).toContain("In slot: GK");
    expect(
      [
        ...within(dossier)
          .getByRole("img", { name: "Dewott attribute radar" })
          .querySelectorAll("text"),
      ].map((t) => t.textContent),
    ).toEqual(["DIV", "REF", "HAN", "GKP", "KIC", "AER"]);
    expect(within(dossier).getByTestId("dossier-offer-count").textContent).toBe("1 of 3");
    fireEvent.click(within(dossier).getByRole("button", { name: "Next offer" }));
    expect(within(dossier).getByRole("heading", { level: 2 }).textContent).toBe("Basculin");
    expect(screen.getByTestId("round-header").textContent).toBe("Round 1 of 16");
  });

  it("the Scout button keeps one-tap picking: a card tap still signs the player at GK", async () => {
    await start(POSITION_FIRST, false);
    fireEvent.click(screen.getByTestId("slot-s0"));
    expect(screen.getByRole("button", { name: "Scout Dewott" })).toBeTruthy();
    fireEvent.click(screen.getByTestId("candidate-502"));
    expect(screen.getByTestId("round-header").textContent).toBe("Round 2 of 16");
    expect(computeAccessibleName(screen.getByTestId("slot-s0"))).toBe("GK Dewott");
  });

  it("squad first has no Scout button on the cards (regression guard, no RED: the selection bar keeps its Scout)", async () => {
    await start(SQUAD_FIRST, false);
    expect(screen.getByTestId("candidate-502")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Scout Dewott" })).toBeNull();
  });
});
