import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkContrast, contrastRatio, hexRgb, palette } from "./theme-contrast.mjs";

describe("warm palette contrast gate", () => {
  it("computes the WCAG extremes without rounding away a failure", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBe(1);
    expect(contrastRatio([142, 150, 132], [248, 244, 235])).toBeLessThan(3);
  });

  it("rejects missing and malformed color values", () => {
    expect(hexRgb("#1E2419")).toEqual([30, 36, 25]);
    expect(() => hexRgb("#fff")).toThrow("six-digit");
    expect(() => hexRgb("red")).toThrow("six-digit");
    expect(() => checkContrast(":root { --text: #1E2419; }")).toThrow("Missing palette");
  });

  it("preserves source AA corrections and separates explicit dark overrides", () => {
    const css = readFileSync(new URL("../../src/design/tokens.css", import.meta.url), "utf8");
    expect(palette(css, "light")["--viz-2"]).toBe("#CD7928");
    expect(palette(css, "dark")["--accent-hover"]).toBe("#E5BE3E");
    expect(palette(css, "light")["--canvas"]).toBe("#E7EAE2");
    expect(palette(css, "dark")["--canvas"]).toBe("#0B1220");
    expect(checkContrast(css).failures).toEqual([]);
  });

  it("fails when faint dark text falls below AA on a sunken surface", () => {
    const css = readFileSync(
      new URL("../../src/design/tokens.css", import.meta.url),
      "utf8",
    ).replace("--text-faint: #8E9EAF", "--text-faint: #6A735F");
    const failures = checkContrast(css).failures;
    expect(
      failures.some(
        (row) =>
          row.theme === "dark" && row.role === "--text-faint" && row.surface === "--surface-sunken",
      ),
    ).toBe(true);
  });
});
