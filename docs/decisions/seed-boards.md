# Seed boards and engine filter (5g)

Wave 5 row 5g, Red. Branch `feat/seed-boards` off `origin/main` at `07beda9` (which includes 5f1
#126 and 5f2 #129). The row spec is hand-off section 4.3 "5g seed and engine boards". No file under
`src/engine`, `src/data` or `src/scouting` changed, and there is no migration.

## Who notices

A player on the all-time board sees only runs played on the current engine (v6) by default. The
caption says "8-0 Challenge, all-time, engine v6." An "All engines" button next to the coach chips
adds older runs, each labelled "Engine v3" (or its own version), and the URL gains `engine=all`.
Daily boards are unchanged: a date already pins the engine that was live that day.

After a cup, live results and every shared `/r/` page show a "Friends on this seed" table: every
submitted run on the same seed and mode, best first, up to 20, across engines and dates. The
current run's row says "This run", and older-engine rows say "Engine vN". The table is fetched
after the page loads. When nobody submitted the seed it does not appear. When the fetch fails it
says "Board unavailable" instead of an empty table. Builder friendlies have no table.

A player who submits to the all-time board is told the rank they hold on the board the "View
leaderboard" link opens, the current-engine one.

The next engineer inherits three new `BoardEntry` fields (`engineVersion`, `seed`, `formation`), a
`Board` union that names the engine view, a `seedBoard` store method, a third `scope: "seed"` query
branch, and one token reader (`src/ui/read-token.ts`) in place of two copies of the prefix-rewrite
decode.

## Scope and files

- `src/leaderboard/contract.ts`: `ENGINE_FILTERS` and `EngineFilter`, `SEED_BOARD_LIMIT = 20`,
  the three `BoardEntry` fields, `BoardOk.engine` and `BoardOk.seed`, `scope: "seed"` in
  `BoardOk`, and the third `boardQuerySchema` branch. The seed uses the token payload's rule (a
  string that is not blank after trim), capped at `TOKEN_MAX`.
- `src/leaderboard/server/store.ts`: `Board` is a union (daily, or all-time with an `engine`);
  `rankedBoard(mode, dailyDate)` gives the board a submit is ranked on; `boardFilter` adds
  `engine_version = ENGINE_VERSION` for the current view; `seedBoard(mode, seed)` returns the top
  20 in board `ORDER`; `toBoardEntry` reads the squad and the formation from one decode.
- `src/leaderboard/server/handlers.ts`: `handleBoard` infers `scope=seed` when `seed` is present,
  answers the seed board, and echoes `engine` and `seed`. Submit and retry use `rankedBoard`.
- `src/leaderboard/server/squad-preview.ts`: exports `squadOf(run)`; `readStoredToken` is gone.
- `src/ui/read-token.ts` (new): `readAnyToken(token)`, the live or retained token decode with the
  prefix rewrite. `challengeHref`, `toBoardEntry` and the seed table use it.
- `src/components/leaderboard/client.ts`: `BoardView.engine`, `engine=all` in the page URL and the
  API query for the all-time board only, the three entry fields in `entrySchema`, an `engine` echo
  check, and `fetchSeedBoard(mode, seed)`.
- `src/components/leaderboard/Board.tsx`, `Board.module.css`, `format.ts`: the "All engines"
  `aria-pressed` button on the all-time board in every state (loading, error, empty, rows) and the
  `engineRowLabel` row label.
- `src/components/leaderboard/LeaderboardScreen.tsx`: the caption names the engine view.
- `src/components/leaderboard/SeedBoard.tsx` and `SeedBoard.module.css` (new): the table.
- `src/components/results/ResultsView.tsx`: one import and one mount, `<SeedBoard token={token} />`.
- Tests: `src/leaderboard/server/__tests__/seed-board.test.ts` (new, PGlite),
  `board-entry.test.ts`, `src/components/leaderboard/__tests__/board-engine.test.tsx` and
  `seed-board.test.tsx` (new), and fixture churn listed below.
- e2e: `e2e/seed-board.spec.ts` (new), `e2e/helpers.ts` (`emptySeedBoard`), and stub shapes in
  `leaderboard.spec.ts`, `a11y.spec.ts`, `contrast.spec.ts`, `platform-experience.spec.ts` and
  `mobile/scenes.ts`.

## Product decisions applied

- Decision 6 (brief section 2): store the engine per row (it already was, `engine_version`), show it
  on rows, default the all-time board to the current engine with an "All engines" toggle.
- The hand-off's re-decision on labels: only rows whose engine is not current carry "Engine vN",
  the same rule as the shared page's kicker. Principle: say what differs.
- Daily boards are not engine filtered. The API refuses `engine` on a daily query with 400 rather
  than ignoring it.
