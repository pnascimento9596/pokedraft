# Wave 5 carryovers and queue hygiene (6-0)

Wave 6 row 6-0, Yellow. Branch `chore/wave5-carryovers` off `origin/main` at `9e4802b`. The row
spec is hand-off section 4.3 "6-0", parts (a) to (i), with the won't-fix reasons from section 5.
No file under `src/engine`, `src/scouting`, `scripts/data` or `src/data` changed, and
`src/engine/__tests__/goldens.test.ts` is byte-identical to `origin/main`.

## Who notices

- A friend who opens a share link to their own run, spelled differently from the stored token,
  sees their row in "Friends on this seed" marked "This run" instead of as a link.
- A player who submits from live results sees their new row in the seed table straight away.
- On every phone the coach chips ("All", "Uncoached", "Coached") keep their labels inside their
  borders. They sit on one row at 390 px and wrap "Coached" onto a second row at 360 px and below.
- "Open the Builder" on the empty exhibition page lands on the builder, not the top of the home
  page.
- A fast double tap on "Play rematch" plays two rematches on, not one.
- The touchline sheet has 12 px sides, the same as its prompts.
- When the default all-time board (current engine) is empty but older engines have runs, the
  board says "No runs on this engine yet." with a "Show all engines" button. After the engine 7
  flip this is what every friend sees first.

The next engineer inherits `canonicalToken` in `src/ui/read-token.ts` for any "is this the same
run" check, and a `submissions` count that `LiveRun` passes to `ResultsView` for the seed table.

## Scope and files

- (a) `src/ui/read-token.ts`: `canonicalToken(token)`, the token's own version prefix on the live
  codec's re-encoding. `readAnyToken` now reads through the same private helper.
  `src/components/leaderboard/SeedBoard.tsx` compares canonical tokens.
- (b) `SubmitPanel.tsx` gains `onSubmitted`; `LiveRun.tsx` counts submissions; `ResultsView.tsx`
  passes the count to `SeedBoard` as `refresh`, which is in the fetch effect's dependencies.
- (c) `src/leaderboard/server/__tests__/seed-board.test.ts:141`: the comment now says what the test
  asserts. Comment only, so no guard.
- (d) `Board.module.css` and `Board.tsx`: `.coachFilter` is a wrapping flex row and each chip has
  a fixed width for its own label (`All` 4rem, `Uncoached` 8.5rem, `Coached` 7rem).
- (e) `Builder.tsx`: the section has `id="builder"`. `ExhibitionScreen.tsx`: "Open the Builder"
  links to `/#builder`.
- (f) `ExhibitionScreen.tsx`: a ref holds the last requested rematch `n` and the URL `n` it counted
  from.
- (g) `Touchline.module.css`: the sheet's side padding is 12 px (was 10 px).
- (h) `Board.tsx` and `Board.module.css`: the empty current-engine state.
- (i) `docs/queue/dispatch-7-frozen.md`, `docs/queue/engine-followups.md`,
  `scripts/audit/api-timing.mjs` and `docs/reports/audits-2026-10-17/program-log.md`.
- Tests: `seed-board.test.tsx`, `board-engine.test.tsx`, `ExhibitionScreen.test.tsx`,
  `e2e/seed-board.spec.ts`, `e2e/exhibition-broadcast.spec.ts` and the new
  `e2e/wave5-carryovers.spec.ts`.

## RED

RED commit `010414e` holds only tests. Its source tree equals `9e4802b`, so the RED e2e run used a
build of `9e4802b`.

Unit (`pnpm vitest run` on the three touched files): 4 of 25 failed.

```
 FAIL  src/components/exhibition/__tests__/ExhibitionScreen.test.tsx > challenger > shows the empty state with Play and Builder links when there is no squad to play with
AssertionError: expected '/' to be '/#builder' // Object.is equality
 FAIL  src/components/exhibition/__tests__/ExhibitionScreen.test.tsx > route state > counts both taps of a fast double tap on Play rematch (catches two taps that read the same n before the URL updates)
AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]
  (both calls were /exhibition?away=…&n=2; expected n=2 then n=3)
 FAIL  src/components/leaderboard/__tests__/board-engine.test.tsx > … > says No runs on this engine yet when only older engines have runs, and one tap shows them (catches an empty default board that never says why)
TestingLibraryElementError: Unable to find an element by: [data-testid="board-empty-engine"]
 FAIL  src/components/leaderboard/__tests__/seed-board.test.tsx > … > marks this run for a link whose JSON spacing differs from the stored token (catches a string compare that shows the player's own row as a link)
AssertionError: expected [ '1Ash4-2-3-15-0-1593', …(1) ] to deeply equal [ '1AshThis run4-2-3-15-0-1593', …(1) ]
 Test Files  3 failed (3)
      Tests  4 failed | 21 passed (25)
```

Playwright (`CI=1`, chromium, `--retries=0`, the three touched specs): 5 of 18 failed.

