import { describe, expect, it } from "vitest";
import { replay } from "../replay";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V8 } from "../coefficients-v8";
import * as v7 from "../versions/v7";
import { GOLDEN_CUP8_V7 } from "../versions/__tests__/fixtures";
import { loadCoefficients } from "../../../scripts/calibration/coeffs";
import { matchStory } from "../story";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import type { Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

describe("defend against direct style edge (Row 8c)", () => {
  it("keeps engine 7 live value 0.655 for directDefendOwn in live coefficients", () => {
    expect(ENGINE_COEFFICIENTS.manager.directDefendOwn).toBe(0.655);
    expect(ENGINE_COEFFICIENTS.manager.styleEdges.direct.defend).toEqual([0.655, 0.4825]);
  });

  it("exports candidate ENGINE_COEFFICIENTS_V8 with candidate directDefendOwn", () => {
    expect(ENGINE_COEFFICIENTS_V8.manager.directDefendOwn).toBe(0.95);
    expect(ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct.defend).toEqual([0.95, 0.7]);
  });

  it("loads ENGINE_COEFFICIENTS_V8 via loadCoefficients('v8')", () => {
    expect(loadCoefficients("v8")).toBe(ENGINE_COEFFICIENTS_V8);
  });

  it("preserves exact output parity between live engine and frozen v7 bundle", () => {
    const liveReplayed = replay(GOLDEN_CUP8_V7);
    const v7Replayed = v7.replay(GOLDEN_CUP8_V7);
    expect(liveReplayed.draft.seed).toBe(v7Replayed.draft.seed);
    expect([liveReplayed.cup.rating.score, liveReplayed.cup.wins, liveReplayed.cup.finish]).toEqual(
      [593, 5, "QF"],
    );
    expect([v7Replayed.cup.rating.score, v7Replayed.cup.wins, v7Replayed.cup.finish]).toEqual([
      593,
      5,
      "QF",
    ]);
    expect(JSON.stringify(liveReplayed)).toBe(JSON.stringify(v7Replayed));
  });
  it("scales the user's Defend chance against a direct side by directDefendOwn (catches the field being read by nothing)", () => {
    const seed = "panel-0" as Seed;
    const lineup = draftLineup(CUP8, seed);
    const manager = [
      { type: "tactic" as const, match: 4, minute: 0, tactic: "defend" as const },
      { type: "tactic" as const, match: 4, minute: 45, tactic: "defend" as const },
    ];
    const firstUserChance = (own: number) =>
      matchStory(
        seed,
        4,
        { lineup, mode: "cup8", manager },
        {
          ...ENGINE_COEFFICIENTS_V7,
          manager: { ...ENGINE_COEFFICIENTS_V7.manager, directDefendOwn: own },
        },
      ).chances.find((c) => c.side === "user")!.p;
    expect(firstUserChance(0.655)).toBe(0.0010903145032324785);
    expect(firstUserChance(0.95)).toBe(0.0015813721802608463);
  });
});
