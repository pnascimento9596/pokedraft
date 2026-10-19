import { describe, expect, it } from "vitest";
import type { OpponentPlayerRef, PenKick, Shirt, SpeciesId } from "@/engine";
import { recapLines } from "@/engine/recap";
import {
  absenceLine,
  contributionLine,
  finalScore,
  goalLine,
  incidentLine,
  shootoutLine,
  type PlayedMatch,
} from "@/components/results/format";

const sp = (n: number) => n as SpeciesId;
const shirt = (n: number) => n as Shirt;

function knockout(over: Partial<PlayedMatch>): PlayedMatch {
  return {
    status: "played",
    round: "QF",
    opponent: {
      id: "o",
      name: "Rival FC",
      score: 760,
      lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
      roster: Array.from({ length: 11 }, (_, i): OpponentPlayerRef => ({
        kind: "shirt",
        number: shirt(i + 1),
      })),
    },
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
    out.push({ side: "opp", taker: { kind: "shirt", number: shirt(9) }, scored: true });
  }
  out.push({ side: "user", taker: sp(1), scored: finalUser });
  out.push({ side: "opp", taker: { kind: "shirt", number: shirt(9) }, scored: finalOpp });
  return out;
}

describe("results format", () => {
  it("labels only goal kinds actually recorded by the live engine", () => {
    const goal = { side: "user" as const, minute: 7, penalty: false, scorer: sp(6), assist: null };
    expect(goalLine({ ...goal, kind: "header" })).toBe("7' Charizard (header)");
    expect(goalLine({ ...goal, kind: "solo" })).toBe("7' Charizard (solo run)");
    expect(goalLine({ ...goal, kind: "free-kick" })).toBe("7' Charizard (free kick)");
    expect(goalLine(goal)).toBe("7' Charizard");
  });
  it("shows the decree line, not '26-25 on pens', for an engine-1 or engine-2 capped shootout", () => {
    const m = knockout({
      shootout: {
        user: 26,
        opp: 25,
        keeper: sp(1),
        kicks: kicks(25, true, false),
        decider: "decree",
        coinWinner: null,
      },
    });
    expect(shootoutLine(m)).toBe("Won on penalties (decided after 20 rounds)");
  });

  it("says 20 rounds on the results line and in the recap for the same engine-1 or engine-2 decree (catches the recap counting the award pair as round 21)", () => {
    const m = knockout({
      shootout: {
        user: 26,
        opp: 25,
        keeper: sp(1),
        kicks: kicks(25, true, false),
        decider: "decree",
        coinWinner: null,
      },
    });
    expect(shootoutLine(m)).toBe("Won on penalties (decided after 20 rounds)");
    expect(recapLines({ matchIndex: 0, ...m }).at(-1)).toBe(
      "Won by the engine after 20 rounds of sudden death.",
    );
  });

  it("names the coin toss and its sudden-death rounds, for a loss as well as a win", () => {
    const shootout = {
      user: 205,
      opp: 205,
      keeper: sp(1),
      kicks: kicks(204, true, true),
      decider: "coin" as const,
    };
    expect(shootoutLine(knockout({ shootout: { ...shootout, coinWinner: "user" } }))).toBe(
      "Won on a coin toss after 200 sudden-death rounds",
    );
    expect(
      shootoutLine(knockout({ outcome: "L", shootout: { ...shootout, coinWinner: "opp" } })),
    ).toBe("Lost on a coin toss after 200 sudden-death rounds");
  });

  it("keeps an ordinary shootout as a scoreline so real wins are not mislabelled as decrees", () => {
    const m = knockout({
      shootout: {
        user: 4,
        opp: 3,
        keeper: sp(1),
        kicks: kicks(4, false, false),
        decider: "kicks",
        coinWinner: null,
      },
    });
    expect(shootoutLine(m)).toBe("4-3 on pens");
  });

  it("throws on a decider no engine issued, naming it, instead of returning undefined (catches the missing default)", () => {
    const m = knockout({
      shootout: {
        user: 4,
        opp: 3,
        keeper: sp(1),
        kicks: kicks(4, false, false),
        decider: "lottery" as never,
        coinWinner: null,
      },
    });
    expect(() => shootoutLine(m)).toThrow('Unknown shootout decider "lottery"');
  });

  it("adds extra-time goals to the regulation score so an a.e.t. scoreline is not stuck at 90 minutes", () => {
    const m = knockout({ regulation: { user: 1, opp: 1 }, extraTime: { user: 2, opp: 1 } });
    expect(finalScore(m)).toEqual({ user: 3, opp: 2 });
  });

  it("names user scorers and assisters, Boss Club Pokemon for engine 4, shirt numbers for legacy runs", () => {
    expect(
      goalLine({ side: "user", minute: 23, penalty: false, scorer: sp(1), assist: sp(43) }),
    ).toBe("23' Bulbasaur, assist Oddish");
    expect(goalLine({ side: "user", minute: 88, penalty: true, scorer: sp(1), assist: null })).toBe(
      "88' Bulbasaur (pen)",
    );
    expect(
      goalLine({
        side: "opp",
        minute: 57,
        penalty: false,
        scorer: { kind: "species", id: sp(6) },
        assist: null,
      }),
    ).toBe("57' Charizard");
    expect(
      goalLine({
        side: "opp",
        minute: 57,
        penalty: false,
        scorer: { kind: "shirt", number: shirt(9) },
        assist: null,
      }),
    ).toBe("57' No. 9");
  });

  it("preserves named Boss Club assists and retained shirt assists in results goal lines", () => {
    expect(
      goalLine({
        side: "opp",
        minute: 57,
        penalty: false,
        scorer: { kind: "species", id: sp(6) },
        assist: { kind: "species", id: sp(4) },
      }),
    ).toBe("57' Charizard, assist Charmander");
    expect(
      goalLine({
        side: "opp",
        minute: 57,
        penalty: false,
        scorer: { kind: "shirt", number: shirt(9) },
        assist: { kind: "shirt", number: shirt(7) },
      }),
    ).toBe("57' No. 9, assist No. 7");
  });

  it("says who replaced an absent player", () => {
    expect(absenceLine({ slot: "s1" as never, out: sp(1), in: sp(43) })).toBe(
      "Bulbasaur missed this match; Oddish came in",
    );
  });

  it("spells out where the player of the tournament's points came from", () => {
    expect(
      contributionLine({
        species: sp(32),
        goals: 1,
        assists: 2,
        cleanSheets: 1,
        minutes: 480,
        points: { goals: 3, assists: 4, cleanSheets: 1, minutes: 2.67 },
        total: 10.67,
      }),
    ).toBe("10.67 pts: goals 3, assists 4, clean sheets 1, minutes 2.67");
  });
});

