// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GOLDEN_CUP8_V3, GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import type { BoardEntry } from "@/leaderboard/contract";
import { StatefulBoard } from "./board-harness";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DAILY = { mode: "cup8", scope: "daily", date: "2026-10-09" } as const;
const ALL_TIME = { mode: "cup8", scope: "all", date: "2026-10-09" } as const;

const MISTY: BoardEntry = {
  rank: 1,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: "2026-10-09",
  token: "pd1.abc",
  teamScore: 845,
  wins: 8,
  draws: 0,
  losses: 0,
  createdAt: "2026-10-09T12:00:00.000Z",
  coached: false,
  engineVersion: "pokedraft-engine-7",
  seed: "e2e-seed",
  formation: "4-3-3",
};

const BROCK: BoardEntry = {
  ...MISTY,
  rank: 2,
  nickname: "Brock",
  token: "pd1.def",
  teamScore: 790,
  wins: 6,
  draws: 1,
  losses: 1,
  formation: "3-5-2",
};

function serve(view: { scope: "daily" | "all" }, entries: BoardEntry[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        mode: "cup8",
        scope: view.scope,
        date: view.scope === "daily" ? "2026-10-09" : null,
        coach: "all",
        engine: view.scope === "daily" ? "all" : "current",
        entries,
      }),
    ),
  );
}

function storeNickname(value: string) {
  localStorage.setItem("pokedraft:nickname", JSON.stringify(value));
}

describe("own rows", () => {
  it("marks Misty's row as the player's own when Misty is the stored nickname (catches own rows looking like everyone else's)", async () => {
    storeNickname("Misty");
    serve(DAILY, [MISTY, BROCK]);
    render(<StatefulBoard view={DAILY} />);
    const rows = await screen.findAllByTestId("board-row");
    expect(rows.map((r) => r.getAttribute("data-me"))).toEqual(["true", null]);
    expect(within(rows[0]).getByTestId("own-row-chip").textContent).toBe("You");
    expect(within(rows[1]).queryByTestId("own-row-chip")).toBeNull();
    expect(within(rows[0]).getByText(", you").className).toBe("visually-hidden");
  });

  it("matches a stored nickname the way the server stores it, trimmed with inner spaces collapsed (catches a saved '  Ash   Red ' missing its row)", async () => {
    storeNickname("  Ash   Red ");
    serve(DAILY, [{ ...MISTY, nickname: "Ash Red" }, BROCK]);
    render(<StatefulBoard view={DAILY} />);
    const rows = await screen.findAllByTestId("board-row");
    expect(rows.map((r) => r.getAttribute("data-me"))).toEqual(["true", null]);
  });

  it("highlights nothing when no nickname is stored or the stored one differs in case (catches a guessed or loose match)", async () => {
    serve(DAILY, [MISTY, BROCK]);
    render(<StatefulBoard view={DAILY} />);
    let rows = await screen.findAllByTestId("board-row");
    expect(rows.map((r) => r.getAttribute("data-me"))).toEqual([null, null]);
    expect(screen.queryByTestId("own-row-chip")).toBeNull();
    cleanup();

    storeNickname("misty");
    render(<StatefulBoard view={DAILY} />);
    rows = await screen.findAllByTestId("board-row");
    expect(rows.map((r) => r.getAttribute("data-me"))).toEqual([null, null]);
  });
});

describe("row details", () => {
  it("shows the formation on Daily rows instead of the fixed daily ruleset (catches every Daily row reading Open, Squad First, All regions)", async () => {
    serve(DAILY, [MISTY, { ...BROCK, formation: null }]);
    render(<StatefulBoard view={DAILY} />);
    const rows = await screen.findAllByTestId("board-row");
    expect(rows[0].textContent).toBe(
      "1Misty4-3-3Squad preview unavailable.W-D-L8-0-0Team Score845",
    );
    expect(rows[1].textContent).toBe(
      "2BrockOpen, Squad First, All regionsSquad preview unavailable.W-D-L6-1-1Team Score790",
    );
  });

  it("keeps the settings label on all-time rows, where settings differ", async () => {
    serve(ALL_TIME, [MISTY]);
    render(<StatefulBoard view={ALL_TIME} />);
    const rows = await screen.findAllByTestId("board-row");
    expect(rows[0].textContent).toBe(
      "1MistyOpen, Squad First, All regionsSquad preview unavailable.W-D-L8-0-0Team Score845",
    );
  });

  it("names each challenge link by its row (catches every row reading the same Challenge this Seed)", async () => {
    serve(ALL_TIME, [
      { ...MISTY, token: GOLDEN_CUP8_V3, wins: 3, draws: 0, losses: 2 },
      { ...BROCK, token: GOLDEN_CUP8_V5, wins: 2, draws: 1, losses: 2 },
    ]);
    render(<StatefulBoard view={ALL_TIME} />);
    await screen.findAllByTestId("board-row");
    const links = screen.getAllByRole("link", { name: /^Challenge this Seed/ });
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Challenge this Seed: Misty, 3-0-2",
      "Challenge this Seed: Brock, 2-1-2",
    ]);
    expect(links.map((a) => a.textContent)).toEqual(["Challenge this Seed", "Challenge this Seed"]);
  });

  it("links each row to an exhibition against its squad, carrying the nickname (catches board rows with no exhibition entry)", async () => {
    serve(ALL_TIME, [
      { ...MISTY, token: GOLDEN_CUP8_V3, wins: 3, draws: 0, losses: 2 },
      { ...BROCK, nickname: "Ash & Brock", token: "pd1.undecodable" },
    ]);
    render(<StatefulBoard view={ALL_TIME} />);
    await screen.findAllByTestId("board-row");
    const links = screen.getAllByRole("link", { name: /^Exhibition vs this squad/ });
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      `/exhibition?away=${GOLDEN_CUP8_V3}&name=Misty`,
    ]);
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Exhibition vs this squad: Misty, 3-0-2",
    ]);
    expect(links.map((a) => a.textContent)).toEqual(["Exhibition vs this squad"]);
  });
});
