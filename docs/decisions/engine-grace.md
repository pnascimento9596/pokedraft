# Engine grace window and version plumbing (6g)

Wave 6 row 6g, Red. Branch `feat/engine-grace` off `origin/main` at `8059458` (the 6b0 squash).
Dormant: `GRACE` is `null`, so production behaviour is exactly today's.

## Who notices

Nobody yet. When 6b9 flips the engine and sets `GRACE`, a friend who finished an engine 6 run just
before the flip can still submit it for about a day. The run is replayed on the frozen engine 6
bundle, stored as an engine 6 row and ranked among engine 6 rows. The flip day's Daily stays on
engine 7 only. Coached engine 7 runs keep their Coached marker from the first submission.

The next engineer inherits one constant to set (`GRACE` in `src/leaderboard/server/grace.ts`), a
proxy guard that goes RED at the flip until pd6 links get a codec branch, and a canonical-form
guard that 6b9 must keep green after the codec changes.

## Scope and files

- `src/leaderboard/server/grace.ts` (new). The `Grace` type, `GRACE = null`, and `openGrace`, which
  returns the window only for a token with the retired prefix before `until`.
- `src/leaderboard/server/handlers.ts`. The grace path in `parseSubmission` and the lazy retained
  replay in `handleSubmit`. `SubmitDeps.grace` injects the window in tests; absent means `GRACE`.
- `src/leaderboard/server/store.ts`. An all-time `Board` can name one engine, and `rankedBoard`
  takes the run's engine.
- `src/ui/manager/coached.ts`. `MANAGER_TOKEN_VERSIONS = [6, 7]`.
- `src/components/leaderboard/SubmitPanel.tsx` and its CSS. The grace line and the all-engines
  board link.
- Tests: `src/leaderboard/server/__tests__/grace.test.ts` (new),
  `src/ui/manager/__tests__/coached.test.ts`, `src/__tests__/proxy.test.ts`,
  `src/components/leaderboard/__tests__/SubmitPanel-grace.test.tsx` (new),
  `e2e/grace-submit.spec.ts` (new).
- Browser proof: `docs/reports/engine-grace/submit-grace-{390,360,320}.png`.

No file under `src/engine`, `src/scouting`, `scripts/data` or `src/data` changed.
`goldens.test.ts` is byte-identical to `origin/main`.

## RED then GREEN

Regression guard commit `cd524a2`, no RED: behaviour already correct. The proxy guard passes a
golden token of every version in `RETAINED_TOKEN_VERSIONS`, `RUN_TOKEN_VERSION` and
`FLIP_RETAINS = 6` through the proxy and expects no `/run-not-found` rewrite. A mutation check (the
`pd5.` branch renamed to `pd9.`) made it fail with the `/run-not-found` rewrite, then the file was
restored. At the flip the list becomes 1 to 7. It fails until `GOLDEN_CUP8_V7` exists and until
`src/proxy.ts` has a `pd6.` branch, which is the RED 6b9 needs.

RED commit `82e5bcd`. `pnpm vitest run src/leaderboard/server/__tests__/grace.test.ts
src/ui/manager/__tests__/coached.test.ts
src/components/leaderboard/__tests__/SubmitPanel-grace.test.tsx`, 9 of 19 failed:

