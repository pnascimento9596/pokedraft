// @vitest-environment jsdom
// Theme 7F: a swap without a drag (SA-02, SB-26, SC-10) and focus after screen swaps, picks and
// rerolls (SC-11).
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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SQUAD_FIRST = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";
const POSITION_FIRST =
  "mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=run-pf";

const label = (key: string) => screen.getByTestId(`slot-${key}`).getAttribute("aria-label");
const pressed = (key: string) => screen.getByTestId(`slot-${key}`).getAttribute("aria-pressed");
const hint = () => screen.queryByTestId("draft-hint")?.textContent ?? null;
const header = () => screen.getByTestId("round-header").textContent;

function start(q: string) {
  query.current = q;
  render(<PlayScreen />);
  fireEvent.click(screen.getByTestId("run-start"));
}

// The first offered player into the first open slot, every round, as e2e/helpers.ts drafts.
function draftAll() {
  for (let round = 1; round <= 16; round++) {
    fireEvent.click(document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!);
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-testid^="slot-"][data-filled="false"]:not([disabled])',
      )!,
    );
  }
}

describe("tap to swap on the draft board", () => {
  it("after the draft, a tap on one player and then another swaps them (SB-26: the second tap did nothing)", () => {
    start(SQUAD_FIRST);
    draftAll();
    expect(header()).toBe("Draft complete");
    expect([label("s0"), label("s9")]).toEqual(["GK Dustox", "ST Yamper"]);

    fireEvent.click(screen.getByTestId("slot-s0"));
    expect({ gk: pressed("s0"), st: pressed("s9"), hint: hint() }).toEqual({
      gk: "true",
      st: "false",
      hint: "Tap another slot to swap Dustox, or tap it again to cancel.",
    });

    fireEvent.click(screen.getByTestId("slot-s9"));
    expect({
      gk: label("s0"),
      st: label("s9"),
      pressed: [pressed("s0"), pressed("s9")],
      hint: hint(),
    }).toEqual({ gk: "GK Yamper", st: "ST Dustox", pressed: ["false", "false"], hint: null });
  });

  it("a second tap on the same player cancels the swap and changes nothing", () => {
    start(SQUAD_FIRST);
    draftAll();
    fireEvent.click(screen.getByTestId("slot-s0"));
    fireEvent.click(screen.getByTestId("slot-s0"));
    expect({ gk: label("s0"), pressed: pressed("s0"), hint: hint() }).toEqual({
      gk: "GK Dustox",
      pressed: "false",
      hint: null,
    });
  });

  it("Escape cancels a picked swap", () => {
    start(SQUAD_FIRST);
    draftAll();
    fireEvent.click(screen.getByTestId("slot-s4"));
    expect(pressed("s4")).toBe("true");
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.click(screen.getByTestId("slot-s9"));
    expect({ rb: label("s4"), st: label("s9"), pressed: pressed("s4") }).toEqual({
      rb: "RB Honedge",
      st: "ST Yamper",
      pressed: "false",
    });
  });

  it("mid-draft, a tap on a placed player picks them to swap and a tap on an open slot moves them there, without a pick", () => {
    start(SQUAD_FIRST);
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByRole("button", { name: "Empty ST slot" }));
    expect(header()).toBe("Round 2 of 16");

    fireEvent.click(screen.getByRole("button", { name: "ST Gulpin" }));
    expect(pressed("s9")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Empty GK slot" }));
    expect({ gk: label("s0"), st: label("s9"), round: header() }).toEqual({
      gk: "GK Gulpin",
      st: "Empty ST slot",
      round: "Round 2 of 16",
    });
  });

  it("names each reroll button by what it shows, count included, so the visible text is part of its name", () => {
    start(SQUAD_FIRST);
    expect(
      screen
        .getAllByRole("button", { name: /^Reroll/ })
        .map((b) => [b.textContent, b.getAttribute("aria-label")]),
    ).toEqual([
      ["Reroll type 3 left", null],
      ["Reroll region 3 left", null],
    ]);
  });

  it("keeps the last reroll button focusable when its count runs out, and a press then does nothing", () => {
    start(SQUAD_FIRST);
    const reroll = () => screen.getByRole("button", { name: /^Reroll type/ });
    for (let i = 0; i < 3; i++) {
      reroll().focus();
      fireEvent.click(reroll());
    }
    const before = screen.getAllByTestId(/^candidate-/).map((el) => el.dataset.testid);
    expect({
      name: reroll().textContent,
      disabled: (reroll() as HTMLButtonElement).disabled,
      ariaDisabled: reroll().getAttribute("aria-disabled"),
      focused: document.activeElement === reroll(),
    }).toEqual({
      name: "Reroll type 0 left",
      disabled: false,
      ariaDisabled: "true",
      focused: true,
    });
    fireEvent.click(reroll());
    expect(screen.getAllByTestId(/^candidate-/).map((el) => el.dataset.testid)).toEqual(before);
  });
});

describe("focus after the screen changes (SC-11)", () => {
  const focused = () => {
    const el = document.activeElement;
    return el === null || el === document.body ? "body" : `${el.tagName}: ${el.textContent}`;
  };

  it("Start run moves focus to the round heading", () => {
    query.current = SQUAD_FIRST;
    render(<PlayScreen />);
    screen.getByTestId("run-start").focus();
    fireEvent.click(screen.getByTestId("run-start"));
    expect(focused()).toBe("H1: Round 1 of 16");
  });

  it("a Position First pick, whose player list goes away, moves focus to the round heading", () => {
    start(POSITION_FIRST);
    fireEvent.click(screen.getByRole("button", { name: "Empty GK slot" }));
    const candidate = document.querySelector<HTMLElement>('[data-testid^="candidate-"]')!;
    candidate.focus();
    fireEvent.click(candidate);
    expect(focused()).toBe("H1: Round 2 of 16");
  });

  it("See results moves focus to the results heading, and New run to the start heading", () => {
    start(SQUAD_FIRST);
    draftAll();
    screen.getByTestId("see-results").focus();
    fireEvent.click(screen.getByTestId("see-results"));
    expect(focused()).toBe("H1: 8-0 Challenge, Open");
    const newRun = screen.getByRole("button", { name: "New run" });
    newRun.focus();
    fireEvent.click(newRun);
    expect(focused()).toBe("H1: 8-0 Challenge");
  });

  it("New run from the draft board moves focus to the start heading", () => {
    start(SQUAD_FIRST);
    screen.getByTestId("new-run").focus();
    fireEvent.click(screen.getByTestId("new-run"));
    expect(focused()).toBe("H1: 8-0 Challenge");
  });
});
