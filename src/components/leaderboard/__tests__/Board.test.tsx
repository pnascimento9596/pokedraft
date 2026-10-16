// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Board } from "@/components/leaderboard/Board";
import type { BoardEntry } from "@/leaderboard/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DAILY = { mode: "cup8", scope: "daily", date: "2026-10-09" } as const;

const ENTRY: BoardEntry = {
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
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Board", () => {
  it("shows the error state, not an empty board, when the API answers 503", async () => {
    const fetchMock = vi.fn(async () =>
      json(503, { error: { code: "DB_UNAVAILABLE", message: "down" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Board view={DAILY} />);
    expect((await screen.findByTestId("board-error")).textContent).toContain(
      "The leaderboard is offline right now.",
    );
    expect(screen.queryByTestId("board-empty")).toBeNull();
    expect(screen.queryByTestId("board")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboard?mode=cup8&scope=daily&date=2026-10-09",
      expect.anything(),
    );
  });

  it("shows the error state on a network failure and retries into the board", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        json(200, {
          mode: "cup8",
          scope: "daily",
          date: "2026-10-09",
          coach: "all",
          entries: [ENTRY],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<Board view={DAILY} />);
    const error = await screen.findByTestId("board-error");
    expect(error.textContent).toContain("Could not reach the leaderboard.");
    expect(screen.queryByTestId("board-empty")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect((await screen.findAllByTestId("board-row")).length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a 200 with a malformed body as an error, not an empty board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { entries: "nope" })),
    );
    render(<Board view={DAILY} />);
    expect(await screen.findByTestId("board-error")).toBeTruthy();
    expect(screen.queryByTestId("board-empty")).toBeNull();
  });

  it("shows the empty state with a play link when the board has no entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(200, { mode: "cup8", scope: "daily", date: "2026-10-09", coach: "all", entries: [] }),
      ),
    );
    render(<Board view={DAILY} />);
    const empty = await screen.findByTestId("board-empty");
    expect(empty.textContent).toContain("No entries yet.");
    expect(screen.getByRole("link", { name: "Play the daily" }).getAttribute("href")).toBe(
      "/daily",
    );
    expect(screen.queryByTestId("board-error")).toBeNull();
  });

  it("renders each row with rank, nickname, record, Team Score, variant and a /r/<token> link", async () => {
    const second: BoardEntry = {
      ...ENTRY,
      rank: 2,
      nickname: "Brock",
      token: "pd1.def",
      teamScore: 790,
      wins: 6,
      draws: 1,
      losses: 1,
      mode: "kanto151",
      variant: "positionFirst",
      dailyDate: null,
    };
    const fetchMock = vi.fn(async () =>
      json(200, {
        mode: "kanto151",
        scope: "all",
        date: null,
        coach: "all",
        entries: [ENTRY, second],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Board view={{ mode: "kanto151", scope: "all", date: "2026-10-09" }} />);
    const rows = await screen.findAllByTestId("board-row");
    expect(rows.map((r) => r.querySelector("a")?.getAttribute("href"))).toEqual([
      "/r/pd1.abc",
      "/r/pd1.def",
    ]);
    expect(rows[0].textContent).toBe(
      "1MistyOpen, Squad First, All regionsSquad preview unavailable.W-D-L8-0-0Team Score845",
    );
    expect(rows[1].textContent).toBe(
      "2BrockPosition FirstSquad preview unavailable.W-D-L6-1-1Team Score790",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboard?mode=kanto151&scope=all",
      expect.anything(),
    );
  });
  it("asks the server for each coach view and shows its rows and ranks as sent (catches a client-side filter over the All top 50)", async () => {
    const reply = (coach: string, entries: BoardEntry[]) =>
      json(200, { mode: "cup8", scope: "daily", date: "2026-10-09", coach, entries });
    let release: () => void = () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        reply("all", [{ ...ENTRY, rank: 1, token: "pd6.a", nickname: "Coach", coached: true }]),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            release = () =>
              resolve(
                reply("uncoached", [
                  { ...ENTRY, rank: 1, token: "pd6.b", nickname: "Plain", coached: false },
                ]),
              );
          }),
      )
      .mockResolvedValueOnce(reply("coached", []));
    vi.stubGlobal("fetch", fetchMock);
    render(<Board view={DAILY} />);
    expect((await screen.findAllByTestId("board-row")).length).toBe(1);
    expect(screen.getAllByTestId("coached-chip").map((c) => c.textContent)).toEqual(["Coached"]);

    fireEvent.click(screen.getByTestId("coach-filter-uncoached"));
    // The chips stay mounted while the filtered view loads.
    expect(screen.getByTestId("coach-filter")).toBeTruthy();
    expect(screen.queryByTestId("board")).toBeNull();
    release();
    const plain = await screen.findAllByTestId("board-row");
    expect(plain.map((r) => r.textContent?.startsWith("1Plain"))).toEqual([true]);
    expect(screen.getByTestId("coach-filter-uncoached").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("coach-filter-coached"));
    expect((await screen.findByTestId("coach-filter-empty")).textContent).toBe(
      "No coached runs on this board yet.",
    );
    expect(screen.getByTestId("coach-filter")).toBeTruthy();
    expect(screen.queryByTestId("board-empty")).toBeNull();

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/leaderboard?mode=cup8&scope=daily&date=2026-10-09",
      "/api/leaderboard?mode=cup8&scope=daily&date=2026-10-09&coach=uncoached",
      "/api/leaderboard?mode=cup8&scope=daily&date=2026-10-09&coach=coached",
    ]);
  });

  it("names an empty uncoached view and keeps the chips (catches a filtered view falling into the All empty state)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          json(200, { ...DAILY, coach: "all", entries: [{ ...ENTRY, coached: true }] }),
        )
        .mockResolvedValueOnce(json(200, { ...DAILY, coach: "uncoached", entries: [] })),
    );
    render(<Board view={DAILY} />);
    await screen.findAllByTestId("board-row");
    fireEvent.click(screen.getByTestId("coach-filter-uncoached"));
    expect((await screen.findByTestId("coach-filter-empty")).textContent).toBe(
      "No uncoached runs on this board yet.",
    );
    expect(screen.getByTestId("coach-filter")).toBeTruthy();
  });

  it("rejects a board reply without a coach or for another coach view (catches rows of one view shown as another)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { ...DAILY, entries: [ENTRY] })),
    );
    render(<Board view={DAILY} />);
    expect(await screen.findByTestId("board-error")).toBeTruthy();
    cleanup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { ...DAILY, coach: "coached", entries: [ENTRY] })),
    );
    render(<Board view={DAILY} />);
    expect(await screen.findByTestId("board-error")).toBeTruthy();
  });

  it("rejects a board reply whose rows lack the coached flag (catches a contract drift read as uncoached)", async () => {
    const { coached: _drop, ...legacy } = ENTRY;
    void _drop;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(200, {
          mode: "cup8",
          scope: "daily",
          date: "2026-10-09",
          coach: "all",
          entries: [legacy],
        }),
      ),
    );
    render(<Board view={DAILY} />);
    expect(await screen.findByTestId("board-error")).toBeTruthy();
  });
});

it("renders server-provided squad species without replaying retained tokens in the browser", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      json(200, {
        coach: "all",
        entries: [
          {
            ...ENTRY,
            squadSpeciesIds: [
              849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
            ],
          },
        ],
      }),
    ),
  );
  render(<Board view={DAILY} />);
  expect(await screen.findByRole("img", { name: "Squad species 807" })).toBeTruthy();
  expect(screen.getAllByRole("img")).toHaveLength(16);
});

it("rejects corrupt server preview metadata rather than drawing invented species", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      json(200, { coach: "all", entries: [{ ...ENTRY, squadSpeciesIds: [1026] }] }),
    ),
  );
  render(<Board view={DAILY} />);
  expect(await screen.findByTestId("board-error")).toBeTruthy();
});
