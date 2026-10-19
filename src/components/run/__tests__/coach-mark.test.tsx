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

const OPEN = "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=run-test";

async function start(): Promise<void> {
  fireEvent.click(screen.getByTestId("run-start"));
  await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
}

describe("first-draft coach mark", () => {
  it("coach mark shows once: the first pick dismisses it and the next draft does not show it (catches a tip that never goes away)", async () => {
    query.current = OPEN;
    render(<PlayScreen />);
    await start();
    expect(screen.getByTestId("coach-mark").textContent).toBe(
      "Watch the spin, pick one that matches, place it on the pitch. Fill all 16 to play the cup.Got it",
    );
    fireEvent.click(screen.getByTestId("candidate-316"));
    fireEvent.click(screen.getByTestId("slot-s9"));
    expect(screen.queryByTestId("coach-mark")).toBeNull();
    expect(localStorage.getItem("pokedraft:coach:draft")).toBe("true");

    cleanup();
    sessionStorage.clear();
    render(<PlayScreen />);
    await start();
    expect(screen.queryByTestId("coach-mark")).toBeNull();
  });

  it("Got it dismisses the coach mark, remembers it and moves focus to the round heading", async () => {
    query.current = OPEN;
    render(<PlayScreen />);
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByTestId("coach-mark")).toBeNull();
    expect(localStorage.getItem("pokedraft:coach:draft")).toBe("true");
    expect(document.activeElement).toBe(screen.getByTestId("round-header"));
  });

  it("words the tip for the draft it sits on: Classic offers three, Position First picks the slot first, 151 rolls one", async () => {
    const lines: string[] = [];
    for (const q of [
      "mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=classic3&seed=run-test",
      "mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=run-test",
      "mode=kanto151&f=4-3-3&order=squadFirst&seed=run-test",
    ]) {
      query.current = q;
      render(<PlayScreen />);
      await start();
      lines.push(screen.getByTestId("coach-mark").querySelector("p")!.textContent!);
      cleanup();
      sessionStorage.clear();
      localStorage.clear();
    }
    expect(lines).toEqual([
      "Watch the spin, pick one of three, place it on the pitch. Fill all 16 to play the cup.",
      "Pick a slot, watch the spin, pick one of three. Fill all 16 to play the cup.",
      "Watch the spin, take the Pokémon it rolls, place it on the pitch. Fill all 16 to play the cup.",
    ]);
  });

  it("stays hidden when storage already holds the key", async () => {
    localStorage.setItem("pokedraft:coach:draft", "true");
    query.current = OPEN;
    render(<PlayScreen />);
    await start();
    expect(screen.queryByTestId("coach-mark")).toBeNull();
  });
});
