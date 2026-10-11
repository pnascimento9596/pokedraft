// @vitest-environment jsdom
// Theme 7F: the board and the submit panel speak through the page's one live region instead of
// inserting a status with its text (SC-13), and Try again and a submit leave focus somewhere
// useful (SC-11).
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Announcer } from "@/components/Announcer";
import { Board } from "@/components/leaderboard/Board";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import type { BoardEntry } from "@/leaderboard/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => localStorage.clear());

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
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const board = (entries: BoardEntry[]) =>
  json(200, { mode: "cup8", scope: "daily", date: "2026-10-09", entries });

const said = () => screen.getByTestId("announcer").textContent;

async function flush() {
  await act(async () => {});
}

describe("Board", () => {
  it("says how many entries arrived, and its loading line is not a status inserted with its text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => board([ENTRY, { ...ENTRY, rank: 2, token: "pd1.def" }])),
    );
    render(
      <>
        <Board view={DAILY} />
        <Announcer />
      </>,
    );
    expect(screen.getAllByRole("status").map((el) => el.dataset.testid)).toEqual(["announcer"]);
    await screen.findAllByTestId("board-row");
    await flush();
    expect(said()).toBe("2 entries.");
  });

  it("says one entry, and no entries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(board([ENTRY]))
      .mockResolvedValueOnce(board([]));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(
      <>
        <Board view={DAILY} />
        <Announcer />
      </>,
    );
    await screen.findAllByTestId("board-row");
    await flush();
    const one = said();
    rerender(
      <>
        <Board view={{ ...DAILY, date: "2026-10-08" }} />
        <Announcer />
      </>,
    );
    await screen.findByTestId("board-empty");
    await flush();
    expect([one, said()]).toEqual(["1 entry.", "No entries yet."]);
  });

  it("Try again moves focus to the board once it loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce(board([ENTRY])),
    );
    render(
      <>
        <Board view={DAILY} />
        <Announcer />
      </>,
    );
    await screen.findByTestId("board-error");
    const retry = screen.getByRole("button", { name: "Try again" });
    retry.focus();
    fireEvent.click(retry);
    await screen.findAllByTestId("board-row");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("board")));
  });
});

describe("SubmitPanel", () => {
  it("moves focus to the success line, which is not a status inserted with its text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: { ...ENTRY, rank: 3 } })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "Misty" } });
    screen.getByTestId("submit-button").focus();
    fireEvent.click(screen.getByTestId("submit-button"));
    const success = await screen.findByTestId("submit-success");
    await waitFor(() => expect(document.activeElement).toBe(success));
    expect({ role: success.getAttribute("role"), text: success.textContent }).toEqual({
      role: null,
      text: "#3Misty is on the daily board.",
    });
  });
});
