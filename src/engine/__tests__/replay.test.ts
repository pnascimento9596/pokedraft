import { describe, expect, it } from "vitest";
import { runCup } from "../cup";
import { applyAction, createDraft, runDraft, slotRefs, toFullLineup } from "../draft";
import { replay } from "../replay";
import { encodeToken } from "../token";
import {
  CUP_ROUNDS,
  RunTokenError,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type RunTokenErrorCode,
  type Seed,
  type SpeciesId,
} from "../types";

const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
const SEED = "replay-test" as Seed;

function offersOf(state: DraftState): readonly SpeciesId[] {
  if (state.phase.kind !== "choosing" || state.phase.roll.kind !== "combo") {
    throw new Error(`expected a combo roll, phase is ${state.phase.kind}`);
  }
  return state.phase.roll.offers ?? [];
}

function scriptedActions(): DraftAction[] {
  const actions: DraftAction[] = [{ type: "reroll", target: "type" }];
  let state = applyAction(createDraft(SETTINGS, SEED), actions[0]!);
  for (const slot of slotRefs()) {
    const offers = offersOf(state);
    const action: DraftAction = { type: "pick", species: offers[offers.length - 1]!, slot };
    actions.push(action);
    state = applyAction(state, action);
  }
  return actions;
}

function tokenCode(fn: () => unknown): RunTokenErrorCode | "no error" {
  try {
    fn();
  } catch (e) {
    if (e instanceof RunTokenError) return e.code;
    throw e;
  }
  return "no error";
}

const ACTIONS = scriptedActions();
const TOKEN = encodeToken({ v: 2, settings: SETTINGS, seed: SEED, actions: ACTIONS });

describe("replay (catches a share link that re-derives a different cup)", () => {
  it("rebuilds the same draft and the same CupResult as running draft and cup directly", () => {
    const direct = runDraft(SETTINGS, SEED, ACTIONS);
    const replayed = replay(TOKEN);
    expect(ACTIONS).toHaveLength(17);
    expect(replayed.draft.phase.kind).toBe("complete");
    expect(replayed.draft.rerollsUsed).toBe(1);
    expect(replayed.draft.drafted).toEqual(
      ACTIONS.flatMap((a) => (a.type === "pick" ? [a.species] : [])),
    );
    expect(replayed.cup.matches.map((m) => m.round)).toEqual([...CUP_ROUNDS]);
    expect(replayed.cup.seed).toBe(SEED);
    expect(replayed.cup.mode).toBe("cup8");
    expect(replayed.cup.rating.slots.map((s) => s.species)).toEqual(direct.lineup.starters);
    expect(replayed.cup).toEqual(runCup(toFullLineup(direct), SEED, "cup8"));
  });

  it("gives byte-identical JSON on two replays of the same token string", () => {
    expect(JSON.stringify(replay(TOKEN).cup)).toBe(JSON.stringify(replay(TOKEN).cup));
  });

  it("accepts a decoded RunToken object the same as its string", () => {
    const object = replay({ v: 2, settings: SETTINGS, seed: SEED, actions: ACTIONS });
    expect(JSON.stringify(object.cup)).toBe(JSON.stringify(replay(TOKEN).cup));
  });

  it("raises invalidAction when the actions stop one pick short of a full squad", () => {
    const short = encodeToken({
      v: 2,
      settings: SETTINGS,
      seed: SEED,
      actions: ACTIONS.slice(0, -1),
    });
    expect(tokenCode(() => replay(short))).toBe("invalidAction");
  });

  it("raises invalidAction when an action is illegal for the draft state", () => {
    const illegal = encodeToken({
      v: 2,
      settings: SETTINGS,
      seed: SEED,
      actions: [{ type: "chooseSlot", slot: { kind: "starter", index: 0 } }, ...ACTIONS],
    });
    expect(tokenCode(() => replay(illegal))).toBe("invalidAction");
  });
});
