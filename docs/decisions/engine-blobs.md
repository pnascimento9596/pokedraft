# Content-addressed engine blobs (8a)

Wave 7 row 8a, Red. Branch `feat/engine-blobs` off `origin/main` at `9c1db3b4`. The first commit (`a5d1a953`) records the PR #169 merge.

## Scope

- Deduplicate frozen version data files across retained engines into a single content-addressed store: `src/engine/versions/_blobs/<sha256>.json`.
- Migrate versions v1 through v6 into the new layout, removing 24 duplicate JSON files across bundle directories and replacing them with 7 unique content-addressed blobs.
- Update `scripts/engine/freeze-version.mts` to emit JSON dependencies into `src/engine/versions/_blobs/<sha256>.json`, rewrite imports in TypeScript sources to `_blobs`, and record `blobs` in `MANIFEST.json`.
- Update `scripts/engine/check-bundle-provenance.sh` to verify both TypeScript sources against bundle copies and JSON blobs against `_blobs/<sha256>.json`.
- Update `scripts/build/retained-json-loader.cjs` and `next.config.ts` to recognize `_blobs/` paths and deduplicate against live artifacts when bytes match.
- Update `scripts/build/measure-retained-json.mjs` to resolve retained data files via `manifest.blobs`.
- Recompute and pin bundle digests for v1 through v6 in `src/engine/versions/__tests__/versions.test.ts`. All replay assertions and goldens remain byte-identical.

## Blobs across v1 to v6

Across the 24 JSON files in v1 to v6, exactly 7 unique SHA-256 hashes exist:

| SHA-256 Hash | Files |
| --- | --- |
| `01f6314fad9c713cafeb0ef4f3dccbced1ef8297c8dba8d8aba4f95d1e0b5851` | v1, v2, v3, v4, v5 `move-traits.json` |
| `b9f7408470383de37d3a64150700d9d49e3287495a2bc73df6aec3ffc05028ed` | v6 `move-traits.json` |
| `f41cdbd61a96bcffbe698c3f4b1d906a1411c473ef863c8931516e849072c39c` | v1, v2, v3, v4, v5, v6 `pokedex.json` |
| `acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1` | v1, v2, v3, v4, v5, v6 `type-chart.json` |
| `5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775` | v1 `scouting.json` |
| `5f4b34e37a1fa78c1c4dafe65cc3dafce5e0532f8f982474898a7187ebe4d74d` | v2, v3, v4, v5 `scouting.json` |
| `9f771c3ad5f68097321551d188f1b0071d7d53cbceb22da217ee29b9d85d4e8e` | v6 `scouting.json` |

## Parity guard

RED commit `a9a747cb` added guard test `src/engine/versions/__tests__/blobs.test.ts` asserting that `src/engine/versions/_blobs` exists with the 7 expected blobs and that versions v1 through v6 record blobs in `MANIFEST.json` without duplicate JSON files in bundle directories.

```
 FAIL  src/engine/versions/__tests__/blobs.test.ts > content-addressed engine blobs (Row 8a) > stores deduplicated JSON data in _blobs directory
AssertionError: expected false to be true
 ❯ src/engine/versions/__tests__/blobs.test.ts:21:35

 FAIL  src/engine/versions/__tests__/blobs.test.ts > content-addressed engine blobs (Row 8a) > manifests in v1 to v6 record blobs mapping and no duplicate JSON in bundle dirs
AssertionError: expected undefined to be defined
 ❯ src/engine/versions/__tests__/blobs.test.ts:44:30

 Test Files  1 failed (1)
      Tests  2 failed (2)
```

GREEN implementation migrates v1 through v6 data files into `_blobs`, rewrites imports to `../../../_blobs/<hash>.json`, updates manifests, and updates the freeze tool, loader, measure script, and bundle digests.

## New bundle digests

The bundle digests in `src/engine/versions/__tests__/versions.test.ts` are recomputed and pinned:

| Bundle | Old digest | New digest |
| --- | --- | --- |
| v1 | `2cbcca39eec560ce5969e989c3e3460b39e53092cac2c7640c3d0fd9c8f8ba3a` | `426d99c58b446ef2c68dc01f8e203412fece54c432577d82282c4584100d611d` |
| v2 | `00c62f652808895871ea37e9306401f92ab14d38f999c4774876325783dbcd96` | `4e3d2e7cb21fd0746a657173eee0c1fcd356fcd96bd7dda73602e625c9f70ab8` |
| v3 | `78d81201170bb56551c56c6486dca4ec4eca8fdd65261530b5155e2d8398f009` | `61d0b986ed682c9147a2475f03345d4504bd55399f43f96a5d5c1be65ce637bc` |
| v4 | `dc448ff8df08e3f122b52c9ec1289c3dbdb5ff21d5535e08eb5f4e8ef21abbfb` | `2042813558e624a51fbdf8c40de2fee42ad37c42108a6b73fb01c3c70188e88d` |
| v5 | `cd69715e61910e64474cb5efd64b888974234b6837b2ac5bc8a6aae8d0084ede` | `3037f5ce9c2b0650b0bd6ba8ad26f207c07b2625a4488151c8b2ecee5c8f042a` |
| v6 | `b0b922bc1eef6e7ec4af9bf64e4af10206e894fdfc5d5f317eaf75b85d604397` | `628f20fb2bb28a40ad21eacbb6a27cf8b9dfd75bf435bdffe37c4e6ad7f7f8b0` |

All 27 tests in `src/engine/versions/__tests__/versions.test.ts` pass, proving every golden token and retained replay outputs byte-identical results.

## Emitted server bundle measurement

`pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: 13 emitted golden replays passed.
`node scripts/build/measure-retained-json.mjs .next/server/chunks`: 4 copies, 2,891,853 bytes total payload.
`bash scripts/check-client-bundle.sh`: client bundle holds 0 retained engine bundles.
`bash scripts/engine/check-bundle-provenance.sh v6 969ca1c`: 30 sources and 4 blobs match, exit 0.
`git diff --quiet origin/main -- src/engine/__tests__/goldens.test.ts`: exit 0 (goldens byte-identical).
