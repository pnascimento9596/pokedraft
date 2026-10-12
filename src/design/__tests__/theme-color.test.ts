import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "../theme-color";

describe("theme-color tokens match tokens.css --canvas", () => {
  it("matches light and dark canvas colors in tokens.css", () => {
    const tokensPath = path.resolve(__dirname, "../tokens.css");
    const css = readFileSync(tokensPath, "utf-8");

    const lightCanvasMatch = css.match(/:root\s*\{[^}]*--canvas:\s*(#[0-9A-Fa-f]{6});/);
    const darkCanvasMatch = css.match(/:root\[data-theme="dark"\]\s*\{[^}]*--canvas:\s*(#[0-9A-Fa-f]{6});/);

    expect(lightCanvasMatch).not.toBeNull();
    expect(darkCanvasMatch).not.toBeNull();

    expect(THEME_COLOR_LIGHT).toBe(lightCanvasMatch![1]);
    expect(THEME_COLOR_DARK).toBe(darkCanvasMatch![1]);
  });
});
