import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  GOLDEN_CUP8_V1,
  GOLDEN_KANTO151_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_KANTO151_V2,
  GOLDEN_CUP8_V3,
} from "../../src/engine/versions/__tests__/fixtures";

const require = createRequire(import.meta.url);
const chunks = path.resolve(process.argv[2] ?? ".next/server/chunks");
const runtime = require(path.join(chunks, "[turbopack]_runtime.js"))(
  "server/retained-replay-check.js",
);
const ids = new Map<number, number>();
for (const file of readdirSync(chunks).filter(
  (file) => file.endsWith(".js") && !file.includes("runtime"),
)) {
  runtime.c(`server/chunks/${file}`);
  const modules: unknown[] = require(path.join(chunks, file));
  if (!Array.isArray(modules)) continue;
  for (let index = 1; index < modules.length; index++) {
    const factory = modules[index];
    if (typeof factory !== "function") continue;
    const version = factory.toString().match(/retained-engine-bundle:v([123])/);
    if (version) ids.set(Number(version[1]), Number(modules[index - 1]));
  }
}
const cases = [
  [1, GOLDEN_CUP8_V1, "13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998"],
  [1, GOLDEN_KANTO151_V1, "2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489"],
  [2, GOLDEN_CUP8_V2, "20e343f8bc4ac7414f1edfc9b56901533b84a27b1ae4deba5989824a9f0b684b"],
  [2, GOLDEN_KANTO151_V2, "f050e3ff1848e655cc534d6d7c78015370b7ed7d21c00fe6878c66c3744ccf47"],
  [3, GOLDEN_CUP8_V3, "07bfee8296298a5c0d7b7878e813811548b1e8a3a74b1cfd899f0680f0d5db95"],
] as const;
assert.equal(ids.size, 3, "all retained engines must exist in the actual emitted server build");
for (const [version, token, expected] of cases) {
  const bundle = runtime.m(ids.get(version)).exports;
  assert.equal(bundle.BUNDLE_MARKER, `retained-engine-bundle:v${version}`);
  const actual = createHash("sha256")
    .update(JSON.stringify(bundle.replay(token)))
    .digest("hex");
  assert.equal(actual, expected, `emitted v${version} golden replay changed`);
  console.log(`PASS emitted v${version} golden replay ${actual}`);
}
console.log(`${cases.length} emitted retained replays passed`);
