# Freeze engine 7 (8b)

Wave 7 row 8b, Red. Branch `feat/freeze-engine-7` off `origin/main` at `363fed60`. The first commit (`3bff8b08`) records the PR #170 merge.

## Scope

- Freeze the live engine 7 into `src/engine/versions/v7` using `scripts/engine/freeze-version.mts --name v7` before any engine 8 changes begin.
- Update `scripts/engine/freeze-version.mts` roots to include `src/engine/story.ts` in addition to `replay.ts` and `types.ts`, allowing retained v7 replays to render the xG river via `matchStory`.
- Leverage the content-addressed blob store (`src/engine/versions/_blobs/`): all 4 data dependencies (`move-traits.json`, `pokedex.json`, `scouting.json`, `type-chart.json`) map to existing blobs, writing zero new duplicate JSON files to disk.
- Pinned bundle digest in `src/engine/versions/__tests__/versions.test.ts`: `f9cf999233e9a2b87ff169a4c64754ba34227f47387ac668a0b6184d6a7f25ef`.
- Verified provenance: `bash scripts/engine/check-bundle-provenance.sh v7 363fed60` exits 0 (31 sources and 4 blobs match).
- Marker isolation: `retained-engine-bundle:v7` marker is completely absent from `.next/static` and `.next/server`.
- The v7 bundle is dormant: nothing imports it until the engine 8 flip (row 8x).

## Parity guard

RED commit `bdd3fe3f` added the v7 test block to `src/engine/versions/__tests__/versions.test.ts` before the bundle was created, failing with `Cannot find module '../v7'`.

GREEN implementation freezes v7, pins its digest and replay assertions, and proves identical outputs for `GOLDEN_CUP8_V7` and `GOLDEN_KANTO151_V7`.

## Retained xG river decision

Decision on whether `pd6` retained replays also get an xG river:
Engine 6's frozen bundle does not contain `story.ts`. Per the hand-off instruction ("only if v6's frozen inputs suffice without re-freezing v6; do not re-freeze v6"), `pd6` retained replays will not render an xG river. Re-freezing v6 is explicitly prohibited to maintain provenance and bundle hash integrity. In contrast, v7 is frozen with `story.ts`, so retained v7 replays will support the river after engine 8 lands.

## Provenance and build verification

- Provenance: `bash scripts/engine/check-bundle-provenance.sh v7 363fed60` exited 0 (31 sources and 4 blobs match `origin/main`).
- Replay parity: 13 emitted golden replays passed in `scripts/build/check-retained-replays.mts`.
- Retained JSON: 4 copies, 2,891,853 bytes measured by `scripts/build/measure-retained-json.mjs`.
- Client bundle: 0 retained bundles in `.next/static`.
- Unit tests: 2,284 passed in 258 files.
