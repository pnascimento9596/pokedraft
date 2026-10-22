import { describe, expect, it } from "vitest";
import { runCup } from "@/engine/cup";
import type { FullLineup, ManagerAction, Seed } from "@/engine/types";
import type { CupContext } from "../touchline";
import { callLabel, callsCopy, yourCallsRuns, type CallsReport } from "../your-calls";

// Squads drafted by `createDraft` for cup8 4-2-3-1 with the first offer in every slot, pinned so
// a draft change cannot move the cups these guards read.
const CALLS_3: CupContext = {
  lineup: {
    formation: "4-2-3-1",
    starters: [286, 310, 758, 523, 789, 727, 187, 166, 400, 410, 793],
    bench: [819, 147, 826, 711, 677],
  } as unknown as FullLineup,
  seed: "calls-3" as Seed,
  mode: "cup8",
};
const CALLS_18: CupContext = {
  lineup: {
    formation: "4-2-3-1",
    starters: [82, 448, 886, 375, 219, 26, 719, 890, 236, 783, 238],
    bench: [684, 956, 778, 830, 288],
  } as unknown as FullLineup,
  seed: "calls-18" as Seed,
  mode: "cup8",
};

const attack12: ManagerAction = { type: "tactic", match: 0, minute: 12, tactic: "attack" };
const defend80: ManagerAction = { type: "tactic", match: 0, minute: 80, tactic: "defend" };

function reports(ctx: CupContext, actions: readonly ManagerAction[], match: number) {
  const cup = runCup(ctx.lineup, ctx.seed, ctx.mode, undefined, actions);
  return [...yourCallsRuns(ctx, cup, actions, match)];
}

const lines = (r: CallsReport | undefined) => (r === undefined ? null : callsCopy(r));

describe("your calls card (catches a card that credits the wrong call or invents a difference)", () => {
  it("Attack at 12' then Defend at 80': Assistant 1-0, You 3-1, and the Attack switch is the swing", () => {
    const runs = reports(CALLS_3, [attack12, defend80], 0);
    expect(runs).toHaveLength(3);
    expect(lines(runs[0])).toEqual({
      score: "Assistant 1-0, You 3-1",
      same: null,
      later: "Later results are the same without your calls here.",
      call: null,
    });
    expect(lines(runs.at(-1))).toEqual({
      score: "Assistant 1-0, You 3-1",
      same: null,
      later: "Later results are the same without your calls here.",
      call: "Biggest swing: your Attack switch at 12'.",
    });
  });

  it("a lone Defend at 80' gives the assistant's score and no call changed it", () => {
    const runs = reports(CALLS_3, [defend80], 0);
    expect(lines(runs.at(-1))).toEqual({
      score: "Assistant 1-0, You 1-0",
      same: "Your calls gave the same score as the assistant.",
      later: "Later results are the same without your calls here.",
      call: "No single call changed the score.",
    });
  });

  it("baseline never throws on a token whose later actions depend on this match", () => {
    const actions: ManagerAction[] = [
      { type: "tactic", match: 4, minute: 12, tactic: "defend" },
      { type: "tactic", match: 5, minute: 20, tactic: "attack" },
    ];
    const runs = reports(CALLS_18, actions, 4);
    expect(lines(runs.at(-1))).toEqual({
      score: "Assistant 0-1, You 3-0",
      same: null,
      later: "Later calls depended on this match.",
      call: "Biggest swing: your Defend switch at 12'.",
    });
  });

  it("a match with no call of yours has no card", () => {
    expect(reports(CALLS_3, [{ ...attack12, match: 1 }], 0)).toEqual([]);
  });

  it("names a substitution by who came on and who went off", () => {
    const sub: ManagerAction = { type: "sub", match: 0, minute: 60, slot: 9, bench: 0 };
    const cup = runCup(CALLS_3.lineup, CALLS_3.seed, CALLS_3.mode, undefined, [sub]);
    const match = cup.matches[0];
    if (match?.status !== "played") throw new Error("expected a played match");
    expect(callLabel(sub, match)).toBe("your Skwovet on for Shieldon at 60'");
    expect(callLabel({ ...attack12, minute: 0 }, match)).toBe("your Attack from kickoff");
  });
});

describe("callLabel for a nominated taker (catches a nomination named as a tactic or a sub)", () => {
  const match = {} as never;
  it("names the set piece and the minute", () => {
    expect(
      callLabel({ type: "taker", match: 0, minute: 0, set: "penalty", slot: null }, match),
    ).toBe("your penalty taker from kickoff");
    expect(
      callLabel({ type: "taker", match: 0, minute: 60, set: "freeKick", slot: null }, match),
    ).toBe("your free-kick taker at 60'");
  });
});
