# Species chunk split (row 7sp, Red)

Branch `feat/species-chunk-split` off `origin/main` at `b823acff`. Wave 7 row 7sp (Red).

## Scope

- A slim species index (`src/data/species-index.json`, 1,025 entries holding only `id, name, types, gen, special`) for every list, search, and picker across the app.
- Nine generation chunks (`src/data/species-chunks/gen-1.json` through `gen-9.json`) holding attributes, role fits, best/worst roles, and strengths/weaknesses (`{ id, evoChainId, attrs, fits, bestRoles, worstRoles, strengths, weaknesses }`).
- Deterministic build script `scripts/data/build-species-split.ts` and validator `scripts/data/validate-artifacts.ts` validating that all 1,025 index entries and all 1,025 generation chunk records match the source artifacts `pokedex.json` and `scouting.json`.
- `src/data/species-index.ts`: exports typed `SPECIES_INDEX`, `slimSpeciesById`, `slimSpeciesByName`, and `SlimSpecies`.
- `src/engine/species.ts`: synchronously loads `SPECIES_INDEX` and the 9 generation chunks without importing `pokedex.json` or `scouting.json`. Populates `worstRoles` directly onto `Species`.
- `src/engine/types.ts`: adds `readonly worstRoles: readonly Role[];` to `interface Species`.
- `src/ui/suitability.ts`: removes `SCOUTING_BY_ID` import from `scouting-data.ts`, reading `species.worstRoles` directly.
- `src/components/scouting/DossierModal.tsx`: lazy dynamic code-split wrapper for `ScoutingDossier`, preventing `pokedex.json` (kickMoves) and `scouting.json` (baseline) from bundling into the initial friendly builder and picker chunks.
- `src/components/builder/live.ts`: removes static re-export of `ScoutingDossier`.
- `src/components/builder/Builder.tsx` and `src/components/builder/Picker.tsx`: use `DossierModal` so the dossier and heavy data files are loaded only when the user requests scouting.
- `e2e/data-split.spec.ts`: verified that opening the picker on the builder home does not download `kickMoves` or `baseline` markers.

## Performance measurements

Draft start time measured under 4x CPU throttling in Chromium over 5 identical runs:

- Baseline: 860.1 ms, 1164.8 ms, 1450.7 ms, 1535.8 ms, 1660.2 ms. Median: 1450.7 ms.
- Post-split: 706.1 ms, 738.9 ms, 751.9 ms, 765.9 ms, 808.2 ms. Median: 751.9 ms.
- Reduction in draft start latency: 698.8 ms (48.2% faster).

## RED output (`80472c2d`)

From test execution of `src/data/__tests__/species-index.test.ts` and `scripts/data/validate-artifacts.test.ts`:

```text
 FAIL  src/data/__tests__/species-index.test.ts
Error: Cannot find module '../species-index.json' imported from /Users/paulo/projects/pokedraft-7sp/src/data/__tests__/species-index.test.ts

 FAIL  scripts/data/validate-artifacts.test.ts
Error: Cannot find module '../src/data/species-index.json' imported from /Users/paulo/projects/pokedraft-7sp/scripts/data/validate-artifacts.test.ts
```

## Gates run at HEAD

- `pnpm lint`: clean, 0 errors, 0 warnings.
- `pnpm typecheck`: clean, 0 errors.
- `pnpm test`: 2,310 passed in 260 files.
- `pnpm build`: clean, production build succeeded in 563 ms.
- `pnpm check:mirrors`: mirrors identical.
- `pnpm check:dashes`: no em or en dashes in copy under src.
- All nine `check:*` scripts: passed.
- `e2e/data-split.spec.ts`: 6 passed on Chromium.
