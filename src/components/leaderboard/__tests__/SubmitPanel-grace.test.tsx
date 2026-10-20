// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmitPanel } from "@/components/leaderboard/SubmitPanel";
import type { BoardEntry } from "@/leaderboard/contract";

vi.mock("@/engine", async (load) => ({
  ...(await load<typeof import("@/engine")>()),
  ENGINE_VERSION: "pokedraft-engine-7",
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const GRACE_ENTRY: BoardEntry = {
  rank: 2,
  nickname: "Misty",
  mode: "cup8",
  variant: "classic3.squadFirst.g123456789",
  dailyDate: null,
  token: "pd6.abc",
  teamScore: 845,
  wins: 4,
  draws: 0,
  losses: 1,
  createdAt: "2026-10-09T12:00:00.000Z",
  coached: false,
  engineVersion: "pokedraft-engine-6",
  seed: "grace-seed",
  formation: "4-3-3",
};

async function submitWith(entry: BoardEntry) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ entry }, { status: 201, headers: { "content-type": "application/json" } }),
    ),
  );
  render(<SubmitPanel token={entry.token} daily={entry.dailyDate !== null} />);
  fireEvent.change(screen.getByTestId("submit-nickname"), { target: { value: "Misty" } });
  fireEvent.click(screen.getByTestId("submit-button"));
  await screen.findByTestId("submit-success");
}

describe("SubmitPanel after an engine change (catches a grace run told it is on the current board)", () => {
  it("says which engine's board ranked a run the grace window accepted, and links to all engines", async () => {
    await submitWith(GRACE_ENTRY);
    expect(screen.getByTestId("submit-grace").textContent).toBe("Ranked on the engine 6 board.");
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=all&coach=uncoached&engine=all",
    );
  });

  it("adds no engine line for a run on the live engine", async () => {
    await submitWith({ ...GRACE_ENTRY, token: "pd7.abc", engineVersion: "pokedraft-engine-7" });
    expect(screen.queryByTestId("submit-grace")).toBeNull();
    expect(screen.getByRole("link", { name: "View leaderboard" }).getAttribute("href")).toBe(
      "/leaderboard?mode=cup8&scope=all&coach=uncoached",
    );
  });
});
