import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeToken, encodeToken } from "@/engine/token";
import {
  GOLDEN_CUP8_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V4,
  GOLDEN_CUP8_V5,
  GOLDEN_KANTO151_V1,
  GOLDEN_KANTO151_V2,
  GOLDEN_KANTO151_V4,
  GOLDEN_KANTO151_V5,
} from "@/engine/versions/__tests__/fixtures";
import type { LeaderboardRow } from "@/db/schema";
import { isCoached } from "@/ui/manager/coached";
import { toBoardEntry } from "../store";
import { GOLDEN_CUP8_V6, GOLDEN_CUP8_V7, scriptedToken } from "./fixtures";

const GOLDEN_SQUAD = [
  849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
];

const COACHED_V7 = encodeToken({
  ...decodeToken(GOLDEN_CUP8_V7),
  manager: [{ type: "tactic", match: 0, minute: 30, tactic: "attack" }],
});

function row(token: string, coached: boolean): LeaderboardRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    nickname: "Ash",
    mode: "cup8",
    variant: "classic3.squadFirst.g123456789",
    dailyDate: null,
    seed: "golden-cup8",
    token,
    teamScore: 593,
    wins: 5,
    draws: 0,
    losses: 1,
    engineVersion: "pokedraft-engine-7",
    coached,
    runFingerprint: "fp",
    ipHash: "h",
    createdAt: new Date("2026-10-19T12:00:00Z"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toBoardEntry (catches every board row decoding its token twice)", () => {
  it.each([
    ["the golden pd7 run", GOLDEN_CUP8_V7, GOLDEN_SQUAD, false],
    ["the golden pd7 run with a manager decision", COACHED_V7, GOLDEN_SQUAD, true],
    ["the golden pd6 run", GOLDEN_CUP8_V6, GOLDEN_SQUAD, false],
    ["the golden pd3 run", GOLDEN_CUP8_V3, GOLDEN_SQUAD, false],
  ] as const)(
    "parses the payload of %s once for its squad and Coached chip",
    (_, token, squad, coached) => {
      const parse = vi.spyOn(JSON, "parse");
      const entry = toBoardEntry(row(token, coached), 1);
      expect([parse.mock.calls.length, entry.squadSpeciesIds, entry.coached]).toEqual([
        1,
        squad,
        coached,
      ]);
    },
  );

  it("shows the Coached chip from the stored column for an empty manager list the live decoder drops (catches the chip and the coach filter disagreeing on a row)", () => {
    const payload = JSON.parse(
      Buffer.from(GOLDEN_CUP8_V6.slice("pd6.".length), "base64url").toString("utf8"),
    ) as unknown[];
    const token = `pd6.${Buffer.from(JSON.stringify([...payload, []])).toString("base64url")}`;
    expect([isCoached(token), toBoardEntry(row(token, isCoached(token)), 1).coached]).toEqual([
      true,
      true,
    ]);
  });
});

describe("toBoardEntry engine, seed and formation (catches a board row that cannot say which engine, seed or shape it was)", () => {
  it.each([
    ["pd1", GOLDEN_CUP8_V1, "4-2-3-1"],
    ["pd2", GOLDEN_CUP8_V2, "4-2-3-1"],
    ["pd3", GOLDEN_CUP8_V3, "4-2-3-1"],
    ["pd4", GOLDEN_CUP8_V4, "4-2-3-1"],
    ["pd5", GOLDEN_CUP8_V5, "4-2-3-1"],
    ["pd6", GOLDEN_CUP8_V6, "4-2-3-1"],
    ["pd1 151", GOLDEN_KANTO151_V1, "3-5-2"],
    ["pd2 151", GOLDEN_KANTO151_V2, "3-5-2"],
    ["pd4 151", GOLDEN_KANTO151_V4, "3-5-2"],
    ["pd5 151", GOLDEN_KANTO151_V5, "3-5-2"],
  ] as const)(
    "decodes the %s golden's formation in the same single parse",
    (_, token, formation) => {
      const parse = vi.spyOn(JSON, "parse");
      const entry = toBoardEntry(row(token, false), 1);
      expect([parse.mock.calls.length, entry.formation]).toEqual([1, formation]);
    },
  );

  it("returns formation 4-3-3 for a 4-3-3 run", () => {
    const token = scriptedToken(
      {
        mode: "cup8",
        formation: "4-3-3",
        gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        style: "classic3",
        order: "squadFirst",
      },
      "board-entry-433",
    );
    expect(toBoardEntry(row(token, false), 1).formation).toBe("4-3-3");
  });

  it("returns a null formation, never a guess, for a token that does not decode", () => {
    expect(toBoardEntry(row("pd3.e30", false), 1).formation).toBeNull();
  });

  it("passes the stored engine version and seed through", () => {
    const entry = toBoardEntry(
      { ...row(GOLDEN_CUP8_V3, false), engineVersion: "pokedraft-engine-3" },
      1,
    );
    expect([entry.engineVersion, entry.seed]).toEqual(["pokedraft-engine-3", "golden-cup8"]);
  });
});
