import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { RUN_TOKEN_VERSION } from "../../src/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "../../src/engine/versions/label";
import {
  GOLDEN_CUP8_V1,
  GOLDEN_KANTO151_V1,
  GOLDEN_CUP8_V2,
  GOLDEN_KANTO151_V2,
  GOLDEN_CUP8_V3,
  GOLDEN_CUP8_V4,
  GOLDEN_KANTO151_V4,
  GOLDEN_CUP8_V5,
  GOLDEN_KANTO151_V5,
  GOLDEN_CUP8_V6,
  GOLDEN_KANTO151_V6,
  GOLDEN_CUP8_V7,
  GOLDEN_KANTO151_V7,
} from "../../src/engine/versions/__tests__/fixtures";

// Each hash is sha256 of JSON.stringify({ draft, cup }) as the issuing engine replays the token:
// the retained bundle's own output, or the live engine's. Freezing engine 6 into a bundle keeps
// its case valid unchanged; the next live version then needs a case of its own.
const CASES = [
  [1, GOLDEN_CUP8_V1, "13c141d47fd86051f7b7e5bea0808aa6bbf1d2dbb5851726b5c42fe3e441f998"],
  [1, GOLDEN_KANTO151_V1, "2e6121c2a610b7af8145f50be16c4277864da14bd91743a979fdfd33e0264489"],
  [2, GOLDEN_CUP8_V2, "20e343f8bc4ac7414f1edfc9b56901533b84a27b1ae4deba5989824a9f0b684b"],
  [2, GOLDEN_KANTO151_V2, "f050e3ff1848e655cc534d6d7c78015370b7ed7d21c00fe6878c66c3744ccf47"],
  [3, GOLDEN_CUP8_V3, "07bfee8296298a5c0d7b7878e813811548b1e8a3a74b1cfd899f0680f0d5db95"],
  [4, GOLDEN_CUP8_V4, "8520e109891a53af4b291690e21ac405c1af5471ff9a39b157918ba21264e611"],
  [4, GOLDEN_KANTO151_V4, "1da7e5609fcd0c0a8d6a32f9856c0b91f4a21a584dac19b119bbffc2656cf795"],
  [5, GOLDEN_CUP8_V5, "d3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a"],
  [5, GOLDEN_KANTO151_V5, "d4d1db9bd84cbd39eae072a86791a76864a16f96db5844c5be67df7c1ab2a95a"],
  [6, GOLDEN_CUP8_V6, "2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e05"],
  [6, GOLDEN_KANTO151_V6, "eb3664642c3c0bd9ee50cb4382182c73e070dad7896e620492d5b0e5b8b12747"],
  [7, GOLDEN_CUP8_V7, "c91cb42cac62bec6e43a649c4e914a1208108ef94a92534acfd900d13df1fe30"],
  [7, GOLDEN_KANTO151_V7, "2b7223f3888259596fd24740506564cdca93ff13e9c035ecb417d681c2858a4d"],
] as const;

type Factory = (...args: unknown[]) => unknown;
type Run = { readonly draft: unknown; readonly cup: unknown };
type Dispatch = (token: string) => Promise<Run & { readonly bundle: string | null }>;

// The route chunks import Next's request storage, which reads this global when it loads.
Object.assign(globalThis, { AsyncLocalStorage });

const require = createRequire(import.meta.url);
const chunks = path.resolve(process.argv[2] ?? ".next/server/chunks");
const runtime = require(path.join(chunks, "[turbopack]_runtime.js"))(
  "server/retained-replay-check.js",
);
const sha256 = (run: Run): string =>
  createHash("sha256")
    .update(JSON.stringify({ draft: run.draft, cup: run.cup }))
    .digest("hex");

// A chunk lists module ids, each run of ids followed by the factory they share, with an optional
// nested list of strict-mode modules first.
function* moduleGroups(list: readonly unknown[]): Generator<[number[], Factory]> {
  let ids: number[] = [];
  for (const [index, entry] of list.entries()) {
    if (index === 0 && Array.isArray(entry)) yield* moduleGroups(entry);
    else if (typeof entry === "function") {
      yield [ids, entry as Factory];
      ids = [];
    } else ids.push(Number(entry));
  }
}

const files = readdirSync(chunks).filter(
  (file) => file.endsWith(".js") && !file.includes("runtime"),
);
for (const file of files) runtime.c(`server/chunks/${file}`);
const bundles = new Map<number, number>();
const dispatcherIds = new Set<number>();
for (const file of files) {
  const list: unknown = require(path.join(chunks, file));
  if (!Array.isArray(list)) continue;
  for (const [ids, factory] of moduleGroups(list)) {
    const source = factory.toString();
    const marker = source.match(/retained-engine-bundle:v(\d+)/);
    if (marker) bundles.set(Number(marker[1]), ids[0]!);
    else if (source.includes("unknown token version") && source.includes(".BUNDLE_MARKER"))
      for (const id of ids) dispatcherIds.add(id);
  }
}

assert.deepEqual(
  [...bundles.keys()].sort((a, b) => a - b),
  RETAINED_TOKEN_VERSIONS,
  "the emitted server build must hold exactly the retained bundles in RETAINED_TOKEN_VERSIONS",
);
for (const version of [...RETAINED_TOKEN_VERSIONS, RUN_TOKEN_VERSION])
  assert.ok(
    CASES.some(([v]) => v === version),
    `token version ${version} has no golden replay case`,
  );

// replayAnyVersion as the emitted route groups hold it. The minifier renames its export and its
// module id, so it is found by the token-version error only it throws.
const dispatchers = [...dispatcherIds].flatMap((id) =>
  Object.values(runtime.m(id).exports as Record<string, unknown>).filter(
    (value): value is Dispatch =>
      typeof value === "function" && value.toString().includes("unknown token version"),
  ),
);
assert.ok(dispatchers.length > 0, "the emitted server build must hold the replay dispatcher");

for (const [version, token, expected] of CASES) {
  const retained = RETAINED_TOKEN_VERSIONS.includes(version);
  const label = retained ? `retained v${version} bundle` : `live engine, token v${version}`;
  for (const dispatch of dispatchers) {
    const run = await dispatch(token);
    assert.equal(run.bundle, retained ? `retained-engine-bundle:v${version}` : null);
    if (!retained) assert.equal(sha256(run), expected, `emitted ${label} golden replay changed`);
  }
  if (retained) {
    const bundle = runtime.m(bundles.get(version)).exports;
    assert.equal(bundle.BUNDLE_MARKER, `retained-engine-bundle:v${version}`);
    assert.equal(sha256(bundle.replay(token)), expected, `emitted ${label} golden replay changed`);
  }
  console.log(`PASS emitted ${label} golden replay ${expected}`);
}
console.log(`${CASES.length} emitted golden replays passed, ${dispatchers.length} dispatcher(s)`);
