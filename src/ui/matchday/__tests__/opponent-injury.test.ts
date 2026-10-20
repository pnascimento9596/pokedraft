import { describe, expect, it } from "vitest";
import { runCup } from "@/engine";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { CUP8, draftLineup } from "@/engine/__tests__/story-panel";
import type { MatchResult, Seed } from "@/engine/types";
import { stopsFor } from "../clock";
import { beatLine } from "../copy";
import { beatKey } from "../player";
import { buildTimeline, stagePitch, type Beat } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Golden panel run 10, match 0 under engine 7: Hau'oli City's Tyrogue (236) is injured at 13' in
// slot 9 and Monferno (391) comes on; Riolu (447) is rested at 60' and Mankey (56) at 75'.
const SEED = "panel-10" as Seed;
const LINEUP = draftLineup(CUP8, SEED);
const MATCH = runCup(LINEUP, SEED, "cup8", ENGINE_COEFFICIENTS_V7).matches[0] as PlayedMatch;
const TIMELINE = buildTimeline(MATCH, { matchIndex: 0, seed: SEED, lineup: LINEUP });
const TEAMS = { user: "You", opp: MATCH.opponent.name };

const injury = TIMELINE.beats.find((b) => b.kind === "injury" && b.minute === 13);

describe("an opponent's injury on the broadcast (catches it staged as the user's player)", () => {
  it("the 13' injury beat is Hau'oli City's slot 9 and reads 'Tyrogue is injured. Monferno comes on.'", () => {
    expect(injury).toMatchObject({
      kind: "injury",
      minute: 13,
      player: { side: "opp", slot: 9, species: 236, name: "Tyrogue" },
      replacement: { side: "opp", slot: 9, species: 391, name: "Monferno" },
    });
    expect(beatLine(injury!, TEAMS)).toBe("13' Tyrogue is injured. Monferno comes on.");
  });

  it("Tyrogue lies down in the opponent's slot 9 while the user's slot 9 plays on", () => {
    const stage = stagePitch(TIMELINE, {
      clock: 13,
      active: { beat: injury!, progress: 0.5 },
      shot: null,
      kicks: 0,
      motion: true,
      userSlots: "4-2-3-1",
      oppSlots: "4-3-3",
    });
    expect({ species: stage.players.opp[9]?.species, pose: stage.players.opp[9]?.pose }).toEqual({
      species: 236,
      pose: "down",
    });
    expect(stage.players.user[9]?.pose).not.toBe("down");
  });

  it("the opponent's injury and its reserve have keys of their own", () => {
    const keys = TIMELINE.beats
      .filter((b) => b.minute === 13 && (b.kind === "injury" || b.kind === "sub"))
      .map(beatKey);
    expect(keys).toEqual(["injury:13:opp:9", "sub:13:opp:9:Monferno"]);
  });

  it("the manager gets no injury stop for an opponent: half time is the only stop", () => {
    expect(stopsFor(MATCH, LINEUP).map((s) => s.key)).toEqual(["halftime"]);
  });
});

describe("an opponent's rotation on the ticker (catches rotations the broadcast never shows)", () => {
  it("reads 'Hau'oli City rotate: Riolu rested.' at 60' and Mankey at 75'", () => {
    const rotations = TIMELINE.beats.filter((b: Beat) => b.kind === "rotate");
    expect(rotations.map((b) => beatLine(b, TEAMS))).toEqual([
      "60' Hau'oli City rotate: Riolu rested.",
      "75' Hau'oli City rotate: Mankey rested.",
    ]);
    expect(rotations.map(beatKey)).toEqual(["rotate:60:8", "rotate:75:7"]);
  });
});
