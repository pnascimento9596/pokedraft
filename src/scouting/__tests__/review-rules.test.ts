import { describe, expect, it } from "vitest";
import { SCOUTING } from "../scouting-data";

describe("Layer 2 review rules", () => {
  it("never lists W or WB as a best role for a species tagged weak on pace", () => {
    const bad = SCOUTING.filter(
      (s) =>
        s.weaknesses.includes("pace") && (s.bestRoles.includes("W") || s.bestRoles.includes("WB")),
    ).map((s) => s.name);
    expect(bad).toEqual([]);
  });

  it("raises KIC only for keepers, because KIC is goalkeeper kicking, not outfield shooting", () => {
    const bad = SCOUTING.filter(
      (s) => (s.adjustments.KIC ?? 0) > 0 && !s.bestRoles.includes("GK"),
    ).map((s) => s.name);
    expect(bad).toEqual([]);
  });
});
