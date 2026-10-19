import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeToken, encodeToken } from "@/engine/token";
import { GOLDEN_CUP8_V3 } from "@/engine/versions/__tests__/fixtures";
import type { LeaderboardRow } from "@/db/schema";
import { toBoardEntry } from "../store";
import { GOLDEN_CUP8_V6 } from "./fixtures";

const GOLDEN_SQUAD = [
  849, 315, 272, 691, 453, 754, 785, 175, 663, 188, 807, 784, 703, 942, 145, 884,
];

const COACHED_V6 = encodeToken({
  ...decodeToken(GOLDEN_CUP8_V6),
  manager: [{ type: "tactic", match: 0, minute: 30, tactic: "attack" }],
});

function row(token: string): LeaderboardRow {
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
    engineVersion: "pokedraft-engine-6",
    coached: null,
    runFingerprint: null,
    ipHash: "h",
    createdAt: new Date("2026-10-19T12:00:00Z"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toBoardEntry (catches every board row decoding its token twice)", () => {
  it.each([
    ["the golden pd6 run", GOLDEN_CUP8_V6, GOLDEN_SQUAD, false],
    ["the golden pd6 run with a manager decision", COACHED_V6, GOLDEN_SQUAD, true],
    ["the golden pd3 run", GOLDEN_CUP8_V3, GOLDEN_SQUAD, false],
  ] as const)(
    "parses the payload of %s once for its squad and Coached chip",
    (_, token, squad, coached) => {
      const parse = vi.spyOn(JSON, "parse");
      const entry = toBoardEntry(row(token), 1);
      expect([parse.mock.calls.length, entry.squadSpeciesIds, entry.coached]).toEqual([
        1,
        squad,
        coached,
      ]);
    },
  );
});
