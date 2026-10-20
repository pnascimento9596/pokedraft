import { describe, expect, it } from "vitest";
import type { SpeciesId } from "@/engine/types";
import {
  ASSISTANT_OFF,
  ASSISTANT_ON,
  EDGE_MARGIN,
  assistantStatus,
  fatigueLine,
  scoutLine,
  tacticEdge,
} from "../intel";

const id = (n: number) => n as SpeciesId;

describe("scoutLine (catches a scout line that is hand-written or ignores the coefficient table)", () => {
  it("cites Press as the favourable tactic against a possession side, then Counter, and warns off Defend", () => {
    expect(scoutLine("possession")).toBe(
      "Scout: a possession side. Best edge: Press, then Counter. Avoid Defend.",
    );
  });

  it("ranks Counter over Press against a pressing side", () => {
    expect(scoutLine("pressing")).toBe(
      "Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend.",
    );
  });

  it("names Defend against a direct side and warns off Press", () => {
    expect(scoutLine("direct")).toBe("Scout: a direct side. Best edge: Defend. Avoid Press.");
  });

  it("says there is no clear edge for a balanced side or a side with no style", () => {
    expect(scoutLine("balanced")).toBe("Scout: no tactic has a clear edge against this opponent.");
    expect(scoutLine(undefined)).toBe("Scout: no tactic has a clear edge against this opponent.");
  });
});

describe("tacticEdge (catches a pill badge that disagrees with the engine's multipliers)", () => {
  it("uses a 4% margin on goals for over goals against", () => {
    expect(EDGE_MARGIN).toBe(0.04);
  });

  it("against possession: Press and Counter favourable, Defend unfavourable, Balanced and Attack neutral", () => {
    expect(
      (["balanced", "attack", "defend", "press", "counter"] as const).map((t) =>
        tacticEdge("possession", t),
      ),
    ).toEqual(["neutral", "neutral", "unfavourable", "favourable", "favourable"]);
  });

  it("against pressing: Attack stays neutral (1.3 for, 1.35 against)", () => {
    expect(tacticEdge("pressing", "attack")).toBe("neutral");
    expect(tacticEdge("pressing", "counter")).toBe("favourable");
  });

  it("against direct: Defend favourable (0.65 for, 0.62 against), Press unfavourable", () => {
    expect(tacticEdge("direct", "defend")).toBe("favourable");
    expect(tacticEdge("direct", "press")).toBe("unfavourable");
  });

  it("gives no badge at all for a balanced side or a side with no style", () => {
    expect(tacticEdge("balanced", "press")).toBeNull();
    expect(tacticEdge(undefined, "press")).toBeNull();
  });
});

// Regression guard, no RED: behaviour already correct. The scout reads the live engine 6 table, so
// the engine 7 candidate's larger edges (6b2) must not reach a badge or a scout line before the flip.
describe("tacticEdge and scoutLine before the flip (catches the engine 7 tactic table leaking into the scout)", () => {
  const ALL = ["balanced", "attack", "defend", "press", "counter"] as const;

  it("gives every style and tactic its engine 6 badge", () => {
    expect(
      (["pressing", "possession", "direct"] as const).map((s) => ALL.map((t) => tacticEdge(s, t))),
    ).toEqual([
      ["neutral", "neutral", "unfavourable", "favourable", "favourable"],
      ["neutral", "neutral", "unfavourable", "favourable", "favourable"],
      ["neutral", "neutral", "favourable", "unfavourable", "neutral"],
    ]);
  });

  it("keeps the three engine 6 scout lines", () => {
    expect((["pressing", "possession", "direct"] as const).map(scoutLine)).toEqual([
      "Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend.",
      "Scout: a possession side. Best edge: Press, then Counter. Avoid Defend.",
      "Scout: a direct side. Best edge: Defend. Avoid Press.",
    ]);
  });
});

describe("fatigueLine (catches a half-time line that names the keeper or the wrong players)", () => {
  // 4-3-3: slot 0 is the keeper.
  const onPitch = [1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 25].map(id);

  it("names the two lowest-energy outfield players, lowest first, and skips the keeper", () => {
    const energy = [40, 80, 81, 61, 83, 84, 85, 58, 87, 88, 90];
    expect(fatigueLine({ onPitch, energy }, "4-3-3")).toBe(
      "Most tired: Spearow (58) and Caterpie (61).",
    );
  });

  it("skips an empty slot and breaks a tie by slot order", () => {
    const withGap = onPitch.map((p, s) => (s === 3 ? null : p));
    const energy = [96, 70, 81, null, 83, 70, 85, 86, 87, 88, 90];
    expect(fatigueLine({ onPitch: withGap, energy }, "4-3-3")).toBe(
      "Most tired: Charmander (70) and Pidgey (70).",
    );
  });
});

describe("assistantStatus (catches a status line that claims engine 7's split before it ships)", () => {
  it("reads subs on, tactics on before any decision and subs off, tactics off after one", () => {
    expect(assistantStatus(false)).toBe("Assistant: subs on, tactics on");
    expect(assistantStatus(true)).toBe("Assistant: subs off, tactics off");
    expect([ASSISTANT_ON, ASSISTANT_OFF]).toEqual([
      "Assistant: subs on, tactics on",
      "Assistant: subs off, tactics off",
    ]);
  });
});
