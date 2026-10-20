import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chanceZone, matchStory } from "../story";
import type { Seed } from "../types";
import { checkRun, panel, type PanelTally } from "./story-panel";

describe("matchStory parity (a story that drifts from simulateMatch would show a match that never happened)", () => {
  it("replays every played match of the 20-run golden panel and 30 more seeds byte for byte", () => {
    const tally: PanelTally = { matches: 0, extraTime: 0, coachedMatches: 0, saved: 0, off: 0 };
    for (const run of panel(50)) checkRun(run, tally);
    // The panel must reach extra time and coached matches, or the guard skips those paths.
    expect(tally.extraTime).toBeGreaterThan(0);
    expect(tally.coachedMatches).toBeGreaterThan(0);
    // saveProbability is at most 0.15 x 0.7, so "off" is 90% or more of the misses.
    expect(tally.off / (tally.off + tally.saved)).toBeGreaterThanOrEqual(0.9);
  });

  it("returns the same story twice for the same inputs", () => {
    const [run] = panel(1);
    const args = [run!.seed, 0, { lineup: run!.lineup, mode: run!.settings.mode }] as const;
    expect(JSON.stringify(matchStory(...args))).toBe(JSON.stringify(matchStory(...args)));
  });

  it("refuses a match index outside the cup instead of inventing a match", () => {
    const [run] = panel(1);
    const story = (k: number) =>
      matchStory("panel-0" as Seed, k, { lineup: run!.lineup, mode: run!.settings.mode });
    expect(() => story(8)).toThrow(RangeError);
    expect(() => story(-1)).toThrow(RangeError);
  });

  it("sums each window's chance p per side into xG and territory", () => {
    const [run] = panel(1);
    const story = matchStory(run!.seed, 0, { lineup: run!.lineup, mode: run!.settings.mode });
    for (const w of story.windows) {
      const sum = (side: string) =>
        story.chances
          .filter((ch) => ch.window === w.window && ch.side === side)
          .reduce((s, ch) => s + ch.p, 0);
      expect(w.xgUser).toBe(sum("user"));
      expect(w.xgOpp).toBe(sum("opp"));
      expect(w.territory).toBeGreaterThan(0);
      expect(w.territory).toBeLessThan(1);
    }
  });
});

describe("chanceZone (a derived zone that contradicts the goal kind would draw a header from 30 yards)", () => {
  it("puts headers and penalties in the box and free kicks outside, whatever the line", () => {
    expect(chanceZone("MID", "L", "header")).toEqual({ depth: "box", lane: "left" });
    expect(chanceZone("ATT", "R", "free-kick")).toEqual({ depth: "outside", lane: "right" });
    expect(chanceZone("GK", "C", "penalty")).toEqual({ depth: "box", lane: "centre" });
    expect(chanceZone("ATT", "L", "penalty")).toEqual({ depth: "box", lane: "centre" });
  });

  it("reads open play, solo goals and misses from the shooter's line and channel", () => {
    expect(chanceZone("ATT", "C", "open-play")).toEqual({ depth: "box", lane: "centre" });
    expect(chanceZone("ATT", "R", "solo")).toEqual({ depth: "box", lane: "right" });
    expect(chanceZone("MID", "C", "solo")).toEqual({ depth: "outside", lane: "centre" });
    expect(chanceZone("MID", "R", null)).toEqual({ depth: "outside", lane: "right" });
    expect(chanceZone("DEF", "L", null)).toEqual({ depth: "box", lane: "left" });
  });
});

describe("observer boundary (a second caller of the observe hook could start steering the engine)", () => {
  it("keeps `observe` inside match.ts and story.ts in src/engine", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
      (f) =>
        /\.tsx?$/.test(f) && !f.split(path.sep).includes("__tests__") && !f.startsWith("versions"),
    );
    const users = files
      .filter((f) => /\bobserve\b/.test(readFileSync(path.join(root, f), "utf8")))
      .sort();
    expect(users).toEqual(["match.ts", "story.ts"]);
  });
});
