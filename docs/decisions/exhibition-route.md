# Exhibition route (5c1)

Wave 5 row 5c1, Yellow. Branch `feat/exhibition-route` off `origin/main` at `54c6a58` (which
includes 5d #137, 5h #136, 5g #133, 5e #134, 5b #132 and 5a #131). The row spec is hand-off
section 4.3 "5c1 exhibitions: route, picker, entry points". No file under `src/engine`, `src/data`
or `src/scouting` changed.

## Who notices

A player can play an exhibition from three places now, not only from a shared run's page. Each
History row, each leaderboard row and the shared run page have an "Exhibition vs this squad"
link. It opens `/exhibition`, a page of its own, instead of a modal.

On that page the player's side is chosen for them: their newest saved run that kept its 16
species, else the squad saved in the Builder. A "Your squad" picker lists every such run (short
date, formation, record) and "Builder lineup", and switching it updates the link. With nothing to
play with, the page says so and links to Play and the Builder.

The other side reads "Misty's squad" when the link came from Misty's board row, else "Their
squad". The old "Shared squad" label is gone. When both sides are the same squad the page says
"Same squad on both sides" above the score and still plays the match. One match or two legs, and
every rematch, live in the link, so a link replays the exact match. Exhibitions stay unranked and
never reach History or the lifetime totals.

The next engineer inherits `src/ui/exhibition-route.ts` (`parseExhibitionQuery`,
`exhibitionHref`, `squadFromToken`, `challengers`, `defaultChallenger`, `sameSquad`, `awayName`),
`src/components/results/ExhibitionReplay.tsx` (the text replay, no longer named `MatchReplay`), and
`src/components/exhibition/ExhibitionScreen.tsx`. 5c2 builds the Broadcast on this route.

## Scope and files

- `src/ui/exhibition-route.ts` (new): the route's query shape, its href builder, the token to
  squad decode, the challenger list and default, and the side label.
- `src/app/exhibition/page.tsx` and `page.module.css` (new): the page, a static shell with the
  screen in a `Suspense` boundary because it reads `useSearchParams`. The proxy gates it like
  every other page.
- `src/components/exhibition/ExhibitionScreen.tsx` and `.module.css` (new): the client screen.
- `src/components/results/ExhibitionReplay.tsx` (new) and `ExhibitionReplay.module.css` (renamed
  from `ExhibitionMatchModal.module.css`, dialog rules removed): the replay moved out of the modal.
- `src/components/results/ExhibitionMatchModal.tsx`: deleted.
- `src/components/results/exhibition.ts`: `exhibitionFixture` takes the other side's name.
- `src/components/results/ShareActions.tsx`: the modal button is a link to the route.
- `src/components/history/HistoryList.tsx` and `.module.css`, `src/components/leaderboard/Board.tsx`
  and `.module.css`: the row link, in a wrapping action row with "Challenge this Seed".
- `scripts/e2e/render-pins.ts` and the regenerated `e2e/pins.ts`: `EXHIBITION_ROUTE`.
- Tests: `src/ui/__tests__/exhibition-route.test.ts` and
  `src/components/exhibition/__tests__/ExhibitionScreen.test.tsx` (new),
  `src/components/results/__tests__/ExhibitionReplay.test.tsx` (moved from
  `ExhibitionMatchModal.test.tsx`), `HistoryList.test.tsx`, `board-ux.test.tsx`,
  `ResultsView.test.tsx`, `exhibition.test.ts`.
- e2e: `e2e/exhibition-route.spec.ts` (new), `e2e/exhibition-two-legs.spec.ts`,
  `e2e/platform-experience.spec.ts`, `e2e/mobile/scenes.ts`.

## RED

RED commit `c441240`: 2 of 18 unit tests failed in the 2 files that loaded, and the 2 new files
(`exhibition-route.test.ts`, 25 tests, and `ExhibitionScreen.test.tsx`, 8 tests) failed to load
because the modules they test did not exist. Output (vitest, verbatim, colour codes stripped):

```
     × links each row to an exhibition against its squad, carrying the nickname (catches board rows with no exhibition entry) 61ms
   × links each history row to an exhibition against its squad (catches the exhibition only opening from a shared page) 83ms
 FAIL  src/ui/__tests__/exhibition-route.test.ts [ src/ui/__tests__/exhibition-route.test.ts ]
Error: Cannot find package '@/ui/exhibition-route' imported from /Users/paulo/Projects/pokedraft-exhibition-route/src/ui/__tests__/exhibition-route.test.ts
 FAIL  src/components/exhibition/__tests__/ExhibitionScreen.test.tsx [ src/components/exhibition/__tests__/ExhibitionScreen.test.tsx ]
Error: Failed to resolve import "../ExhibitionScreen" from "src/components/exhibition/__tests__/ExhibitionScreen.test.tsx". Does the file exist?
 FAIL  src/components/history/__tests__/HistoryList.test.tsx > links each history row to an exhibition against its squad (catches the exhibition only opening from a shared page)
TestingLibraryElementError: Unable to find an accessible element with the role "link" and name `/^Exhibition vs this squad/`
 FAIL  src/components/leaderboard/__tests__/board-ux.test.tsx > row details > links each row to an exhibition against its squad, carrying the nickname (catches board rows with no exhibition entry)
 Test Files  4 failed (4)
      Tests  2 failed | 16 passed (18)
```

The four RED cases the hand-off names, and where they live:

- the default challenger is the newest qualifying history record, as a literal token:
  `exhibition-route.test.ts` "default challenger";
- a history row links to the literal route: `HistoryList.test.tsx` (and the board row in
  `board-ux.test.tsx`);
- the param parse: `exhibition-route.test.ts` "exhibition query";
- the mirror note: `ExhibitionScreen.test.tsx` "mirror match".

GREEN `8839ff7`.

## Measurements

Chromium, headless, `next start` build of `8839ff7`'s code. "Right edge" is the widest right edge
of any element inside the measured region; the page never scrolls sideways at any width
(`scrollWidth` equals the viewport).

| Region | 320 px | 308 px |
| --- | --- | --- |
| Exhibition page, 20-W nickname, two legs (`main > *`) | 304 | 292 |
| History rows with both row links | 287 | 275 |
| Board, own coached 20-W row with both row links | 275 | 275 |

`e2e/exhibition-route.spec.ts` asserts every region at or under 308 px at both widths, which keeps
12 px of headroom under 320 for Linux CI fonts. The board list's right edge did not move between
320 and 308; both values are 29 px or more inside the viewport.

The first proof run found the 20-W nickname pushing the page's heading and scoreboard to 396 px at
320 (clipped, so `scrollWidth` stayed 320). The screen now sets `overflow-wrap: anywhere`, and the
spec measures it. The first 320 px screenshot also cut the picker's record ("4-1-"); the picker date
is now "Oct 19" instead of "Oct 19, 2026".

## Product decisions applied

- Route `/exhibition?home=&away=&n=&legs=&name=`, `n` default 0, `legs` default 1, a client
  component under the existing gate.
- Challenger default: the newest history record with 16 `squadSpeciesIds` and a formation, else the
  Builder save, else the empty state with links to Play and the Builder.
- Picker: a select of history squads (date, formation, record) plus "Builder lineup", the current
  choice preselected, `router.replace` on change.
- "Exhibition vs this squad" on history rows, board rows and the shared page, each linking to
  `/exhibition?away=<token>` and leaving `home` to the default. Board rows add `&name=`.
- The shared page's modal button is now that link. The modal is deleted.
- The replay stays text, moved to `ExhibitionReplay.tsx`.
- Labels: "Your squad", and "{nickname}'s squad" or "Their squad". The name is plain text, at most
  20 characters, rendered by React (escaped).
- Mirror match: "Same squad on both sides" above the score, and the match still plays.
- Unranked and never recorded: the screen reads storage and never writes it (unit and e2e tests
  assert the stored history is unchanged).

## Re-decisions

- **`?ex=<a>.<b>.<rematch>` became named params.** The hand-off had already re-decided this: every
  token holds a dot (`pd6.<payload>`), so one dotted param cannot be split. Confirmed at this head:
  `GOLDEN_CUP8_V3` starts `pd3.` and builder tokens start `pd6.`.
- **Run tokens decode by walking their actions, not through `squadOf`.** The hand-off says to
  decode through "the prefix-rewrite decode that `squad-preview.ts` uses". At this head
  `squad-preview.ts` has only `squadOf`, which returns the 16 species in pick order with no slots
  and is `server-only`. The prefix rewrite is `readAnyToken` in `src/ui/read-token.ts`, which the
  route uses. An exhibition needs each species' slot, so `squadFromToken` walks the decoded actions
  (`chooseSlot`, `pick`, `swap`, `reroll`) without re-rolling the draft. The live engine cannot
  replay a retained draft's rolls, so this is what lets pd1 to pd5 links play on the client.
  Same principle: decode without replaying. The golden engine-3 token decodes to its literal
  4-2-3-1 squad in `exhibition-route.test.ts`, and `MIRROR_EXHIBITION` (the old modal's pins)
  still holds through the route, which proves the decoded squad equals the server replay's.
- **The seed is the away squad's.** The modal played on the shared run's seed. The route keeps
  that: the away token's seed (a builder token's own seed when the away side is a Builder squad).
  So the old shared-page exhibition and its pins replay unchanged.

## Implementation decisions

- **Route state lives only in the URL.** Legs and the rematch counter are params, so "Play
  rematch" and the format buttons call `router.replace` like the picker. The replay resets its
  highlights when the match changes by keying its state to the match, not by remounting, so focus
  stays on the pressed button (`ExhibitionReplay.test.tsx` checks focus after a rematch).
- **Defaults stay out of the URL.** `exhibitionHref` writes `home`, `n` and `legs` only when they
  differ from their defaults, so a row link is `/exhibition?away=<token>` exactly.
- **The screen reads storage without writing.** `useSavedRuns` calls `ensureLifetime`, which
  writes a lifetime backfill on first read. The exhibition page must not write, so it reads the
  history and the Builder save through its own `useSyncExternalStore` over the raw strings (null
  on the server, so the first render is the loading line).
- **A squad qualifies only if its token decodes.** The picker, the default and the row links all
  use `squadFromToken`, so no link opens a page that cannot play. Board rows whose token does not
  decode show only "Challenge this Seed".
- **A home token from a link that is not in this browser's list** shows as "Squad from the link"
  in the picker, so a shared exhibition link keeps its home side.
- **Picker date is month and day.** At 320 px the full date pushed the record out of the closed
  select.
- **Play and Builder links both go to `/`.** The Builder and the Play cards share the home page;
  there is no separate Builder URL.
- **`exhibitionFixture` takes the other side's name.** The engine reads `opponent.name` only for
  recap text, so scores do not move: `exhibition.test.ts` and `MIRROR_EXHIBITION` are unchanged.

## Spec churn (literal to literal)

- `ExhibitionMatchModal.test.tsx` moved to `ExhibitionReplay.test.tsx` with a state harness in
  place of the dialog. Same scores and statuses; "Shared squad" reads "Their squad". The dialog's
  Escape and focus-return case has no replacement because there is no dialog; a new case checks
  focus stays on "Play rematch".
- `ResultsView.test.tsx`: the dialog close case is deleted with the dialog. The shared actions case
  now asserts the link text "Exhibition vs this squad" and `href` `/exhibition?away=<token>`. The
  three "does not invent an exhibition challenger" cases moved to the route: the empty state case
  in `ExhibitionScreen.test.tsx` and the null default cases (null, 42, "garbage") in
  `exhibition-route.test.ts`.
- `e2e/exhibition-two-legs.spec.ts` and `e2e/platform-experience.spec.ts` (the exhibition case)
  click the shared page link, assert the route URL, and drive the page instead of the modal. The
  two-legs spec also asserts the mirror note and waits for each rematch's `n` in the URL.
- `e2e/mobile/scenes.ts`: the "two-leg exhibition" scene opens `/exhibition?away=<token>&legs=2`
  and is no longer a modal scene.
- `exhibition.test.ts`: `exhibitionFixture(own, other, "Their squad")`.

## Gates

At `8839ff7`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0
  (`check:client-bundle`: no retained engine bundle in the client; the server build holds 20 files
  with it). Prettier passed on the 26 touched code and test files.
- Unit tests: 1,996 passed in 228 files.
- Playwright (`CI=1`, headless chromium, `--retries=0`): `exhibition-route` 5 of 5;
  with `exhibition-two-legs`, `platform-experience`, `board-ux`, `history-controls`,
  `lifetime-history`, `achievements`, `leaderboard`, `seed-board`, `share`, `challenge`, `a11y` and
  `server-html`, 103 of 103.
- Full Playwright suite once (`CI=1`, headless, `--retries=0`, 4 workers, all projects): 1,071
  passed, 67 skipped by their own project gates, 0 failed (17.8m).

## NOT RUN

- The e2e specs against a build of the RED commit.
- `exhibition-route.spec.ts` on WebKit and the phone projects (it runs on chromium only).
- Review and hosted CI (the coordinator runs them).
- A real phone check and a screen reader pass over the page and the picker (owner actions).

## Carryovers

- 5c2 mounts the Broadcast on this route and replaces `ExhibitionReplay` for one match.
- A fast double tap on "Play rematch" can count once: both taps read the same `n` before the URL
  updates. The e2e spec waits for each `n`.
