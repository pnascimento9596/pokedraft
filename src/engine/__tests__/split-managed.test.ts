import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { runCup } from "../cup";
import type { ManagerAction, MatchResult, Seed } from "../types";
import { CUP8, draftLineup } from "./story-panel";

// Golden panel run 0 (seed panel-0, cup8 4-2-3-1), match 1. Uncoached, it leads 1-0 from 10',
// an injury at 28' is answered by the assistant, fatigue subs come at 60' and 75', and the
// assistant switches to Defend at 75'. Each expectation below is that match's engine 6 output up to
// the first minute where an assistant the manager has not taken over acts, except the score: engine 7
// also awards the user a penalty at 61', which goes in.
const SEED = "panel-0" as Seed;
const LINEUP = draftLineup(CUP8, SEED);
const MATCH = 1;

function play(manager: readonly ManagerAction[]) {
  const m: MatchResult = runCup(LINEUP, SEED, "cup8", ENGINE_COEFFICIENTS_V7, manager).matches[
    MATCH
  ]!;
  if (m.status !== "played") throw new Error("expected a played match");
  const user = (m.incidents ?? []).filter((i) => i.side === "user");
  return {
    match: m,
    autoTactics: user.filter((i) => i.kind === "tactic" && i.by === "auto"),
    fatigueSubs: user.filter((i) => i.kind === "sub" && i.reason === "fatigue"),
    userTactics: user.filter((i) => i.kind === "tactic"),
  };
}

const tactic = (minute: number, t: "balanced" | "attack"): ManagerAction => ({
  type: "tactic",
  match: MATCH,
  minute,
  tactic: t,
});

const FATIGUE_60 = {
  kind: "sub",
  side: "user",
  minute: 60,
  slot: 10,
  out: 292,
  in: 94,
  reason: "fatigue",
  by: "auto",
};
const FATIGUE_75 = {
  kind: "sub",
  side: "user",
  minute: 75,
  slot: 8,
  out: 92,
  in: 678,
  reason: "fatigue",
  by: "auto",
};
const DEFEND_75 = {
  kind: "tactic",
  side: "user",
  minute: 75,
  tactic: "defend",
  by: "auto",
};

describe("engine 7 split managed (catches one decision switching off the whole assistant)", () => {
  it("Balanced at kickoff leaves both assistant behaviours on: the uncoached match, 4-0", () => {
    const { match, autoTactics, fatigueSubs } = play([tactic(0, "balanced")]);
    expect(autoTactics).toEqual([DEFEND_75]);
    expect(fatigueSubs).toEqual([FATIGUE_60, FATIGUE_75]);
    expect(match.regulation).toEqual({ user: 4, opp: 0 });
  });

  it("a sub at 30' turns the fatigue subs off and leaves the late tactic on", () => {
    const { autoTactics, fatigueSubs } = play([
      { type: "sub", match: MATCH, minute: 30, slot: 9, bench: 0 },
    ]);
    expect(fatigueSubs).toEqual([]);
    expect(autoTactics[0]).toEqual(DEFEND_75);
  });

  it("a chosen injury replacement at 28' turns the fatigue subs off and leaves the late tactic on", () => {
    const { match, autoTactics, fatigueSubs } = play([
      { type: "sub", match: MATCH, minute: 28, slot: 6, bench: 2 },
    ]);
    expect(match.incidents).toContainEqual({
      kind: "sub",
      side: "user",
      minute: 28,
      slot: 6,
      out: 649,
      in: 381,
      reason: "injury",
      by: "manager",
    });
    expect(fatigueSubs).toEqual([]);
    expect(autoTactics[0]).toEqual(DEFEND_75);
  });

  it("Attack at 50' turns the assistant's tactics off and leaves its fatigue subs on", () => {
    const { userTactics, fatigueSubs } = play([tactic(50, "attack")]);
    expect(userTactics).toEqual([
      { kind: "tactic", side: "user", minute: 50, tactic: "attack", by: "manager" },
    ]);
    expect(fatigueSubs).toEqual([FATIGUE_60, FATIGUE_75]);
  });

  it("Attack at 30' holds until the assistant protects the lead at 75' (it is not reset to Balanced)", () => {
    const { match, userTactics } = play([
      { type: "sub", match: MATCH, minute: 20, slot: 9, bench: 0 },
      tactic(30, "attack"),
    ]);
    expect(userTactics[0]).toEqual({
      kind: "tactic",
      side: "user",
      minute: 30,
      tactic: "attack",
      by: "manager",
    });
    expect(userTactics[1]).toEqual(DEFEND_75);
    expect(
      match.windows!.filter((w) => w.minute > 30 && w.minute <= 75).map((w) => w.tactic.user),
    ).toEqual(Array(9).fill("attack"));
  });

  it("never writes the split flags into the result", () => {
    const { match } = play([tactic(0, "balanced"), tactic(50, "attack")]);
    expect(JSON.stringify(match)).not.toMatch(/managed/i);
  });
});