```
1) exhibition-broadcast.spec.ts:216 the managed exhibition keeps 12 px of headroom …
   expect(sheet.right).toBeLessThanOrEqual(width - 12)  Expected: <= 308  Received: 310
2) seed-board.spec.ts:180 live results show a run submitted from the page in the seed table without a reload
   expect(locator).toHaveText(expected) failed  - Expected - 1  + Received + 0
3) wave5-carryovers.spec.ts:67 each coach chip's label keeps 4 px inside its border …
   Error: Uncoached  Expected: >= 4  Received: -0.8
4) wave5-carryovers.spec.ts:105 Open the Builder on the empty exhibition goes to the builder section
   Expected pattern: /\/#builder$/  Received string: "http://localhost:3910/"
5) wave5-carryovers.spec.ts:127 an empty current-engine board with older runs says why …
   expect(locator).toContainText(expected) failed  Expected substring: "No runs on this engine yet."  element(s) not found
  5 failed
  13 passed (27.9s)
```

GREEN `ff4d44a`, with the chip fix re-decided in `52dc6be` and `72a46ca` (below). The same unit files pass 25 of 25. The GREEN commit also tightens one RED
assertion: the Lance row after "Show all engines" is pinned to its full literal text, where the
RED version used `stringContaining("Lance")`. The same specs plus `touchline-sheet.spec.ts` pass
26 of 26 (chromium).

Regression guard, no RED: behaviour already correct. `board-engine.test.tsx` "keeps No entries
yet when no engine has runs" passed before the fix and pins that the new state needs older runs.

## Measurements

Playwright chromium, macOS fonts.

| Measurement | Before (`9e4802b`) | After |
| --- | --- | --- |
| Smallest gap between "Uncoached" and its border (any side), 390 px | -0.8 px | 11 px |
| Same at 360, 320 and 308 px | not reached (the test stops at the first width) | 11 px |
| Smallest side gap (left or right) of each chip, every width | | All 15.9, Uncoached 15.2, Coached 15.1 px |
| Touchline sheet content right edge at the half-time stop, 320 px | 310 | 308 |
| Same at 308 px | 298 | 296 |
| Empty-engine note right edge, 390 / 360 / 320 / 308 px | no note | 357 / 327 / 287 / 275 |
| Builder section top after "Open the Builder", 390 px | no hash, page top | 72 px, `scrollY` 823 |

The touchline sheet at 320 px, collapsed and open, still leaves the pitch clear and stays under
55% of the screen height (`touchline-sheet.spec.ts`, 302 px open at 320x640).

The "Uncoached" chip overflowed at every phone width, not only at 320 px. Its label is about
104 px wide (136 px chip less 2 px of border and two 15.2 px gaps); with the chip's 21 px of
padding and its border it needs about 127 px, and three equal columns in the board's width gave it less.

## Product decisions applied

- Decision 6 stays: the default all-time board shows only the current engine. Part (h) explains
  the empty state instead of changing the default.
- Copy rules: sentence case, no dashes. The new copy is "No runs on this engine yet.", "Runs from
  older engines are on the All engines board.", "Show all engines" and "Play a run".
- Blind challenges (decision 3): no number shown during a draft changed.
- Section 5 dispositions: SF-20 and SF-29 closed as fixed in #61; engine follow-up 5 closed as
  won't fix (changing keeper fit or `weakest` moves every Team Score, and the All engines board
  compares Team Scores across engines); Dependabot dropped from the Wave 7 CI item.

## Implementation decisions

- (a) The canonical form keeps the token's own version. A pd3 link and a pd6 link with the same
  body are different runs, because they replay on different engines. Re-encoding with the live
  codec is enough to make spacing and key order irrelevant, since the codec writes one compact
  JSON form (Model the Domain: identity is the decoded run, not the string).
- (b) An explicit prop chain (`SubmitPanel` `onSubmitted`, `LiveRun` state, `ResultsView`
  `submissions`, `SeedBoard` `refresh`) over a window event. The chain is three short props a
  reader can follow; an event would hide who refetches (Minimize Reader Load). The shared `/r`
  page never submits, so its count stays 0 and its single fetch is unchanged. The old table stays
  on screen while the refetch runs, because the result's key is still the mode and seed.
- (d) Fixed per-chip widths in a wrapping row. Three equal columns wide enough for "Uncoached"
  do not fit a phone, so each chip gets its own fixed width with about 15 px each side of its
  label. That leaves room for the wider Linux fonts on hosted CI, and a late web font cannot move
  a chip box. Re-decided once. The first GREEN (`ff4d44a`) sized the chips to their labels. The
  full Playwright suite then failed `leaderboard-font-cls.spec.ts` at 412 px, light and dark
  (2 of 4 tests): the "Coached" chip shifted by 0.00013 when Inter arrived 700 ms late. That spec
  pins the reason the old fixed columns existed. `52dc6be` gave every chip a fixed width,
  `72a46ca` tightened the widths so the row fits 390 px. `leaderboard-font-cls.spec.ts` then
  passed 21 of 21 with `--repeat-each=3`.
