import { describe, expect, it } from "vitest";
import type { Lineup, Seed } from "@/engine";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import { builderToken } from "@/ui/builder-token";
import type { RunRecord } from "@/ui/runs";
import {
  defaultChallenger,
  exhibitionHref,
  parseExhibitionQuery,
  squadFromToken,
} from "@/ui/exhibition-route";

const lineup: Lineup = {
  formation: "4-3-3",
  starters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as unknown as Lineup["starters"],
  bench: [12, 13, 14, 15, 16] as unknown as Lineup["bench"],
};
const settings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
} as const;
const BUILDER = builderToken(settings, lineup, "builder" as Seed);

// The golden engine-3 cup8 run's squad, in its 11 plus 5 slot order.
const GOLDEN_SQUAD = [
  849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
];

function run(token: string, at: string, squadSpeciesIds?: readonly number[]): RunRecord {
  return {
    token,
    ...(squadSpeciesIds ? { squadSpeciesIds } : {}),
    bucket: "cup8:open",
    friendly: false,
    formation: "4-2-3-1",
    score: 700,
    wins: 3,
    draws: 0,
    losses: 2,
    finish: "R16",
    flawless: false,
    at,
  };
}

describe("exhibition query", () => {
  it("reads home, away, the rematch counter, legs and the board name from named params (catches the ambiguous ?ex=a.b.n form)", () => {
    expect(
      parseExhibitionQuery(
        new URLSearchParams(`home=${BUILDER}&away=${GOLDEN_CUP8_V3}&n=3&legs=2&name=Misty`),
      ),
    ).toEqual({ home: BUILDER, away: GOLDEN_CUP8_V3, rematch: 3, legs: 2, name: "Misty" });
  });

  it("defaults to rematch 0, one leg and no name (catches a missing param reading as NaN or a second leg)", () => {
    expect(parseExhibitionQuery(new URLSearchParams(""))).toEqual({
      home: null,
      away: null,
      rematch: 0,
      legs: 1,
      name: null,
    });
  });

  it.each(["-1", "1.5", "abc", "", "99999999999999999999"])(
    "reads a bad rematch counter %j as 0 (catches a negative or fractional rematch scope)",
    (n) => {
      expect(parseExhibitionQuery(new URLSearchParams({ n })).rematch).toBe(0);
    },
  );

  it.each(["0", "3", "two", "1"])(
    "reads legs=%j as one leg (catches any value but 2 turning on the second leg)",
    (legs) => {
      expect(parseExhibitionQuery(new URLSearchParams({ legs })).legs).toBe(1);
    },
  );

  it("keeps the name as plain text, trimmed and cut to 20 characters (catches a long or padded name overflowing the label)", () => {
    expect(
      parseExhibitionQuery(new URLSearchParams({ name: "  <b>Misty</b> of Cerulean City  " })).name,
    ).toBe("<b>Misty</b> of Ceru");
    expect(parseExhibitionQuery(new URLSearchParams({ name: "   " })).name).toBeNull();
    expect(parseExhibitionQuery(new URLSearchParams({ name: "Mi\u0000s\u001fty" })).name).toBe(
      "Misty",
    );
  });

  it("builds the route with only the params that differ from their defaults (catches a link that pins home or the rematch)", () => {
    expect(exhibitionHref({ away: GOLDEN_CUP8_V3 })).toBe(`/exhibition?away=${GOLDEN_CUP8_V3}`);
    expect(exhibitionHref({ away: "pd6.a", name: "Ash & Misty" })).toBe(
      "/exhibition?away=pd6.a&name=Ash+%26+Misty",
    );
    expect(exhibitionHref({ home: "pd6.h", away: "pd6.a", rematch: 2, legs: 2 })).toBe(
      "/exhibition?home=pd6.h&away=pd6.a&n=2&legs=2",
    );
  });
});

describe("squad from a token", () => {
  it("decodes a retained engine-3 run token to its 4-2-3-1 squad without replaying the cup (catches pd3 links failing on the client)", () => {
    const squad = squadFromToken(GOLDEN_CUP8_V3)!;
    expect(squad.lineup).toEqual({
      formation: "4-2-3-1",
      starters: GOLDEN_SQUAD.slice(0, 11),
      bench: GOLDEN_SQUAD.slice(11),
    });
    expect(squad.seed).toBe("golden-cup8");
  });

  it("decodes a builder token to its lineup and seed", () => {
    expect(squadFromToken(BUILDER)).toEqual({ lineup, seed: "builder" });
  });

  it.each(["", "garbage", "pd6.garbage", "pd99.abc"])(
    "returns null for an undecodable token %j (catches a broken link reaching the engine)",
    (token) => {
      expect(squadFromToken(token)).toBeNull();
    },
  );

  it("returns null for a builder token with an empty bench (catches a half squad playing)", () => {
    const half = builderToken(
      settings,
      { ...lineup, bench: [null, null, null, null, null] as unknown as Lineup["bench"] },
      "builder" as Seed,
    );
    expect(squadFromToken(half)).toBeNull();
  });
});

describe("default challenger", () => {
  it("is the newest history record with 16 species and a formation (catches the Builder save winning over a played run)", () => {
    const history = [
      run("pd6.newest-without-a-squad", "2026-10-19T12:00:00.000Z"),
      run("pd6.newest-with-eleven", "2026-10-18T12:00:00.000Z", GOLDEN_SQUAD.slice(0, 11)),
      run(GOLDEN_CUP8_V3, "2026-10-17T12:00:00.000Z", GOLDEN_SQUAD),
      run(
        BUILDER,
        "2026-10-16T12:00:00.000Z",
        [...Array(16).keys()].map((i) => i + 1),
      ),
    ];
    expect(defaultChallenger(history, BUILDER)).toBe(GOLDEN_CUP8_V3);
  });

  it("falls back to the Builder save when no history record qualifies", () => {
    expect(defaultChallenger([run("pd6.old", "2026-10-19T12:00:00.000Z")], BUILDER)).toBe(BUILDER);
  });

  it.each([null, 42, "garbage"])(
    "is null with no qualifying history and no usable Builder save (%j), so the page shows the empty state",
    (save) => {
      expect(defaultChallenger([], save)).toBeNull();
    },
  );
});
