// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeToken } from "@/engine/token";
import type { Seed } from "@/engine/types";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import { boardHref, parseBoardView } from "@/components/leaderboard/client";
import type { BoardEntry } from "@/leaderboard/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const COACHED = encodeToken({
  v: 7,
  settings: {
    mode: "cup8",
    formation: "4-3-3",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "open",
    order: "squadFirst",
  },
  seed: "coach-view" as Seed,
  actions: [],
  manager: [{ type: "tactic", match: 0, minute: 30, tactic: "attack" }],
});

const ENTRY: BoardEntry = {
  rank: 1,
  nickname: "Misty",
  mode: "cup8",
  variant: "open.squadFirst.g123456789",
  dailyDate: null,
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

function submitWith(token: string, entry: BoardEntry) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ entry }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<SubmitPanel token={token} daily={false} />);
  fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "Misty" } });
  fireEvent.click(screen.getByTestId("submit-button"));
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("coach view in the URL (catches a filtered board that cannot be linked)", () => {
  it("reads coach from the query and defaults anything else to all", () => {
    const at = (q: string) => parseBoardView(new URLSearchParams(q), "2026-10-10").coach;
    expect(at("mode=cup8&scope=all&coach=uncoached")).toBe("uncoached");
    expect(at("mode=cup8&scope=all&coach=coached")).toBe("coached");
    expect(at("mode=cup8&scope=all")).toBe("all");
    expect(at("mode=cup8&scope=all&coach=managed")).toBe("all");
  });

  it("writes coach into the link only for a filtered view", () => {
    expect(boardHref({ mode: "cup8", scope: "all", coach: "uncoached" })).toBe(
      "/leaderboard?mode=cup8&scope=all&coach=uncoached",
    );
    expect(boardHref({ mode: "cup8", scope: "daily", date: "2026-10-09", coach: "coached" })).toBe(
      "/leaderboard?mode=cup8&scope=daily&date=2026-10-09&coach=coached",
    );
    expect(boardHref({ mode: "kanto151", scope: "all", coach: "all" })).toBe(
      "/leaderboard?mode=kanto151&scope=all",
    );
  });
});

describe("submit names the run's own coach view (catches an uncoached leader shown its All rank)", () => {
  it("sends coach=uncoached for an uncoached run and links to the uncoached board", async () => {
    const fetchMock = submitWith("pd1.abc", ENTRY);
    expect((await screen.findByTestId("submit-success")).textContent).toBe(
      "#1Misty is on the all-time board, among uncoached runs.",
    );
    expect(sentBody(fetchMock)).toEqual({
      nickname: "Misty",
      token: "pd1.abc",
      engineVersion: "pokedraft-engine-7",
      coach: "uncoached",
    });
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=all&coach=uncoached",
    );
  });

  it("sends coach=coached for a coached run and links to the coached board", async () => {
    const fetchMock = submitWith(COACHED, { ...ENTRY, token: COACHED, coached: true });
    expect((await screen.findByTestId("submit-success")).textContent).toBe(
      "#1Misty is on the all-time board, among coached runs.",
    );
    expect((sentBody(fetchMock) as { coach: string }).coach).toBe("coached");
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=all&coach=coached",
    );
  });
});
