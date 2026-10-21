import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS_V7 } from "../coefficients-v7";
import { type EngineCoefficients } from "../coefficients";
import { runCup } from "../cup";
import { matchStory } from "../story";
import type { ManagerAction, Seed, Tactic } from "../types";
import { CUP8, draftLineup } from "./story-panel";

// Golden panel run 0 (seed panel-0, cup8 4-2-3-1). The manager picks a tactic at kickoff and again
// at 45', which takes the tactics off the assistant so the tactic holds for the whole match.
const SEED = "panel-0" as Seed;
const LINEUP = draftLineup(CUP8, SEED);

const held = (match: number, tactic: Tactic): ManagerAction[] => [
  { type: "tactic", match, minute: 0, tactic },
  { type: "tactic", match, minute: 45, tactic },
];

function withManager(patch: Partial<EngineCoefficients["manager"]>): EngineCoefficients {
  return { ...ENGINE_COEFFICIENTS_V7, manager: { ...ENGINE_COEFFICIENTS_V7.manager, ...patch } };
}

function story(match: number, tactic: Tactic, c: EngineCoefficients) {
  const s = matchStory(
    SEED,
    match,
    { lineup: LINEUP, mode: "cup8", manager: held(match, tactic) },
    c,
  );
  const userAt = (minute: number) =>
    s.chances.filter((ch) => ch.side === "user" && ch.minute === minute);
  const oppAt = (minute: number) =>
    s.chances.filter((ch) => ch.side === "opp" && ch.minute === minute);
  return { s, userAt, oppAt };
}

describe("engine 7 counter while leading (catches Counter paying nothing for a lead)", () => {
  // Match 0 against a pressing side. Level at 1-1 until the user scores at 79'; the window from
  // 81' to 85' opens 2-1 up.
  const v7 = story(0, "counter", ENGINE_COEFFICIENTS_V7);
  const flat = story(0, "counter", withManager({ counterLead: 1 }));

  it("a chance while level keeps its rate: 79' at 1-1", () => {
    expect(v7.userAt(79).map((ch) => [ch.p, ch.outcome])).toEqual([[0.08952683271092454, "goal"]]);
    expect(flat.userAt(79).map((ch) => ch.p)).toEqual([0.08952683271092454]);
  });

  it("a chance while leading is 10% likelier and scores: 81' at 2-1", () => {
    expect(v7.userAt(81).map((ch) => [ch.p, ch.outcome])).toEqual([[0.12548636063192117, "goal"]]);
    expect(flat.userAt(81).map((ch) => [ch.p, ch.outcome])).toEqual([[0.11407850966538287, "off"]]);
  });

  it("the lead turns 3-1 into 4-1, and runCup agrees with the story", () => {
    expect(v7.s.result.regulation).toEqual({ user: 4, opp: 1 });
    expect(flat.s.result.regulation).toEqual({ user: 3, opp: 1 });
    const cup = runCup(LINEUP, SEED, "cup8", ENGINE_COEFFICIENTS_V7, held(0, "counter"));
    expect(cup.matches[0]).toEqual(v7.s.result);
  });
});

describe("engine 7 press fades with energy (catches a tired press costing nothing)", () => {
  // Match 3 against a possession side goes to extra time. The pressing eleven's mean outfield
  // energy is above 70 at 103' and below it from 105' on.
  const v7 = story(3, "press", ENGINE_COEFFICIENTS_V7);
  const fresh = story(3, "press", withManager({ pressFade: { below: 70, perPoint: 0 } }));

  it("keeps the press rate while the side is fresh enough: 103'", () => {
    expect(v7.userAt(103).map((ch) => ch.p)).toEqual([0.07082408446971854]);
    expect(fresh.userAt(103).map((ch) => ch.p)).toEqual([0.07082408446971854]);
  });

  it("lowers a tired pressing side's chance at 120'", () => {
    expect(v7.userAt(120).map((ch) => ch.p)).toEqual([0.08955540998560824]);
    expect(fresh.userAt(120).map((ch) => ch.p)).toEqual([0.09113057093756514]);
  });
});

describe("engine 7 press against a direct side (catches pressing a direct side going unpunished)", () => {
  // Match 4 against a direct side. Press hands the direct side's first chance 28.75% more than
  // Balanced does, and Press itself adds nothing to the user's own chance. Engine 7 also awards the
  // direct side a penalty that goes in, at 57' against Press and 58' against Balanced.
  const press = story(4, "press", ENGINE_COEFFICIENTS_V7);
  const balanced = story(4, "balanced", ENGINE_COEFFICIENTS_V7);

  it("the direct side's 1' chance: 0.0555 against Press, 0.0431 against Balanced", () => {
    expect(press.oppAt(1).map((ch) => ch.p)).toEqual([0.055518494379948734]);
    expect(balanced.oppAt(1).map((ch) => ch.p)).toEqual([0.04311082977935492]);
  });

  it("the user's own 1' chance does not grow with Press", () => {
    expect(press.userAt(1).map((ch) => ch.p)).toEqual([0.0016644402088414661]);
    expect(balanced.userAt(1).map((ch) => ch.p)).toEqual([0.0016646022950114173]);
  });

  it("Press loses it 8-2, Balanced 5-2", () => {
    expect(press.s.result.regulation).toEqual({ user: 2, opp: 8 });
    expect(balanced.s.result.regulation).toEqual({ user: 2, opp: 5 });
  });
});
