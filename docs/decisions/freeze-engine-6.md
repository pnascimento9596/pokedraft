# Freeze engine 6 (6b0)

Wave 6 row 6b0, Red. Branch `chore/freeze-engine-6` off `origin/main` at `969ca1c` (the 6a1
squash), with no engine change in between. The bundle is dormant: nothing imports it.

## Who notices

Nobody. Engine 6 stays live and every run, link and board row replays exactly as before. This row
puts a byte-for-byte copy of engine 6 in the repo so that 6b9 can route `pd6` links to it when
engine 7 goes live. The next engineer inherits one `GOLDEN_CUP8_V6` literal instead of three.

## Scope and files

- `src/engine/versions/v6/` (new, 36 files). Written by
  `pnpm tsx scripts/engine/freeze-version.mts --name v6` from this tree at `969ca1c`: 34 copied
  files, `index.ts` and `MANIFEST.json`.
- `.prettierignore`. Lists `src/engine/versions/v6`, as for v1 to v5: a reformat would void the
  digest.
- `src/engine/versions/__tests__/fixtures.ts`. `GOLDEN_CUP8_V6` and `GOLDEN_KANTO151_V6` as
  literals, cut from the `goldens.test.ts` scripts (seeds `golden-cup8`, `golden-kanto151`).
- `src/engine/versions/__tests__/versions.test.ts`. A v6 block like v5's: golden token SHAs, raw
  replay SHAs through the v6 bundle, the bundle's names, and the bundle digest. No routing test,
  because the dispatcher does not know v6 yet.
- `src/leaderboard/server/__tests__/fixtures.ts`. Re-exports `GOLDEN_CUP8_V6` from the versions
  fixtures instead of holding its own copy.
- `scripts/build/check-retained-replays.mts`. Imports `GOLDEN_CUP8_V6` from the versions fixtures
  instead of holding its own copy. Its v6 case still replays through the live engine.

Not wired, as the hand-off decides: `RETAINED` and `retainedTokenVersions()` in
`src/engine/versions/index.ts`, `RETAINED_TOKEN_VERSIONS` in `label.ts`, `src/proxy.ts` and
`lazy-loading.test.ts` are unchanged. `src/scouting`, `scripts/data` and `src/data` are untouched.
`goldens.test.ts` is byte-identical to `origin/main`.

## Parity guard

The RED/GREEN equivalent for a row that must not move engine output.

RED commit `35bf588` adds the fixtures and the v6 test block before the bundle exists.
`pnpm vitest run src/engine/versions/__tests__/versions.test.ts`, 1 of 1 file failed, 0 tests ran:

```
 FAIL  src/engine/versions/__tests__/versions.test.ts [ src/engine/versions/__tests__/versions.test.ts ]
Error: Cannot find module '../v6' imported from /Users/paulo/Projects/pokedraft-freeze-engine-6/src/engine/versions/__tests__/versions.test.ts
 ❯ src/engine/versions/__tests__/versions.test.ts:14:1
     12| import * as v4 from "../v4";
     13| import * as v5 from "../v5";
     14| import * as v6 from "../v6";
       | ^
     15| import { fromLegacy, type LegacyCupResult, type LegacyV3CupResult } fr…
     16| import { buildLadder as v1Ladder } from "../v1/src/engine/opponents";

 Test Files  1 failed (1)
      Tests  no tests
```

GREEN commit `ae838a2` adds the bundle. `pnpm vitest run src/engine/versions`: 41 passed in 4
files. The v6 block pins these literals:

| Value                         | Pinned                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| sha256 `GOLDEN_CUP8_V6`       | `91d7a44a3e489b6740655ea38cf75d4ad83d2399b7cd53d706229ac8cebb30a4` |
| v6 replay, cup8               | `2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e05` |
| sha256 `GOLDEN_KANTO151_V6`   | `6b4f9d46c3b88d5dab4135b91913e37ba1b909b41e9efd227fd9bd217b935c14` |
| v6 replay, kanto151           | `eb3664642c3c0bd9ee50cb4382182c73e070dad7896e620492d5b0e5b8b12747` |
| cup8 score, wins, finish      | 593, 5, QF                                                         |
| kanto151 score, wins, finish  | 480, 3, R32                                                        |
| bundle digest (36 files)      | `b0b922bc1eef6e7ec4af9bf64e4af10206e894fdfc5d5f317eaf75b85d604397` |

