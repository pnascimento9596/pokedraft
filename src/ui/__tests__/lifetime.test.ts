// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { replayAnyVersion } from "@/engine/versions";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import {
  backfill,
  COUNTED_LIMIT,
  countRun,
  emptyLifetime,
  ensureLifetime,
  LIFETIME_KEY,
  loadLifetime,
  mergeLifetime,
  overall,
  recordCompletedRun,
  runKey,
} from "../lifetime";
import { HISTORY_LIMIT, loadHistory, toRecord, type RunRecord } from "../runs";

const HISTORY_KEY = "pokedraft:history:v1";

const run = (token: string, extra: Partial<RunRecord> = {}): RunRecord => ({
  token,
  bucket: "cup8:open",
  friendly: false,
  formation: "4-3-3",
  score: 700,
  wins: 4,
  draws: 1,
  losses: 1,
  finish: "QF",
  flawless: false,
  at: "2026-10-16T10:00:00.000Z",
  goalsFor: 9,
  goalsAgainst: 4,
  ...extra,
});

beforeEach(() => localStorage.clear());

describe("lifetime totals", () => {
  it("stores the cup's goals on each new run record", async () => {
    const { draft, cup } = await replayAnyVersion(GOLDEN_CUP8_V3);
    const record = toRecord(GOLDEN_CUP8_V3, draft.settings, cup, "2026-10-16T00:00:00.000Z");
    expect([record.goalsFor, record.goalsAgainst]).toEqual([16, 3]);
  });

  it("counts a run once when the results view records it again on reload", () => {
    recordCompletedRun(run("pd5.one"));
    recordCompletedRun(run("pd5.one"));
    const totals = loadLifetime()!;
    expect(totals.buckets["cup8:open"]).toEqual({
      runs: 1,
      cupsWon: 0,
      wins: 4,
      draws: 1,
      losses: 1,
      goalsFor: 9,
      goalsAgainst: 4,
      goalRuns: 1,
      bestFinish: "QF",
    });
    expect(totals.counted).toEqual([runKey("pd5.one")]);
    expect(totals.backfilledRuns).toBe(0);
  });

  it("does not count a run again after it fell out of the 50-run history", () => {
    for (let i = 0; i <= HISTORY_LIMIT; i++) recordCompletedRun(run(`pd5.run-${i}`));
    expect(loadHistory().some((r) => r.token === "pd5.run-0")).toBe(false);
    recordCompletedRun(run("pd5.run-0"));
    expect(loadLifetime()!.buckets["cup8:open"].runs).toBe(51);
    expect(overall(loadLifetime()!).wins).toBe(204);
  });

  it("keeps formation win rates for ranked runs only", () => {
    recordCompletedRun(run("pd5.ranked", { formation: "3-5-2", wins: 6, draws: 0, losses: 1 }));
    recordCompletedRun(
      run("pd5.friendly", { bucket: "builder", friendly: true, formation: "3-5-2", wins: 8 }),
    );
    expect(loadLifetime()!.formations).toEqual({
      "3-5-2": { runs: 1, wins: 6, draws: 0, losses: 1 },
    });
    expect(loadLifetime()!.buckets.builder.runs).toBe(1);
  });

  it("keeps the best finish per mode and counts cups won", () => {
    recordCompletedRun(run("pd5.a", { finish: "SF" }));
    recordCompletedRun(run("pd5.b", { finish: "champion" }));
    recordCompletedRun(run("pd5.c", { finish: "group" }));
    recordCompletedRun(run("pd5.k", { bucket: "kanto151", finish: "F" }));
    const totals = loadLifetime()!;
    expect(totals.buckets["cup8:open"].bestFinish).toBe("champion");
    expect(totals.buckets["cup8:open"].cupsWon).toBe(1);
    expect(totals.buckets.kanto151.bestFinish).toBe("F");
    expect(totals.buckets["cup8:classic3"].bestFinish).toBeNull();
  });

  it("bounds the counted-run keys to the newest entries", () => {
    let totals = emptyLifetime();
    for (let i = 0; i < COUNTED_LIMIT + 5; i++) totals = countRun(totals, run(`pd5.bound-${i}`));
    expect(totals.counted.length).toBe(1000);
    expect(totals.counted[0]).toBe(runKey(`pd5.bound-${COUNTED_LIMIT + 4}`));
    expect(totals.counted.includes(runKey("pd5.bound-0"))).toBe(false);
    expect(totals.buckets["cup8:open"].runs).toBe(1005);
  });

  it("hashes tokens to stable 16-character keys", () => {
    expect(runKey("pd1.abc")).toBe("b5734726ee403c47");
  });
});

