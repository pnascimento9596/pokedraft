# Copy pass and dash lint (Wave 4, row 4e)

Branch `fix/copy-pass` off `origin/main` at `34af10e`, with `origin/main` merged at `124afab`
(PR #113, row 4-0) in fix round 1. Yellow. No file under `src/engine`, `src/data` or
`src/scouting` changed, so the goldens are untouched.

## Scope

- Fit labels read Best, OK and Poor everywhere. The Best star is a separate `aria-hidden` glyph.
- Empty slot names and the Picker's swap line say "Best fit", "OK fit" and "Poor fit" instead of
  the raw `recommended`, `ok` and `bad`.
- The Road to the Final tooltip row is "Rating" and "267", not "Rating" and "Rating 267".
- The draft drawer toggle says Hide players, Show players, or Show roll before the reveal. The
  selection bar button says Show roll, named "Back to the roll".
- Sentence case: "Tap to draft", "Sort: role rating", "Sort: raw fit", "Ratings on".
- The blind-mode hints follow decision 3.
- A shared run says "This squad" and "This lineup" where a live run says "You", "Your team",
  "Your XI", "Your squad" and "Your lineup". That covers the result card, the group table, the
  replay's group table, the recorded saves and the match events. Since fix round 1 it also covers
  the shared match player: the scoreboard, the full screen score bug, the momentum meter, the
  tactic banner and the ticker.
- Scores are "1-0" on the scoreboard, the penalties line, the full-time line and the exhibition.
- The history page interpolates `HISTORY_LIMIT`.
- `check:dashes` (`scripts/audit/dash-lint.mjs`) fails on an em or en dash in copy under `src`,
  and CI runs it after `check:theme-colors`.

Files:

- Copy: `src/ui/labels.ts`, `src/ui/matchday/copy.ts`, `src/components/pitch/{Pitch,PitchCard}.tsx`,
  `src/components/builder/Picker.tsx`, `src/components/matchday/{Touchline,MatchPlayer,MatchdayFlow}.tsx`,
  `src/components/run/{DraftBoard,RoadStrip}.tsx`, `src/components/home/SidePanel.tsx`,
  `src/app/history/page.tsx`.
- Shared copy: `src/components/results/format.ts` (`ResultsVariant`, `SIDE_COPY`, `incidentLine`),
  `ResultsView`, `MatchList`, `MatchReplay`, `MatchHighlights`, `RecordedSaves`, `MatchIncidents`,
  `ExhibitionMatchModal.tsx` (scores only), and `MatchList.module.css`.
- Lint: `scripts/audit/dash-lint.mjs`, `scripts/audit/dash-lint.test.ts`, `package.json`,
  `.github/workflows/ci.yml`.
- e2e: new `e2e/copy-pass.spec.ts`; `scripts/e2e/render-pins.ts` writes hyphen scores and
  `e2e/pins.ts` is regenerated with `pnpm e2e:pins`; 17 specs take the new literals.
- In `MatchPlayer.tsx` and `MatchdayFlow.tsx` only the score strings changed, so row 4-0's edits
  there do not collide.

## RED commits and output (verbatim excerpt)

RED `84aec88`: 31 of 166 failed in 19 files, and `scripts/audit/dash-lint.test.ts` failed to load
(its 8 tests were not collected). GREEN `18cf3e2`.

```
     × replays only genuine goals when their minutes arrive and restores the recorded final score
   × keeps scoreless draws honest and finishes the replay without creating events
     × shows both legs, the aggregate and a penalty decision, and the one-match result is unchanged
     × replays leg 2 through extra time and hides the aggregate until both legs reach full time
     × plays a fresh tie on rematch and settles it on aggregate without extra time
     × names an empty slot's fit as Best, OK or Poor (catches the raw recommended, ok or bad enum)
     × after a shootout the bug reads FT and Pens 3-2 with hyphens
     × starts off with the blind hints from decision 3 (catches the old Off keeps challenges blind and sighted mode copy)
     × turns on, saves showChallengeRatings to pokedraft:panel, and says challenges show ratings
     × turns back off and restores the blind sentence
     × is absent at 89' and reads Assistant 1-0, You 3-1 with the Attack switch at full time
     × watch=0 at=49 opens G1 at 48', a minute before the goal
     × seek to a pip lands the clock at minute - 1 with no goal SFX fired: the 30' pip lands on 29', the 12' goal stays silent, and only the 30' goal sounds
     × with ratings off, bench cards show the fit glyph for the outgoing slot and no numbers
   × empty slots invite drafting and bench count reflects actual filled substitutes
     × names the three fits Best, OK and Poor, with no glyph
     × prints the tooltip's Rating row as the bare number (catches Rating / Rating 267)
     × at 2x the score lands with the ball: 0-0 at progress 0.49, 1-0 at 0.62
     × keeps swap suitability qualitative and hides comparison numbers with ratings off
     × writes the sort options in sentence case (catches Sort: Role Rating and Sort: Raw Fit)
     × names a shared run's side This squad (catches Your XI on a friend's link)
     × names the shared run's side This squad in the table (catches Your team on a friend's link)
     × labels the draft drawer Hide players, Show players and Show roll (catches Minimize draft picker and Spin results)
     × shared view never says You or Your
     × score reads 0-0 while progress is 0.5; 1-0 at 0.6
     × counts the goal at once under reduced motion, where nothing is staged
     × counts the goal at once in Quick view
     × puts the score in a status region
     × paused at goal progress 0.498 the score stays 0-0 for 5 s; 17 frames after Resume it reads 1-0
     × a goal that has landed stays on the scoreboard through a pause and the Resume tap
     × after the 30' goal the pitch shows the REPLAY bug, and Skip replay returns to the live clock
Error: Cannot find module './dash-lint.mjs' imported from /Users/paulo/Projects/pokedraft-copy-pass/scripts/audit/dash-lint.test.ts
 Test Files  20 failed (20)
      Tests  31 failed | 135 passed (166)
```

Typical failures: `expected '1 - 0' to be '1-0'`, `expected 'Minimize draft picker' to be 'Hide
players'`, `expected 'Empty GK slot (bad fit)' to be 'Empty GK slot (Poor fit)'`, `expected [
'Rating 267', ... ] to deeply equal [ '267', ... ]`.

The shared-view guard first used `\b(You|Your)\b` on the whole `textContent`, which glues
neighbouring nodes ("WinYou6-0") and so matched nothing. Before the RED commit it changed to read
each text node and `aria-label`, and it then failed for the right reason (28 strings, "You" and
"Your record, Team Score and cup finish." among them).

RED `1449ed8`: 2 of 41 failed in 2 files. GREEN `028b6f3`. The first browser run of
`copy-pass.spec.ts` found "75' Your assistant switches to Defend" in a shared engine-6 run's match
events, which the engine-1 unit fixture has none of.

```
     × on a shared run names the side This squad, never you (catches Your assistant on a friend's link)
     × a shared engine-6 run with assistant tactic changes never says You or Your (catches the match events list)
 Test Files  2 failed (2)
      Tests  2 failed | 39 passed (41)
```

Regression guards, no RED (behaviour already correct): "a live run still says You and Your team",
the history heading "Your last 50 runs" in `copy-pass.spec.ts`, and `lintDashes` finding no dash
in `src` today.

## Fix round 1

`git merge origin/main` (never a rebase) brought in PR #113 (`124afab`) as merge commit `9353da8`.
Only `STATE.md` conflicted, and `resolve-state.py` resolved it with the #113 paragraph. Git merged
`MatchPlayer.tsx`, `MatchdayFlow.tsx` and `Touchline.tsx` on its own. After the merge no spaced
score is left in them, and `pnpm check:dashes` passes with 4-0's new copy included.

The carryover reproduced at the merge head. A shared run's replay still said "Your XI" on the
scoreboard and score bug, "Your side 50%" on the momentum meter, "Your side switch to Defend" on
the tactic banner and "75' Your assistant switches to Defend" in the ticker.

RED `8d5558d`: 2 of 7 failed in 2 files. GREEN `3af2e35`.

```
 FAIL  src/components/matchday/__tests__/Broadcast.sharedSide.test.tsx > Broadcast tactic banner (catches a shared run's banner saying Your side) > a shared run says This squad switches to Defend
AssertionError: expected 'Your side switch to Defend' to be 'This squad switches to Defend' // Object.is equality

Expected: "This squad switches to Defend"
Received: "Your side switch to Defend"

 FAIL  src/components/results/__tests__/MatchReplay.test.tsx > MatchReplay on a shared run (catches the shared match player still saying Your XI and Your assistant) > names the shared side This squad on the scoreboard, the momentum meter and the ticker
AssertionError: expected 'Your XI' to be 'This squad' // Object.is equality

Expected: "This squad"
Received: "Your XI"

     × a shared run says This squad switches to Defend 37ms
     × names the shared side This squad on the scoreboard, the momentum meter and the ticker 16ms
 Test Files  2 failed (2)
      Tests  2 failed | 5 passed (7)
```

The two live guards ("the live run still says Your side switch to Defend" and "keeps Your XI,
Your side and Your assistant on the live run") passed at RED. They are regression guards with no
RED.

Decisions:

- **Variant through props.** `MatchReplay` passes its `variant` to `MatchPlayer`, and
  `MatchPlayer` passes it to `Broadcast`. Both default to `"live"`, so `MatchdayFlow` and the
  exhibition replay keep "Your XI". The strings come from `SIDE_COPY`, which gains `ourSide`
  ("Your side" or "This squad") and `switchesTo` (Model the Domain: one table, no new branches in
  the components). The `TEAMS_USER` constant is gone.
- **Ticker.** `beatLine` takes the same `shared` flag that `incidentText` already took, so the
  ticker says what the results' match events say: "75' This squad's assistant switches to Defend".
- **Banner grammar.** The live banner keeps "Your side switch to Defend", and an opponent keeps
  "Goldenrod United switch to Defend". The shared banner reads "This squad switches to Defend",
  the same verb the shared match events already use. The two shared lines read alike.
- **Guard placement.** The scoreboard, meter and ticker guard renders `MatchReplay`, so it fails
  if the replay stops passing `variant`. The banner guard renders `Broadcast` with only the 75'
  switch marked as fired. In the golden G1 a sub fires on the same tick and would take the
  banner.

## Measurements

- The rating meters now share one grid in `.ladder`, with a `minmax(2.6em, max-content)` label
  column at 13 px. With the label set to "You" in a browser (390 px, `/r/` golden run, G1), the
  label, track and value boxes were identical before and after the CSS change: label 51.0 px left
  and 33.8 px wide, track 92.8 px left and 215.5 px wide, value 316.3 px left. A live run's card
  is therefore unchanged. At 320 px "THIS SQUAD" sits on one line and both bars start together;
  before the change it wrapped to two lines and ran into the bar column.
- No horizontal overflow on the shared run at 390, 360 and 320 px, the draft at 390 px and the
  history page at 390 px (`document.documentElement.scrollWidth <= innerWidth`).
- `pnpm check:dashes` on `src` today: no findings.

## Product decisions applied

All from hand-off 4.3, row 4e:

- `SUITABILITY_LABEL` is `{ recommended: "Best", ok: "OK", bad: "Poor" }`. The star is a glyph
  beside the label in `PitchCard` and `Touchline`, the two places that rendered it before.
- "(recommended fit)" becomes "(Best fit)" through `SUITABILITY_LABEL`.
- "Rating / Rating 61" becomes key "Rating", value "61".
- Drawer: "Hide players" open, "Show players" revealed and closed, "Show roll" before the reveal.
  "Spin results" becomes "Show roll" with the aria-label "Back to the roll".
- Sentence case: "Tap to draft", "Sort: role rating", "Sort: raw fit". "Casual sighted mode"
  becomes "Ratings on".
- Blind-mode hint: "Off hides scores and ratings during challenges. Position fit hints stay." The
  Play card says "Challenge runs show scores and ratings." or "Challenge runs hide scores and
  ratings. Position fit hints stay."
- Shared view says "This squad" or "This lineup". `variant` reaches `MatchList`, `MatchReplay` and
  `RecordedSaves`.
- Scores are "1-0" everywhere, including "Pens 4-3".
- History copy interpolates `HISTORY_LIMIT`.
- Dash lint as specified, with `__tests__`, `*.test.*` and `src/engine/versions/` skipped.

## Implementation decisions

- **One copy table per variant.** `SIDE_COPY` in `src/components/results/format.ts` holds every
  string that names the run's side, keyed by `ResultsVariant`. Each component reads one entry
  instead of branching on `variant` (Model the Domain). Components outside the results page keep
  `variant = "live"` as the default, so `ExhibitionMatchModal`'s replay, where the user side is the
  viewer's own Builder squad, still says "Your team".
- **No nickname.** The `/r/[token]` page passes only `token`, `watch` and `at`. `replayAnyVersion`
  returns `{ engine, current, bundle, draft, cup }`, and `DraftState` holds settings, seed, round,
  rerolls, lineup, drafted and phase. A token carries no nickname, so the shared view always says
  "This squad". Nothing is invented.
- **Match events too.** `incidentText` in `src/ui/matchday/copy.ts` takes `shared`, and a shared
  run reads "This squad switches to Attack", "This squad's assistant switches to Defend", "Kick
  off: this squad plays Press" and "(tactical, manager's call)". The live ticker is unchanged.
- **The explainer** says "Matches are simulated from the Team Score" for both variants, since it
  explains the game to whoever reads it. "Play your own" and "more than you might expect" address
  the viewer, so they stay.
- **Meter label.** "This squad" did not fit the 2.6em label column. The two meters now share one
  grid (`display: contents` on `.ladder > .meter`), so the column grows to the longer label and both
  bars still start at the same x. A "You" label keeps the old geometry (see Measurements). The
  standalone not-played meter keeps its own grid.
- **Dash lint parses, not greps.** `lintSource` walks the TypeScript AST and checks string
  literals, template pieces and JSX text, both decoded (the `\u2014` and `\u{2014}` escapes) and raw (`&mdash;`,
  `&ndash;`, `&#8212;`, `&#x2014;`). CSS lines with `content:` are checked for the characters and
  `\2013`/`\2014`. Comments and regex literals are not copy and are not checked (Build the Lever).
- **The pins generator.** `scripts/e2e/render-pins.ts` wrote "0 - 0" style scores for e2e pins.
  It now writes "0-0", and `pnpm e2e:pins` regenerated `e2e/pins.ts`.

## Re-decided

- **No allowlist for `src/scouting/review.ts`.** The hand-off allowlists it because "its em dash
  is the regex that forbids em dashes". The premise breaks at this head: the em dash sits in a
  regex literal at `review.ts:49` (the `.refine` that rejects a rationale with an em dash), which is outside the lint's stated scope (string
  literals, template literals, JSX text). The lint passes the file with no special case, and
  `dash-lint.test.ts` pins that with the real file ("passes src/scouting/review.ts, whose em dash
  is the regex that forbids em dashes"). Same principle as the hand-off: the regex that enforces
  the rule must never fail it. An allowlist entry for a file that cannot fail would be dead code.

## Brief against code

- Every cited line in the 4e code map matched at `34af10e`: `labels.ts:138-142`, `Pitch.tsx:114`,
  `Picker.tsx:419` and `:331-332`, `RoadStrip.tsx:84`, `DraftBoard.tsx:599` and `:762-764`,
  `PitchCard.tsx:53`, `SidePanel.tsx:184-186`, `:273`, `:279`, the shared "You" lines,
  `MatchPlayer.tsx:580, :584`, `MatchdayFlow.tsx:171, :174`, `ExhibitionMatchModal.tsx:101, :348`
  and `history/page.tsx:17, :25`.
- The dash census matched: 8 em dashes and 1 en dash, all in `review.ts`, its five engine version
  copies, `PackCredit.test.tsx:37` and `recap.test.ts:159`.
- Not in the map: `Touchline.tsx:200` renders `SUITABILITY_LABEL` (bench cards); `MatchList.tsx:173`
  says "below your full Team Score"; `MatchHighlights.tsx:287` renders `RecordedSaves`;
  `src/ui/matchday/copy.ts:94-97` says "you play" and "Your assistant" in the results' match
  events; `ResultsView.tsx:368` says "your Team Score"; `scripts/e2e/render-pins.ts` formats the
  e2e pin scores with spaces.
- The fullscreen score bug (`MatchPlayer` `score-bug`) already used "0-0" and "Pens 3-2".
- `Pitch.tsx` sets `aria-label` on a slot, but `aria-labelledby` wins for the accessible name, so
  a screen reader reads the visible prompt ("GK GK Poor"). The `aria-label` is fixed as decided;
  it only shows where `aria-labelledby` is absent.
- `ScoutingDossier.tsx:355` renders its own `"★ Best"`, `"OK"` and `"Poor"`. The visible words
  already match, so it is left to row 4f, which rewrites the dossier.
- Fix round 1, at `9353da8`: the "Your side" banner is at `Broadcast.tsx:740`, not about `:665`.
  `TEAMS_USER` also fed the full screen score bug (`MatchPlayer.tsx:926`) and the ticker, and the
  momentum meter's `aria-valuetext` said "Your side" (`:645`). The fix brief named only the side
  label and the banner. The decision "Shared view never says You" covers all four, so all four
  changed.

## Gates

Fix round 1 gates are at `3af2e35`, the code-identical head (the docs commit that follows changes
only docs and proof PNGs):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,692 passed in 198 files.
- All eight `check:*` scripts exited 0.
- Prettier passed on all 79 files changed against `origin/main`.
- Playwright full suite (`CI=1`, headless, default workers, fresh build at `3af2e35`): 932
  passed, 64 skipped, 1 failed. The failure was `fullscreen-score-bug.spec.ts:101` (chromium,
  also on its retry). It opens a shared `/r/` run and expected "Your XI" in the score bug, which
  now says "This squad0-0Goldenrod7'". That is this round's intended change. `fcc6eb9` updates that
  literal and adds the side label and momentum checks to `copy-pass.spec.ts` (e2e only, no `src`
  change). `copy-pass.spec.ts` and `fullscreen-score-bug.spec.ts` then passed 11 of 11 on the same
  build. The full suite was not re-run after `fcc6eb9`.
- Browser proof: `docs/reports/copy-pass/scoreboard-390.png` now shows "This squad 1-0" at 49'
  on the shared replay.

Round 0 gates follow.

At `287150e` (code identical at the docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,678 passed in 195 files.
- All eight `check:*` scripts exited 0: `mirrors`, `image-seam`, `image-packs`, `client-bundle`,
  `theme-contrast`, `theme-colors`, `theme-cvd` and the new `dashes`.
- `check-retained-replays.mts` (10 golden replays) and `measure-retained-json.mjs` exited 0.
- Prettier passed on every touched file.
- Playwright full suite (`CI=1`, headless, default workers, fresh build at `287150e`): 921 passed,
  64 skipped, 2 failed. Both failures were one test, `manager-mode.spec.ts:54` on the `chromium` and
  `pixel-7` projects: the share-link check expected "Kick off: you play Attack" and the shared view
  now says "Kick off: this squad plays Attack", which is this row's intended change. `429b448`
  updates that literal (e2e only, no `src` change), and `manager-mode.spec.ts` then passed 14 of 14
  on the same build.
- `e2e/copy-pass.spec.ts`: 7 of 7 passed in the full run.

At `429b448`: `pnpm lint` and `pnpm typecheck` exited 0, `pnpm test` passed 1,678 in 195 files,
`pnpm check:dashes` exited 0 and Prettier passed on the touched files.

## NOT RUN

- Review, hosted CI and the live check (coordinator).
- `pnpm data:pokedex` and `pnpm data:scouting` (no data change).
- A physical phone check and a real screen reader pass (owner actions).

## Carryovers

- Closed in fix round 1: the shared match player's "Your XI" and "Your side" (see Fix round 1).
- A shared ticker goal line reads "Goal for This squad!", the side's name in title case, as the
  live line reads "Goal for Your XI!".
- `ScoutingDossier.tsx:355` keeps an inline "★ Best" (row 4f).
