import { describe, expect, it } from "vitest";
import type { StoryChance } from "@/engine/story";
import type { Score, Side, SpeciesId } from "@/engine/types";
import { goalNotes, lateDramaLine, runOfPlayLine, scorerLine } from "../commentary";
import type { Beat } from "../timeline";

type GoalBeat = Extract<Beat, { kind: "goal" }>;

function goal(minute: number, side: Side, name: string, species: number, score: Score): GoalBeat {
  return {
    kind: "goal",
    minute,
    side,
    scorer: { side, slot: 9, species: species as SpeciesId, name },
    assist: null,
    penalty: false,
    goalKind: "open-play",
    callout: { effect: "strike", type: null, move: null } as unknown as GoalBeat["callout"],
    score,
  };
}

function chance(minute: number, side: Side, p: number): StoryChance {
  return {
    window: Math.floor((minute - 1) / 5),
    minute,
    side,
    p,
    outcome: "off",
    kind: null,
    shooter: 25 as SpeciesId,
    zone: { depth: "box", lane: "centre" },
  };
}

describe("lateDramaLine (catches a late-drama line on a goal that changed nothing)", () => {
  it("calls an 87' equaliser late drama", () => {
    expect(lateDramaLine(87, "user", { user: 1, opp: 1 })).toBe("Late drama at 87'");
  });

  it("calls a 90' winner from level late drama", () => {
    expect(lateDramaLine(90, "user", { user: 2, opp: 1 })).toBe("Late drama at 90'");
  });

  it("calls the opponent's 85' winner late drama", () => {
    expect(lateDramaLine(85, "opp", { user: 1, opp: 2 })).toBe("Late drama at 85'");
  });

  it("says nothing for an 87' goal that only stretches a lead", () => {
    expect(lateDramaLine(87, "user", { user: 3, opp: 0 })).toBeNull();
  });

  it("says nothing for an 87' goal that only narrows a defeat", () => {
    expect(lateDramaLine(87, "user", { user: 1, opp: 3 })).toBeNull();
  });

  it("says nothing for an 84' winner", () => {
    expect(lateDramaLine(84, "user", { user: 1, opp: 0 })).toBeNull();
  });
});

describe("scorerLine (catches a brace or hat-trick line on the wrong goal)", () => {
  it("names a scorer's second and third goals and nothing else", () => {
    expect([1, 2, 3, 4].map((n) => scorerLine("Pikachu", n))).toEqual([
      null,
      "Pikachu's second",
      "Pikachu's hat-trick",
      null,
    ]);
  });
});

describe("runOfPlayLine (catches an against-the-run line the chances do not support)", () => {
  it("calls a goal against the run of play when the scorer trails by 0.8 xG or more", () => {
    expect(runOfPlayLine("user", { user: 0.2, opp: 1.0 })).toBe("Against the run of play");
    expect(runOfPlayLine("opp", { user: 1.5, opp: 0.5 })).toBe("Against the run of play");
  });

  it("says nothing when the gap is under 0.8 or the scorer leads on chances", () => {
    expect(runOfPlayLine("user", { user: 0.3, opp: 1.0 })).toBeNull();
    expect(runOfPlayLine("user", { user: 1.0, opp: 0.2 })).toBeNull();
  });
});

describe("goalNotes (catches commentary that reads the future or a goal it does not belong to)", () => {
  const goals = [
    goal(10, "user", "Pikachu", 25, { user: 1, opp: 0 }),
    goal(30, "opp", "Mewtwo", 150, { user: 1, opp: 1 }),
    goal(60, "user", "Pikachu", 25, { user: 2, opp: 1 }),
    goal(80, "opp", "Mew", 151, { user: 2, opp: 2 }),
    goal(88, "user", "Pikachu", 25, { user: 3, opp: 2 }),
  ];

  it("gives each goal its late drama, scorer and run-of-play lines in that order", () => {
    const chances = [
      chance(4, "user", 0.6),
      chance(20, "user", 0.4),
      chance(29, "opp", 0.1),
      chance(31, "opp", 2.0),
    ];
    expect(goalNotes(goals, chances)).toEqual([
      [],
      ["Against the run of play"],
      ["Pikachu's second"],
      [],
      ["Late drama at 88'", "Pikachu's hat-trick"],
    ]);
  });

  it("counts only chances up to the goal's minute, so a chance after it never changes the line", () => {
    const chances = [chance(29, "opp", 0.1), chance(31, "user", 2.0)];
    expect(goalNotes(goals, chances)[1]).toEqual([]);
  });

  it("gives no run-of-play line without the match's chances", () => {
    expect(goalNotes(goals, null)).toEqual([
      [],
      [],
      ["Pikachu's second"],
      [],
      ["Late drama at 88'", "Pikachu's hat-trick"],
    ]);
  });
});
