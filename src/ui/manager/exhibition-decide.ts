import { simulateMatch, type MatchInput } from "@/engine/match";
import { RunTokenError, type FullLineup, type ManagerAction, type Seed } from "@/engine/types";
import { ENGINE_REFUSAL, record, type Decision, type PlayedMatch } from "./touchline";

/** A one-match exhibition. The lineup is required: it is what lets the bench come on. */
export type ExhibitionFixture = Omit<MatchInput, "seed" | "phase" | "manager"> & {
  readonly lineup: FullLineup;
};

export interface ExhibitionContext {
  readonly fixture: ExhibitionFixture;
  readonly seed: Seed;
}

export type ExhibitionVerdict =
  | { readonly ok: true; readonly actions: readonly ManagerAction[]; readonly match: PlayedMatch }
  | { readonly ok: false; readonly reason: string };

/**
 * Records a decision at `minute` and replays the exhibition with every decision so far, as
 * `decide` does for a cup with `runCup`. An exhibition is one match, so its index is always 0.
 */
export function decideExhibition(
  ctx: ExhibitionContext,
  match: PlayedMatch,
  actions: readonly ManagerAction[],
  minute: number,
  decision: Decision,
): ExhibitionVerdict {
  const { fixture } = ctx;
  const recorded = record(match, fixture.matchIndex, fixture.lineup, actions, minute, decision);
  if (!recorded.ok) return recorded;
  try {
    const next = simulateMatch({
      ...fixture,
      phase: "group",
      seed: ctx.seed,
      manager: recorded.actions,
    });
    return { ok: true, actions: recorded.actions, match: next };
  } catch (e) {
    if (e instanceof RunTokenError) return { ok: false, reason: ENGINE_REFUSAL };
    throw e;
  }
}
