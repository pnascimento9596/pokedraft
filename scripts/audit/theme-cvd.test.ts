import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distance, simulate, typeSeparation } from "./theme-cvd.mjs";

describe("type palette vision checks", () => {
  it("applies the published severity-one red simulation in linear sRGB", () => {
    expect(simulate([255, 0, 0], "protanopia").map(Math.round)).toEqual([109, 95, 0]);
    expect(simulate([255, 0, 0], "deuteranopia").map(Math.round)).toEqual([163, 144, 0]);
    expect(simulate([0, 0, 0], "protanopia")).toEqual([0, 0, 0]);
  });

  it("keeps normal vision unchanged and detects identical colors", () => {
    expect(simulate([30, 36, 25], "normal")).toEqual([30, 36, 25]);
    expect(distance([30, 36, 25], [30, 36, 25])).toBe(0);
  });

  it("checks all eighteen types in both themes and both red-green deficiency simulations", () => {
    const report = typeSeparation(
      readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8"),
    );
    expect(report).toHaveLength(6);
    expect(report.every((row) => row.minimum >= 4)).toBe(true);
  });
});
