import { describe, expect, it } from "vitest";
import type { CupResult } from "@/engine/types";
import { broadcastTable } from "../broadcast-table";

const group = ["user", "a", "b", "c"].map((team) => ({
  team, name: team, played: 3, won: 0, drawn: 3, lost: 0,
  goalsFor: 0, goalsAgainst: 0, points: 3,
}));
const cup = {
  group,
  groupFixtures: [
    { round: "G1", a: "user", b: "a", aGoals: 2, bGoals: 0 },
    { round: "G1", a: "b", b: "c", aGoals: 1, bGoals: 0 },
    { round: "G2", a: "user", b: "b", aGoals: 0, bGoals: 1 },
    { round: "G2", a: "a", b: "c", aGoals: 0, bGoals: 0 },
    { round: "G3", a: "user", b: "c", aGoals: 0, bGoals: 0 },
    { round: "G3", a: "a", b: "b", aGoals: 0, bGoals: 0 },
  ],
} as CupResult;

describe("broadcast standings", () => {
  it("uses recorded fixtures without revealing other scores before the selected round ends", () => {
    expect(broadcastTable(cup, "G1", 0, { user: 0, opp: 0 })!.map((r) => r.played)).toEqual([0, 0, 0, 0]);
    const live = broadcastTable(cup, "G1", 3, { user: 1, opp: 0 })!;
    expect(live.find((r) => r.team === "user")).toMatchObject({ played: 1, points: 3, goalsFor: 1 });
    expect(live.find((r) => r.team === "b")).toMatchObject({ played: 0, points: 0 });
    const end = broadcastTable(cup, "G1", 90, { user: 2, opp: 0 })!;
    expect(end.find((r) => r.team === "b")).toMatchObject({ played: 1, points: 3, goalsFor: 1 });
    expect(broadcastTable(cup, "G2", 0, { user: 0, opp: 0 })!.find((r) => r.team === "user")).toMatchObject({ played: 1, points: 3, goalsFor: 2 });
    expect(broadcastTable(cup, "G3", 90, { user: 0, opp: 0 })).toEqual(group);
    expect(broadcastTable({ ...cup, groupFixtures: undefined }, "G1", 90, { user: 2, opp: 0 })).toBeNull();
  });
});
