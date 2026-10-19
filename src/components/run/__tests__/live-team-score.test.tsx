// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "../PlayScreen";

const query = { current: "" };

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

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

const RUN_TEST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
const CAP_SQUAD_FIRST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=cap-0";
const CAP_POSITION_FIRST =
  "mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=cap-0";
const SLOTS = [
  ...Array.from({ length: 11 }, (_, i) => `s${i}`),
  ...Array.from({ length: 5 }, (_, i) => `b${i}`),
];
const CAP_WARNING = "Last legendary or mythical slot. A third fills the cap.";

function ratingsOn(): void {
  localStorage.setItem("pokedraft:panel", JSON.stringify({ showChallengeRatings: true }));
}

async function start(q: string): Promise<void> {
  query.current = q;
  render(<PlayScreen />);
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
}

function scorebug(): { label: string | null; value: string | null } | null {
  const bug = screen.queryByTestId("draft-team-score");
  if (bug === null) return null;
  return {
    label: bug.querySelector(".scorebug__label")?.textContent ?? null,
    value: bug.querySelector(".scorebug__value")?.textContent ?? null,
  };
}

function pickAt(species: number, slot: string): void {
  fireEvent.click(screen.getByTestId(`candidate-${species}`));
  fireEvent.click(screen.getByTestId(`slot-${slot}`));
}

const capWarning = () => screen.queryByTestId("cap-warning")?.textContent ?? null;

describe("live Team Score in the draft hub", () => {
  it("shows no scorebug before the first starter, then Team Score (so far) 66 once Gulpin is at ST", async () => {
    ratingsOn();
    await start(RUN_TEST);
    expect(scorebug()).toBeNull();
    pickAt(316, "s9");
    expect(scorebug()).toEqual({ label: "Team Score (so far)", value: "66" });
  });

  it("tracks every pick of a full draft and ends on the exact engine Team Score 336 without (so far)", async () => {
    ratingsOn();
    await start(RUN_TEST);
    const picks = [269, 256, 926, 858, 679, 655, 582, 824, 230, 835, 403, 292, 215, 185, 843, 688];
    const seen = picks.map((id, round) => {
      pickAt(id, SLOTS[round]!);
      return scorebug();
    });
    const partial = [527, 389, 355, 411, 352, 478, 366, 309, 359, 292, 304, 320, 344, 352, 342];
    expect(seen).toEqual([
      ...partial.map((v) => ({ label: "Team Score (so far)", value: String(v) })),
      { label: "Team Score", value: "336" },
    ]);
    expect(screen.getByTestId("round-header").textContent).toBe("Draft complete");
  });

  it("delta for candidate Combusken with Gulpin at ST is +281, its best empty slot (CM)", async () => {
    ratingsOn();
    await start(RUN_TEST);
    pickAt(316, "s9");
    fireEvent.click(screen.getByTestId("candidate-256"));
    expect(screen.getByTestId("draft-selection-bar")).toBeTruthy();
    expect(screen.getByTestId("draft-delta").textContent).toBe("Team Score +281");
  });

  it("scorebug hidden with ratings off, and no delta on the selected candidate", async () => {
    await start(RUN_TEST);
    pickAt(316, "s9");
    fireEvent.click(screen.getByTestId("candidate-256"));
    expect(screen.getByTestId("draft-selection-bar")).toBeTruthy();
    expect(scorebug()).toBeNull();
    expect(screen.queryByTestId("draft-delta")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Team Score/);
  });
});

describe("legendary cap warning before the third legendary or mythical", () => {
  it("cap warning shows at 2 legendaries when a third is selected, with ratings off, and not before", async () => {
    await start(CAP_SQUAD_FIRST);
    pickAt(647, "s0");
    fireEvent.click(screen.getByTestId("candidate-1016"));
    expect(capWarning()).toBeNull();
    fireEvent.click(screen.getByTestId("slot-s1"));
    pickAt(10, "s2");
    pickAt(650, "s3");
    expect(document.body.textContent).toContain("Legendaries: 2/3");
    fireEvent.click(screen.getByTestId("candidate-522"));
    expect(capWarning()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to the roll" }));
    fireEvent.click(screen.getByTestId("candidate-642"));
    expect(capWarning()).toBe(CAP_WARNING);
  });

  it("cap warning shows in the Position First drawer when a third legendary or mythical is offered at 2", async () => {
    await start(CAP_POSITION_FIRST);
    const picks = [502, 1016, 48, 672, 604, 432, 983, 483, 851];
    picks.forEach((id, round) => {
      fireEvent.click(screen.getByTestId(`slot-${SLOTS[round]}`));
      expect(capWarning()).toBeNull();
      fireEvent.click(screen.getByTestId(`candidate-${id}`));
    });
    expect(document.body.textContent).toContain("Legendaries: 2/3");
    fireEvent.click(screen.getByTestId("slot-s9"));
    expect(screen.getByTestId("candidate-802")).toBeTruthy();
    expect(capWarning()).toBe(CAP_WARNING);
  });
});
