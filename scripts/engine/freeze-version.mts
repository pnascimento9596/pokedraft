// Freezes the live engine into a retained, server-only bundle so runs on this engine keep
// replaying after the live engine moves on. Copies the import closure of the replay path
// (engine code and the scouting code it reads) under src/engine/versions/<name>/, keeping
// repository-relative paths so relative imports stay valid, and rewrites "@/" aliases.
// Data files (.json) are content-addressed and deduplicated into src/engine/versions/_blobs/<sha256>.json.
// Refuses to touch an existing bundle.
//
// Usage: pnpm tsx scripts/engine/freeze-version.mts --name v1
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ROOTS = ["src/engine/replay.ts", "src/engine/types.ts", "src/engine/story.ts"];
const SPECIFIER = /(?:from|import)\s+"([^"]+)"/g;
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts"];

const { values } = parseArgs({ options: { name: { type: "string" } } });
const name = values.name;
if (name === undefined || !/^v\d+$/.test(name)) {
  throw new Error("pass --name v<N>, for example --name v1");
}
const bundleDir = path.join(ROOT, "src/engine/versions", name);
if (existsSync(bundleDir))
  throw new Error(`${path.relative(ROOT, bundleDir)} exists; bundles are frozen`);

const blobsDir = path.join(ROOT, "src/engine/versions/_blobs");
mkdirSync(blobsDir, { recursive: true });

function resolveSpecifier(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of EXTENSIONS) {
    if (
      existsSync(base + ext) &&
      !base.endsWith("/") &&
      (ext !== "" || path.extname(base) !== "")
    ) {
      return base + ext;
    }
  }
  throw new Error(`cannot resolve ${spec} from ${path.relative(ROOT, from)}`);
}

const closure = new Set<string>();
const queue = ROOTS.map((r) => path.join(ROOT, r));
while (queue.length > 0) {
  const file = queue.pop()!;
  if (closure.has(file)) continue;
  closure.add(file);
  if (!/\.tsx?$/.test(file)) continue;
  for (const [, spec] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
    const target = resolveSpecifier(file, spec!);
    if (target !== null) queue.push(target);
  }
}

const files = [...closure].map((f) => path.relative(ROOT, f)).sort();
const sources: Record<string, string> = {};
const blobs: Record<string, string> = {};

for (const rel of files) {
  const src = path.join(ROOT, rel);
  const raw = readFileSync(src);
  const hash = createHash("sha256").update(raw).digest("hex");
  if (rel.endsWith(".json")) {
    blobs[rel] = hash;
    const blobPath = path.join(blobsDir, `${hash}.json`);
    if (!existsSync(blobPath)) {
      writeFileSync(blobPath, raw);
    }
  } else {
    sources[rel] = hash;
  }
}

function rewrite(file: string, text: string): string {
  if (!/\.tsx?$/.test(file)) return text;
  const dest = path.join(bundleDir, path.relative(ROOT, file));
  return text.replace(SPECIFIER, (whole, spec: string) => {
    const target = resolveSpecifier(file, spec);
    if (target === null) return whole;
    const relTarget = path.relative(ROOT, target);
    if (relTarget.endsWith(".json")) {
      const blobHash = blobs[relTarget];
      if (blobHash) {
        let rel = path.relative(path.dirname(dest), path.join(blobsDir, `${blobHash}.json`));
        if (!rel.startsWith(".")) rel = `./${rel}`;
        return whole.replace(`"${spec}"`, `"${rel}"`);
      }
    }
    if (!spec.startsWith("@/")) return whole;
    const bundleTarget = path.join(bundleDir, relTarget);
    let rel = path.relative(path.dirname(dest), bundleTarget).replace(/\.ts$/, "");
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return whole.replace(`"${spec}"`, `"${rel}"`);
  });
}

for (const rel of Object.keys(sources)) {
  const src = path.join(ROOT, rel);
  const raw = readFileSync(src);
  const out = path.join(bundleDir, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, rewrite(src, raw.toString("utf8")));
}

writeFileSync(
  path.join(bundleDir, "index.ts"),
  `import "server-only";

export { replay } from "./src/engine/replay";
export { matchStory } from "./src/engine/story";
export { ENGINE_VERSION, RUN_TOKEN_VERSION } from "./src/engine/types";
export const BUNDLE_MARKER = "retained-engine-bundle:${name}";
`,
);
writeFileSync(
  path.join(bundleDir, "MANIFEST.json"),
  JSON.stringify({ name, sources, blobs }, null, 2) + "\n",
);
console.log(
  `froze ${Object.keys(sources).length} sources and ${Object.keys(blobs).length} blobs into ${path.relative(ROOT, bundleDir)}`,
);
for (const rel of Object.keys(sources)) console.log(`  source: ${rel}`);
for (const [rel, hash] of Object.entries(blobs))
  console.log(`  blob:   ${rel} -> _blobs/${hash}.json`);
