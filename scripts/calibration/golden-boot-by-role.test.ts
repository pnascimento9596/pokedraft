import { describe, expect, it } from "vitest";
import { asSpeciesId } from "@/engine/species";
import type { Role } from "@/engine/types";
import { ROLES } from "@/scouting/types";
import { GROUPS, exceedsLimit, winnerBucket } from "./golden-boot-by-role.mjs";

// The 4-3-3 starters in slot order, species ids 1 to 11.
const ROLES_433: readonly Role[] = ["GK", "FB", "CB", "CB", "FB", "DM", "CM", "CM", "W", "ST", "W"];
const SLOTS = ROLES_433.map((role, i) => ({ species: asSpeciesId(i + 1), role }));

describe("winnerBucket", () => {
  it("reads the role of the slot the winner holds", () => {
    expect(winnerBucket(SLOTS, { species: asSpeciesId(6) })).toBe("DM");
    expect(winnerBucket(SLOTS, { species: asSpeciesId(10) })).toBe("ST");
    expect(winnerBucket(SLOTS, { species: asSpeciesId(1) })).toBe("GK");
  });

  it("counts a winner outside the eleven starters as bench, not as a starter's role", () => {
    expect(winnerBucket(SLOTS, { species: asSpeciesId(150) })).toBe("bench");
  });

  it("counts a cup with no goals as none, not as a role", () => {
    expect(winnerBucket(SLOTS, null)).toBe("none");
  });
});

describe("exceedsLimit", () => {
  it("is strictly more than 10 percent, so exactly 10 percent does not fire", () => {
    expect(exceedsLimit(500, 5000)).toBe(false);
    expect(exceedsLimit(501, 5000)).toBe(true);
    expect(exceedsLimit(10, 100)).toBe(false);
    expect(exceedsLimit(11, 100)).toBe(true);
    expect(exceedsLimit(0, 5000)).toBe(false);
  });
});

describe("GROUPS", () => {
  it("places every Role in exactly one group, so the grouped table drops no role", () => {
    const grouped = GROUPS.flatMap((g) => [...g.roles]).sort();
    expect(grouped).toEqual([...ROLES].sort());
  });
});
