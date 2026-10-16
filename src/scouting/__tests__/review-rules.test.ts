import { describe, expect, it } from "vitest";
import { POKEDEX } from "@/data/pokedex";
import { roleBlend } from "../fit";
import { SCOUTING } from "../scouting-data";
import { ROLES, type Role } from "../types";

describe("Layer 2 review rules", () => {
  it("never lists W or WB as a best role for a species tagged weak on pace", () => {
    const bad = SCOUTING.filter(
      (s) =>
        s.weaknesses.includes("pace") && (s.bestRoles.includes("W") || s.bestRoles.includes("WB")),
    ).map((s) => s.name);
    expect(bad).toEqual([]);
  });

  it("never lists W or WB as a best role for a species with spe 30 or less, tagged or not (Azurill, Kricketot)", () => {
    const bad = SCOUTING.filter(
      (s) =>
        POKEDEX[s.id - 1]!.spe <= 30 && (s.bestRoles.includes("W") || s.bestRoles.includes("WB")),
    ).map((s) => s.name);
    expect(bad).toEqual([]);
  });

  it("raises KIC only for keepers, because KIC is goalkeeper kicking, not outfield shooting", () => {
    expect(SCOUTING.filter(raisesKicOffGoal).map((s) => s.name)).toEqual([]);
  });

  it("flags a synthetic outfield KIC raise, so the KIC rule can fail (no shipped species has one)", () => {
    expect(raisesKicOffGoal({ adjustments: { KIC: 3 }, bestRoles: ["ST"] })).toBe(true);
    expect(raisesKicOffGoal({ adjustments: { KIC: 3 }, bestRoles: ["GK"] })).toBe(false);
    expect(raisesKicOffGoal({ adjustments: { KIC: -4 }, bestRoles: ["ST"] })).toBe(false);
  });

  it("never lists GK as a best role when GK is the species' lowest role blend (Jigglypuff)", () => {
    const bad = SCOUTING.filter((s) => keeperIsLowestBest(blendsOf(s), s.bestRoles));
    expect(bad.map((s) => s.name)).toEqual([]);
  });

  it("flags a synthetic keeper listed best at its lowest fit, so the GK rule can fail", () => {
    const blends = {
      GK: 30,
      CB: 40,
      FB: 40,
      WB: 40,
      DM: 50,
      CM: 55,
      AM: 40,
      WM: 45,
      W: 35,
      ST: 31,
    };
    expect(keeperIsLowestBest(blends, ["CM", "GK"])).toBe(true);
    expect(keeperIsLowestBest({ ...blends, GK: 32 }, ["CM", "GK"])).toBe(false);
    expect(keeperIsLowestBest(blends, ["CM", "DM"])).toBe(false);
  });
});

type Entry = (typeof SCOUTING)[number];

function raisesKicOffGoal(s: Pick<Entry, "adjustments" | "bestRoles">): boolean {
  return (s.adjustments.KIC ?? 0) > 0 && !s.bestRoles.includes("GK");
}

// The raw role blend, before familiarity: fits already carry the bestRoles boost, so testing them
// would let the best-role listing vouch for itself.
function blendsOf(s: Entry): Record<Role, number> {
  return Object.fromEntries(ROLES.map((r) => [r, roleBlend(s.attrs, r)])) as Record<Role, number>;
}

function keeperIsLowestBest(blends: Record<Role, number>, bestRoles: readonly Role[]): boolean {
  const outfield = ROLES.filter((r) => r !== "GK").map((r) => blends[r]);
  return bestRoles.includes("GK") && blends.GK <= Math.min(...outfield);
}
