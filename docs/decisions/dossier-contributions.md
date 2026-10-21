# Dossier contributions (row 6d, Red)

Branch `feat/dossier-contributions` off `origin/main` at `e927608` (the 6b9 squash, PR #155). Wave 6
row 6d (Red data). The first commit (`98696957`) records the PR #155 merge at the end of the
`## Engine 7 flip` section in `STATE.md`.

## Who notices

Players opening any Pokémon's scouting dossier when ratings are on:

- Under each affected attribute bar in `17 Soccer Attributes`, the dossier now shows the non-zero
  ability contribution (`Abilities +3`, `Abilities -2`) and move contribution (`Moves +1.75`,
  `Moves +3`) that went into that attribute's Layer 1 baseline, alongside the non-zero Layer 2
  scout review adjustment (`Review -6`, `Review +6`).
- A note under the attribute grid explains how the numbers combine:
  `Abilities and moves are contributions to the baseline. Review is the scout adjustment before the 1 to 99 clamp.`
- When blind challenge ratings are off (`showRatings={false}`), the attribute bars, all contribution
  lines, and the note stay hidden.

## Scope and files

- **Data schema, builder, and artifact:**
  - `src/scouting/scouting-schema.ts`: adds `ScoutingContributionsRecord` and
    `ScoutingContributionsEntrySchema`, a strict Zod schema (`id` in `1..1025`, `abilities` and
    `moves` partial attribute maps whose numbers must be finite, non-zero, and bounded in `-99..99`,
    with `.strict()` on both the outer object and inner attribute maps).
  - `src/scouting/build.ts`: adds `buildScoutingContributions` and
    `serializeScoutingContributions`, extracting the non-zero `b.abilities` and `b.moves` totals from
    `computeBaselines(s, abilityTraits, moveTechniques)` without changing `buildScoutingEntries` or
    `serializeScouting`.
  - `scripts/data/build-scouting.ts`: writes `src/data/scouting-contributions.json` alongside
    `src/data/scouting.json`.
  - `scripts/data/validate-artifacts.ts`: adds `validateScoutingContributions` and validates all
    1,025 contribution records during `pnpm data:validate`.
  - `src/scouting/scouting-contributions.ts`: exports `SCOUTING_CONTRIBUTIONS` and
    `SCOUTING_CONTRIBUTIONS_BY_ID` from `src/data/scouting-contributions.json`, kept separate from
    `src/scouting/scouting.ts` so engine and draft consumers do not pull the contribution artifact.
  - `src/data/scouting-contributions.json`: new deterministic build artifact (1,025 species).
    `src/data/pokedex.json` (`f41cdbd6...`) and `src/data/scouting.json` (`9f771c3a...`) remain
    byte-identical to `origin/main`, and `src/engine` is untouched.
- **Dossier UI:**
  - `src/components/scouting/ScoutingDossier.tsx`: lazily loads
    `@/scouting/scouting-contributions` via `loadContributions()` when the dossier mounts with
    `showRatings` on, renders `Abilities +n`, `Moves +n`, and `Review +n` lines under each affected
    attribute bar (`data-testid="attr-abilities-<ATTR>"`, `data-testid="attr-moves-<ATTR>"`,
    `data-testid="attr-review-<ATTR>"`), and renders the explanatory note
    (`data-testid="attr-contributions-note"`) when any contribution or review adjustment is shown.
  - `src/components/scouting/ScoutingDossier.module.css`: adds `.attrContribs`, `.attrContrib`, and
    `.attrContribNote` styles with `font-variant-numeric: tabular-nums`.
- **Tests and browser proof:**
  - `scripts/data/validate-artifacts.test.ts`: guards `validateScoutingContributions` on all 1,025
    records and on invalid inputs (zero ability or move contribution, out-of-range value, unknown
    attribute key, extra entry field).
  - `src/scouting/__tests__/golden.test.ts`: guards `buildScoutingContributions` literal values for
    Snorlax (`#143`), Hitmonlee (`#106`), and Wishiwashi (`#746`), and verifies that
    `serializeScoutingContributions` matches `src/data/scouting-contributions.json` byte-for-byte.
  - `src/data/__tests__/artifact-boundary.test.ts`: guards that `SCOUTING_CONTRIBUTIONS` is the raw
    JSON import reference (`toBe(rawContributions)`) and equals
    `ScoutingContributionsEntrySchema.array().parse(rawContributions)`.
  - `src/components/scouting/__tests__/ScoutingDossier.test.tsx`: guards literal ability, move, and
    review lines on Snorlax, Hitmonlee, and Wishiwashi, the baseline note, and hiding all
    contribution lines and the note when `showRatings={false}`.
  - `e2e/dossier-contributions.spec.ts` and `docs/reports/dossier-contributions/`: Playwright proof
    at `390x844`, `360x800`, `320x568`, and `308x568` with ratings on and blind mode (`ratings`
    off).

## RED commits

1. **Data schema, builder, and validator (`62de309b`)** - 8 of 26 failed across
   `scripts/data/validate-artifacts.test.ts` and `src/scouting/__tests__/golden.test.ts`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-dossier-contributions

 ❯ scripts/data/validate-artifacts.test.ts (22 tests | 6 failed) 49ms
   ❯ generated artifact build validation (22)
     × accepts all 1025 scouting contribution records without changing their values 1ms
     × rejects a zero ability contribution in scouting contributions with the schema error and field path 2ms
     × rejects a zero move contribution in scouting contributions with the schema error and field path 0ms
     × rejects an out-of-range ability contribution in scouting contributions with the schema error and field path 0ms
     × rejects an unknown attribute key in abilities in scouting contributions with the schema error and field path 0ms
     × rejects an extra contribution entry field in scouting contributions with the schema error and field path 0ms
 ❯ src/scouting/__tests__/golden.test.ts (4 tests | 2 failed) 42ms
   ❯ scouting-contributions.json golden (2)
     × emits non-zero ability and move contributions per species and attribute (catches discarded breakdown contributions) 1ms
     × equals the committed src/data/scouting-contributions.json artifact 0ms

 Test Files  2 failed (2)
      Tests  8 failed | 18 passed (26)
```

Fixed in `1f60ebb8` (26 of 26 passed).

2. **Dossier UI rendering and blind-mode hiding (`7ae2ecc4`)** - 3 of 27 failed in
   `src/components/scouting/__tests__/ScoutingDossier.test.tsx`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-dossier-contributions

 ❯ src/components/scouting/__tests__/ScoutingDossier.test.tsx (27 tests | 3 failed) 641ms
   ❯ dossier contributions (6d) (3)
     × shows Snorlax ability, move and review contributions under affected attribute bars and labels baseline contributions 11ms
     × shows both ability and move or review lines when an attribute has multiple contributions (Hitmonlee and Wishiwashi) 9ms
     × hides ability, move and review contribution lines when blind challenge ratings are off 8ms

FAIL  src/components/scouting/__tests__/ScoutingDossier.test.tsx > dossier contributions (6d) > shows Snorlax ability, move and review contributions under affected attribute bars and labels baseline contributions
TestingLibraryElementError: Unable to find an element by: [data-testid="attr-abilities-ACC"]

 Test Files  1 failed (1)
      Tests  3 failed | 24 passed (27)
```

Fixed in `3cdb41bf` (27 of 27 passed).

`cc5eeb96` adds the `artifact-boundary.test.ts` regression guard and `e2e/dossier-contributions.spec.ts`
(refined in `f6b6b308` so `ratings(page, true)` enables both `showRatings` and
`showChallengeRatings` in `localStorage` for builder and challenge dossiers).

## Measurements

### Artifact and chunk sizes

| Item | Raw bytes | Gzip bytes |
| --- | --- | --- |
| `src/data/scouting-contributions.json` (on disk) | 76,204 | 6,538 |
| Lazy client chunk `/_next/static/chunks/0dpet79lzsrgy.js` | 75,483 | 6,844 |
| `src/data/pokedex.json` (`f41cdbd6...`, unchanged) | 491,341 | - |
| `src/data/scouting.json` (`9f771c3a...`, unchanged) | 847,264 | - |

### First-load JS before (`98696957`) vs after (`1e37cdd9`)

| Route | Chunks | Raw before | Raw after | Raw delta | Gzip before | Gzip after | Gzip delta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 12 | 787,279 B | 787,279 B | 0 B | 246,002 B | 246,006 B | +4 B |
| `/play` | 11 | 748,207 B | 748,207 B | 0 B | 232,059 B | 232,059 B | 0 B |
| `/daily` | 11 | 750,329 B | 750,329 B | 0 B | 233,116 B | 233,115 B | -1 B |

The lazy contribution chunk `/_next/static/chunks/0dpet79lzsrgy.js` is absent from the initial
`/_next/static/chunks/` script tags of `/`, `/play`, and `/daily` (`inHomeFirstLoad: false`,
`inPlayFirstLoad: false`), and loads only when `ScoutingDossier` opens with `showRatings` enabled.

### 308x568 viewport measurement (`e2e/dossier-contributions.spec.ts`)

- `document.documentElement.scrollWidth - document.documentElement.clientWidth`: `0` px
- `dialog.scrollWidth - dialog.clientWidth`: `0` px
- `grid.scrollWidth - grid.clientWidth`: `0` px
- `dialog.clientWidth`: `284` px

## Product and implementation decisions

- **Separate module `src/scouting/scouting-contributions.ts` loaded via dynamic `import()`:**
  `src/scouting/scouting.ts` is imported by `src/engine/` and server routes. Keeping
  `SCOUTING_CONTRIBUTIONS` in `src/scouting/scouting-contributions.ts` and importing it inside
  `ScoutingDossier.tsx` via `const loadContributions = () => import("@/scouting/scouting-contributions")`
  keeps `.next/server/chunks` retained JSON copies unchanged (4 copies, 2,891,853 B) and keeps `/`
  and `/play` first-load JS unchanged (0 B raw growth).
- **Caching the resolved map at module scope in `ScoutingDossier.tsx`:** Once the first dossier open
  resolves `loadContributions()`, `cachedContributions` stores `SCOUTING_CONTRIBUTIONS_BY_ID` so
  subsequent dossier opens render contributions synchronously on the first paint without flashing.
- **Layer 2 `Review` line alongside `Abilities` and `Moves`:** `entry.adjustments` in
  `src/data/scouting.json` already holds the non-zero Layer 2 review deltas per attribute. Rendering
  `Review +n` (`data-testid="attr-review-<ATTR>"`) alongside `Abilities +n` and `Moves +n` under the
  affected bar, while keeping the header badge (`data-delta`) and `.num` count at 17, satisfies both
  the hand-off requirement ("Show the non-zero Layer 2 review adjustment as its own `Review +n` line,
  and label the numbers as contributions to the baseline before the review adjustment and 1 to 99
  clamp") and the existing `ScoutingDossier.test.tsx` structural invariants (`17` `.num` spans, `17`
  `[data-delta]` badges, `17` `[style]` bar fills inside `.attrGrid`).
- **Blind challenge mode (`showRatings={false}`):** `loadContributions()` is not called when
  `showRatings` is `false`, and the entire attribute grid, contribution lines, and explanatory note
  are omitted when `showRatings` is `false` (decision 3).

## Brief vs code

Every cited file and line in the hand-off (`4.3 6d dossier contributions`) matched the branch head:

- `src/scouting/attributes.ts:147-198`: `computeBaselines` computes `AttributeBreakdown` (`stats`,
  `body`, `abilities`, `moves`, `total`) for each of the 17 attributes.
- `src/scouting/build.ts:37`: `buildScoutingEntries` previously mapped `computeBaselines` to `b.total`
  only and discarded `b.abilities` and `b.moves`.
- `src/components/scouting/ScoutingDossier.tsx:249-280`: rendered the 17 attribute bars with the
  header `data-delta` badge (`entry.adjustments[attr]`) and `Abilities & Signature Moves` below at
  lines 296-328.
- No discrepancies between the brief/hand-off and the codebase.

## Carryovers

None assigned to row 6d.

## NOT RUN

- Non-Chromium Playwright projects (`iphone-se`, `iphone-14`, `pixel-7`, `webkit-wheel`,
  `webkit-progress`) and unrelated Chromium specs outside the 6-spec dossier/ratings/data-split set.
- Coordinator review, preview/production database steps, merge, and post-merge live check.
- Hosted CI.
- Physical phone check and screen reader pass.
