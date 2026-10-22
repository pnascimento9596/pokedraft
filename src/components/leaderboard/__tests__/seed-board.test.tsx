// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeToken, encodeToken } from "@/engine/token";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { GOLDEN_CUP8_V8 } from "@/leaderboard/server/__tests__/fixtures";
import type { BoardEntry } from "@/leaderboard/contract";
import { SeedBoard } from "@/components/leaderboard/SeedBoard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ASH: BoardEntry = {
  rank: 1,
  nickname: "Ash",
  mode: "cup8",
  variant: "classic3.squadFirst.g123456789",
  dailyDate: null,
  token: GOLDEN_CUP8_V8,
  teamScore: 593,
  wins: 5,
  draws: 0,
  losses: 1,
  createdAt: "2026-10-16T12:00:00.000Z",
  coached: false,
  engineVersion: "pokedraft-engine-8",
  seed: "golden-cup8",
  formation: "4-2-3-1",
};

const LANCE: BoardEntry = {
  ...ASH,
  rank: 2,
  nickname: "Lance",
  token: GOLDEN_CUP8_V3,
  teamScore: 500,
  engineVersion: "pokedraft-engine-3",
  formation: "3-5-2",
};

const SEED_OK = {
  mode: "cup8",
  scope: "seed",
  date: null,
  coach: "all",
  engine: "all",
  seed: "golden-cup8",
};

describe("Friends on this seed (catches a results page that hides who else played the seed)", () => {
  it("lists the seed's rows, marks this run and labels the older engine", async () => {
    const fetchMock = vi.fn(async () => json(200, { ...SEED_OK, entries: [ASH, LANCE] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SeedBoard token={GOLDEN_CUP8_V8} />);
    const table = await screen.findByRole("table", { name: "Friends on this seed" });
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent);
    expect(rows).toEqual(["1AshThis run4-2-3-15-0-1593", "2LanceEngine v33-5-25-0-1500"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboard?mode=cup8&seed=golden-cup8",
      expect.anything(),
    );
  });

  it("marks this run for a retained token too", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { ...SEED_OK, entries: [ASH, LANCE] })),
    );
    render(<SeedBoard token={GOLDEN_CUP8_V3} />);
    const marks = await screen.findAllByText("This run");
    expect(marks.map((m) => m.closest("tr")?.textContent?.startsWith("2Lance"))).toEqual([true]);
  });

  it("marks this run for a link whose JSON spacing differs from the stored token (catches a string compare that shows the player's own row as a link)", async () => {
    const [prefix, body] = GOLDEN_CUP8_V8.split(".") as [string, string];
    const spaced = JSON.stringify(JSON.parse(Buffer.from(body, "base64url").toString()), null, 1);
    const link = `${prefix}.${Buffer.from(spaced).toString("base64url")}`;
    expect(link).not.toBe(GOLDEN_CUP8_V8);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(200, { ...SEED_OK, entries: [ASH, LANCE] })),
    );
    render(<SeedBoard token={link} />);
    const table = await screen.findByRole("table", { name: "Friends on this seed" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      "1AshThis run4-2-3-15-0-1593",
      "2LanceEngine v33-5-25-0-1500",
    ]);
    expect(rows.map((r) => within(r).queryByRole("link")?.textContent ?? null)).toEqual([
      null,
      "Lance",
    ]);
  });

  it("renders nothing when nobody has submitted the seed", async () => {
    const fetchMock = vi.fn(async () => json(200, { ...SEED_OK, entries: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<SeedBoard token={GOLDEN_CUP8_V8} />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });

  it.each([
    ["a 503", () => json(503, { error: { code: "DB_UNAVAILABLE", message: "down" } })],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["another seed's rows", () => json(200, { ...SEED_OK, seed: "other", entries: [ASH] })],
    [
      "a board that is not a seed board",
      () => json(200, { ...SEED_OK, scope: "all", entries: [ASH] }),
    ],
  ])("says Board unavailable on %s, never an empty table", async (_, reply) => {
    vi.stubGlobal("fetch", vi.fn(reply));
    render(<SeedBoard token={GOLDEN_CUP8_V8} />);
    expect((await screen.findByTestId("seed-board-error")).textContent).toContain(
      "Board unavailable",
    );
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("asks nothing for a Builder friendly", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const builder = encodeToken({
      ...decodeToken(GOLDEN_CUP8_V8),
      settings: { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false },
      actions: [],
    });
    const { container } = render(<SeedBoard token={builder} />);
    expect([fetchMock.mock.calls.length, container.textContent]).toEqual([0, ""]);
  });
});
