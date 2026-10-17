import type { CupResult, Shirt, SlotId, SpeciesId, StarterIndex } from "@/engine";
import { describe, expect, it } from "vitest";
import { replayAnyVersion as replay } from "@/engine/versions";
import { getAllMatchStars, getMatchStar, getTournamentMvp } from "../starCalculation";

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

const ELIMINATED =
  "pd1.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJjLTQiLFtbInAiLDgyOSwiczAiXSxbInAiLDIxMCwiczEiXSxbInAiLDUyOCwiczIiXSxbInAiLDE2NywiczMiXSxbInAiLDI4NCwiczQiXSxbInAiLDE5NSwiczUiXSxbInAiLDEzMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDMxNywiczgiXSxbInAiLDI5NSwiczkiXSxbInAiLDEwMTYsInMxMCJdLFsicCIsNjMyLCJiMCJdLFsicCIsMzg2LCJiMSJdLFsicCIsNDc4LCJiMiJdLFsicCIsMjMwLCJiMyJdLFsicCIsMzcsImI0Il1dXQ";

describe("starCalculation", () => {
  it("does not label the 10-minute opener an equalizer when the opponent scores at 80", async () => {
    const { draft, cup } = await replay(FLAWLESS);
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
    expect(star.icon).toBe("⚽");
    expect(star.headline).toBe("Goal Scorer (10')");
    expect(star.speciesId).toBe(scorer);
    expect(star.statSummary).toBe("1 Goal");
    expect(star.matchScore).toBe("1-1");
  });

  it("computes match stars for all played matches in a flawless run", async () => {
    const { draft, cup } = await replay(FLAWLESS);
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

  it("computes stars for played games up to elimination", async () => {
    const { draft, cup } = await replay(ELIMINATED);
    const stars = getAllMatchStars(cup, draft);

    // Eliminated in QF: 3 group + R32 + R16 + QF = 6 played matches + 1 tournament MVP = 7 stars
    expect(stars).toHaveLength(7);
    const qfStar = stars.find((s) => s.round === "QF");
    expect(qfStar).toBeDefined();
    expect(qfStar?.roundShort).toBe("Quarter");
  });

  it("extracts Tournament MVP directly with getTournamentMvp", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    const mvp = getTournamentMvp(cup, draft);

    expect(mvp.speciesId).toBe(cup.awards.playerOfTournament.species);
    expect(mvp.isTournamentMvp).toBe(true);
    expect(mvp.statSummary).toContain("Goals");
  });

  it("computes single match star with getMatchStar", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    const playedMatch = cup.matches.find(
      (m): m is Extract<typeof m, { status: "played" }> => m.status === "played",
    )!;
    const star = getMatchStar(playedMatch, draft);
    expect(star.roundLabel).toBe("Group match 1");
    expect(star.roundShort).toBe("Game 1");
    expect(star.name).toBeTruthy();
  });

  it("prioritizes offensive kick or header moves over reflex moves like Detect or Protect for goal scorers", async () => {
    const { draft, cup } = await replay(FLAWLESS);
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

  type Played = Extract<CupResult["matches"][number], { status: "played" }>;

  async function scoreless(patch: Partial<Played>) {
    const { draft, cup } = await replay(FLAWLESS);
    const match = cup.matches.find((m): m is Played => m.status === "played")!;
    const base: Played = {
      ...match,
      outcome: "D",
      regulation: { user: 0, opp: 0 },
      extraTime: null,
      shootout: null,
      goals: [],
      absences: [],
      incidents: [],
    };
    return getMatchStar({ ...base, ...patch }, draft);
  }

  const KEEPER = 630 as SpeciesId;
  const LB = 893 as SpeciesId;
  const BENCH_0 = 200 as SpeciesId;
  const GK_SLOT = "4-3-3.GK" as SlotId;

  it("shows Arcanine as fire, not the dark of its first ability Intimidate", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    const match = cup.matches.find((m): m is Played => m.status === "played")!;
    const arcanine = 59 as SpeciesId;
    const star = getMatchStar(
      {
        ...match,
        outcome: "W",
        regulation: { user: 1, opp: 0 },
        goals: [{ side: "user", scorer: arcanine, assist: null, minute: 30, penalty: false }],
      },
      draft,
    );
    expect(star.speciesId).toBe(59);
    expect(star.element).toBe("fire");
    const mvp = getTournamentMvp(
      {
        ...cup,
        awards: {
          ...cup.awards,
          playerOfTournament: { ...cup.awards.playerOfTournament, species: arcanine },
        },
      },
      draft,
    );
    expect(mvp.element).toBe("fire");
  });

  it("gives a 0W-0D-3L tournament record the L tone, not the neutral D", async () => {
    const { draft, cup } = await replay(ELIMINATED);
    const mvp = getTournamentMvp({ ...cup, wins: 0, draws: 0, losses: 3, flawless: false }, draft);
    expect(mvp.matchScore).toBe("0-0-3");
    expect(mvp.outcome).toBe("L");
  });

  it("gives a level 1W-1D-1L group exit the D tone, not W", async () => {
    const { draft, cup } = await replay(ELIMINATED);
    const mvp = getTournamentMvp({ ...cup, wins: 1, draws: 1, losses: 1, flawless: false }, draft);
    expect(mvp.outcome).toBe("D");
  });

  it("keeps the starting keeper as Clean Sheet Hero when he played the whole 0-0", async () => {
    const star = await scoreless({});
    expect(star.speciesId).toBe(630);
    expect(star.headline).toContain("Clean Sheet Hero");
  });

  it("does not crown an absent keeper Clean Sheet Hero; the stand-in who kept goal gets it", async () => {
    const star = await scoreless({ absences: [{ slot: GK_SLOT, out: KEEPER, in: BENCH_0 }] });
    expect(star.speciesId).toBe(200);
    expect(star.headline).toContain("Clean Sheet Hero");
  });

  it("does not crown a keeper subbed off at 60' Clean Sheet Hero", async () => {
    const star = await scoreless({
      incidents: [
        {
          kind: "sub",
          side: "user",
          minute: 60,
          slot: 0 as StarterIndex,
          out: KEEPER,
          in: BENCH_0,
          reason: "fatigue",
          by: "auto",
        },
      ],
    });
    expect(star.speciesId).toBe(893);
    expect(star.headline).toContain("Clean Sheet Hero");
  });

  it("does not call a 0-0 lost on penalties a clean sheet", async () => {
    const star = await scoreless({
      outcome: "L",
      shootout: { user: 3, opp: 4, keeper: KEEPER, kicks: [], decider: "kicks", coinWinner: null },
    });
    expect(star.speciesId).toBe(630);
    expect(star.headline).toContain("Squad Anchor");
  });

  it("does not name an absent, unreplaced keeper Squad Anchor of a 0-2 loss", async () => {
    const star = await scoreless({
      outcome: "L",
      regulation: { user: 0, opp: 2 },
      absences: [{ slot: GK_SLOT, out: KEEPER, in: null }],
    });
    expect(star.speciesId).toBe(LB);
    expect(star.headline).toContain("Squad Anchor");
  });

  it("keeps emoji out of the headline text so screen readers do not read 'gloves Clean Sheet Hero'", async () => {
    const star = await scoreless({});
    expect(star.headline).toBe("Clean Sheet Hero");
  });
});
