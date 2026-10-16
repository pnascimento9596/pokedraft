import { describe, expect, it } from "vitest";
import { replay } from "@/engine/replay";
import type { CupResult, DraftSettings } from "@/engine/types";
import { scriptedToken } from "@/leaderboard/server/__tests__/fixtures";
import * as v4 from "../v4";

const PANEL: readonly DraftSettings[] = [
  {
    mode: "cup8",
    formation: "4-2-3-1",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "classic3",
    order: "positionFirst",
  },
  { mode: "cup8", formation: "4-4-2", gens: [1, 4], style: "open", order: "squadFirst" },
  { mode: "kanto151", formation: "3-5-2", order: "positionFirst" },
  { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
  { mode: "builder", formation: "5-3-2", gens: [2, 9], legendaries: true },
];

// Engine 5 only appends saves and its version string, so removing both must leave engine 4 exactly.
function withoutSaves(cup: CupResult): unknown {
  return {
    ...cup,
    engine: "pokedraft-engine-4",
    matches: cup.matches.map((m) => {
      if (m.status !== "played") return m;
      const rest: Partial<typeof m> = { ...m };
      delete rest.saves;
      return rest;
    }),
  };
}

describe("engine 5 against engine 4 (catches save recording that moves any score, scorer, or draft)", () => {
  it("matches engine 4 on every paired run once the saves are removed", () => {
    let saves = 0;
    for (const [i, settings] of PANEL.entries()) {
      for (let k = 0; k < 8; k++) {
        const live = scriptedToken(settings, `parity-${i}-${k}`);
        const old = v4.replay(`pd4.${live.slice(live.indexOf(".") + 1)}`);
        const run = replay(live);
        expect(run.draft).toEqual(old.draft);
        expect(withoutSaves(run.cup)).toEqual(old.cup);
        for (const m of run.cup.matches) if (m.status === "played") saves += m.saves!.length;
      }
    }
    expect(saves).toBeGreaterThan(0);
  });
});
