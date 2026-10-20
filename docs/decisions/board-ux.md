# Board UX (5d)

Wave 5 row 5d, Yellow. Branch `feat/board-ux` off `origin/main` at `783ddbf` (which includes 5g
#133, 5e #134 and 5a #131). The row spec is hand-off section 4.3 "5d board UX". No file under
`src/engine`, `src/data` or `src/scouting` changed.

## Who notices

A player who has submitted a run finds their own rows on the leaderboard at a glance: an accent
bar down the row's left edge and a "You" chip after the nickname. A screen reader hears "Misty,
you" in the row's link. The match is the nickname this browser last submitted, cleaned the way the
server cleans it, so "  Ash   Red " finds the "Ash Red" row. No stored nickname means no mark,
and the first paint never has one.

After a ranked submit, "Share my rank" sits next to "View leaderboard". It shares the run link
(which has the card preview) with "I'm #3 on the October 9 daily. Beat it?" or "I'm #12 on the
all-time board. Beat it?". When the rank could not be loaded there is no button.

Daily rows show the formation ("4-3-3") instead of "Open, Squad First, All regions", which every
Daily row used to repeat. All-time rows keep the settings label, because settings differ there. A
row whose token does not decode (`formation` null) keeps the settings label.

Every "Challenge this Seed" link is named for its row: "Challenge this Seed: Misty, 3-0-2" on the
board, "Challenge this Seed: Oct 15, 2026, 12:00 AM, 3-0-2" in History (the date the row shows).
The visible text is unchanged.

Daily and All-time, and the 8-0 Challenge and 151 Challenge chips, are pressed buttons in a
group, like the coach chips.

The Hall of Fame on `/history` opens on "Drafted species". A player with no stored squad still
opens on "All species", so the grid is never empty on a first visit.

The next engineer inherits `src/components/leaderboard/ownNickname.ts` (`NICKNAME_KEY`, moved
from `SubmitPanel.tsx`, and `useOwnNickname()`), `rankShareText` in
`src/components/share/shareLink.ts`, and no `role="tab"` or `role="radio"` anywhere in the app.

## Scope and files

- `src/components/leaderboard/ownNickname.ts` (new): `NICKNAME_KEY` and `useOwnNickname()`, a
  `useSyncExternalStore` read of the stored nickname through `parseNickname`, null on the server.
- `src/components/leaderboard/Board.tsx` and `Board.module.css`: `data-me`, the "You" chip and the
  hidden ", you", the accent bar (`::before`, `var(--accent)`), the formation on Daily rows, the
  challenge `aria-label`, and a wrapping nickname line so chips never split.
- `src/components/leaderboard/LeaderboardScreen.tsx` and `LeaderboardScreen.module.css`: the
  Board and Mode groups with `aria-pressed` buttons.
- `src/components/leaderboard/SubmitPanel.tsx` and `SubmitPanel.module.css`: "Share my rank"
  with its status line and the manual-copy field from `useLinkShare`.
- `src/components/share/shareLink.ts`: `rankShareText(rank, dailyDate)`.
- `src/components/history/HistoryList.tsx`: the Hall default and the history challenge label.
- Tests: `src/components/leaderboard/__tests__/board-ux.test.tsx` (new), `LeaderboardScreen.test.tsx`,
  `SubmitPanel.test.tsx`, `src/components/history/__tests__/HistoryList.test.tsx`.
- e2e: `e2e/board-ux.spec.ts` (new), `e2e/leaderboard.spec.ts`, `e2e/platform-experience.spec.ts`,
  `e2e/mobile/helpers.ts`.

## RED

RED commit `3d8ff07`: 12 of 41 unit tests failed in 4 of 4 files. Output (vitest, verbatim, colour
codes stripped):

```
     × uses pressed buttons, not tabs or radios, for controls that only change the URL (catches a tablist with no tab panel and a radiogroup with no arrow keys) 10ms
     × presses Daily on the daily board and shows no mode group there 56ms
     × moves to the board a pressed button names 12ms
     × marks Misty's row as the player's own when Misty is the stored nickname (catches own rows looking like everyone else's) 25ms
     × matches a stored nickname the way the server stores it, trimmed with inner spaces collapsed (catches a saved '  Ash   Red ' missing its row) 5ms
     × shows the formation on Daily rows instead of the fixed daily ruleset (catches every Daily row reading Open, Squad First, All regions) 6ms
     × names each challenge link by its row (catches every row reading the same Challenge this Seed) 106ms
   × shows match win rate by formation and all species with honest missing-history coverage 34ms
     × opens on the drafted species when stored squads exist (catches a returning player landing on 1,025 species they never drafted) 13ms
   × names each history challenge link by its run (catches every row reading the same Challenge this Seed) 29ms
     × shares the daily rank with the run link next to View leaderboard (catches a submitted rank with no way to send it) 15ms
     × names the all-time board in the all-time share text 1007ms
 FAIL  src/components/history/__tests__/HistoryList.test.tsx > shows match win rate by formation and all species with honest missing-history coverage
AssertionError: expected 'Species Hall of FameBrowse all 1,025 …' to contain 'No species match these filters.'
 FAIL  src/components/history/__tests__/HistoryList.test.tsx > Species Hall of Fame default > opens on the drafted species when stored squads exist (catches a returning player landing on 1,025 species they never drafted)
AssertionError: expected 'all' to be 'drafted' // Object.is equality
 FAIL  src/components/history/__tests__/HistoryList.test.tsx > names each history challenge link by its run (catches every row reading the same Challenge this Seed)
TypeError: .toMatch() expects to receive a string, but got object
 FAIL  src/components/leaderboard/__tests__/LeaderboardScreen.test.tsx > LeaderboardScreen board and mode controls > uses pressed buttons, not tabs or radios, for controls that only change the URL (catches a tablist with no tab panel and a radiogroup with no arrow keys)
AssertionError: expected <div role="tablist" …(2)>…(2)</div>
 FAIL  src/components/leaderboard/__tests__/LeaderboardScreen.test.tsx > LeaderboardScreen board and mode controls > presses Daily on the daily board and shows no mode group there
TestingLibraryElementError: Unable to find an accessible element with the role "group" and name "Board"
 FAIL  src/components/leaderboard/__tests__/LeaderboardScreen.test.tsx > LeaderboardScreen board and mode controls > moves to the board a pressed button names
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "All-time"
 FAIL  src/components/leaderboard/__tests__/SubmitPanel.test.tsx > Share my rank > shares the daily rank with the run link next to View leaderboard (catches a submitted rank with no way to send it)
TestingLibraryElementError: Unable to find an accessible element with the role "button"
 FAIL  src/components/leaderboard/__tests__/SubmitPanel.test.tsx > Share my rank > names the all-time board in the all-time share text
TestingLibraryElementError: Unable to find role="button" and name "Share my rank"
 FAIL  src/components/leaderboard/__tests__/board-ux.test.tsx > own rows > marks Misty's row as the player's own when Misty is the stored nickname (catches own rows looking like everyone else's)
AssertionError: expected [ null, null ] to deeply equal [ 'true', null ]
 FAIL  src/components/leaderboard/__tests__/board-ux.test.tsx > own rows > matches a stored nickname the way the server stores it, trimmed with inner spaces collapsed (catches a saved '  Ash   Red ' missing its row)
AssertionError: expected [ null, null ] to deeply equal [ 'true', null ]
 FAIL  src/components/leaderboard/__tests__/board-ux.test.tsx > row details > shows the formation on Daily rows instead of the fixed daily ruleset (catches every Daily row reading Open, Squad First, All regions)
AssertionError: expected '1MistyOpen, Squad First, All regionsS…' to be '1Misty4-3-3Squad preview unavailable.…' // Object.is equality
 FAIL  src/components/leaderboard/__tests__/board-ux.test.tsx > row details > names each challenge link by its row (catches every row reading the same Challenge this Seed)
AssertionError: expected [ null, null ] to deeply equal [ …(2) ]
 Test Files  4 failed (4)
      Tests  12 failed | 29 passed (41)
```

The 29 that passed at RED include three regression guards that hold already (no RED: behaviour
already correct): no mark without a stored nickname or with a case mismatch, all-time rows keep the
settings label, and Share my rank hidden when the rank is null. The two Hall cases "all species
with no squads" and "the player's own choice sticks" also passed at RED, because "all" was the
old default for everyone.

GREEN `9584c1e`. `6c73d50` keeps row chips whole under a long nickname (found in the 320 px proof,
below) and folds Chromium's name spacing in the e2e spec.

## Measurements

Chromium, headless, `next start` build of `6c73d50`'s code, the widest row the server allows (a
20-W nickname, the player's own, coached, 16-sprite squad, challenge link):

| Width | Board's widest right edge | Slack | Row link overflow |
| --- | --- | --- | --- |
| 390 | 357 | 33 | 0 |
| 360 | 327 | 33 | 0 |
| 320 | 287 | 33 | 0 |
| 308 | 275 | 33 | 0 |
| 300 | 267 | 33 | 0 |
| 290 | 261 | 29 | 0 |

The submitted panel with "Share my rank" and "Link copied", the same nickname: right edge 304 at
320 and 292 at 308, 16 px slack (the page gutter) at every width from 390 down to 300.
`e2e/board-ux.spec.ts` asserts both at 308 px, which keeps 12 px of headroom under 320 for Linux
CI fonts.

## Product decisions applied

- Own rows: exact match after the server's normalisation, `data-me`, "You" chip, accent bar from an
  existing token (`--accent`, no new colour; `check:theme-colors` passes), ", you" in the name,
  nothing at hydration.
- Share my rank: title "pokedraft", the two literal texts, path `runHref(token)`, hidden when the
  rank is null.
- Daily rows show `formation`; all-time rows keep `variantLabel`.
- Row sprites keep their species-name alts (re-decided in the hand-off; see below).
- Contextual challenge labels with the visible text unchanged (WCAG 2.5.3).
- `aria-pressed` buttons in a `role="group"` for Board and Mode.
- Hall of Fame defaults to "Drafted species", or "All species" with no recorded squads.

## Implementation decisions

- **Normalise with `parseNickname` itself.** The hand-off says to use the server's rules. Calling
  the server's function means the two can never drift. A stored nickname the server would reject
  (too short, blocked) cannot be on the board, so it marks nothing.
- **`useSyncExternalStore` for the nickname.** The server snapshot is null, so hydration renders no
  mark and the client corrects it on mount without an effect. A `storage` event from another tab
  updates it. This is the same shape as `useSavedRuns` and `ThemeToggle`.
- **The bar is a `::before` over the row's 4 px left padding**, not a border, so no row content
  moves when a row becomes yours.
- **", you" is visually hidden text and the chip is `aria-hidden`.** The link's name reads
  "Misty, you" once, not "Misty You". Chromium pads the out-of-flow span with a space ("Misty ,
  you"); a screen reader reads both the same, and the e2e spec folds that space before comparing.
- **Share date is "October 9".** The hand-off left `{date}` open. A friend reads the share the same
  week, so the year and weekday add length without meaning, and "2026-10-09" reads like a code. The
  month and day are formatted in UTC from the stored daily date, the day the daily board files the
  run under. An unparseable date is shared as stored.
- **`rankShareText` lives in `shareLink.ts`** next to `runShareText`, so `SubmitPanel` does not
  import the leaderboard `format.ts` (and its engine label import) onto the results page.
- **History challenge label uses `when(r.at)`**, the date and time the row already shows, so the
  name matches what a sighted player sees. It is locale and time zone dependent, so the unit test
  pins the record and the year, and `platform-experience.spec.ts` pins `locale: "en-US"` and
  `timezoneId: "UTC"` to assert the full literal.
- **All engines stays one `aria-pressed` toggle.** It already was one (5g, `Board.tsx:127-138`).
  It is a single on or off switch, not a choice among siblings, so it needs no group.
- **Chips never split.** The first 320 px proof showed "Coached" broken as "Coache d" under the
  widest nickname: each chip wrapped to its own line but kept its 8 px lead margin, and the column
  is about 70 px. The nickname line is now a wrapping flex row with an 8 px column gap and chips
  are `white-space: nowrap`. Inferred, not measured on main: the same break happened before this
  row for a coached 20-W nickname, because the Coached chip had the same margin.
- **`e2e/mobile/helpers.ts`** drops `[role="tab"]` and `[role="radio"]` from the target and iOS
  focus selectors. No element in the app has either role now, and the buttons match `button`.
  Subtract before you add: a selector for a role nothing renders only misleads the next reader.
- **Hall default is derived, not stored.** `pickedFilter` is null until the player chooses, and the
  effective filter is computed from the stored squads on each render. No effect, no flash of the
  wrong grid.

## Spec churn (literal to literal)

- `e2e/leaderboard.spec.ts`: `getByRole("tab", { name: "All-time" })` and two
  `getByRole("radio", { name: "151 Challenge" })` become `getByRole("button", ...)`.
- `e2e/platform-experience.spec.ts`: the board link is
  "Challenge this Seed: Known squad, 3-0-2" (exact); the history link is
  "Challenge this Seed: Oct 15, 2026, 12:00 AM, 3-0-2" (exact, Chromium puts a narrow no-break
  space before AM) under `locale: "en-US"` and `timezoneId: "UTC"` for the file's describe.
- `HistoryList.test.tsx`: the coverage test now expects "No species match these filters." for
  Ivysaur under the drafted default, then "No recorded squads" after choosing All species. Three new
  Hall default cases and the history challenge label case.
- `e2e/leaderboard-font-cls.spec.ts`: `/leaderboard` opens on the Daily board, so the stubbed
  row's name changes from "... Classic, Squad First, All regions ..." to "... 4-3-3 ..." (found by
  the full suite, 4 of 4 font swap cases failed on that literal only; fixed in `9ad9c46`).
- No test was deleted.

## Gates

At `6c73d50` (the code head; `9ad9c46` changes only `e2e/leaderboard-font-cls.spec.ts`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0
  (`check:client-bundle`: no retained engine bundle in the client). Prettier passed on every
  touched file.
- Unit tests: 1,931 passed in 225 files.
- Playwright, full suite once (`CI=1`, headless, `--retries=0`, all six projects): 1,047 passed, 67
  skipped by their own project gates, 4 failed (17.8m). The 4 were `leaderboard-font-cls.spec.ts`
  at 360 and 412 in both themes, all on the stale literal above. After `9ad9c46`,
  `leaderboard-font-cls` and `leaderboard-cls` passed 13 of 13.
- `board-ux.spec.ts` 3 of 3, `leaderboard.spec.ts` and `platform-experience.spec.ts` 22 of 22 on
  chromium.
- `src/engine/__tests__/goldens.test.ts` is unchanged and passed in the unit run.

## Brief vs code

- Line numbers in the hand-off are from `5932775`. At `783ddbf`: the tablist is
  `LeaderboardScreen.tsx:58-71` and the radiogroup `:72-87`; the coach chips are `Board.tsx:104-124`;
  the row meta is `Board.tsx:242`; the sprite alt `Board.tsx:250`; the board challenge link
  `Board.tsx:271-275`; the history challenge link `HistoryList.tsx:239-243`; the Hall default
  `HistoryList.tsx:25`; `NICKNAME_KEY` `SubmitPanel.tsx:12`.
- `Board.test.tsx:248` (sprite alt) is at `Board.test.tsx:275-297` now. Left as is.
- `HistoryList.test.tsx:167-172` was the Ivysaur "No recorded squads" assertion at `:167-172`; it
  changed as above.
- `platform-experience.spec.ts:192,254` are at `:199` and `:261` at the base.
- `e2e/mobile/helpers.ts:484,713` do not count tabs; they are generic interactive-element selectors
  that listed `[role="tab"]` and `[role="radio"]`. Removed as above.
- The brief's audit line said "Row sprites `alt=""`". Re-decided by the hand-off: 4g
  (`docs/decisions/resilience-a11y.md:37-41`) named each sprite by species because the strip
  shows no names, and `alt=""` would hide the squad from screen readers. Sprites keep their names.

## Re-decisions

- Sprite alts: kept, per the hand-off's re-decision above.
- None of the hand-off's other premises broke at this head.

## NOT RUN

- Playwright RED: the e2e specs were not run against a build of `3d8ff07` (the vitest RED above is
  the RED evidence).
- WebKit and the phone projects for `board-ux.spec.ts` (it runs on chromium only).
- Review and hosted CI (the coordinator runs them).
- The phone check and the screen reader pass (owner actions).

## Carryovers

- The coach chips at 320 px ("All", "Uncoached", "Coached") fill their fixed 7.5rem columns edge
  to edge, so "UNCOACHED" touches its border (see `own-row-320-light.png`). This row does not touch
  the coach chips, so the same fit held before it (inferred, not measured on main).