```
 FAIL  src/components/leaderboard/__tests__/SubmitPanel-grace.test.tsx > SubmitPanel after an engine change (catches a grace run told it is on the current board) > says which engine's board ranked a run the grace window accepted, and links to all engines
TestingLibraryElementError: Unable to find an element by: [data-testid="submit-grace"]
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > accepts a retired-engine all-time run sent by the old page with 201 and stores its own engine
AssertionError: expected [ 409, undefined, undefined ] to deeply equal [ 201, 'pokedraft-engine-5', …(1) ]
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > accepts the same run from a page that reloaded onto the live engine with 201
AssertionError: expected [ 409, undefined ] to deeply equal [ 201, 'pokedraft-engine-5' ]
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > accepts a retired-engine run for the previous day's Daily with 201 on that date
AssertionError: expected [ 409, undefined, undefined ] to deeply equal [ 201, '2026-10-08', …(1) ]
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > answers a retry with 200 and a copy under another nickname with 409 DUPLICATE_TOKEN
AssertionError: expected [ 409, 409, undefined ] to deeply equal [ 201, 200, …(1) ]
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > ranks a grace run among its own engine's runs and lists it under all engines only
AssertionError: expected [ 409, undefined ] to deeply equal [ 201, 1 ]
 FAIL  src/ui/manager/__tests__/coached.test.ts > isCoached reads every manager-capable version (catches retained coached runs losing the marker once a newer token ships) > lists versions 6 and 7 as carrying the manager list
AssertionError: expected [ 6 ] to deeply equal [ 6, 7 ]
 FAIL  src/ui/manager/__tests__/coached.test.ts > isCoached reads every manager-capable version (catches retained coached runs losing the marker once a newer token ships) > marks a coached pd7 token coached (catches every engine 7 coached run stored as uncoached)
AssertionError: expected false to be true // Object.is equality
 FAIL  src/ui/manager/__tests__/coached.test.ts > isCoached reads every manager-capable version (catches retained coached runs losing the marker once a newer token ships) > marks a payload with a fourth element coached on each listed version, and not on others
AssertionError: expected [ true ] to deeply equal [ true, true ]
 Test Files  3 failed (3)
      Tests  9 failed | 10 passed (19)
```

The 10 that passed are regression guards for behaviour that is already correct: the refusals (third
engine string, after `until`, no window, the flip-day Daily), the exact engine rule for live tokens
inside the window, the canonical-form guard, the live-engine panel without a grace line, and the
earlier coached tests.

GREEN commit `c93e5ea`. All 19 pass.

Build fix commit `34069ba`. The GREEN commit imported `@/engine/versions` statically into
`handlers.ts`. The build split the submit route's chunks differently and emitted a second copy of
the live scouting data. `node scripts/build/measure-retained-json.mjs .next/server/chunks` failed
with `AssertionError [ERR_ASSERTION]: unexpected emitted data payload count` and `5 !== 4`
(`live/scouting` copies 2). `handleSubmit` now loads the dispatcher with `await import()` only for
a grace run. The same check then reported 4 payloads, 2,891,853 bytes, the 6b0 figure.

## Measurements

Engine output cannot move: no engine file changed, `goldens.test.ts` is byte-identical, and
`check-retained-replays.mts` passed its 10 golden replays with the live v6 replay `2b26ee82...`.
The 6p probe numbers were NOT RUN for that reason.

Grace line fit in Chromium (`e2e/grace-submit.spec.ts`), text width against the line's box:

| Viewport | Text px | Box px | Headroom px |
| -------- | ------- | ------ | ----------- |
| 390      | 217     | 324    | 107         |
| 360      | 217     | 294    | 77          |
| 320      | 217     | 254    | 37          |
| 308      | 217     | 242    | 25          |

## Product decisions applied (hand-off 4.3, 6g)

- `GRACE` lives in `src/leaderboard/server/`, typed
  `{ version; engine; until: IsoDateTime; flipDate: IsoDate } | null`, `null` here.
- In the window a token with the retired prefix is accepted with body `engineVersion` absent, equal
  to `GRACE.engine`, or equal to the live `ENGINE_VERSION`. Live tokens keep the exact-match rule.
- The run replays through `replayAnyVersion`, its token is canonicalised with `canonicalToken`
  from `read-token.ts` (strip the prefix, re-encode with the live codec, re-prefix), and the row
  stores `engine_version = cup.engine`.
- A grace run whose daily date is on or after `flipDate` gets the existing stale-run 409
  (`ENGINE_VERSION_MISMATCH`), so the panel copy is today's.
- Rate limiting, the copy guard and the fingerprint are unchanged: the grace path uses the same
  admission, insert and conflict code.
- `MANAGER_TOKEN_VERSIONS = [6, 7]`.
- The submit result says "Ranked on the engine 6 board." for an engine 6 row once engine 7 is live,
  built from `engineLabel`.

## Implementation decisions

