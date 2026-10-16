// Downloads the Inter woff2 subsets that next/font/google served for weights 400, 600 and 700, so
// the site can self-host them through next/font/local. Run by hand; the build never fetches fonts.
// Usage: node scripts/fonts/fetch-inter-woff2.mjs
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

const CSS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap";
// Google picks the woff2 subset files by user agent; this is a current desktop Chrome string.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const OUT = path.resolve(import.meta.dirname, "../../src/design/fonts");

const css = await (await fetch(CSS_URL, { headers: { "user-agent": UA } })).text();
const faces = [
  ...css.matchAll(
    /\/\* ([a-z-]+) \*\/\s*@font-face \{[^}]*font-weight: (\d+);[^}]*src: url\(([^)]+)\)[^}]*unicode-range: ([^;]+);/g,
  ),
].map(([, subset, weight, url, unicodeRange]) => ({
  subset,
  weight: Number(weight),
  url,
  unicodeRange,
}));

const subsets = new Map();
for (const face of faces) {
  const seen = subsets.get(face.subset);
  if (seen && (seen.url !== face.url || seen.unicodeRange !== face.unicodeRange)) {
    throw new Error(`${face.subset} differs across weights; Inter is no longer one variable file`);
  }
  if (seen) seen.weights.push(face.weight);
  else subsets.set(face.subset, { ...face, weights: [face.weight] });
}

const files = [];
for (const { subset, url, unicodeRange, weights } of subsets.values()) {
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = `inter-${subset}.woff2`;
  writeFileSync(path.join(OUT, file), bytes);
  files.push({
    file,
    subset,
    weights,
    unicodeRange,
    source: url,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  });
}

writeFileSync(
  path.join(OUT, "web-provenance.json"),
  `${JSON.stringify({ family: "Inter", license: "OFL-1.1", googleCssUrl: CSS_URL, files }, null, 2)}\n`,
);
console.log(files.map((f) => `${f.file} ${f.bytes} ${f.sha256}`).join("\n"));
