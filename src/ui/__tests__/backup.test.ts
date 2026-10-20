// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { backupFileName, buildBackup, mergeHistory, parseBackup, restoreBackup } from "../backup";
import { loadLifetime, recordCompletedRun, runKey } from "../lifetime";
import { loadHistory, type RunRecord } from "../runs";

const run = (token: string, at: string, extra: Partial<RunRecord> = {}): RunRecord => ({
  token,
  bucket: "kanto151",
  friendly: false,
  formation: "4-4-2",
  score: 650,
  wins: 3,
  draws: 2,
  losses: 1,
  finish: "R16",
  flawless: false,
  at,
  goalsFor: 7,
  goalsAgainst: 5,
  ...extra,
});

beforeEach(() => localStorage.clear());

function backupOf(runs: readonly RunRecord[]): string {
  for (const r of [...runs].reverse()) recordCompletedRun(r);
  const text = JSON.stringify(buildBackup("2026-10-16T09:30:00.000Z"));
  localStorage.clear();
  return text;
}

describe("parseBackup", () => {
  it.each([
    ["not json", "This file is not a pokedraft backup. It is not valid JSON."],
    ["[1,2]", "This file is not a pokedraft backup."],
    [JSON.stringify({ format: "other" }), "This file is not a pokedraft backup."],
    [
      JSON.stringify({ format: "pokedraft-backup", schemaVersion: 2 }),
      "This backup uses schema version 2. This site reads version 1.",
    ],
    [
      JSON.stringify({ format: "pokedraft-backup", schemaVersion: 1, exportedAt: "x" }),
      "This backup is damaged at history. Nothing was restored.",
    ],
    ["x".repeat(1_000_001), "This file is too large to be a pokedraft backup."],
  ])("rejects a malformed file with a clear message (%#)", (text, message) => {
    expect(parseBackup(text)).toEqual({ ok: false, message });
  });

  it("rejects a backup whose run has an impossible negative win count", () => {
    const text = backupOf([run("pd5.a", "2026-10-15T00:00:00.000Z")]);
    const broken = JSON.parse(text);
    broken.history[0].wins = -1;
    expect(parseBackup(JSON.stringify(broken))).toEqual({
      ok: false,
      message: "This backup is damaged at history.0.wins. Nothing was restored.",
    });
  });

  it("rejects lifetime totals with more cups won than runs", () => {
    const broken = JSON.parse(backupOf([run("pd5.a", "2026-10-15T00:00:00.000Z")]));
    broken.lifetime.buckets.kanto151.cupsWon = 5;
    expect(parseBackup(JSON.stringify(broken))).toEqual({
      ok: false,
      message: "This backup is damaged at lifetime.buckets.kanto151. Nothing was restored.",
    });
  });
});

describe("restoreBackup", () => {
  it("restores history and lifetime totals into an empty browser", () => {
    const text = backupOf([
      run("pd5.b", "2026-10-15T00:00:00.000Z"),
      run("pd5.a", "2026-10-14T00:00:00.000Z"),
    ]);
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.backup.schemaVersion).toBe(1);
    expect(restoreBackup(parsed.backup)).toEqual({ addedRuns: 2 });
    expect(loadHistory().map((r) => r.token)).toEqual(["pd5.b", "pd5.a"]);
    expect(loadLifetime()!.buckets.kanto151.runs).toBe(2);
    expect(loadLifetime()!.buckets.kanto151.goalsFor).toBe(14);
    recordCompletedRun(run("pd5.a", "2026-10-14T00:00:00.000Z"));
    expect(loadLifetime()!.buckets.kanto151.runs).toBe(2);
  });

  it("dedupes runs by token, keeps this browser's copy and repeats as a no-op", () => {
    const text = backupOf([
      run("pd5.shared", "2026-10-13T00:00:00.000Z", { score: 1 }),
      run("pd5.remote", "2026-10-15T00:00:00.000Z"),
    ]);
    recordCompletedRun(run("pd5.shared", "2026-10-13T00:00:00.000Z", { score: 999 }));
    recordCompletedRun(run("pd5.local", "2026-10-14T00:00:00.000Z"));
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(restoreBackup(parsed.backup)).toEqual({ addedRuns: 1 });
    expect(loadHistory().map((r) => [r.token, r.score])).toEqual([
      ["pd5.remote", 650],
      ["pd5.local", 650],
      ["pd5.shared", 999],
    ]);
    const lifetime = loadLifetime()!;
    expect(lifetime.buckets.kanto151.runs).toBe(3);
    expect(lifetime.buckets.kanto151.wins).toBe(9);
    expect(new Set(lifetime.counted)).toEqual(
      new Set([runKey("pd5.shared"), runKey("pd5.local"), runKey("pd5.remote")]),
    );
    expect(restoreBackup(parsed.backup)).toEqual({ addedRuns: 0 });
    expect(loadLifetime()).toEqual(lifetime);
  });
});

