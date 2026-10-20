import { describe, expect, it } from "vitest";
import { runCup } from "@/engine";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { CUP8, draftLineup } from "@/engine/__tests__/story-panel";
import type { MatchResult, Seed } from "@/engine/types";
import { beatLine } from "../copy";
import { cutInAt } from "../cutin";
import { SHOW, buildTimeline, stagePitch } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Golden panel run 7, match 1 under engine 7: 802 puts a penalty wide at 9' (Marshadow, the keeper is 88).
// Run 24, match 4: 346 saves 784's penalty at 71'.
function v7Match(seed: string, index: number) {
  const lineup = draftLineup(CUP8, seed as Seed);
  const match = runCup(lineup, seed as Seed, "cup8", ENGINE_COEFFICIENTS_V7).matches[index];
  if (match?.status !== "played") throw new Error("expected a played match");
  const input = { matchIndex: index, seed, lineup };
  return {
    match: match as PlayedMatch,
    timeline: buildTimeline(match as PlayedMatch, input),
    input,
  };
}

const TEAMS = { user: "You", opp: "Them" };

describe("missed penalties on the broadcast (catches a missed penalty that never reaches the pitch)", () => {
  it("panel-7 match 1: a save beat at 9' marked missed, read as 'Penalty missed'", () => {
    const { timeline } = v7Match("panel-7", 1);
    const beat = timeline.beats.find((b) => b.kind === "save" && b.penalty !== undefined);
    expect(beat).toMatchObject({ kind: "save", minute: 9, side: "opp", penalty: "missed" });
    expect(beatLine(beat!, TEAMS)).toBe("9' Penalty missed. Marshadow puts it wide");
  });

  it("panel-24 match 4: a save beat at 71' marked saved, read as 'Penalty saved'", () => {
    const { timeline } = v7Match("panel-24", 4);
    const beat = timeline.beats.find((b) => b.kind === "save" && b.penalty !== undefined);
    expect(beat).toMatchObject({ kind: "save", minute: 71, side: "opp", penalty: "saved" });
    expect(beatLine(beat!, TEAMS)).toBe("71' Penalty saved. Cradily stops Kommo-o");
  });

  it("between strike and reach the ball flies from the user's spot (89, 50), wide of the post", () => {
    const { timeline } = v7Match("panel-7", 1);
    const beat = timeline.beats.find((b) => b.kind === "save" && b.penalty !== undefined);
    if (beat?.kind !== "save") throw new Error("expected the missed penalty");
    const stage = stagePitch(timeline, {
      clock: beat.minute,
      active: null,
      shot: { beat, age: 0.4 * SHOW.save },
      kicks: 0,
      motion: true,
      userSlots: "4-2-3-1",
      oppSlots: "4-3-3",
    });
    expect(stage.trail?.from).toEqual({ x: 89, y: 50 });
    // The kick heads for the goal line outside the post (y 64), not at the keeper in the middle.
    expect(stage.ball.y).toBeGreaterThan(50);
  });

  it("a penalty put wide gets no keeper cut-in; a saved one shows the keeper, Cradily (346)", () => {
    const missed = v7Match("panel-7", 1).timeline.beats.find(
      (b) => b.kind === "save" && b.penalty !== undefined,
    );
    const saved = v7Match("panel-24", 4).timeline.beats.find(
      (b) => b.kind === "save" && b.penalty !== undefined,
    );
    expect(cutInAt({ beat: missed!, progress: 0.5 }, null)).toBeNull();
    expect(cutInAt({ beat: saved!, progress: 0.5 }, null)).toMatchObject({
      kind: "save",
      species: 346,
    });
  });
});
