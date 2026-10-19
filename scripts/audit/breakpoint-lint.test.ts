import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lintBreakpoints, lintSource } from "./breakpoint-lint.mjs";

describe("lintSource (catches a media query width off the 480, 720, 960, 1200 scale)", () => {
  it("passes the scale written as min-width N and max-width N - 0.02", () => {
    expect(
      lintSource(
        "a.css",
        [
          "@media (min-width: 480px) { a { b: c } }",
          "@media (max-width: 719.98px) { a { b: c } }",
          "@media (min-width: 960px) and (max-width: 1199.98px) { a { b: c } }",
          "@media (max-height: 500px) and (max-width: 959.98px) { a { b: c } }",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("flags an ad-hoc width, a whole-pixel max and each off-scale side of a list, with its line", () => {
    expect(
      lintSource(
        "b.css",
        [
          ".x { color: red }",
          "@media (min-width: 1024px) {",
          "  .x { color: blue }",
          "}",
          "@media (max-width: 480px), (max-height: 500px) and (max-width: 959px) {",
          "  .x { color: blue }",
          "}",
        ].join("\n"),
      ),
    ).toEqual([
      "b.css:2: min-width 1024px is off the scale",
      "b.css:5: max-width 480px is off the scale",
      "b.css:5: max-width 959px is off the scale",
    ]);
  });

  it("flags range syntax and em units, and ignores commented-out queries", () => {
    expect(
      lintSource(
        "c.css",
        "/* @media (min-width: 1px) {} */\n@media (width >= 960px) {}\n@media (min-width: 60em) {}\n",
      ),
    ).toEqual([
      "c.css:2: width range syntax is off the scale",
      "c.css:3: min-width 60em is off the scale",
    ]);
  });

  it("exempts @container queries, which follow a component's width", () => {
    expect(lintSource("d.css", "@container (min-width: 820px) { a { b: c } }\n")).toEqual([]);
  });

  it("checks quoted media queries in TS, the matchMedia callers", () => {
    expect(
      lintSource(
        "e.ts",
        'const WIDE = "(min-width: 600px)";\nconst OK = "(min-width: 720px)";\nconst R = "(prefers-reduced-motion: reduce)";\n',
      ),
    ).toEqual(["e.ts:1: min-width 600px is off the scale"]);
  });
});

describe("lintBreakpoints", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "breakpoint-lint-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("walks CSS and TS files and skips tests and frozen engine copies", () => {
    mkdirSync(path.join(root, "ui/__tests__"), { recursive: true });
    mkdirSync(path.join(root, "engine/versions"), { recursive: true });
    writeFileSync(path.join(root, "ui/a.module.css"), "@media (min-width: 768px) {}\n");
    writeFileSync(path.join(root, "ui/__tests__/b.css"), "@media (min-width: 768px) {}\n");
    writeFileSync(path.join(root, "ui/c.test.ts"), 'const q = "(min-width: 768px)";\n');
    writeFileSync(path.join(root, "engine/versions/d.ts"), 'const q = "(min-width: 768px)";\n');
    expect(lintBreakpoints(root)).toEqual(["ui/a.module.css:1: min-width 768px is off the scale"]);
  });

  it("finds no off-scale media query width in the repository's src today (43 queries before the scale move)", () => {
    expect(lintBreakpoints()).toEqual([]);
  });
});
