import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The viewport scale. A layout widens at `min-width: N` and narrows below it at `max-width: N - 0.02`. */
export const SCALE = [480, 720, 960, 1200];
const ALLOWED = new Set(SCALE.flatMap((n) => [`min-width:${n}px`, `max-width:${n - 0.02}px`]));
const WIDTH = /\(\s*(min|max)-width\s*:\s*([^)]*?)\s*\)/g;
const RANGE = /\(\s*[^():]*\bwidth\s*[<>]/;

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function check(rel, text, start, query, failures) {
  const line = lineOf(text, start);
  for (const [, side, value] of query.matchAll(WIDTH)) {
    if (!ALLOWED.has(`${side}-width:${value}`))
      failures.push(`${rel}:${line}: ${side}-width ${value} is off the scale`);
  }
  if (RANGE.test(query)) failures.push(`${rel}:${line}: width range syntax is off the scale`);
}

/**
 * Off-scale viewport widths in one file: every `@media` prelude of a CSS file, and every quoted
 * media query in a TS or TSX file (the `matchMedia` callers). `@container` queries are exempt,
 * because they follow a component's width, not the viewport's.
 */
export function lintSource(rel, text) {
  const failures = [];
  if (rel.endsWith(".css")) {
    const bare = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    for (const match of bare.matchAll(/@media\b([^{]*)\{/g))
      check(rel, bare, match.index, match[1], failures);
  } else {
    for (const match of text.matchAll(/(["'`])([^"'`\n]*\b(?:min|max)-width\b[^"'`\n]*)\1/g))
      check(rel, text, match.index, match[2], failures);
  }
  return failures;
}

/** Lints `root` (default `src`), skipping tests and the frozen engine copies under engine/versions. */
export function lintBreakpoints(root = path.resolve(import.meta.dirname, "../../src")) {
  const failures = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const file = path.join(directory, entry.name);
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__" && rel !== "engine/versions") walk(file);
        continue;
      }
      if (!/\.(tsx?|css)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
      failures.push(...lintSource(rel, readFileSync(file, "utf8")));
    }
  };
  walk(root);
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = lintBreakpoints();
  if (failures.length > 0) {
    console.error(
      `${failures.join("\n")}\n${failures.length} media query widths are off the scale. ` +
        `Use min-width ${SCALE.join(", ")}px or max-width ${SCALE.map((n) => n - 0.02).join(", ")}px.`,
    );
    process.exitCode = 1;
  } else console.log(`Every media query width is on the ${SCALE.join(", ")}px scale.`);
}