- No migration. The table holds 3 rows on production, and a seed filter on a table under 10,000
  rows is a sub-millisecond scan. Threshold recorded in `store.ts` next to `seedBoard`: add
  `(mode, seed)` to an index if a later wave passes 10,000 rows.
- Blind challenges (decision 3) do not apply: the seed table shows recorded results after the cup.

## Implementation decisions

**The table sits after "How the eleven fit", not under the hero (re-decided).** The hand-off puts
it after `ShareActions`. Built there, `e2e/layout-shift.spec.ts` failed 3 of 10: the `/r` phone load
and the SX-06 saved-run restore at 360 and 390 px, with CLS 0.1456 at 360 px (retry 1). The table
arrives after mount, by design, so anything below it moves. Below the squad card it is under the
first viewport on every page the spec measures, and the same spec passed 10 of 10. Principle:
experience first; the page must not jump under the player's thumb, and the table still shows on
both pages. Both hand-off premises stay intact (client fetch after mount, server HTML pinned).

**An all-time submit is ranked on the current-engine board.** Before this row the submit rank
counted every engine. With the default view filtered, a leader could read "#2" and open a board
where they are first. `rankedBoard` gives submit and retry the same view the "View leaderboard"
link opens. Guard: "a fresh all-time submit is ranked among current-engine runs" (RED, `[201, 2,
...]` before).

**"Unknown seed" means a malformed seed, not an unplayed one (re-decided).** The hand-off says an
"unknown or empty seed is a 400". A seed nobody has submitted is the normal case for a fresh run,
and a 400 there would show "Board unavailable" on most results pages. An empty, blank or too long
seed is 400 `INVALID_QUERY`; an unplayed seed is 200 with no entries, and the table hides. A seed
with `scope=all`, `date`, `coach` or no `mode` is also 400.

**The client checks the `engine` echo.** `fetchBoard` already refuses a reply for another coach
view. It now also refuses a reply whose `engine` is not the view it asked for (`all` for a daily
board). This is what forced the e2e stub churn.

**One token reader.** `challengeHref` and `readStoredToken` held the same prefix-rewrite decode.
`readAnyToken` replaces both, and after the #132 merge `readTokenRun` delegates to it. The seed table needs it on the client, and `challengeHref` already
proved it client-safe. It imports `@/engine/token`, `@/engine/types` and
`@/engine/versions/label`, never `@/engine/versions`; `check:client-bundle` passed.

**The toggle shows in every all-time state.** The current-engine board can be empty while older
runs exist (production today has engine 3 rows), so the toggle renders with the empty state too.

**The error state has no role="alert".** A secondary table failing on page load should not
interrupt a screen reader on every shared link.

**Formation is null, never guessed, when the token does not decode.** The table shows "Unknown".

## RED

RED commit `b10dad5`. Vitest, 4 files: 26 of 37 failed, and `seed-board.test.tsx` failed to load
because `SeedBoard` did not exist.

