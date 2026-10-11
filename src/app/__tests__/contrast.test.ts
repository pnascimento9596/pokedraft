import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkContrast,
  contrastRatio,
  hexRgb,
  palette,
} from "../../../scripts/audit/theme-contrast.mjs";
const css = readFileSync("src/design/tokens.css", "utf8");
const surfaces = ["--canvas", "--surface", "--surface-emphasis", "--surface-sunken"];
const text = ["--text", "--text-soft", "--text-muted", "--text-faint", "--link"];
function value(tokens: Record<string, string>, role: string): readonly [number, number, number] {
  const raw = tokens[role]!;
  const ref = /^var\((--[\w-]+)\)$/.exec(raw);
  return ref ? value(tokens, ref[1]!) : hexRgb(raw);
}
describe("warm colour token contrast", () => {
  it("mirrors every explicit dark token under the system dark scheme", () => {
    const explicit = [...css.matchAll(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/g)].map((m) =>
      m[1]!.trim(),
    );
    const system = [...css.matchAll(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]+)\}/g)].map(
      (m) => m[1]!.trim(),
    );
    expect(system).toEqual(explicit);
  });
  for (const name of ["light", "dark"] as const) {
    const tokens = palette(css, name);
    describe(name, () => {
      for (const role of text)
        for (const surface of surfaces)
          it(`${role} reaches AA on ${surface}`, () => {
            expect(
              contrastRatio(value(tokens, role), value(tokens, surface)),
            ).toBeGreaterThanOrEqual(4.5);
          });
      it("passes status text, action text, controls, pitch lines, data marks and all 18 tinted type pills", () => {
        const report = checkContrast(css);
        expect(report.failures.filter((row) => row.theme === name)).toEqual([]);
        expect(
          report.rows.filter((row) => row.theme === name && row.surface === "tinted type pill"),
        ).toHaveLength(18);
      });
    });
  }
  it("rejects the source light control edge before its permitted AA correction", () => {
    expect(contrastRatio([142, 150, 132], [248, 244, 235])).toBeCloseTo(2.7946, 4);
    expect(
      checkContrast(
        css.replace("--border-control: #7C856F", "--border-control: #8E9684"),
      ).failures.some((row) => row.role === "--border-control"),
    ).toBe(true);
  });
  it("reserves the sand palette entry for heat fill and measures the numbers at both permitted ceilings", () => {
    expect(palette(css, "light")["--viz-8"]).toBe("#C8C19E");
    const rows = checkContrast(css).rows.filter((row) => row.surface.startsWith("viz-8 heat"));
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.ratio >= 4.5)).toBe(true);
  });
});
