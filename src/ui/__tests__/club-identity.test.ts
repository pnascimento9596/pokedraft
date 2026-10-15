import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clubRegion } from "../club-identity";

describe("clubRegion", () => {
  it("covers every scheduled city club without importing engine data into presentation metadata", () => {
    const schedule = readFileSync("src/engine/opponent-schedule.ts", "utf8");
    const pools = schedule.slice(
      schedule.indexOf("const OPEN_CLUBS"),
      schedule.indexOf("const CLUBS:"),
    );
    const names = [...pools.matchAll(/"([^"\n]+)"/g)].map((match) => match[1]!);
    const ids = new Set(
      names.map((name) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      ),
    );
    expect(ids.size).toBe(39);
    expect([...ids].filter((id) => clubRegion(id) === undefined)).toEqual([]);
    const registry = readFileSync("src/ui/club-identity.ts", "utf8");
    expect(registry).not.toMatch(/\bimport\b/);
  });

  it("returns verified identity for the stable slug and leaves unknown IDs unmapped", () => {
    expect(clubRegion("hau-oli-city")).toBe("Alola");
    expect(clubRegion("vermilion-athletic")).toBe("Kanto");
    expect(clubRegion("vermilion-fc")).toBe("Kanto");
    expect(clubRegion("Wyndon FC")).toBeUndefined();
    expect(clubRegion("toString")).toBeUndefined();
    expect(clubRegion("unknown-fc")).toBeUndefined();
  });
});