```
 FAIL  src/components/leaderboard/__tests__/board-engine.test.tsx > All engines toggle and engine labels (catches older-engine runs shown unlabelled) > asks for engine=all when pressed and labels only the older-engine row
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "All engines"
 FAIL  src/components/leaderboard/__tests__/board-engine.test.tsx > client board contract (catches engine, seed and formation stripped from board rows) > fetchBoard keeps engineVersion, seed and formation on every entry
AssertionError: expected { kind: 'ok', …(1) } to deeply equal { kind: 'ok', …(1) }
 FAIL  src/components/leaderboard/__tests__/board-engine.test.tsx > client board contract (catches engine, seed and formation stripped from board rows) > fetchBoard treats a reply for the other engine view as unexpected
AssertionError: expected { kind: 'ok', entries: [ { …(12) } ] } to deeply equal { kind: 'error', reason: 'unexpected' }
 FAIL  src/components/leaderboard/__tests__/board-engine.test.tsx > client board contract (catches engine, seed and formation stripped from board rows) > reads engine=all from an all-time link and drops it from a daily one
AssertionError: expected undefined to be 'all' // Object.is equality
 FAIL  src/components/leaderboard/__tests__/seed-board.test.tsx [ src/components/leaderboard/__tests__/seed-board.test.tsx ]
Error: Failed to resolve import "@/components/leaderboard/SeedBoard" from "src/components/leaderboard/__tests__/seed-board.test.tsx". Does the file exist?
 FAIL  src/leaderboard/server/__tests__/board-entry.test.ts > toBoardEntry engine, seed and formation (catches a board row that cannot say which engine, seed or shape it was) > decodes the pd1 golden's formation in the same single parse
AssertionError: expected [ 1, undefined ] to deeply equal [ 1, '4-2-3-1' ]
 FAIL  src/leaderboard/server/__tests__/board-entry.test.ts > toBoardEntry engine, seed and formation (catches a board row that cannot say which engine, seed or shape it was) > decodes the pd1 151 golden's formation in the same single parse
AssertionError: expected [ 1, undefined ] to deeply equal [ 1, '3-5-2' ]
 FAIL  src/leaderboard/server/__tests__/board-entry.test.ts > toBoardEntry engine, seed and formation (catches a board row that cannot say which engine, seed or shape it was) > returns formation 4-3-3 for a 4-3-3 run
AssertionError: expected undefined to be '4-3-3' // Object.is equality
 FAIL  src/leaderboard/server/__tests__/board-entry.test.ts > toBoardEntry engine, seed and formation (catches a board row that cannot say which engine, seed or shape it was) > passes the stored engine version and seed through
AssertionError: expected [ undefined, undefined ] to deeply equal [ 'pokedraft-engine-3', 'golden-cup8' ]
 FAIL  src/leaderboard/server/__tests__/seed-board.test.ts > all-time engine filter (catches an engine 3 run ranked against engine 6 runs by default) > the default all-time board lists only current-engine runs and says so
AssertionError: expected undefined to be 'current' // Object.is equality
 FAIL  src/leaderboard/server/__tests__/seed-board.test.ts > all-time engine filter (catches an engine 3 run ranked against engine 6 runs by default) > a fresh all-time submit is ranked among current-engine runs, as the default board shows it (catches #2 for the leader of the board the link opens)
AssertionError: expected [ 201, 2, [ …(3) ] ] to deeply equal [ 201, 1, [ …(2) ] ]
 FAIL  src/leaderboard/server/__tests__/seed-board.test.ts > seed board (catches friends on one seed missing from each other's results) > returns exactly this seed's rows on this mode, in board order, across engines and boards
AssertionError: expected 400 to be 200 // Object.is equality
 FAIL  src/leaderboard/server/__tests__/seed-board.test.ts > seed board (catches friends on one seed missing from each other's results) > a seed nobody played is an empty board, not an error
AssertionError: expected [ 400, undefined ] to deeply equal [ 200, [] ]
 Test Files  4 failed (4)
      Tests  26 failed | 11 passed (37)
```

The excerpt shows one failure per distinct cause; the full list has all ten golden formation cases
(pd1 to pd6 cup8, pd1, pd2, pd4 and pd5 151) failing the same way, plus the null formation, the
`engine=all` board, the daily board, the unknown engine value, the 20-row cap and the seed on the
all-time board.

The 11 that passed at the RED commit: the 4 existing `toBoardEntry` tests, and 7 labelled
"regression guard, no RED: behaviour already correct": six of the seven seed 400 cases (the old
schema already refused them for lacking a scope) and "has no engine toggle on a daily board".

GREEN `6a8fee2`. `7a9e7d2` is Prettier on one test file.

The new `e2e/seed-board.spec.ts` was written with the implementation and never ran against the
RED build: NOT RUN as a RED.

## Measurements

- CLS with the table after `ShareActions`: `layout-shift.spec.ts` 3 of 10 failed, SX-06 at 360 px
  measured 0.14558161067561126 (expected 0). With the table after the squad card: 10 of 10 passed.
- Seed table at 320x640: the first layout overflowed its wrapper by 21 px and broke "3-4-2-1" and
  "7-1-0" across lines. Unwrapped numeric cells and unspaced headers fit: page and table overflow
  0 at 390, 360 and 320 (asserted in `seed-board.spec.ts`).
- No timing was measured for the seed query. The 10,000-row threshold is the hand-off's.

## Spec and test churn

Each changed assertion now states the new literal behaviour. No test was deleted.

- `LeaderboardScreen.test.tsx`: both all-time captions gain ", engine v6"; a new case pins
  "all-time, every engine." for `engine=all`. These literals changed with the GREEN commit, not in
  the RED commit.
- `Board.test.tsx`, `announce-board.test.tsx`, `SubmitPanel.test.tsx`, `coach-view.test.tsx`: the
  entry fixtures gain the three fields and the board replies gain `engine`.
- `board-harness.tsx`: holds the engine view in state as it holds the coach view.
- `coach-board.test.ts`, `retention.test.ts`: the all-time `Board` literal names `engine: "current"`.
- `squad-preview.test.ts`: calls `squadOf(readAnyToken(token)!)` and `readAnyToken` now that
  `readStoredToken` is gone.
