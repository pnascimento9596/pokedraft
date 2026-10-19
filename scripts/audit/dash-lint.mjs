import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DASH = /[–—]|&(?:m|n)dash;|&#(?:821[12]|x201[34]);/i;
const CSS_ESCAPE = /\\0{0,2}201[34]\b/i;
const MESSAGE = "em or en dash in copy";

/** Every string literal, template piece and JSX text in a TS or TSX file, or each CSS content value. */
export function lintSource(rel, text) {
  if (rel.endsWith(".css")) {
    const bare = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    return bare
      .split("\n")
      .flatMap((line, i) =>
        /\bcontent\s*:/.test(line) && (DASH.test(line) || CSS_ESCAPE.test(line))
          ? [`${rel}:${i + 1}: ${MESSAGE}`]
          : [],
      );
  }
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const lines = new Set();
  const visit = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      // `text` holds escapes already decoded; the raw source still spells out HTML entities.
      if (DASH.test(node.text) || DASH.test(node.getText(source))) {
        lines.add(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...lines].sort((a, b) => a - b).map((line) => `${rel}:${line}: ${MESSAGE}`);
}

/** Lints `root` (default `src`), skipping tests and the frozen engine copies under engine/versions. */
export function lintDashes(root = path.resolve(import.meta.dirname, "../../src")) {
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
  const failures = lintDashes();
  if (failures.length > 0) {
    console.error(`${failures.join("\n")}\nUse a comma, a period or a hyphen score ("1-0").`);
    process.exitCode = 1;
  } else console.log("No em or en dashes in copy under src.");
}