The token and replay hashes are the same literals `goldens.test.ts` pins for the live engine, so
the frozen bundle and the live engine agree on both goldens.

The literals were generated once by a scratch script that reruns the `goldens.test.ts` scripts.
It printed `91d7a44a...`, `2b26ee82...`, `6b4f9d46...` and `eb366464...`, the same values the live
goldens pin. The cup8 literal is byte-identical to the two copies it replaces.

## Provenance

`bash scripts/engine/check-bundle-provenance.sh v6 969ca1c`, exit 0, verbatim:

```
  src/engine/availability.ts < import { familiarity } from "@/scouting/fit";
  src/engine/availability.ts > import { familiarity } from "../scouting/fit";
  src/engine/draft.ts < import { TYPES } from "@/data/pokedex";
  src/engine/draft.ts > import { TYPES } from "../data/pokedex";
  src/engine/match.ts < import { familiarity } from "@/scouting/fit";
  src/engine/match.ts > import { familiarity } from "../scouting/fit";
  src/engine/opponents.ts < import { TYPES, type PokemonType } from "@/data/pokedex";
  src/engine/opponents.ts > import { TYPES, type PokemonType } from "../data/pokedex";
  src/engine/rng.ts < import { compareCodePointStrings, cyrb128, sfc32 } from "@/lib/rng";
  src/engine/rng.ts > import { compareCodePointStrings, cyrb128, sfc32 } from "../lib/rng";
  src/engine/rng.ts < export { compareCodePointStrings } from "@/lib/rng";
  src/engine/rng.ts > export { compareCodePointStrings } from "../lib/rng";
  src/engine/roles.ts < import { COEFFICIENTS } from "@/scouting/coefficients";
  src/engine/roles.ts < import { ROLES, type Role } from "@/scouting/types";
  src/engine/roles.ts > import { COEFFICIENTS } from "../scouting/coefficients";
  src/engine/roles.ts > import { ROLES, type Role } from "../scouting/types";
  src/engine/species.ts < import { POKEDEX } from "@/data/pokedex";
  src/engine/species.ts < import { SCOUTING } from "@/scouting/scouting-data";
  src/engine/species.ts < import { ROLES } from "@/scouting/types";
  src/engine/species.ts > import { POKEDEX } from "../data/pokedex";
  src/engine/species.ts > import { SCOUTING } from "../scouting/scouting-data";
  src/engine/species.ts > import { ROLES } from "../scouting/types";
  src/engine/team.ts < import { familiarity } from "@/scouting/fit";
  src/engine/team.ts > import { familiarity } from "../scouting/fit";
  src/engine/type-chart.ts < import raw from "@/data/type-chart.json";
  src/engine/type-chart.ts < import { TYPES } from "@/data/pokedex";
  src/engine/type-chart.ts > import raw from "../data/type-chart.json";
  src/engine/type-chart.ts > import { TYPES } from "../data/pokedex";
  src/engine/types.ts < import type { PokemonType } from "@/data/pokedex";
  src/engine/types.ts < import type { Attributes, Role, RoleFits } from "@/scouting/types";
  src/engine/types.ts > import type { PokemonType } from "../data/pokedex";
  src/engine/types.ts > import type { Attributes, Role, RoleFits } from "../scouting/types";
  src/engine/types.ts < export type { PokemonType } from "@/data/pokedex";
  src/engine/types.ts < export type { Attributes, Role, RoleFits } from "@/scouting/types";
  src/engine/types.ts > export type { PokemonType } from "../data/pokedex";
  src/engine/types.ts > export type { Attributes, Role, RoleFits } from "../scouting/types";
  src/scouting/coefficients.ts < import type { PokemonType, Shape } from "@/data/pokedex";
  src/scouting/coefficients.ts > import type { PokemonType, Shape } from "../data/pokedex";
  src/scouting/review.ts < import type { Species } from "@/data/pokedex";
  src/scouting/review.ts > import type { Species } from "../data/pokedex";
  src/scouting/scouting-data.ts < import raw from "@/data/scouting.json";
  src/scouting/scouting-data.ts > import raw from "../data/scouting.json";
provenance ok: 34 files in src/engine/versions/v6 match 969ca1c; only @/ import lines differ
```

