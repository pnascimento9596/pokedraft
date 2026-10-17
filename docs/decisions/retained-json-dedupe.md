# Retained JSON dedupe

Wave 1 row 1l, Red, size S. Branch `fix/retained-json-dedupe` off `f4489cb`.

## Scope

- `next.config.ts`: the Turbopack retained-JSON rule matches `v\d+` instead of `v[1234]`, so v5 and
  every later frozen bundle go through the loader.
- `scripts/build/retained-json-loader.cjs`: a retained `pokedex.json` or `scouting.json` re-exports
  the live `src/data` file when the bytes match, else the earliest byte-identical copy in a lower
  numbered `src/engine/versions/v<n>`, else inlines itself. Versions sort numerically. Every file
  compared is a loader dependency, so a change to it invalidates the cache.
- `scripts/build/measure-retained-json.mjs` defaults to 4 payloads. CI runs it right after
  `pnpm build` in the `check` job.
- No file under `src/engine` or `src/data` changed (`git diff origin/main -- src/engine src/data`
  is empty).

## Why 4

Byte hashes at `f4489cb` (SHA-256 prefixes):

| Payload        | Files                          | Hash       |
| -------------- | ------------------------------ | ---------- |
| pokedex        | live and v1 to v5              | `f41cdbd6` |
| live scouting  | `src/data/scouting.json`       | `9f771c3a` |
| v1 scouting    | v1                             | `5969709f` |
| v2 scouting    | v2, v3, v4, v5                 | `5f4b34e3` |

Four distinct payloads, so four emitted copies is the floor. The code agrees with the brief.

## RED

Commit `098a694` sets the measure default to 4 and adds three loader tests. On a fresh
`pnpm build` of `f4489cb`:

```
AssertionError [ERR_ASSERTION]: unexpected emitted data payload count

8 !== 4
```

With the old default (`8 !== 3`) the payloads were: pokedex 2 copies (968,338 bytes), live
scouting 1 (802,132), v1 scouting 1 (802,414), v2 scouting 4 (3,211,525). Total 8 copies,
5,784,409 bytes.

Loader tests at `098a694`: 2 failed, 5 passed of 7. Both failures received
`export default JSON.parse("[2]");` where a re-export of `../../../v2/src/data/scouting.json`
(and `v9` in the numeric-order test) was expected.

## GREEN

At `a980db9`, fresh build, `node scripts/build/measure-retained-json.mjs .next/server/chunks`
exits 0 with 4 copies, 2,891,853 bytes (one copy per payload). Saved 2,892,556 bytes of server
chunk JSON. The audit's estimate of 2,887,688 bytes was not reproduced. The measured live
scouting payload is 802,132 bytes as emitted.

`pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: 7 emitted retained
replays passed (v1 to v4). An uncommitted copy of that script extended to v5 with the v5 golden
digests from `versions.test.ts` passed 9 of 9, so the v5 bundle reads the right data through the
new re-exports.

## NOT RUN

- The committed emitted-replay check still covers only v1 to v4 and is not in CI. Out of this
  row's file scope. Carryover.
- Full local Playwright suite (hosted CI runs it). Local: `e2e/old-links.spec.ts` and
  `e2e/engine-v4.spec.ts`, 4 passed.
