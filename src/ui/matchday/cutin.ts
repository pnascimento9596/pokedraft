import type { Side, SpeciesId } from "@/engine/types";
import type { Callout } from "./moves";
import type { Beat, PitchStage } from "./timeline";

/** The lower-third card for a big moment: who made it and the move they called. */
export interface CutIn {
  readonly kind: "goal" | "save" | "duel";
  readonly side: Side;
  readonly species: SpeciesId | null;
  readonly callout: Callout;
}

// A goal's card waits for the shot, the same share of its staging the move callout always used.
const GOAL_CARD_FROM = 0.25;

/**
 * The cut-in on screen, if any. Only shots on target (every goal and every save) and the key duels
 * that win the ball for them get one; every other beat and open-play callout stays on the pitch.
 */
export function cutInAt(
  active: { readonly beat: Beat; readonly progress: number } | null,
  play: PitchStage["playCallout"],
): CutIn | null {
  const beat = active?.beat;
  if (beat?.kind === "goal") {
    return active!.progress >= GOAL_CARD_FROM
      ? { kind: "goal", side: beat.side, species: beat.scorer.species, callout: beat.callout }
      : null;
  }
  if (beat?.kind === "save") {
    return { kind: "save", side: beat.side, species: beat.keeper.species, callout: beat.callout };
  }
  if (beat !== undefined || play?.moment !== "key-duel") return null;
  return { kind: "duel", side: play.side, species: play.species, callout: play.callout };
}
