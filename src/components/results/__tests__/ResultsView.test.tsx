// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultsView } from "@/components/results/ResultsView";
import { replay, type CupResult, type PenKick, type Shirt, type SpeciesId } from "@/engine";
import { loadHistory } from "@/ui/runs";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

// Cut with scratch scripts: cup8 Open 4-3-3 seed "seed-9" (observed 8-0-0, Team Score 845),
// cup8 Classic 4-2-3-1 seed "c-4" (observed 5-0-1, out in the quarter-final), and the same
// 16 as a builder friendly with seed "friendly-1" (observed 7-0-1, Team Score 845).
const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";
const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";
const FRIENDLY =
  "pd1.W1siYiIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwxXSwiZnJpZW5kbHktMSIsW1sibCIsNjMwLCJzMCJdLFsibCIsODkzLCJzMSJdLFsibCIsNTU4LCJzMiJdLFsibCIsNjgxLCJzMyJdLFsibCIsNjUyLCJzNCJdLFsibCIsNDY4LCJzNSJdLFsibCIsMjMzLCJzNiJdLFsibCIsNzE3LCJzNyJdLFsibCIsNTczLCJzOCJdLFsibCIsNjYzLCJzOSJdLFsibCIsNjk3LCJzMTAiXSxbImwiLDIwMCwiYjAiXSxbImwiLDQ0NSwiYjEiXSxbImwiLDI1NywiYjIiXSxbImwiLDcyNCwiYjMiXSxbImwiLDg2NiwiYjQiXV1d";

function view(token: string, variant: "live" | "shared" = "shared", cupOverride?: CupResult) {
  const { draft, cup } = replay(token);
  return render(
    <ResultsView token={token} draft={draft} cup={cupOverride ?? cup} variant={variant} />,
  );
}

describe("ResultsView", () => {
  it("shows the replayed record and Team Score, not a placeholder or a recomputed value", () => {
    view(FLAWLESS);
    expect(screen.getByTestId("results-record").textContent).toBe("8-0-0");
    expect(screen.getByTestId("results-score").textContent).toBe("845");
    expect(screen.getByText("Champions")).toBeTruthy();
    expect(screen.queryByText("Friendly (not ranked)")).toBeNull();
  });

  it("badges a builder-mode token as a friendly so it never reads as a ranked run", () => {
    view(FRIENDLY);
    expect(screen.getByText("Friendly (not ranked)")).toBeTruthy();
    expect(screen.getByTestId("results-record").textContent).toBe("7-0-1");
  });

  it("lists the games after elimination as Not played with the nominal ladder rating", () => {
    view(ELIMINATED);
    expect(screen.getByTestId("results-record").textContent).toBe("5-0-1");
    const sf = screen.getByTestId("match-SF");
    const final = screen.getByTestId("match-F");
    expect(within(sf).getByText("Not played")).toBeTruthy();
    expect(within(sf).getByText("about 850")).toBeTruthy();
    expect(within(final).getByText("about 980")).toBeTruthy();
    expect(
      within(screen.getByTestId("match-QF")).getByText("Out in the quarter-final"),
    ).toBeTruthy();
  });

  it("shows the decree line for a final the engine awarded after the sudden-death cap", () => {
    const { cup } = replay(FLAWLESS);
    const kicks: PenKick[] = [];
    for (let i = 0; i < 25; i++) {
      kicks.push({ side: "user", taker: 1 as SpeciesId, scored: true });
      kicks.push({ side: "opp", taker: 9 as Shirt, scored: true });
    }
    kicks.push({ side: "user", taker: 1 as SpeciesId, scored: true });
    kicks.push({ side: "opp", taker: 9 as Shirt, scored: false });
    const matches = cup.matches.map((m) =>
      m.status === "played" && m.round === "F"
        ? {
            ...m,
            regulation: { user: 1, opp: 1 },
            extraTime: { user: 0, opp: 0 },
            shootout: { user: 26, opp: 25, keeper: 1 as SpeciesId, kicks },
            outcome: "W" as const,
          }
        : m,
    );
    view(FLAWLESS, "shared", { ...cup, matches });
    const final = screen.getByTestId("match-F");
    expect(within(final).getByText(/Won on penalties \(decided after 20 rounds\)/)).toBeTruthy();
    expect(within(final).queryByText(/26-25 on pens/)).toBeNull();
  });

  it("records a live run in local history exactly once and never records a shared view", () => {
    const first = view(FLAWLESS, "live");
    first.unmount();
    view(FLAWLESS, "live");
    expect(loadHistory().map((r) => [r.token === FLAWLESS, r.score, r.wins, r.finish])).toEqual([
      [true, 845, 8, "champion"],
    ]);
    cleanup();
    localStorage.clear();
    view(ELIMINATED, "shared");
    expect(loadHistory()).toEqual([]);
  });

  it("copies the /r/ link on Share and says so, and offers Play your own instead of New run when shared", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    view(ELIMINATED);
    expect(screen.queryByRole("button", { name: "New run" })).toBeNull();
    expect(screen.getByRole("link", { name: "Play your own" }).getAttribute("href")).toBe("/");
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText("Link copied")).toBeTruthy();
    expect(writeText.mock.calls).toEqual([[`${location.origin}/r/${ELIMINATED}`]]);
  });

  it("renders the submit slot on a live run and never on a shared view", () => {
    const { draft, cup } = replay(FLAWLESS);
    const slot = <p data-testid="submit-slot">submit here</p>;
    render(<ResultsView token={FLAWLESS} draft={draft} cup={cup} variant="live" submit={slot} />);
    expect(screen.getByTestId("submit-slot").textContent).toBe("submit here");
    cleanup();
    render(<ResultsView token={FLAWLESS} draft={draft} cup={cup} variant="shared" submit={slot} />);
    expect(screen.queryByTestId("submit-slot")).toBeNull();
  });
});
