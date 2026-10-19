import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COLOR = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;
const SKIPPED = ["design", "__tests__", "data", "engine", "scouting"];

/** One failure per line that spells a colour (hex, rgb, rgba, hsl, hsla) or uses the reserved sand. */
export function lintSource(rel, text) {
  const failures = [];
  for (const [index, line] of text.split("\n").entries()) {
    if (COLOR.test(line)) failures.push(`${rel}:${index + 1}: color belongs in src/design tokens`);
    if (/var\(--viz-8\)/.test(line))
      failures.push(`${rel}:${index + 1}: sand is reserved for a contrast-checked heat fill`);
  }
  return failures;
}

/** Lints `root` (default `src`), skipping the token folder, tests and the engine and data trees. */
export function lintColors(root = path.resolve(import.meta.dirname, "../../src")) {
  const failures = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED.includes(entry.name)) walk(file);
        continue;
      }
      if (!/\.(css|tsx?|mjs|mts)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
      const rel = path.relative(root, file).split(path.sep).join("/");
      failures.push(...lintSource(rel, readFileSync(file, "utf8")));
    }
  };
  walk(root);
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = lintColors();
  if (failures.length > 0) {
    console.error(
      `${failures.join("\n")}\n${failures.length} lines spell a colour outside src/design.`,
    );
    process.exitCode = 1;
  } else console.log("No stray colors; viz-8 remains reserved for heat fills.");
}