Re-freeze check (what the Red reviewer repeats): `git archive 969ca1c` into a scratch directory,
`pnpm exec tsx <scratch>/scripts/engine/freeze-version.mts --name v6` there, then
`diff -r <scratch>/src/engine/versions/v6 src/engine/versions/v6` exited 0 with no output. A trial
freeze before the RED commit gave the same digest, so the freeze is deterministic.

## Dead code proof

After a fresh `pnpm build` at `e54e63c`:

- `grep -rl 'retained-engine-bundle:v6' .next/static | wc -l` printed 0, and the same over
  `.next/server` printed 0. The control, `retained-engine-bundle:v5` over `.next/server`, printed 4.
- `node scripts/build/measure-retained-json.mjs .next/server/chunks` exited 0 with
  `"totalCopies": 4` and 2,891,853 payload bytes, the same as the 1l baseline.
- `pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: 10 emitted golden
  replays passed, the v6 case through the live engine at `2b26ee82...`.

## One literal

`git grep -n 'GOLDEN_CUP8_V6 ='` finds one hit, `src/engine/versions/__tests__/fixtures.ts:44`.
Every importer (the leaderboard server and component tests, `check-retained-replays.mts`) now reads
that one. The full token string also appears twice in `e2e/pins.ts` (and the kanto151 token once).
That file is generated by `pnpm e2e:pins` from the live engine, not a hand literal, and 6t owns it,
so it stays.

## Decisions

- The RED test carries the final digest. I froze once, read the digest, deleted the directory,
  committed the test, and froze again. The GREEN commit then adds only the bundle and the
  `.prettierignore` line, and the identical second digest proves the freeze is deterministic.
  Principle: sequence work into verifiable units.
- `.prettierignore` gains `src/engine/versions/v6`. The hand-off does not list it, but every
  earlier bundle is there for the same reason, and `prettier --check .` would otherwise reformat
  the rewritten import lines and break the digest.
- The leaderboard fixtures re-export rather than every importer switching path. Seven test files
  import it from there; one line moves instead of seven. Principle: laziness protocol.
- No routing or lazy-loading test for v6. The hand-off keeps the bundle unwired until 6b9, so the
  existing `[1, 2, 3, 4, 5]` assertions in `lazy-loading.test.ts` and the retained-list parity test
  stay as they are and still pass.

## Brief vs code

- The hand-off (4.2) says the only `pd6` golden literal is in `check-retained-replays.mts:23-24`. A
  second byte-identical copy lived at `src/leaderboard/server/__tests__/fixtures.ts:87-89`, as the
  coordinator's code map corrections say. Both are consolidated.
- `src/engine/story.ts` (6a1's `matchStory`) is not in the frozen closure. The freeze roots are
  `replay.ts` and `types.ts`, and nothing on the replay path imports `story.ts`. The bundle does
  carry `playMatchCore` and `cupMatchInput` in its `match.ts` and `cup.ts`. See carryovers.
- The hand-off does not mention `.prettierignore`; see Decisions.

## Measurements

Engine output is unchanged by construction (no live engine file changed), so no probe was re-run
against the 6p baseline.

## NOT RUN

- Review (GLM and the Red reviewer) and hosted CI: the coordinator runs them.
- Playwright: no UI or route changed.
- Calibration probes: engine output cannot move in this row.
- Phone check and screen reader pass: no UI changed.

## Carryovers

- For 6b9: wire v6 into `RETAINED`, `RETAINED_TOKEN_VERSIONS`, the proxy's codec branches, the
  lazy-loading list, `measure-retained-json.mjs` names and a `check-retained-replays.mts` case
  moved from the live engine to the v6 bundle, plus a `GOLDEN_KANTO151_V6` case there.
- For 6a2 and 6b9: a shared `pd6` link after the flip cannot get a `matchStory` from this bundle,
  because `story.ts` is not in it. If 6a2 shows the xG river on shared runs, 6b9 must decide what a
  retained run shows instead, and whether the engine 7 freeze roots should include `story.ts`.
