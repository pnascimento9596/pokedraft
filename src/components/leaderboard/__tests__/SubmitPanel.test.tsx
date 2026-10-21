// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  coached: false,
  engineVersion: "pokedraft-engine-7",
  seed: "e2e-seed",
  formation: "4-3-3",
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
    expect(success.textContent).toBe("#3Misty is on the daily board, among uncoached runs.");
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=daily&date=2026-10-09&coach=uncoached",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/leaderboard");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      nickname: "Misty",
      token: "pd1.abc",
      engineVersion: "pokedraft-engine-7",
      coach: "uncoached",
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
    expect(success.textContent).toBe("Misty is on the daily board, among uncoached runs.");
    expect(screen.getByTestId("rank-unavailable").textContent).toBe(
      "Rank unavailableYour rank could not be loaded right now.",
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
      "/leaderboard?mode=kanto151&scope=all&coach=uncoached",
    );
  });

  it("sends one request for a double tap while submitting (catches a second POST from one panel)", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    fireEvent.click(screen.getByTestId("submit-button"));
    fireEvent.submit(screen.getByTestId("submit-button").closest("form")!);
    const button = (await screen.findByText("Submitting")) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows success for a 200 retry reply the same way as a 201", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { entry: ENTRY })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    expect((await screen.findByTestId("submit-success")).textContent).toBe(
      "#3Misty is on the daily board, among uncoached runs.",
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
    [
      429,
      "RATE_LIMITED",
      "Too many submissions from this network. The limit is 10 an hour, so you may need to wait up to an hour.",
    ],
    [503, "DB_UNAVAILABLE", "The leaderboard is offline right now. Try again in a few minutes."],
    [409, "DUPLICATE_TOKEN", "This exact run is already on the board."],
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

  it("names the nickname a matching run is listed under (catches a copy refusal that does not say whose run it matches)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(409, { error: { code: "DUPLICATE_TOKEN", message: "x", nickname: "Misty" } }),
      ),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Brock");
    expect((await screen.findByTestId("submit-error")).textContent).toBe(
      "This exact run is already on the board, listed under Misty.",
    );
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

describe("Share my rank", () => {
  function phoneSheet(): ShareData[] {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(pointer: coarse)", media: q }));
    const calls: ShareData[] = [];
    Object.assign(navigator, {
      canShare: () => true,
      share: async (data: ShareData) => {
        calls.push(data);
      },
    });
    return calls;
  }

  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
  });

  it("shares the daily rank with the run link next to View leaderboard (catches a submitted rank with no way to send it)", async () => {
    const sheet = phoneSheet();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: ENTRY })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    await screen.findByTestId("submit-success");
    const panel = screen.getByTestId("submit-panel");
    expect(
      within(panel)
        .getAllByRole("link")
        .concat(within(panel).getAllByRole("button"))
        .map((el) => el.textContent),
    ).toEqual(["View leaderboard", "Share my rank"]);
    fireEvent.click(screen.getByRole("button", { name: "Share my rank" }));
    expect(await screen.findByText("Link shared")).toBeTruthy();
    expect(sheet).toEqual([
      {
        title: "pokedraft",
        text: "I'm #3 on the October 9 daily. Beat it?",
        url: "http://localhost:3000/r/pd1?t=abc",
      },
    ]);
  });

  it("names the all-time board in the all-time share text", async () => {
    const sheet = phoneSheet();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: { ...ENTRY, rank: 12, dailyDate: null } })),
    );
    render(<SubmitPanel token="pd6.xyz" daily={false} />);
    typeAndSubmit("Misty");
    fireEvent.click(await screen.findByRole("button", { name: "Share my rank" }));
    await screen.findByText("Link shared");
    expect(sheet).toEqual([
      {
        title: "pokedraft",
        text: "I'm #12 on the all-time board. Beat it?",
        url: "http://localhost:3000/r/pd6?t=xyz",
      },
    ]);
  });

  it("offers no Share my rank when the rank is unavailable (catches a share that would say #null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(201, { entry: { ...ENTRY, rank: null } })),
    );
    render(<SubmitPanel token="pd1.abc" daily />);
    typeAndSubmit("Misty");
    await screen.findByTestId("rank-unavailable");
    expect(screen.queryByRole("button", { name: "Share my rank" })).toBeNull();
    expect(screen.getByRole("link", { name: "View leaderboard" })).toBeTruthy();
  });
});