- (e) The section gets a plain `id`, not the heading's `useId()` id, so the anchor is stable across
  renders. The home page's URL sync already keeps the hash (`HomeScreen.tsx` `replaceState` adds
  `hash`).
- (f) The ref stores `{ from, to }`: the URL `n` it counted from and the last `n` asked. Once the
  URL catches up (or the player goes back in history), `from` no longer matches and counting
  restarts from the URL. A plain "max of ref and URL" would skip numbers after a back navigation.
- (g) 12 px matches `.sheet > .prompt`'s 12 px side margins, so the prompts and the touchline line
  up. The sheet stays edge to edge.
- (h) The extra `engine=all` request runs only when the current-engine all-time board answers
  empty with the coach filter on "All". It finishes before the board renders, so the player never
  sees "No entries yet." flash into the new note. If the second request fails or is empty, the
  board shows the old "No entries yet." state. Pressing "Show all engines" sets the same focus
  attempt as "Try again", so focus lands on the loaded board.
- (i) `scripts/audit/api-timing.mjs` imports `ENGINE_VERSION` from `@/engine/types` (the README
  runs the tools through `tsx`, which resolves the alias). `pnpm exec tsx
  scripts/audit/api-timing.mjs` with no arguments loads the module and stops at its own argument
  check (exit 2), so the import resolves. No unit guard: the `post` mode needs a local server on
  the Neon preview branch, which this row does not touch.

## Re-decisions

- (d), see Implementation decisions: content-sized chips moved on a late font swap, so the chips
  have fixed widths per label.

## Spec churn (literal to literal)

- `ExhibitionScreen.test.tsx`: "Open the Builder" `href` `/` became `/#builder`.
- `exhibition-broadcast.spec.ts` `fitsWithHeadroom`: the sheet content bound moved from `width`
  to `width - 12`, so the sheet now keeps the same 12 px headroom as the page. Its comment no
  longer says `touchline-sheet.spec.ts` owns the sheet's headroom.

## Brief vs code

- Hand-off (i) says to remove "Dependabot" from the program log's Wave 7 CI hygiene item. The
  program log has no CI hygiene item and no "Dependabot"; the item is in the brief
  (`pokedraft-implementation-prompt-2026-10-17.md:206`). Re-decided on the same principle (no
  scheduled jobs): the brief is the frozen source, so the program log's Wave 7 list gains a line
  that the CI item runs without Dependabot, with the reason. The brief is unchanged.
- Hand-off (g) says the sheet's content "reaches 310 px". Measured at `9e4802b`, nothing
  overflows: every row of the sheet fills its width, and the 310 is the sheet's own 10 px side
  padding. The fix is the padding, not the content.
- Hand-off (d) and the 5d and 5g logs place the chip clipping at 320 px. It happened at 390 px
  too (-0.8 px).
- `exhibition-broadcast.md:185` said the rematch button "unmounts on the first tap, so a second
  tap has nothing to hit". It unmounts only after the URL updates; the unit guard shows two taps
  in one frame both reach the handler and both asked for `n=2`.
- Hand-off (c) names `seed-board.test.ts`; the comment is at
  `src/leaderboard/server/__tests__/seed-board.test.ts:141`.
- Every other cited line held at `9e4802b`: `ExhibitionScreen.tsx:73, 76-77`,
  `Builder.tsx:281-288`, `api-timing.mjs:293`, `review-rules.test.ts:28-55`,
  `engine-6-manager.md:71-80`, `SeedBoard.tsx` comparing `e.token === token`.

## Gates

At `72a46ca` (the code-identical head; later commits add docs and screenshots only):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 2,002 passed in 229 files.
- `check-retained-replays.mts` and `measure-retained-json.mjs` on `.next/server/chunks` exited 0.
- All nine `check:*` scripts exited 0.
- `goldens.test.ts` byte-identical to `origin/main`.
- Prettier passed on the 22 touched code, test and doc files.
- An earlier full gate run at `fc05305` gave the same results (2,002 tests in 229 files).
- Playwright (`CI=1`, headless, `--retries=0`), the full suite, all projects, at `72a46ca`: 1,081
  passed, 67 skipped by project gates, 0 failed (18.3m). The first full run at `fc05305` had
  1,079 passed, 67 skipped and 2 failed (`leaderboard-font-cls.spec.ts` at 412 px; see
  Re-decisions).

## NOT RUN

- The new specs on the WebKit and phone projects (they run on chromium only, like the specs they
  sit beside).
- Review and hosted CI (the coordinator runs them).
- A physical phone check and a screen reader pass (owner actions).

## Carryovers

- None new.

Browser proof: `docs/reports/wave5-carryovers/` (`coach-chips-{390,360,320}.png`,
`empty-engine-board-{390,360,320}.png`, `open-the-builder-390.png`,
`touchline-halftime-{390,360,320}.png`, `touchline-expanded-{390,360,320}.png`). 308 px is
measured, not shot.
