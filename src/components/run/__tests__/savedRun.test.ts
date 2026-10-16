// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeToken, encodeToken, type DraftSettings, type IsoDate } from "@/engine";
import { slotRefs } from "@/engine/draft";
import { forgetRun, restoreRun, saveRun, type RunSlot } from "../savedRun";
import { runToken, startRun, step, type Run } from "../runState";

const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const SLOT: RunSlot = { settings: SETTINGS, seed: null, daily: null };
const KEY = "pokedraft.run.cup8";
const PICKED =
  "pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwicnVuLXRlc3QiLFtbInAiLDMxNiwiczkiXV1d";
const OTHER = "pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwib3RoZXItc2VlZCIsW11d";
const CHECKPOINT = JSON.stringify({ screen: "draft", token: PICKED, daily: null });
const OTHER_CHECKPOINT = JSON.stringify({ screen: "draft", token: OTHER, daily: null });

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("browser checkpoints with per-tab authority", () => {
  it("preserves an existing tab-only save durably when it is restored after the update", () => {
    sessionStorage.setItem(KEY, CHECKPOINT);
    const restored = restoreRun(SLOT);
    expect(restored?.kind).toBe("draft");
    expect(localStorage.getItem(KEY)).toBe(CHECKPOINT);
  });

  it("saves the same action token durably and restores its exact squad with no tab snapshot", () => {
    saveRun(SLOT, "draft", PICKED);
    expect(localStorage.getItem(KEY)).toBe(CHECKPOINT);
    sessionStorage.clear();

    const restored = restoreRun(SLOT);
    expect(restored?.kind).toBe("draft");
    if (restored?.kind !== "draft") throw new Error("draft not restored");
    expect(runToken(restored.run)).toBe(PICKED);
    expect(restored.run.seed).toBe("run-test");
    expect(restored.run.state.round).toBe(1);
    expect(restored.run.state.lineup.starters[9]).toBe(316);
    expect(sessionStorage.getItem(KEY)).toBe(CHECKPOINT);
  });

  it("keeps this tab's progress ahead of a newer checkpoint written by another tab", () => {
    sessionStorage.setItem(KEY, CHECKPOINT);
    localStorage.setItem(KEY, OTHER_CHECKPOINT);

    const restored = restoreRun(SLOT);
    expect(restored?.kind).toBe("draft");
    if (restored?.kind !== "draft") throw new Error("draft not restored");
    expect(runToken(restored.run)).toBe(PICKED);
    expect(localStorage.getItem(KEY)).toBe(OTHER_CHECKPOINT);
  });

  it("rejects a durable checkpoint on a different explicit seed without deleting the owner's progress", () => {
    localStorage.setItem(KEY, CHECKPOINT);
    expect(restoreRun({ ...SLOT, seed: "other-seed" })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(CHECKPOINT);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("rejects a durable checkpoint with different formation settings", () => {
    localStorage.setItem(KEY, CHECKPOINT);
    expect(restoreRun({ ...SLOT, settings: { ...SETTINGS, formation: "4-4-2" } })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(CHECKPOINT);
  });

  it("rejects yesterday's Daily checkpoint without deleting another tab's saved Daily", () => {
    const key = "pokedraft.run.daily";
    const yesterday = JSON.stringify({ screen: "draft", token: PICKED, daily: "2026-10-10" });
    localStorage.setItem(key, yesterday);
    expect(restoreRun({ ...SLOT, daily: "2026-10-11" as IsoDate })).toBeNull();
    expect(localStorage.getItem(key)).toBe(yesterday);
  });

  it("forgets this tab's own durable checkpoint after New run", () => {
    sessionStorage.setItem(KEY, CHECKPOINT);
    localStorage.setItem(KEY, CHECKPOINT);
    forgetRun(SLOT);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(restoreRun(SLOT)).toBeNull();
  });

  it("forgets only this tab when another tab has written a different durable checkpoint", () => {
    sessionStorage.setItem(KEY, CHECKPOINT);
    localStorage.setItem(KEY, OTHER_CHECKPOINT);
    forgetRun(SLOT);
    expect(localStorage.getItem(KEY)).toBe(OTHER_CHECKPOINT);
    expect(restoreRun(SLOT)).toBeNull();
    sessionStorage.clear();
    const reopened = restoreRun(SLOT);
    expect(reopened?.kind).toBe("draft");
    if (reopened?.kind !== "draft") throw new Error("draft not restored");
    expect(runToken(reopened.run)).toBe(OTHER);
  });

  it("ignores malformed browser checkpoints without crashing", () => {
    localStorage.setItem(KEY, '{"screen":"draft","token":42}');
    expect(restoreRun(SLOT)).toBeNull();
  });

  it("uses a valid browser checkpoint when this tab's snapshot is corrupt", () => {
    sessionStorage.setItem(KEY, "not json");
    localStorage.setItem(KEY, CHECKPOINT);
    const restored = restoreRun(SLOT);
    expect(restored?.kind).toBe("draft");
    if (restored?.kind !== "draft") throw new Error("draft not restored");
    expect(runToken(restored.run)).toBe(PICKED);
  });

  it("keeps per-tab persistence working when durable storage is blocked", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    saveRun(SLOT, "draft", PICKED);
    const restored = restoreRun(SLOT);
    expect(restored?.kind).toBe("draft");
    if (restored?.kind !== "draft") throw new Error("draft not restored");
    expect(runToken(restored.run)).toBe(PICKED);
    forgetRun(SLOT);
    expect(restoreRun(SLOT)).toBeNull();
  });

  it("does not restore completed results from durable checkpoint on an unseeded challenge with null session", () => {
    const unseededSlot = { settings: SETTINGS, seed: null, daily: null };
    saveRun(unseededSlot, "results", PICKED);
    // Simulate a new tab opening without session snapshot:
    sessionStorage.clear();
    expect(restoreRun(unseededSlot)).toBeNull();
  });
});

describe("coached runs (catches a results page that drops a run once it carries touchline decisions)", () => {
  const COACHED: DraftSettings = { ...SETTINGS, formation: "4-2-3-1", style: "classic3" };
  const slot: RunSlot = { settings: COACHED, seed: "coach-save" as RunSlot["seed"], daily: null };

  function completeRun(): Run {
    let run = startRun(COACHED, "coach-save");
    for (const ref of slotRefs()) {
      const roll = run.state.phase.kind === "choosing" ? run.state.phase.roll : null;
      if (roll === null) throw new Error("expected a roll");
      const species = roll.kind === "species" ? roll.species : roll.offers![0]!;
      run = step(run, { type: "pick", species, slot: ref });
    }
    return run;
  }

  it("restores the results of a run whose token carries a kickoff tactic", () => {
    const run = completeRun();
    const token = encodeToken({
      ...decodeToken(runToken(run)),
      manager: [{ type: "tactic", match: 0, minute: 0, tactic: "attack" }],
    });
    saveRun(slot, "results", token);

    const restored = restoreRun(slot);
    expect(restored?.kind).toBe("results");
    if (restored?.kind !== "results") throw new Error("results not restored");
    expect(restored.token).toBe(token);
    const first = restored.cup.matches[0];
    if (first?.status !== "played") throw new Error("first match not played");
    expect(first.incidents?.[0]).toEqual({
      kind: "tactic",
      side: "user",
      minute: 0,
      tactic: "attack",
      by: "manager",
    });
  });

  it("still refuses a coached token whose draft belongs to other settings", () => {
    const run = completeRun();
    const token = encodeToken({
      ...decodeToken(runToken(run)),
      manager: [{ type: "tactic", match: 0, minute: 0, tactic: "attack" }],
    });
    saveRun(slot, "results", token);
    expect(restoreRun({ ...slot, settings: { ...COACHED, formation: "4-3-3" } })).toBeNull();
  });
});
