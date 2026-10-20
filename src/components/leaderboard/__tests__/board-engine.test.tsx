// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { GOLDEN_CUP8_V6 } from "@/leaderboard/server/__tests__/fixtures";
import type { BoardEntry } from "@/leaderboard/contract";
import { boardHref, fetchBoard, parseBoardView } from "@/components/leaderboard/client";
import { StatefulBoard } from "./board-harness";

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
  token: GOLDEN_CUP8_V6,
  teamScore: 593,
  wins: 5,
  draws: 0,
  losses: 1,
  createdAt: "2026-10-16T12:00:00.000Z",
  coached: false,
  engineVersion: "pokedraft-engine-6",
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

describe("client board contract (catches engine, seed and formation stripped from board rows)", () => {
  it("fetchBoard keeps engineVersion, seed and formation on every entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(200, {
          mode: "cup8",
          scope: "all",
          date: null,
          coach: "all",
          engine: "all",
          seed: null,
          entries: [ASH, LANCE],
        }),
      ),
    );
    const result = await fetchBoard({
      mode: "cup8",
      scope: "all",
      date: "2026-10-19",
      coach: "all",
      engine: "all",
    });
    expect(result).toEqual({ kind: "ok", entries: [ASH, LANCE] });
  });

  it("fetchBoard treats a reply for the other engine view as unexpected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(200, {
          mode: "cup8",
          scope: "all",
          date: null,
          coach: "all",
          engine: "current",
          seed: null,
          entries: [ASH],
        }),
      ),
    );
    const result = await fetchBoard({
      mode: "cup8",
      scope: "all",
      date: "2026-10-19",
      coach: "all",
      engine: "all",
    });
    expect(result).toEqual({ kind: "error", reason: "unexpected" });
  });

  it("reads engine=all from an all-time link and drops it from a daily one", () => {
    expect(
      parseBoardView(new URLSearchParams("mode=cup8&scope=all&engine=all"), "2026-10-19").engine,
    ).toBe("all");
    expect(parseBoardView(new URLSearchParams("mode=cup8&scope=all"), "2026-10-19").engine).toBe(
      "current",
    );
    expect(parseBoardView(new URLSearchParams("scope=daily&engine=all"), "2026-10-19").engine).toBe(
      "current",
    );
    expect(boardHref({ mode: "cup8", scope: "all", engine: "all" })).toBe(
      "/leaderboard?mode=cup8&scope=all&engine=all",
    );
    expect(boardHref({ mode: "cup8", scope: "all", engine: "current" })).toBe(
      "/leaderboard?mode=cup8&scope=all",
    );
    expect(boardHref({ mode: "cup8", scope: "daily", date: "2026-10-19", engine: "all" })).toBe(
      "/leaderboard?mode=cup8&scope=daily&date=2026-10-19",
    );
  });
});

describe("All engines toggle and engine labels (catches older-engine runs shown unlabelled)", () => {
  it("asks for engine=all when pressed and labels only the older-engine row", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const engine = new URL(url, "http://local").searchParams.get("engine") ?? "current";
      return json(200, {
        mode: "cup8",
        scope: "all",
        date: null,
        coach: "all",
        engine,
        seed: null,
        entries:
          engine === "all"
            ? [
                { ...LANCE, rank: 1 },
                { ...ASH, rank: 2 },
              ]
            : [ASH],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<StatefulBoard view={{ mode: "cup8", scope: "all", date: "2026-10-19" }} />);
    expect((await screen.findAllByTestId("board-row")).length).toBe(1);
    expect(screen.queryByTestId("engine-row-label")).toBeNull();
    const toggle = screen.getByRole("button", { name: "All engines" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    await screen.findByText("Lance");
    expect(screen.getByRole("button", { name: "All engines" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getAllByTestId("engine-row-label").map((n) => n.textContent)).toEqual([
      "Engine v3",
    ]);
    expect(fetchMock.mock.calls.map(([u]) => u)).toEqual([
      "/api/leaderboard?mode=cup8&scope=all",
      "/api/leaderboard?mode=cup8&scope=all&engine=all",
    ]);
  });

  it("has no engine toggle on a daily board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(200, {
          mode: "cup8",
          scope: "daily",
          date: "2026-10-09",
          coach: "all",
          engine: "all",
          seed: null,
          entries: [{ ...ASH, dailyDate: "2026-10-09" }],
        }),
      ),
    );
    render(<StatefulBoard view={{ mode: "cup8", scope: "daily", date: "2026-10-09" }} />);
    await screen.findAllByTestId("board-row");
    expect(screen.queryByRole("button", { name: "All engines" })).toBeNull();
  });
});