- **Rank on the run's own engine.** `rankedBoard` used to put every all-time run on the "current"
  board, which filters on the live `ENGINE_VERSION`. A grace row would have been ranked against
  engine 7 rows it is not listed with. An all-time `Board` can now name one engine
  (`{ version }`), and `rankedBoard(mode, dailyDate, engine)` returns `"current"` for the live
  engine and `{ version }` otherwise. The insert and the retry path both pass the row's stored
  engine. For live runs the board object and the SQL are unchanged. The grace test pins rank 1 for
  an engine 5 run behind an engine 6 row with 8 wins. The old rule would have said 2.
- **Retained errors.** A retained bundle throws its own copy of `RunTokenError`, so `tokenError`
  matches on the error's name instead of the class. Live errors map exactly as before.
- **Decode before replay.** The grace path decodes with the live codec under the live prefix
  first, so a damaged token gets today's typed error codes before any database work.
- **`TOKEN_MALFORMED` when `canonicalToken` returns null.** That only happens if `GRACE.version`
  is neither live nor retained, which is a misconfiguration. Refusing beats storing a non-canonical
  token.
- **`IsoDateTime` is a template literal type**
  (`${number}-${number}-${number}T${number}:${number}:${number}Z`), so `"tomorrow"` fails to compile.
  A scratch `tsc` check confirmed both cases and was deleted.
- **The grace line is its own paragraph** under the success line, so the focused success sentence
  stays as it was. The board link adds `engine=all` for a grace run, because the current-engine
  board does not list it after the flip.
- **The coached guard literal.** No coached pd6 token existed in the repo. `COACHED_V6` is
  `GOLDEN_CUP8_V6`'s draft plus one tactic, encoded by the engine 6 codec at `8059458`, and pinned
  as a literal.

## Brief vs code

- The hand-off's guard names "the production golden pd6 Daily row's token". That token is not in
  the repo, and this row has no database access. Per the coordinator, the guard uses
  `GOLDEN_CUP8_V6` and the coached literal above.
- The hand-off says a reloaded results page "sends the engine 7 string with a pd6 token, and that
  is the common case". Inferred from code, not seen in a browser: `SubmitPanel` renders only in
  `LiveRun`, and `savedRun.ts:117-131` rebuilds a saved run with the live `decodeToken`, which
  throws `unknownVersion` on a pd6 token after the flip. A reloaded engine 7 page then has no pd6
  result to submit. Grace submissions would come from pages still on the engine 6 bundle, with
  body `engine-6`. Accepting both strings costs nothing, so the hand-off's rule stands. 6b9 should
  confirm in a browser.
- `rankedBoard` (`store.ts:25-27` at `8059458`) hard-coded the current-engine board. The hand-off
  says the row "ranks on that engine's board" without naming this function. Fixed as above.
- The hand-off does not anticipate the chunk split. A static import of the dispatcher costs a
  second 802 KB scouting payload. Fixed with a lazy import.
- `handlers.ts:199-205`, `:214`, `:223`, `:234`, `:236`, `coached.ts:7`, `label.ts:10` and
  `proxy.ts:3-4, 18-24` matched the code map at `8059458`.
- `canonicalToken` already existed in `read-token.ts:18-21`. It is reused, not duplicated.

## Carryovers for 6b9

- Set `GRACE = { version: 6, engine: "pokedraft-engine-6", until, flipDate }`.
- Add `GOLDEN_CUP8_V7` to `GOLDEN_BY_VERSION` in `proxy.test.ts`. The proxy guard then fails on pd6
  until `src/proxy.ts` gets its `pd6.` branch.
- Keep the canonical-form guard in `grace.test.ts` green on the engine 7 codec.
- `grace.test.ts` uses engine 5 as the retired engine and `"pokedraft-engine-6"` as the live
  string. It stays valid after the flip only if the live-string literals move to engine 7.
- `measure-retained-json.mjs` is not in CI. A static import of `@/engine/versions` into another
  shared server module could re-split chunks the same way.

## NOT RUN

- Review (GLM and the Red reviewer) and hosted CI: the coordinator runs them.
- The preview-branch API proof (pd6 submit 201, retry 200, delete): the coordinator runs it with
  the Red reviewer. This row touched no database.
- Calibration probes: engine output cannot move.
- The full Playwright suite: not required for this row. The related specs ran (see STATE).
- Phone check and screen reader pass: owner actions.
