// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as settings from "../settings";
import { loadHistory, loadStats } from "../runs";

const STATS_KEY = "pokedraft:stats:v1";
const HISTORY_KEY = "pokedraft:history:v1";

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

const GOOD_RUN = {
  token: "pd1.abc",
  bucket: "kanto151",
  friendly: false,
  formation: "4-3-3",
  score: 612,
  wins: 3,
  draws: 1,
  losses: 1,
  finish: "R16",
  flawless: false,
  at: "2026-10-01T10:00:00.000Z",
};

describe("saved stats on read", () => {
  it("keeps a sound bucket and drops one whose best record is not numbers, so the home screen never renders NaN", () => {
    window.localStorage.setItem(
      STATS_KEY,
      JSON.stringify({
        kanto151: { runs: 4, bestScore: 700, bestRecord: { wins: 5, draws: 0, losses: 1 } },
        "cup8:open": { runs: 2, bestScore: "high", bestRecord: { wins: "x" } },
        "cup8:classic3": { runs: -3, bestScore: null, bestRecord: null },
        builder: { runs: 1.5, bestScore: null, bestRecord: null },
      }),
    );
    const stats = loadStats();
    expect(stats.kanto151).toEqual({
      runs: 4,
      bestScore: 700,
      bestRecord: { wins: 5, draws: 0, losses: 1 },
    });
    const empty = { runs: 0, bestScore: null, bestRecord: null };
    expect(stats["cup8:open"]).toEqual(empty);
    expect(stats["cup8:classic3"]).toEqual(empty);
    expect(stats.builder).toEqual(empty);
  });

  it("drops history entries that are not complete run records and keeps the good ones in order", () => {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([
        GOOD_RUN,
        { ...GOOD_RUN, token: "pd1.bad", finish: "winner" },
        { token: "pd1.half" },
        "nonsense",
        null,
        { ...GOOD_RUN, token: "pd1.two", score: 640 },
      ]),
    );
    expect(loadHistory().map((r) => r.token)).toEqual(["pd1.abc", "pd1.two"]);
  });

  it("falls back to empty for text that is not JSON or not the expected shape", () => {
    window.localStorage.setItem(STATS_KEY, "{not json");
    expect(loadStats().kanto151).toEqual({ runs: 0, bestScore: null, bestRecord: null });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify({ not: "a list" }));
    expect(loadHistory()).toEqual([]);
  });
});

describe("settings module", () => {
  it("no longer exports the unused challengeSettings", () => {
    expect("challengeSettings" in settings).toBe(false);
  });
});
