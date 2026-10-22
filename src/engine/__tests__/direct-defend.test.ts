import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS } from "../coefficients";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { ENGINE_COEFFICIENTS_V8 } from "../coefficients-v8";
import * as v7 from "../versions/v7";
import { loadCoefficients } from "../../../scripts/calibration/coeffs";
import { buildLadder } from "../opponents";
import { matchStory } from "../story";
import { CUP_ROUNDS, type ManagerAction, type Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

function capture(fn: () => unknown): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

describe("defend against direct style edge (engine 8 flip)", () => {
  it("promotes the calibrated V8 direct-Defend edge [1.05, 0.52] to live ENGINE_COEFFICIENTS and retains engine 7 in ENGINE_COEFFICIENTS_V7", () => {
    expect(ENGINE_COEFFICIENTS.manager.directDefendOwn).toBe(1.05);
    expect(ENGINE_COEFFICIENTS.manager.styleEdges.direct.defend).toEqual([1.05, 0.52]);
    expect(ENGINE_COEFFICIENTS.manager.directDefendOwn).toBe(
      ENGINE_COEFFICIENTS.manager.styleEdges.direct.defend![0],
    );
    expect(ENGINE_COEFFICIENTS_V7.manager.directDefendOwn).toBe(0.655);
    expect(ENGINE_COEFFICIENTS_V7.manager.styleEdges.direct.defend).toEqual([0.655, 0.4825]);
    expect(ENGINE_COEFFICIENTS_V8).toEqual(ENGINE_COEFFICIENTS);
  });

  it("loads ENGINE_COEFFICIENTS_V8 via loadCoefficients('v8') and ENGINE_COEFFICIENTS_V7 via loadCoefficients('v7')", () => {
    expect(loadCoefficients("v8")).toBe(ENGINE_COEFFICIENTS_V8);
    expect(loadCoefficients("v7")).toBe(ENGINE_COEFFICIENTS_V7);
  });

  it("proves live matchStory code is byte-identical to frozen v7 across 50 cup8 seeds when given ENGINE_COEFFICIENTS_V7", () => {
    let stories = 0;
    let errorsInBoth = 0;
    let played = 0;
    let defendVsDirectPlayed = 0;
    let mismatches = 0;

    for (let i = 0; i < 50; i += 1) {
      const seed = `panel-${i}` as Seed;
      const lineup = draftLineup(CUP8, seed);
      const ladder = buildLadder(seed, "cup8");

      for (let m = 0; m < 8; m += 1) {
        const isDirect = ladder[CUP_ROUNDS[m]!].tacticalStyle === "direct";
        const defendManager: readonly ManagerAction[] = [
          { type: "tactic", match: m, minute: 0, tactic: "defend" },
          { type: "tactic", match: m, minute: 45, tactic: "defend" },
        ];

        for (const manager of [undefined, defendManager] as const) {
          stories += 1;
          const liveWithV7 = capture(() =>
            matchStory(seed, m, { lineup, mode: "cup8", manager }, ENGINE_COEFFICIENTS_V7),
          );
          const frozen = capture(() =>
            v7.matchStory(seed as never, m, {
              lineup: lineup as never,
              mode: "cup8",
              manager,
            } as never),
          );

          if (!liveWithV7.ok && !frozen.ok) {
            errorsInBoth += 1;
            if (liveWithV7.message !== frozen.message) mismatches += 1;
            continue;
          }
          if (!liveWithV7.ok || !frozen.ok) {
            mismatches += 1;
            continue;
          }

          played += 1;
          if (manager !== undefined && isDirect) {
            defendVsDirectPlayed += 1;
          }
          if (JSON.stringify(liveWithV7.value) !== JSON.stringify(frozen.value)) {
            mismatches += 1;
          }
        }
      }
    }

    expect({
      stories,
      errorsInBoth,
      played,
      defendVsDirectPlayed,
      mismatches,
    }).toEqual({
      stories: 800,
      errorsInBoth: 316,
      played: 484,
      defendVsDirectPlayed: 73,
      mismatches: 0,
    });
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
    expect(firstUserChance(1.05)).toBe(0.0017478324097619886);
    expect(
      matchStory(seed, 4, { lineup, mode: "cup8", manager }).chances.find((c) => c.side === "user")!
        .p,
    ).toBe(0.0017478324097619886);
  });
});
