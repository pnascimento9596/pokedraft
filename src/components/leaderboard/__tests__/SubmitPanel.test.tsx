// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import type { BoardEntry } from "@/leaderboard/contract";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => localStorage.clear());

const ENTRY: BoardEntry = {
  rank: 3,
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

function typeAndSubmit(nickname: string) {
  fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: nickname } });
  fireEvent.click(screen.getByTestId("submit-button"));
}

describe("SubmitPanel", () => {
  it("posts the trimmed nickname, token and engine version, remembers the nickname, and links to the daily board", async () => {
    const fetchMock = vi.fn(async () => json(201, { entry: ENTRY }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SubmitPanel token="pd1.abc" daily />);
    expect(screen.getByTestId("submit-panel").textContent).toContain(
      "Submit to today's daily board",
    );
    typeAndSubmit("  Misty  ");

    const success = await screen.findByTestId("submit-success");
    expect(success.textContent).toBe("#3Misty is on the daily board.");
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=daily&date=2026-10-09",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/leaderboard");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      nickname: "Misty",
      token: "pd1.abc",
      engineVersion: "pokedraft-engine-1",
    });
    expect(localStorage.getItem("pokedraft:nickname")).toBe('"Misty"');

    cleanup();
    render(<SubmitPanel token="pd1.other" daily={false} />);
    expect((screen.getByTestId("submit-nickname") as HTMLInputElement).value).toBe("Misty");
    expect(screen.getByTestId("submit-panel").textContent).toContain(
      "Submit to the all-time board",
    );
  });

  it("confirms a saved run whose rank could not be loaded (catches a saved run shown as a failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: { ...ENTRY, rank: null } })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    const success = await screen.findByTestId("submit-success");
    expect(success.textContent).toBe(
      "Misty is on the daily board. Your rank could not be loaded right now.",
    );
    expect(screen.queryByTestId("submit-error")).toBeNull();
  });

  it("links an all-time success to the all-time board for that mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: { ...ENTRY, mode: "kanto151", dailyDate: null } })),
    );
    render(<SubmitPanel token="pd1.abc" daily={false} />);
    typeAndSubmit("Brock");
    await screen.findByTestId("submit-success");
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=kanto151&scope=all",
    );
  });

  it("keeps Submit disabled until the trimmed nickname is 2 to 20 characters", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<SubmitPanel token="pd1.abc" daily />);
    const button = screen.getByTestId("submit-button") as HTMLButtonElement;
    fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "  a  " } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "x".repeat(21) } });
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "ab" } });
    expect(button.disabled).toBe(false);
  });

  it.each([
    [
      409,
      "DAILY_ALREADY_SUBMITTED",
      "That nickname already has a run on this daily board. One run per nickname per day.",
    ],
    [429, "RATE_LIMITED", "Too many submissions from here. Wait a minute and try again."],
    [503, "DB_UNAVAILABLE", "The leaderboard is offline right now. Try again in a few minutes."],
    [409, "DUPLICATE_TOKEN", "This run is already on the leaderboard."],
    [
      409,
      "ENGINE_VERSION_MISMATCH",
      "The game was updated after this run started. Reload the page and play a new run to submit.",
    ],
    [422, "NICKNAME_INVALID", "That nickname is not allowed. Try a different one."],
    [500, "SOMETHING_NEW", "The leaderboard sent a reply we could not read. Try again later."],
  ])("maps HTTP %i %s to its copy", async (status, code, copy) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(status, { error: { code, message: "x" } })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    expect((await screen.findByTestId("submit-error")).textContent).toBe(copy);
    expect(screen.queryByTestId("submit-success")).toBeNull();
  });

  it("shows the network copy when the request never reaches the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    expect((await screen.findByTestId("submit-error")).textContent).toBe(
      "Could not reach the leaderboard. Check your connection and try again.",
    );
  });
});