it("orders merged history newest first and trims it to 50 runs", () => {
  const local = Array.from({ length: 30 }, (_, i) =>
    run(`pd5.l${i}`, `2026-09-${String(30 - i).padStart(2, "0")}T00:00:00.000Z`),
  );
  const imported = Array.from({ length: 30 }, (_, i) =>
    run(`pd5.i${i}`, `2026-10-${String(30 - i).padStart(2, "0")}T00:00:00.000Z`),
  );
  const merged = mergeHistory(local, imported);
  expect(merged.length).toBe(50);
  expect(merged[0]!.token).toBe("pd5.i0");
  expect(merged[49]!.token).toBe("pd5.l19");
});

it("names the file after the export date", () => {
  expect(backupFileName("2026-10-16T09:30:00.000Z")).toBe("pokedraft-backup-2026-10-16.json");
});

describe("achievements in a backup (catches a restore that drops earns or rejects an old file)", () => {
  it("round-trips run achievements, lifetime earns and formation titles", () => {
    const text = backupOf([
      run("pd6.later", "2026-10-22T12:00:00.000Z", {
        bucket: "cup8:open",
        formation: "3-5-2",
        finish: "champion",
        achievements: ["giant-killer"],
      }),
      run("pd6.earlier", "2026-10-21T12:00:00.000Z", { achievements: ["comeback"] }),
    ]);
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.message);
    restoreBackup(parsed.backup);
    expect(loadHistory().map((r) => r.achievements)).toEqual([["giant-killer"], ["comeback"]]);
    const lifetime = loadLifetime()!;
    expect(lifetime.earned).toEqual({
      comeback: { at: "2026-10-21T12:00:00.000Z", token: "pd6.earlier" },
      "giant-killer": { at: "2026-10-22T12:00:00.000Z", token: "pd6.later" },
    });
    expect(lifetime.formationTitles).toEqual(["3-5-2"]);
  });

  it("restores a backup written before achievements existed", () => {
    const text = backupOf([run("pd5.old", "2026-10-14T00:00:00.000Z")]);
    const raw = JSON.parse(text) as { lifetime: Record<string, unknown> };
    delete raw.lifetime.earned;
    delete raw.lifetime.formationTitles;
    const parsed = parseBackup(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(parsed.message);
    expect(restoreBackup(parsed.backup)).toEqual({ addedRuns: 1 });
    expect(loadLifetime()!.earned).toEqual({});
    expect(loadLifetime()!.formationTitles).toEqual([]);
  });

  it("an imported earlier earn replaces this browser's later one", () => {
    const text = backupOf([
      run("pd6.remote", "2026-10-20T12:00:00.000Z", { achievements: ["comeback"] }),
    ]);
    recordCompletedRun(
      run("pd6.local", "2026-10-23T12:00:00.000Z", { achievements: ["comeback"] }),
    );
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.message);
    restoreBackup(parsed.backup);
    expect(loadLifetime()!.earned.comeback).toEqual({
      at: "2026-10-20T12:00:00.000Z",
      token: "pd6.remote",
    });
  });
});