describe("backfill", () => {
  const old = [
    run("pd5.newer", { goalsFor: undefined, goalsAgainst: undefined, finish: "champion" }),
    run("pd5.older", { goalsFor: undefined, goalsAgainst: undefined, wins: 2 }),
  ];

  it("starts lifetime totals from the retained history once and marks them backfilled", () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(old));
    const started = ensureLifetime();
    expect(started.backfilledRuns).toBe(2);
    expect(started.buckets["cup8:open"]).toEqual({
      runs: 2,
      cupsWon: 1,
      wins: 6,
      draws: 2,
      losses: 2,
      goalsFor: 0,
      goalsAgainst: 0,
      goalRuns: 0,
      bestFinish: "champion",
    });
    expect(started.counted).toEqual([runKey("pd5.newer"), runKey("pd5.older")]);
    expect(ensureLifetime()).toEqual(started);
  });

  it("does not count a backfilled run again when its results are shown", () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(old));
    recordCompletedRun(old[0]!);
    expect(loadLifetime()!.buckets["cup8:open"].runs).toBe(2);
    recordCompletedRun(run("pd5.fresh"));
    expect(loadLifetime()!.buckets["cup8:open"].runs).toBe(3);
    expect(loadLifetime()!.backfilledRuns).toBe(2);
  });

  it("rebuilds from history when the stored totals are damaged", () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(old));
    localStorage.setItem(LIFETIME_KEY, JSON.stringify({ v: 1, buckets: "broken" }));
    expect(ensureLifetime().buckets["cup8:open"].runs).toBe(2);
    expect(loadLifetime()!.backfilledRuns).toBe(2);
  });

  it("starts at zero with nothing marked backfilled when there is no history", () => {
    expect(ensureLifetime()).toEqual(emptyLifetime());
    expect(backfill([]).backfilledRuns).toBe(0);
  });
});

describe("merge", () => {
  const local = [run("pd5.l1"), run("pd5.l2"), run("pd5.l3", { finish: "SF" })].reduce(
    countRun,
    emptyLifetime(),
  );
  const imported = [
    run("pd5.i1", { finish: "champion", formation: "4-4-2" }),
    run("pd5.i2", { bucket: "kanto151" }),
  ].reduce(countRun, emptyLifetime());

  it("takes the larger figure per mode, so a cup won only in the backup still counts", () => {
    const merged = mergeLifetime(local, imported);
    expect(merged.buckets["cup8:open"]).toEqual({
      runs: 3,
      cupsWon: 1,
      wins: 12,
      draws: 3,
      losses: 3,
      goalsFor: 27,
      goalsAgainst: 12,
      goalRuns: 3,
      bestFinish: "champion",
    });
    expect(merged.buckets.kanto151.runs).toBe(1);
    expect(merged.backfilledRuns).toBe(0);
  });

  it("keeps the formation with more runs whole so its win rate is never a blend", () => {
    const merged = mergeLifetime(local, imported);
    expect(merged.formations).toEqual({
      "4-3-3": { runs: 3, wins: 12, draws: 3, losses: 3 },
      "4-4-2": { runs: 1, wins: 4, draws: 1, losses: 1 },
    });
    expect(merged.counted.length).toBe(5);
  });

  it("changes nothing when the same totals are merged twice", () => {
    const once = mergeLifetime(local, imported);
    expect(mergeLifetime(once, imported)).toEqual(once);
    expect(mergeLifetime(once, once)).toEqual(once);
  });
});
