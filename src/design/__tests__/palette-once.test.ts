import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { palette } from "../../../scripts/audit/theme-contrast.mjs";

const tokens = readFileSync("src/design/tokens.css", "utf8");
const stadium = readFileSync("src/design/stadium.css", "utf8");
const blocks = (css: string, selector: RegExp) => [...css.matchAll(selector)].length;
const ROOT = /(?:^|\n)\s*:root\s*\{/g;
const DARK = /(?:^|\n)\s*:root\[data-theme="dark"\]\s*\{/g;

describe("the dark palette is defined once (catches a dark token edited in one copy and not the other)", () => {
  it("tokens.css holds one :root block, one dark block and no prefers-color-scheme copy", () => {
    expect(blocks(tokens, ROOT)).toBe(1);
    expect(blocks(tokens, DARK)).toBe(1);
    expect(tokens).not.toContain("prefers-color-scheme");
    expect(tokens).not.toContain(':not([data-theme="light"])');
  });

  it("stadium.css holds no prefers-color-scheme copy either", () => {
    expect(stadium).not.toContain("prefers-color-scheme");
    expect(stadium).not.toContain(':not([data-theme="dark"])');
  });

  it("keeps the values the duplicated blocks resolved to", () => {
    const light = palette(tokens, "light");
    const dark = palette(tokens, "dark");
    expect(light["--canvas"]).toBe("#E7EAE2");
    expect(light["--border-control"]).toBe("#7C856F");
    expect(light["--pitch"]).toBe("#476147");
    expect(dark["--canvas"]).toBe("#0B1220");
    expect(dark["--pitch"]).toBe("#204630");
    expect(dark["--type-grass"]).toBe("#5BC354");
    expect(dark["--border-control"]).toBe("#5A7394");
  });
});

describe("stadium colours follow the theme where they paint page chrome (catches the night vignette and blue edge on the light page)", () => {
  it("the floodlight vignette is set only in the dark block", () => {
    const light = palette(stadium, "light");
    const dark = palette(stadium, "dark");
    expect(light["--stadium-shell"]).toBe("none");
    expect(dark["--stadium-shell"]).toBe(
      "radial-gradient(ellipse at 50% 15%, #111a2e 0%, #080d16 100%)",
    );
  });

  it("glass panels, their edge and the phone picker sheet take light values in light", () => {
    const light = palette(stadium, "light");
    const dark = palette(stadium, "dark");
    expect(light["--stadium-glass"]).toBe("var(--surface)");
    expect(light["--stadium-border"]).toBe("var(--border-emphasis)");
    expect(light["--sheet-fill"]).toBe("var(--surface)");
    expect(light["--sheet-ink"]).toBe("var(--text)");
    expect(light["--sheet-muted"]).toBe("var(--text-muted)");
    expect(dark["--stadium-glass"]).toBe("rgba(13, 22, 38, 0.85)");
    expect(dark["--stadium-border"]).toBe("rgba(37, 99, 235, 0.4)");
    expect(dark["--sheet-fill"]).toBe("var(--stadium-card)");
    expect(dark["--sheet-ink"]).toBe("var(--stadium-ink)");
    expect(dark["--sheet-muted"]).toBe("var(--stadium-muted)");
  });

  it("the night stadium (pitch, player cards, brand plate) keeps one value in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const values = palette(stadium, theme);
      expect(values["--stadium-card"]).toBe("#0f172a");
      expect(values["--stadium-ink"]).toBe("#f8fafc");
    }
  });
});
