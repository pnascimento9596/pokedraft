import { describe, expect, it } from "vitest";
import type { PenKick, Shirt, SpeciesId } from "@/engine";
import {
  absenceLine,
  finalScore,
  goalLine,
  shootoutLine,
  type PlayedMatch,
} from "@/components/results/format";

const sp = (n: number) => n as SpeciesId;
const shirt = (n: number) => n as Shirt;

function knockout(over: Partial<PlayedMatch>): PlayedMatch {
  return {
    status: "played",
    round: "QF",
    opponent: { id: "o", name: "Rival FC", score: 760, lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 } },
    regulation: { user: 1, opp: 1 },
    extraTime: { user: 0, opp: 0 },
    shootout: null,
    outcome: "W",
    goals: [],
    absences: [],
    rating: 700,
    recap: [],
    ...over,
  };
}

function kicks(pairs: number, finalUser: boolean, finalOpp: boolean): PenKick[] {
  const out: PenKick[] = [];
  for (let i = 0; i < pairs; i++) {
    out.push({ side: "user", taker: sp(1), scored: true });
    out.push({ side: "opp", taker: shirt(9), scored: true });
  }
  out.push({ side: "user", taker: sp(1), scored: finalUser });
  out.push({ side: "opp", taker: shirt(9), scored: finalOpp });
  return out;
}

describe("results format", () => {
  it("shows the decree line, not '26-25 on pens', when the engine forced the win after the sudden-death cap", () => {
    const m = knockout({
      shootout: { user: 26, opp: 25, keeper: sp(1), kicks: kicks(25, true, false) },
    });
    expect(shootoutLine(m)).toBe("Won on penalties (decided after 20 rounds)");
  });

  it("shows the decree line when a shootout win is reported with level goals", () => {
    const m = knockout({
      shootout: { user: 5, opp: 5, keeper: sp(1), kicks: kicks(4, true, true) },
    });
    expect(shootoutLine(m)).toBe("Won on penalties (decided after 20 rounds)");
  });

  it("keeps an ordinary shootout as a scoreline so real wins are not mislabelled as decrees", () => {
    const m = knockout({
      shootout: { user: 4, opp: 3, keeper: sp(1), kicks: kicks(4, false, false) },
    });
    expect(shootoutLine(m)).toBe("4-3 on pens");
  });

  it("adds extra-time goals to the regulation score so an a.e.t. scoreline is not stuck at 90 minutes", () => {
    const m = knockout({ regulation: { user: 1, opp: 1 }, extraTime: { user: 2, opp: 1 } });
    expect(finalScore(m)).toEqual({ user: 3, opp: 2 });
  });

  it("names user scorers and assisters but only shirt numbers for opponents", () => {
    expect(
      goalLine({ side: "user", minute: 23, penalty: false, scorer: sp(1), assist: sp(43) }),
    ).toBe("23' Bulbasaur, assist Oddish");
    expect(goalLine({ side: "user", minute: 88, penalty: true, scorer: sp(1), assist: null })).toBe(
      "88' Bulbasaur (pen)",
    );
    expect(
      goalLine({ side: "opp", minute: 57, penalty: false, scorer: shirt(9), assist: null }),
    ).toBe("57' No. 9");
  });

  it("says who replaced an absent player", () => {
    expect(absenceLine({ slot: "s1" as never, out: sp(1), in: sp(43) })).toBe(
      "Bulbasaur missed this match; Oddish came in",
    );
  });
});
