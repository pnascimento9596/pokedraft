import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lintColors, lintSource } from "./theme-color-lint.mjs";

describe("lintSource (catches a colour spelled outside the src/design tokens)", () => {
  it("flags hex, rgb and rgba literals with their lines", () => {
    expect(
      lintSource(
        "a.module.css",
        [
          ".a { color: #1E2419; }",
          ".b { border-top: 2px solid rgb(110, 231, 183); }",
          ".c { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5); }",
          ".d { color: var(--text); }",
        ].join("\n"),
      ),
    ).toEqual([
      "a.module.css:1: color belongs in src/design tokens",
      "a.module.css:2: color belongs in src/design tokens",
      "a.module.css:3: color belongs in src/design tokens",
    ]);
  });

  it("flags hsl and hsla literals, in CSS and in a TSX style (catches the forms the hex-only lint missed)", () => {
    expect(
      lintSource(
        "b.tsx",
        [
          'const a = { background: "hsl(210, 40%, 96%)" };',
          "const b = `color-mix(in srgb, ${c} 28%, HSLA(0, 0%, 0%, 0.75))`;",
          'export const C = () => <circle fill="rgb(15, 23, 42)" />;',
        ].join("\n"),
      ),
    ).toEqual([
      "b.tsx:1: color belongs in src/design tokens",
      "b.tsx:2: color belongs in src/design tokens",
      "b.tsx:3: color belongs in src/design tokens",
    ]);
  });

  it("ignores names that only contain rgb or hsl, and a fragment link", () => {
    expect(
      lintSource(
        "c.ts",
        ["const x = hexRgb(value);", "const y = toHsl(x);", 'const href = "#main";'].join("\n"),
      ),
    ).toEqual([]);
  });

  it("reports the reserved sand separately from a colour on the same line", () => {
    expect(lintSource("d.css", ".e { fill: var(--viz-8); stroke: rgb(0, 0, 0); }")).toEqual([
      "d.css:1: color belongs in src/design tokens",
      "d.css:1: sand is reserved for a contrast-checked heat fill",
    ]);
  });
});

describe("lintColors (catches a colour literal in a linted file)", () => {
  let root = "";
  const write = (rel: string, body: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  };
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "color-lint-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reports a component and a stylesheet, and skips tokens, tests, data and the engine", () => {
    write(
      "components/A.tsx",
      'export const A = () => <p style={{ color: "rgba(0,0,0,.5)" }} />;\n',
    );
    write("components/__tests__/A.test.tsx", 'expect(x).toBe("rgb(1, 2, 3)");\n');
    write("components/B.test.ts", 'const s = "#FFFFFF";\n');
    write("design/tokens.css", ":root { --x: rgba(0, 0, 0, 0.5); }\n");
    write("engine/x.ts", 'const s = "hsl(0, 0%, 0%)";\n');
    write("data/x.ts", 'const s = "#000";\n');
    write("scouting/x.ts", 'const s = "#000";\n');
    write("styles/a.css", "\n.a { color: hsla(0, 0%, 100%, 0.1); }\n");
    expect(lintColors(root)).toEqual([
      "components/A.tsx:1: color belongs in src/design tokens",
      "styles/a.css:2: color belongs in src/design tokens",
    ]);
  });

  it("finds no colour literal in the repository's src today", () => {
    expect(lintColors(path.resolve(import.meta.dirname, "../../src"))).toEqual([]);
  });
});
