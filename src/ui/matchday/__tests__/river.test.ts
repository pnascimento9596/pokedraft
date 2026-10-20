import { describe, expect, it } from "vitest";
import type { StoryWindow } from "@/engine/story";
import { ENGINE_VERSION, type ManagerAction, type Seed } from "@/engine/types";
import { completedWindows, riverLabel, riverTotals, storySource } from "../river";

const WINDOWS: readonly StoryWindow[] = [
  { window: 0, minute: 5, xgUser: 0.25, xgOpp: 0.125, territory: 2 / 3 },
  { window: 1, minute: 10, xgUser: 0.5, xgOpp: 0, territory: 1 },
  { window: 2, minute: 15, xgUser: 0, xgOpp: 0.375, territory: 0 },
];

describe("storySource (catches a river drawn for a run the live engine cannot replay)", () => {
  const manager: readonly ManagerAction[] = [];
  const seed = "s" as Seed;

  it("gives no story for a retained engine-5 run", () => {
    expect(storySource({ engine: "pokedraft-engine-5", seed, mode: "cup8" }, manager)).toBeNull();
  });

  it("replays a live-engine run with its own seed, mode and decisions", () => {
    expect(storySource({ engine: ENGINE_VERSION, seed, mode: "kanto151" }, manager)).toEqual({
      seed: "s",
      mode: "kanto151",
      manager,
    });
  });
});

describe("completedWindows (catches a river that shows a window before it is played)", () => {
  it("counts a window only once the clock reaches its last minute", () => {
    expect([0, 4.99, 5, 9.5, 14.99, 15, 90].map((m) => completedWindows(WINDOWS, m))).toEqual([
      0, 0, 1, 1, 2, 3, 3,
    ]);
  });
});

describe("riverTotals and riverLabel (catches a label that disagrees with the drawn river)", () => {
  it("sums the completed windows per side", () => {
    expect(riverTotals(WINDOWS, 0)).toEqual({ user: 0, opp: 0 });
    expect(riverTotals(WINDOWS, 2)).toEqual({ user: 0.75, opp: 0.125 });
    expect(riverTotals(WINDOWS, 3)).toEqual({ user: 0.75, opp: 0.5 });
  });

  it("reads the totals to one decimal for you and them", () => {
    expect(riverLabel({ user: 1.44, opp: 0.6 }, false)).toBe("Chances so far: you 1.4, them 0.6");
    expect(riverLabel({ user: 0, opp: 0 }, false)).toBe("Chances so far: you 0.0, them 0.0");
  });

  it("names a shared run's side this squad", () => {
    expect(riverLabel({ user: 0.75, opp: 0.5 }, true)).toBe(
      "Chances so far: this squad 0.8, them 0.5",
    );
  });
});
