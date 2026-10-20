import { describe, expect, it } from "vitest";
import { runCup, type Incident, type MatchResult, type Seed, type SpeciesId } from "@/engine";
import { ENGINE_COEFFICIENTS_V7 } from "@/engine/coefficients-v7";
import { CUP8, draftLineup } from "@/engine/__tests__/story-panel";
import { replayAnyVersion as replay } from "@/engine/versions";
import { incidentLine, listedIncidents } from "../format";
import { getMatchStar } from "../starCalculation";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// Golden panel run 10, match 0 under engine 7, against Hau'oli City.
const SEED = "panel-10" as Seed;
const MATCH = runCup(draftLineup(CUP8, SEED), SEED, "cup8", ENGINE_COEFFICIENTS_V7)
  .matches[0] as PlayedMatch;

describe("an opponent's injury and rotations in the results list (catches a reserve read as the user's assistant sub)", () => {
  it("panel-10 match 0 lists the injury once, naming Monferno, and both rotations", () => {
    const all = MATCH.incidents!;
    const lines = listedIncidents(all).map((i) =>
      incidentLine(i, MATCH.opponent.name, "live", all),
    );
    expect(lines).toEqual([
      "10' Yellow card for Timburr (Hau'oli City)",
      "13' Tyrogue is injured. Monferno comes on.",
      "27' Yellow card for Venomoth",
      "30' Yellow card for Emolga",
      "36' Yellow card for Crabrawler (Hau'oli City)",
      "55' Hau'oli City switch to Attack",
      "60' Bergmite on for Mime Jr. (fresh legs, assistant)",
      "60' Hau'oli City rotate: Riolu rested.",
      "61' Yellow card for Archeops",
      "75' Your assistant switches to Defend",
      "75' Blacephalon on for Inkay (fresh legs, assistant)",
      "75' Hau'oli City rotate: Mankey rested.",
      "76' Yellow card for Riolu (Hau'oli City)",
      "90' Second yellow, red card for Riolu (Hau'oli City)",
    ]);
  });
});

const FLAWLESS =
  "pd1.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwibyIsInMiXSwic2VlZC05IixbWyJwIiw2MzAsInMwIl0sWyJwIiw4OTMsInMxIl0sWyJwIiw1NTgsInMyIl0sWyJwIiw2ODEsInMzIl0sWyJwIiw2NTIsInM0Il0sWyJwIiw0NjgsInM1Il0sWyJwIiwyMzMsInM2Il0sWyJwIiw3MTcsInM3Il0sWyJwIiw1NzMsInM4Il0sWyJwIiw2NjMsInM5Il0sWyJwIiw2OTcsInMxMCJdLFsicCIsMjAwLCJiMCJdLFsicCIsNDQ1LCJiMSJdLFsicCIsMjU3LCJiMiJdLFsicCIsNzI0LCJiMyJdLFsicCIsODY2LCJiNCJdXV0";

describe("the match star ignores the opponent's substitutions (catches a reserve swap marking the user's keeper as subbed)", () => {
  it("a 0-0 with the opponent taking off its own 630 still names the user's keeper 630", async () => {
    const { draft, cup } = await replay(FLAWLESS);
    const match = cup.matches.find((m) => m.status === "played")!;
    const keeper = draft.lineup.starters[0]!;
    expect(keeper).toBe(630);
    const reserve: Incident = {
      kind: "sub",
      side: "opp",
      minute: 30,
      slot: 4,
      out: keeper,
      in: 893 as SpeciesId,
      reason: "injury",
      by: "auto",
    };
    const star = getMatchStar(
      {
        ...match,
        outcome: "D",
        regulation: { user: 0, opp: 0 },
        extraTime: null,
        shootout: null,
        goals: [],
        incidents: [reserve],
      },
      draft,
    );
    expect(star.headline).toBe("Clean Sheet Hero");
    expect(star.speciesId).toBe(630);
  });
});
