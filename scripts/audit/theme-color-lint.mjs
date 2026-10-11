import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../src");
const failures = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["design", "__tests__", "data", "engine", "scouting"].includes(entry.name)) walk(file);
      continue;
    }
    if (!/\.(css|tsx?|mjs|mts)$/.test(file) || /\.test\./.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const [index, line] of text.split("\n").entries()) {
      if (/#[\da-f]{3,8}\b/i.test(line))
        failures.push(
          `${path.relative(root, file)}:${index + 1}: color belongs in src/design tokens`,
        );
      if (/var\(--viz-8\)/.test(line))
        failures.push(
          `${path.relative(root, file)}:${index + 1}: sand is reserved for a contrast-checked heat fill`,
        );
    }
  }
}
walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("No stray hex colors; viz-8 remains reserved for heat fills.");
