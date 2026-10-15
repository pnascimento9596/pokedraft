import type { Shirt } from "@/engine";
import { describe, expect, it } from "vitest";
import { replayAnyVersion as replay } from "@/engine/versions";
import { getAllMatchStars, getMatchStar, getTournamentMvp } from "../starCalculation";

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

describe("starCalculation", () => {
  it("does not label the 10-minute opener an equalizer when the opponent scores at 80", () => {
    const { draft, cup } = replay(FLAWLESS);
    const match = cup.matches.find((m) => m.status === "played")!;
    const scorer = draft.lineup.starters[1]!;
    const star = getMatchStar(
      {
        ...match,
        outcome: "D",
        regulation: { user: 1, opp: 1 },
        extraTime: null,
        shootout: null,
        goals: [
          { side: "user", scorer, assist: null, minute: 10, penalty: false },
          {
            side: "opp",
            minute: 80,
            scorer: { kind: "shirt", number: 9 as Shirt },
            assist: null,
            penalty: false,
          },
        ],
      },
      draft,
    );
    expect(star.headline).toBe("⚽ Goal Scorer (10')");
    expect(star.speciesId).toBe(scorer);
    expect(star.statSummary).toBe("1 Goal");
    expect(star.matchScore).toBe("1-1");
  });

  it("computes match stars for all played matches in a flawless run", () => {
    const { draft, cup } = replay(FLAWLESS);
    const stars = getAllMatchStars(cup, draft);

    // Flawless run has 8 played matches + 1 tournament MVP = 9 stars
    expect(stars).toHaveLength(9);
    for (const star of stars) {
      expect(star.name).toBeTruthy();
      expect(star.headline).toBeTruthy();
      expect(star.ability).toBeTruthy();
      expect(star.abilityFlavor).toBeTruthy();
      expect(star.element).toBeTruthy();
      expect(star.role).toBeTruthy();
    }

    const mvp = stars[stars.length - 1]!;
    expect(mvp.round).toBe("mvp");
    expect(mvp.isTournamentMvp).toBe(true);
    expect(mvp.headline).toContain("Player of the Tournament");
  });

  it("computes stars for played games up to elimination", () => {
    const { draft, cup } = replay(ELIMINATED);
    const stars = getAllMatchStars(cup, draft);

    // Eliminated in QF: 3 group + R32 + R16 + QF = 6 played matches + 1 tournament MVP = 7 stars
    expect(stars).toHaveLength(7);
    const qfStar = stars.find((s) => s.round === "QF");
    expect(qfStar).toBeDefined();
    expect(qfStar?.roundShort).toBe("Quarter");
  });

  it("extracts Tournament MVP directly with getTournamentMvp", () => {
    const { draft, cup } = replay(FLAWLESS);
    const mvp = getTournamentMvp(cup, draft);

    expect(mvp.speciesId).toBe(cup.awards.playerOfTournament.species);
    expect(mvp.isTournamentMvp).toBe(true);
    expect(mvp.statSummary).toContain("Goals");
  });

  it("computes single match star with getMatchStar", () => {
    const { draft, cup } = replay(FLAWLESS);
    const playedMatch = cup.matches.find(
      (m): m is Extract<typeof m, { status: "played" }> => m.status === "played",
    )!;
    const star = getMatchStar(playedMatch, draft);
    expect(star.roundLabel).toBe("Group match 1");
    expect(star.roundShort).toBe("Game 1");
    expect(star.name).toBeTruthy();
  });

  it("prioritizes offensive kick or header moves over reflex moves like Detect or Protect for goal scorers", () => {
    const { draft, cup } = replay(FLAWLESS);
    const match = cup.matches.find(
      (m): m is Extract<typeof m, { status: "played" }> => m.status === "played",
    )!;
    // Pikachu (#25) has kickMoves: ["detect", "double-kick", "headbutt", "mega-kick", "protect", "skull-bash"]
    const pikachu = 25 as (typeof match.goals)[number]["scorer"] &
      (typeof draft.lineup.starters)[0];
    const star = getMatchStar(
      {
        ...match,
        outcome: "W",
        regulation: { user: 1, opp: 0 },
        goals: [{ side: "user", scorer: pikachu, assist: null, minute: 22, penalty: false }],
      },
      draft,
    );
    expect(star.kickMove).not.toBe("Detect");
    expect(["Double Kick", "Mega Kick", "Headbutt", "Skull Bash"]).toContain(star.kickMove);
  });
});
