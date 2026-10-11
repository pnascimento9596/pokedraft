import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Dispatch 7 theme 7E (SA-26 to SA-31, SC-04 to SC-09, SC-36). WCAG 2.1 contrast of the colour
// tokens in globals.css: 4.5:1 for text, 3:1 for UI boundaries, state rings and focus rings.

const css = readFileSync("src/app/globals.css", "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

function tokens(body: string): Record<string, string> {
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  );
}

const dark = tokens(block(":root"));
const lightOverrides = tokens(block(':root[data-theme="light"]'));
const lightSystem = tokens(block(':root:not([data-theme="dark"])'));
const light = { ...dark, ...lightOverrides };
const themes = { dark, light } as const;

type Rgba = readonly [number, number, number, number];

function parse(value: string, theme: Record<string, string>): Rgba {
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (ref) return parse(theme[ref[1]!] ?? "", theme);
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as unknown as Rgba;
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4] ?? 1)];
  throw new Error(`cannot parse colour "${value}"`);
}

function over([r, g, b, a]: Rgba, [br, bg, bb]: Rgba): Rgba {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];
}

function luminance([r, g, b]: Rgba): number {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

// Foreground composited over the surface, the surface itself composited over --bg.
function contrast(theme: Record<string, string>, fg: string, surface: string): number {
  const page = parse(theme["--bg"]!, theme);
  const back = over(parse(surface, theme), page);
  const front = over(parse(fg, theme), back);
  const [hi, lo] = [luminance(front), luminance(back)].sort((x, y) => y - x);
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
}

const SURFACES = ["var(--bg)", "var(--bg-raised)", "var(--panel)", "var(--bg-sunk)"];

const TEXT: { fg: string; on: string[] }[] = [
  { fg: "var(--ink-faint)", on: SURFACES },
  { fg: "var(--flood-text)", on: SURFACES },
  { fg: "var(--win)", on: ["var(--bg)", "var(--panel)"] },
  { fg: "var(--token-weak)", on: ["var(--bg)", "var(--panel)"] },
  { fg: "#ffffff", on: ["var(--grass-1)", "var(--grass-2)"] },
  { fg: "#ffffff", on: ["var(--hero-1)", "var(--hero-2)", "var(--hero-3)"] },
  { fg: "rgba(255, 255, 255, 0.7)", on: ["var(--hero-1)", "var(--hero-2)", "var(--hero-3)"] },
  { fg: "var(--pitch-flood)", on: ["var(--hero-1)", "var(--hero-2)", "var(--hero-3)"] },
];

const UI: { fg: string; on: string[] }[] = [
  { fg: "var(--flood-line)", on: SURFACES },
  { fg: "var(--focus)", on: SURFACES },
  { fg: "var(--line-field)", on: ["var(--bg)", "var(--bg-raised)", "var(--panel)"] },
  { fg: "var(--pitch-flood)", on: ["var(--grass-1)", "var(--grass-2)"] },
  { fg: "var(--pitch-focus)", on: ["var(--grass-1)", "var(--grass-2)"] },
  { fg: "var(--pitch-halo)", on: ["var(--grass-1)", "var(--grass-2)"] },
];

const TYPES = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
];

describe("colour token contrast", () => {
  it("declares the same light tokens for the toggle and for the system light scheme", () => {
    expect(lightSystem).toEqual(lightOverrides);
  });

  for (const [name, theme] of Object.entries(themes)) {
    describe(`${name} theme`, () => {
      for (const { fg, on } of TEXT) {
        it(`text ${fg} reaches 4.5:1 on ${on.join(", ")}`, () => {
          for (const surface of on) {
            expect({ surface, ok: contrast(theme, fg, surface) >= 4.5 }).toEqual({
              surface,
              ok: true,
            });
          }
        });
      }

      for (const { fg, on } of UI) {
        it(`UI colour ${fg} reaches 3:1 on ${on.join(", ")}`, () => {
          for (const surface of on) {
            expect({ surface, ok: contrast(theme, fg, surface) >= 3 }).toEqual({
              surface,
              ok: true,
            });
          }
        });
      }

      it("every type chip label reaches 4.5:1 on its chip", () => {
        const failing = TYPES.filter(
          (t) => contrast(theme, `var(--type-${t}-ink)`, `var(--type-${t})`) < 4.5,
        );
        expect(failing).toEqual([]);
      });
    });
  }

  it("keeps the type chip colours and gives the five dark chips white labels", () => {
    expect(TYPES.filter((t) => dark[`--type-${t}-ink`] === "#ffffff")).toEqual([
      "fighting",
      "poison",
      "ghost",
      "dragon",
      "dark",
    ]);
    expect(dark["--type-water"]).toBe("#6390f0");
    expect(dark["--type-electric"]).toBe("#f7d02c");
  });

  it("measures the old light amber and the old ink-faint as failing, so the checker is not blind", () => {
    const before = { ...light, "--flood-text": "#f2b600", "--ink-faint": "#6b8072" };
    expect(contrast(before, "var(--flood-text)", "var(--bg)")).toBe(1.64);
    expect(contrast(before, "var(--ink-faint)", "var(--bg)")).toBe(3.8);
  });
});
