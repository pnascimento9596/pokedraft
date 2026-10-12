// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftSettings, IsoDate } from "@/engine";
import { forgetRun, restoreRun, saveRun, type RunSlot } from "../savedRun";
import { runToken } from "../runState";

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
  "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwicnVuLXRlc3QiLFtbInAiLDMxNiwiczkiXV1d";
const OTHER = "pd3.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwib3RoZXItc2VlZCIsW11d";
const CHECKPOINT = JSON.stringify({ screen: "draft", token: PICKED, daily: null });
const OTHER_CHECKPOINT = JSON.stringify({ screen: "draft", token: OTHER, daily: null });

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("browser checkpoints with per-tab authority", () => {
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
});
