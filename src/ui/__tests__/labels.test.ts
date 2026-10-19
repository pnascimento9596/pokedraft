import { describe, expect, it } from "vitest";
import { ROLES } from "@/scouting/types";
import { ROUND_SHORT, ROLE_PLURAL, SUITABILITY_LABEL, qualityScore, versusLabel } from "../labels";

describe("role plurals", () => {
  it("names every role the formations use, in the words the cards print", () => {
    expect(ROLE_PLURAL).toEqual({
      GK: "keepers",
      CB: "CBs",
      FB: "FBs",
      WB: "WBs",
      DM: "DMs",
      CM: "CMs",
      AM: "AMs",
      WM: "WMs",
      W: "wingers",
      ST: "strikers",
    });
    // A role added to the engine without a plural would print "vs other undefined".
    expect(Object.keys(ROLE_PLURAL).sort()).toEqual([...ROLES].sort());
  });

  it("builds the label that sits beside the number", () => {
    expect(versusLabel("CB")).toBe("vs other CBs");
    expect(versusLabel("GK")).toBe("vs other keepers");
    expect(versusLabel("W")).toBe("vs other wingers");
  });
});

describe("qualityScore", () => {
  it("rounds the engine's quality to the 0 to 100 number on the cards", () => {
    // The finish-2 team's keeper and right centre-back, as printed by play-seeded.mts.
    expect(qualityScore(0.40487804878048783)).toBe(40);
    expect(qualityScore(0.11560975609756098)).toBe(12);
    // The lowest and highest a mid-rank percentile over 1,025 species can be.
    expect(qualityScore(0.5 / 1025)).toBe(0);
    expect(qualityScore(1024.5 / 1025)).toBe(100);
  });

  it("refuses a value that is not a quality instead of printing NaN or a negative rating", () => {
    expect(() => qualityScore(Number.NaN)).toThrow(
      new RangeError("quality must be a number in 0..1, got NaN"),
    );
    expect(() => qualityScore(1.2)).toThrow(
      new RangeError("quality must be a number in 0..1, got 1.2"),
    );
    expect(() => qualityScore(-0.1)).toThrow(
      new RangeError("quality must be a number in 0..1, got -0.1"),
    );
  });
});

it("prints readable round names instead of internal round codes", () => {
  expect(ROUND_SHORT).toEqual({
    G1: "Game 1",
    G2: "Game 2",
    G3: "Game 3",
    R32: "Round 32",
    R16: "Round 16",
    QF: "Quarter",
    SF: "Semi",
    F: "Final",
  });
});

describe("fit labels (catches the star glyph or a trailing Fit inside the label text)", () => {
  it("names the three fits Best, OK and Poor, with no glyph", () => {
    expect(SUITABILITY_LABEL).toEqual({ recommended: "Best", ok: "OK", bad: "Poor" });
  });
});