- e2e stubs (`leaderboard`, `a11y`, `contrast`, `platform-experience`, `mobile/scenes`): rows gain
  the three fields, board replies gain `engine`. `contrast.spec.ts` answers the seed request with
  one row, so both themes score the table; `mobile/scenes.ts` answers it with none.

## Playwright

Full suite at `7a9e7d2` (`CI=1`, headless, six projects): 1,020 passed, 67 skipped, 0 failed
in 17.9m. `seed-board.spec.ts` 8 of 8 on chromium. Screenshots the suite rewrote outside
`docs/reports/seed-boards/` were reverted.

After the PR opened, `origin/main` gained #131 (share sheet) and #132 (head-to-head). Merged, not
rebased: `e54e9e2` (only `STATE.md` conflicted) and `026c596` (`STATE.md` and
`src/ui/challenge-href.ts`). #132 rewrote `challengeHref` on a new `readTokenRun` in
`src/ui/versus.ts`, a second copy of the prefix-rewrite decode. Main's `challenge-href.ts` is taken
as is, and `readTokenRun` now calls `readAnyToken` and keeps its own return shape, so the decode
lives in one place again; the `versus` and `head-to-head` tests pass unchanged. At `026c596`: lint,
typecheck, build and all nine `check:*` exited 0; unit tests 1,905 passed in 224 files; full
Playwright 1,034 passed, 67 skipped, 0 failed (19.2m).

## Brief vs code

- The hand-off's RED test asserts `formation: "4-3-3"` "for the fixture". The golden fixtures are
  4-2-3-1 (cup8) and 3-5-2 (151). The tests pin those for every retained version, and a separate
  scripted 4-3-3 run returns "4-3-3".
- The hand-off names the 400 code `BAD_QUERY`. The contract's code is `INVALID_QUERY`
  (`BOARD_ERROR_STATUS`); kept.
- The placement after `ShareActions` and the "unknown seed" 400: re-decided above.
- The code map's `BoardEntry` at `contract.ts:57-72` and `boardQuerySchema` at `:93-113` are at
  `:62-77` and `:98-118` at `07beda9`. `toBoardEntry` already decoded once (5f2).

## Commands for the coordinator

No migration, so no Neon step changes the schema. Read-only checks:

1. Preview or production, read-only SQL: `SELECT nickname, mode, seed, daily_date, engine_version
   FROM leaderboard_entries ORDER BY created_at;` The default all-time board after merge lists only
   rows whose `engine_version` is `pokedraft-engine-6`.
2. Post-merge real-API check with the gate cookie from the e2e gate helper:
   `GET https://pokedraft-woad.vercel.app/api/leaderboard?mode=cup8&seed=pokedraft%3Adaily%3Av1%3A70bad4b9718efdcf1df6c9b34262e8b7`
   should answer 200 with `scope: "seed"`, that seed, and the 2026-10-16 pd6 row with its
   `engineVersion`, `seed` and `formation`.
3. `GET /api/leaderboard?mode=cup8&scope=all` and `...&engine=all` should differ by exactly the
   rows whose `engine_version` is not `pokedraft-engine-6`.

## NOT RUN

- Every Neon query and the production real-API check (the coordinator runs them).
- `e2e/seed-board.spec.ts` against the RED build.
- Review and hosted CI.
- The new spec on the WebKit and phone projects (it runs on chromium only).
- Physical phone check and screen reader pass (owner actions).

## Carryovers

- Live results fetch the seed table once, on mount. A run submitted from that page appears in the
  table only after a reload.
- At 320 px the existing coach chips clip "Uncoached" and "Coached" inside their 3-column grid
  (`all-engines-320x640.png`). It was there before this row; the chips are unchanged.
- Add `(mode, seed)` to an index once `leaderboard_entries` passes 10,000 rows.

## Narrow table on Linux fonts (fix after review)

Hosted CI at `3eac05a` failed `seed-board.spec.ts` at 320 px: the seed table was 3 px wider than
its wrapper on Linux font metrics, deterministically (attempt and retry). macOS fonts fit with 3 px
to spare, which is why local runs passed. Real Android phones use metrics close to the CI fonts, so
this is a product fix, not a test fix.

Measured locally before the fix: overflow 0 at 320, 7 px at 310, 17 px at 300. The floor is set by
the nowrap "Engine v3" tag (player column 74 px) and the "Formation" header (65 px). Letting the
player cell wrap changed nothing, because its tbody `th` already wraps.

Decision: cell side padding 3 to 2 px and tag side padding 6 to 4 px. The table's minimum width
drops from 254 to about 239 px (overflow 0 down to 306 px, 5 px at 300). Rejected: a shorter
"Formation" header or engine tag (copy the spec fixed), hiding a column at narrow widths (drops
data), and two-line pill tags (the stadium shape breaks).

