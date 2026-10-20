// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeToken, encodeToken, type Seed } from "@/engine";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PlayScreen } from "../PlayScreen";
import { saveRun } from "../savedRun";

const query = { current: "" };
const replaced: string[] = [];

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query.current),
  usePathname: () => "/play",
  useRouter: () => ({ replace: (href: string) => void replaced.push(href), push: vi.fn() }),
}));

// Seed golden-cup8. THEIRS: the golden engine-5 draft under the live prefix, observed 5-0-1.
// MINE: the first offered player into the first open slot, observed 1-1-2.
const THEIRS = GOLDEN_CUP8_V5.replace(/^pd5\./, "pd6.");
const MINE =
  "pd6.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1sicCIsODgzLCJzMCJdLFsicCIsMzE1LCJzMSJdLFsicCIsMjcyLCJzMiJdLFsicCIsNjkxLCJzMyJdLFsicCIsNDUzLCJzNCJdLFsicCIsNzU0LCJzNSJdLFsicCIsMzc2LCJzNiJdLFsicCIsMTc1LCJzNyJdLFsicCIsNjYzLCJzOCJdLFsicCIsMTg4LCJzOSJdLFsicCIsNzM3LCJzMTAiXSxbInAiLDc4NCwiYjAiXSxbInAiLDcwMywiYjEiXSxbInAiLDk0MiwiYjIiXSxbInAiLDE0NSwiYjMiXSxbInAiLDg4NCwiYjQiXV1d";
const CHALLENGE = "mode=cup8&f=4-2-3-1&order=squadFirst&g=123456789&style=classic3";

beforeEach(() => {
  replaced.length = 0;
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

describe("a challenge with a run to beat", () => {
  it("New run drops the run to beat along with the seed (catches a fresh seed still compared with the old run)", async () => {
    query.current = `${CHALLENGE}&seed=golden-cup8&vs=${THEIRS}`;
    render(<PlayScreen />);
    fireEvent.click(screen.getByTestId("run-start"));
    await screen.findByTestId("round-header", undefined, { timeout: 10_000 });
    fireEvent.click(screen.getByTestId("new-run"));
    expect(replaced).toEqual([`/play?${CHALLENGE}`]);
  });

  it("shows the head-to-head right after the hero on the results (catches a challenge whose results never compare)", async () => {
    const { settings } = decodeToken(MINE);
    saveRun({ settings, seed: "golden-cup8", daily: null }, "results", MINE);
    query.current = `${CHALLENGE}&seed=golden-cup8&vs=${THEIRS}`;
    render(<PlayScreen />);
    const verdict = await screen.findByTestId("h2h-verdict", undefined, { timeout: 10_000 });
    expect(verdict.textContent).toBe("They win the seed");
    const hero = screen.getByRole("heading", { level: 1 }).closest("section")!;
    const h2h = screen.getByTestId("head-to-head");
    expect(hero.nextElementSibling).toBe(h2h);
  });

  it("shows no head-to-head when the run to beat is from another seed", async () => {
    const { settings } = decodeToken(MINE);
    saveRun({ settings, seed: "golden-cup8", daily: null }, "results", MINE);
    const other = encodeToken({ ...decodeToken(THEIRS), seed: "other-seed" as Seed });
    query.current = `${CHALLENGE}&seed=golden-cup8&vs=${other}`;
    render(<PlayScreen />);
    await screen.findByTestId("results-record", undefined, { timeout: 10_000 });
    expect(screen.getByTestId("results-record").textContent).toBe("1-1-2");
    expect(screen.queryByTestId("head-to-head")).toBeNull();
  });
});