describe("incidentLine (catches results that hide who made a change or mislabel a card)", () => {
  it("names injuries, substitutions with reason and who made them, and cards on both sides", () => {
    expect(
      incidentLine({ kind: "injury", side: "user", minute: 33, slot: 4, player: sp(6) }, "Opp"),
    ).toBe("33' Charizard is injured");
    expect(
      incidentLine(
        {
          kind: "sub",
          side: "user",
          minute: 33,
          slot: 4,
          out: sp(6),
          in: sp(9),
          reason: "injury",
          by: "auto",
        },
        "Opp",
      ),
    ).toBe("33' Blastoise on for Charizard (injury, assistant)");
    expect(
      incidentLine(
        {
          kind: "sub",
          side: "user",
          minute: 61,
          slot: 9,
          out: sp(25),
          in: sp(26),
          reason: "tactical",
          by: "manager",
        },
        "Opp",
      ),
    ).toBe("61' Raichu on for Pikachu (tactical, your call)");
    expect(
      incidentLine(
        { kind: "yellow", side: "opp", minute: 12, slot: 3, player: sp(1), secondYellow: false },
        "Kanto FC",
      ),
    ).toBe("12' Yellow card for Bulbasaur (Kanto FC)");
    expect(
      incidentLine(
        { kind: "red", side: "user", minute: 70, slot: 3, player: sp(4), secondYellow: true },
        "Opp",
      ),
    ).toBe("70' Second yellow, red card for Charmander");
  });

  it("says whether the user, the assistant or the opponent changed the tactic", () => {
    expect(
      incidentLine(
        { kind: "tactic", side: "user", minute: 0, tactic: "press", by: "manager" },
        "Opp",
      ),
    ).toBe("Kick off: you play Press");
    expect(
      incidentLine(
        { kind: "tactic", side: "user", minute: 46, tactic: "attack", by: "manager" },
        "Opp",
      ),
    ).toBe("46' You switch to Attack");
    expect(
      incidentLine(
        { kind: "tactic", side: "user", minute: 75, tactic: "defend", by: "auto" },
        "Opp",
      ),
    ).toBe("75' Your assistant switches to Defend");
    expect(
      incidentLine(
        { kind: "tactic", side: "opp", minute: 60, tactic: "counter", by: "auto" },
        "Opp",
      ),
    ).toBe("60' Opp switch to Counter");
  });

  it("on a shared run names the side This squad, never you (catches Your assistant on a friend's link)", () => {
    const line = (i: Parameters<typeof incidentLine>[0]) => incidentLine(i, "Opp", "shared");
    expect(line({ kind: "tactic", side: "user", minute: 0, tactic: "press", by: "manager" })).toBe(
      "Kick off: this squad plays Press",
    );
    expect(
      line({ kind: "tactic", side: "user", minute: 46, tactic: "attack", by: "manager" }),
    ).toBe("46' This squad switches to Attack");
    expect(line({ kind: "tactic", side: "user", minute: 75, tactic: "defend", by: "auto" })).toBe(
      "75' This squad's assistant switches to Defend",
    );
    expect(
      line({
        kind: "sub",
        side: "user",
        minute: 61,
        slot: 9,
        out: sp(25),
        in: sp(26),
        reason: "tactical",
        by: "manager",
      }),
    ).toBe("61' Raichu on for Pikachu (tactical, manager's call)");
  });

  it("writes an opponent tactic at kickoff as the shape they start in, not a 0' switch", () => {
    expect(
      incidentLine(
        { kind: "tactic", side: "opp", minute: 0, tactic: "counter", by: "auto" },
        "Opp",
      ),
    ).toBe("Kick off: Opp play Counter");
  });
});
