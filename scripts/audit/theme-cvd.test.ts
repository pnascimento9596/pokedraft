import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { distance, paletteSeparation, simulate, typeSeparation } from "./theme-cvd.mjs";

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

  it("checks all eighteen chip tokens in both themes and both red-green deficiency simulations, each pair at least 4.01 apart (catches dark ground against grass at 4.0005 for protanopia)", () => {
    const report = typeSeparation(
      readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8"),
    );
    expect(report).toHaveLength(6);
    expect(
      report.flatMap((row) => row.under.map((p) => `${row.theme} ${row.vision} ${p.a} ${p.b}`)),
    ).toEqual([]);
  });

  it("checks TYPE_PALETTE, the pitch, icon and kit colours, each pair at least 4.01 apart in every vision (catches fire against rock at 1.54 for deuteranopia)", () => {
    const report = paletteSeparation();
    expect(report.map((row) => row.vision)).toEqual(["normal", "protanopia", "deuteranopia"]);
    expect(report.flatMap((row) => row.under.map((p) => `${row.vision} ${p.a} ${p.b}`))).toEqual(
      [],
    );
  });

  it("lists a pair under 4.01 with its vision", () => {
    const report = paletteSeparation({ fire: "#EE8130", rock: "#B6A136", water: "#6390F0" });
    expect(report.flatMap((row) => row.under.map((p) => `${row.vision} ${p.a} ${p.b}`))).toEqual([
      "deuteranopia fire rock",
    ]);
  });
});
