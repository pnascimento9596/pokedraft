import { describe, expect, it } from "vitest";
import { applyAction, createDraft, eligibleSpecies, replay } from "@/engine";
import { toFullLineup } from "@/engine/draft";
import { decodeToken, encodeToken } from "@/engine/token";
import type { DraftSettings, Seed } from "@/engine/types";
import { builderToken } from "@/ui/builder-token";
import { ALL_REFS } from "@/ui/lineup";
import { decide } from "../touchline";

const GEN1: DraftSettings = { mode: "builder", formation: "4-3-3", gens: [1], legendaries: false };

function fullBuilderToken(seed: Seed): string {
  let state = createDraft(GEN1, seed);
  const pool = [...eligibleSpecies(state)];
  ALL_REFS.forEach((slot, i) => {
    state = applyAction(state, { type: "place", species: pool[i]!, slot });
  });
  return builderToken(GEN1, state.lineup, seed);
}

describe("touchline decisions on a builder cup (catches a friendly matchday whose coaching the token cannot replay)", () => {
  it("records a tactic through decide and replays the coached builder token to the same cup", () => {
    const token = fullBuilderToken("friendly-coach" as Seed);
    const { draft, cup } = replay(token);
    const ctx = { lineup: toFullLineup(draft), seed: cup.seed, mode: draft.settings.mode };
    const verdict = decide(ctx, cup, [], 0, 30, { kind: "tactic", tactic: "attack" });
    if (!verdict.ok) throw new Error(verdict.reason);
    const coached = encodeToken({ ...decodeToken(token), manager: [...verdict.actions] });
    expect(decodeToken(coached).settings.mode).toBe("builder");
    expect(decodeToken(coached).manager).toEqual([
      { type: "tactic", match: 0, minute: 30, tactic: "attack" },
    ]);
    expect(replay(coached).cup).toEqual(verdict.cup);
  });
});
