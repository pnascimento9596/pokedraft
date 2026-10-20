# Wave 4 carryovers and queue triage (Wave 5, row 5-0)

Branch `fix/wave4-carryovers` off `origin/main` at `5932775` (PR #125, the Wave 4 summary).
Yellow, with part (e) Green. No file under `src/engine`, `src/data` or `src/scouting` changed, so
the goldens are untouched.

## Scope

- **(a) Shared goal line.** `SIDE_COPY` (`src/components/results/format.ts`) gains
  `xiInSentence`: "Your XI" on a live run and "this squad" on a shared one. `MatchPlayer` builds
  the ticker's `Teams` from it, so a shared replay reads "49' Goal for this squad! Talonflame",
  "(this squad)" after a card and "Penalty 3: ... (this squad) scores". Scoreboard, momentum
  meter and table labels keep `xi` ("This squad"), since each starts its own line.
- **(b) Picture alts.** The wheel's species face (`Wheel.tsx:57`) and each Boss XI player
  (`BossRoster.tsx:56`) pass `alt=""`. Both show the same name as text in the same element.
- **(c) Home footer inset.** On `/` the home bar inset now applies once, to the footer, which is
  the last block. `.page:has(+ .site-footer)` drops the page's own inset. Other pages keep it on
  `.page`.
- **(d) Landscape side insets.** `--gutter-left` and `--gutter-right` are
  `max(var(--gutter), env(safe-area-inset-left or right))`. `.page`, `.site-header` and
  `.site-footer` pad their sides with them, the phone header uses `max(12px, env(...))`, and the
  body's own `padding-inline` of the insets is removed.
- **(e) Queue triage.** `docs/queue/dispatch-7-deferred.md`: 11 fixed SA rows deleted with their
  PRs, 13 left with one disposition each in a new section.
- **(f) 4h2 frame diffs.** Closed as frame noise (Measurements).
- **(g) Swipes.** Closed by measurement. `scripts/perf/draft-drag.mts` gains a `picker` scene for
  the Builder Picker sheet.

Files: `src/app/globals.css`, `src/components/results/format.ts`,
`src/components/matchday/MatchPlayer.tsx`, `src/components/wheel/Wheel.tsx`,
`src/components/results/BossRoster.tsx`, `scripts/perf/draft-drag.mts`,
`docs/queue/dispatch-7-deferred.md`; tests `src/components/results/__tests__/MatchReplay.test.tsx`,
`src/components/results/__tests__/BossRoster.test.tsx`, `src/components/wheel/__tests__/wheel.test.tsx`,
new `e2e/safe-area-insets.spec.ts`; data `docs/reports/wave4-carryovers/{swipe.json,frame-noise.jsonl}`.

## RED commits and output (verbatim excerpts)

RED `456d436` (tests only, against the code of `5932775`). Unit: 3 of 60 failed in 3 of 3 files.

```
 ❯ src/components/results/__tests__/BossRoster.test.tsx (44 tests | 1 failed) 215ms
     × names each Boss XI player once, by the visible name, not again by the picture (catches Charmander read twice) 10ms
 ❯ src/components/results/__tests__/MatchReplay.test.tsx (6 tests | 1 failed) 199ms
     × writes Goal for this squad! in lower case mid-sentence (catches Goal for This squad!) 19ms
 ❯ src/components/wheel/__tests__/wheel.test.tsx (10 tests | 1 failed) 528ms
     × reads the landed species once, by its visible name, not again as the picture's alt (catches Pikachu read twice) 10ms
AssertionError: expected [ …(11) ] to deeply equal []
+   <img
+     alt="Charmander"
AssertionError: expected '90\' Full time88\' Toxtricity saves f…' to contain '49\' Goal for this squad!'
Received: "... 59' Spheal saves from Dragalge49' Goal for This squad! Talonflame47' ..."
AssertionError: expected [ <img alt="Pikachu" …(6)></img> ] to deeply equal []
```

The wheel and BossRoster cases are the accessibility tree reproduction of (b): Testing Library
computes roles and names with `dom-accessibility-api`, and both found a picture named after the
text beside it.

`e2e/safe-area-insets.spec.ts` at `456d436` against a build of `5932775` (`CI=1`, chromium): 6 of 7
failed, the no-notch case passing as a labelled regression guard.

```
    -   "padding": "28px",
    +   "padding": "62px",
        "pagePadding": "66px",
...
    -   "brand": 47,
    +   "brand": 63,
        "header": Object {
    -     "left": 47,
    -     "right": 797,
    +     "left": 63,
    +     "right": 781,
```

Second RED `051b0dc` (spec only). It changes the footer guard to the re-decided (c) below, skips
visually hidden text in the landscape scan (8 visually hidden match labels, such as
"Final, Viridian FC, rating 100", showed up at `left: -1` on the first GREEN run) and expects the centred edges (59 and 785) of the three 820px
pages. Against a fresh build of `051b0dc`, whose code equals `5932775`: 6 of 7 failed.

```
  3) [chromium] › e2e/safe-area-insets.spec.ts:80:5 › the home bar inset applies once on /, below the footer text (catches the page's 66px above the footer's 62px)
      Object {
        "padding": "62px",
    -   "pagePadding": "32px",
    +   "pagePadding": "66px",
        "textGap": 65,
      }
```

GREEN `90442aa`. `b2f000c` adds the harness scene and the measurement files.

## Measurements

**(c) Footer.** With the hand-off's fix (footer inset removed) under a 34px home bar, the
footer's last line of text ended 31px above the bottom edge, inside the 34px inset. With the
re-decided fix it ends 65px above (31px without a notch, unchanged), and the gap between the home
card and the footer is 32px again instead of 66px.

**(d) Landscape.** At 844x390 with Chromium's `Emulation.setSafeAreaInsetsOverride` (left 47,
right 47, bottom 21), before: header, brand and page content at 63px from each side (47 body
inset plus 16 gutter). After: 47px on `/` and `/daily`, 59px on the 820px pages (12px of centring
plus the 47px inset). No visible text starts or ends inside either 47px strip on `/`, `/daily`,
`/how-to-play`, `/history` or `/leaderboard`. Without a notch every value is the 16px it was.

**(f) Frame diffs.** `scripts/audit/breakpoint-shots.mts --scenes matchday --widths 960,1280`
twice against one `next start` build of `5932775`, then `scripts/audit/pixel-diff.mts`
(`docs/reports/wave4-carryovers/frame-noise.jsonl`):

| Shot                    | Changed pixels | Box                |
| ----------------------- | -------------- | ------------------ |
| `matchday-1280-light`   | 4              | x 684, y 132 to 135 |
| `matchday-960-dark`     | 4              | x 512, y 143 to 146 |
| `matchday-960-light`    | 19             | x 33 to 527, y 143 to 207 |
| `matchday-1280-dark`    | 0              |                    |

The same 1x4 column shape that 4h2 saw appears between two shots of one build, so it is frame
noise, not a code change. No bisect against `00ab013`.

**(g) Swipes.** `pnpm exec tsx scripts/perf/draft-drag.mts --target head=<build of 5932775> --runs
5`: 4x CDP CPU throttle, 390x844 at 3x, a 2 s scripted drag per scene, 5 runs. Median (min to
max). Load average 2.2 at the start and 2.8 at the end. Headless Chromium rasterises in software,
so these numbers exclude GPU raster.

| Scene                   | p50 ms | p95 ms           | Dropped, long | Script ms per 2 s | Moves | Mutations per s |
| ----------------------- | ------ | ---------------- | ------------- | ----------------- | ----- | --------------- |
| Drawer swipe (draft)    | 16.7   | 16.7 (16.7-16.8) | 0, 0          | 144 (138-189)     | 65    | 33              |
| Picker swipe (Builder)  | 16.7   | 16.7 (16.7-16.8) | 0, 0          | 270 (260-304)     | 66    | 131             |

Both swipes drew every frame (largest gap 16.8 ms, the 60 Hz clock) with no long task. The Builder
Picker spends about 4 ms of script per move at 4x (270 ms over 66 moves), a quarter of a frame,
because each move re-renders the open sheet and its species list. Neither p95 exceeds 16.7 ms
beyond the clock's own 0.1 ms jitter, so the hand-off's condition for the refs and rAF rewrite is
not met. Both stay as they are. The drag scenes measured alongside them match 4j (p95 16.7 to
16.8, no dropped frame). Work happened: the harness throws unless the sheet or drawer is still
translated at the end of each scene, and no run threw.

## Product decisions applied (hand-off 4.3, 5-0)

- (a) A sentence-start word is capitalised and a mid-sentence one is not. The guard asserts
  "Goal for this squad!".
- (b) `alt=""` only where the same name is visible text in the same control. It is in both.
- (d) `max(var(--gutter), env(...))`, so a phone without a notch does not change.
- (e) No behaviour change. Fixed rows deleted with the PR cited, the rest "Wave 7" or "won't fix"
  with a reason.
- (f) and (g) close with numbers and change no code.

## Implementation decisions

- **(a) A new copy field, not a lower-cased string.** `xiInSentence` sits beside `xi` in the copy
  table, so each variant states its own mid-sentence form. "Your XI" keeps its capitals: it is the
  live side's name, and the copy pass (`docs/decisions/copy-pass.md`) pinned "Goal for Your XI!".
  (Model the Domain.)
- **(b) The BossRoster picture count.** The old test counted 11 `img` roles. With empty alts the
  pictures leave the accessibility tree, so it now counts the 11 `[data-player-image]` elements,
  and the new test proves no picture is named. The coverage that every player has a picture
  stays.
- **(d) One custom property per side.** `--gutter-left` and `--gutter-right` live on `:root` next
  to the comment that explains the insets, so the header, page and footer cannot drift apart.
- **(d) The landscape guard scans text, not only edges.** Moving the inset off `body` could leave
  some other block under the notch. The scan checks every visible text box on five routes.

## Brief vs code

- **(c) The premise "the page's padding already clears the home bar" does not hold for the
  footer.** On `/` the footer is the last block, below the page. With its inset removed, its text
  ended 31px above the bottom, 3px inside the 34px inset. Decided again on the hand-off's
  principle (one inset, clear of the home bar): the footer keeps the inset and the page above it
  drops its own. The double gap the carryover named (66px of page padding above a 62px footer
  inset) is gone. The guard checks the page's padding returns to its no-notch 32px and the footer
  text sits 65px from the bottom, instead of the footer's padding.
- **(d) The body already padded the side insets.** `body { padding-inline: env(safe-area-inset-left)
  env(safe-area-inset-right) }` has been in `globals.css` since #22 (`7735b2d`). The 4i log's
  "the gutters ignore the side insets" was wrong: the content cleared the notch, at 47 + 16 =
  63px. Adding `max()` padding on top of the body inset, as written, would have put content at
  94px. Decided again on the same principle (clear the notch once, no change without one): the
  body inset moves into the `max()` gutters. The site footer gets the same gutters, since it lost
  the body inset too.
- **(e) The queue holds more than SA rows.** The file also lists SB, SC, SD, SE, SF and SX rows.
  The row names SA-13 to SA-43, so only those were triaged. SA-20 and SA-26 to SA-31 are not in
  the file.
- **(e) Coordinator hints.** SA-16's viewport export came from #22 and #37 (4g added the theme
  colour meta). SA-18's theme boot script came from #37, extended by #122 and #124. SA-23's
  haptics (#107) cover the matchday only.
- **(g) The drawer swipe was already measured.** 4j measured it (p95 16.7) and left it. The open
  item was the Builder Picker swipe (`Picker.tsx:226`), which 4j did not measure.
- **Line numbers.** `Wheel.tsx:57` and `BossRoster.tsx:56` matched at `5932775`.

## Spec churn

- `e2e/engine-v4.spec.ts` counted 11 Boss XI `img` roles. The pictures now have empty alts, so it
  counts the 11 `[data-player-image]` elements. The new BossRoster unit test proves no picture is
  named.
- `e2e/pwa-viewport.spec.ts` expected the home page's bottom padding at 66px under a home bar. It
  is 32px now, since the footer below carries the inset; `/how-to-play` still expects 66px, and
  `e2e/safe-area-insets.spec.ts` guards the footer.

## Gates

- At `b2f000c`: `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0, all nine `check:*`
  scripts exited 0, and 1,808 unit tests passed in 214 files. Lint and typecheck exited 0 again at
  `34b26b6`. Prettier passed on every touched text file.
- Full Playwright suite at `b2f000c` (`CI=1`, headless, server built from that tree): 1,008
  passed, 67 skipped, 3 failed, no flaky, 18.4m. The 3 failures are the spec churn above.
- After `34b26b6`: `engine-v4`, `pwa-viewport`, `safe-area-insets`, `a11y`, `wheel-results`,
  `mobile-acceptance` and `theme-breakpoints` passed 356, 54 skipped, 0 failed.
- `e2e/safe-area-insets.spec.ts` passed 21 of 21 with `--repeat-each 3`.
- The suite run rewrote screenshots under `docs/reports`; all of them were restored except the
  two new ones in `docs/reports/wave4-carryovers/`.

## Skipped steps

- `no-comments` (Comment Sicko) and `deslop`: skip, not installed. The diff adds three comments,
  each a why: the insets note on `:root`, the footer rule, and the `xiInSentence` note.

## NOT RUN

- Review and hosted CI (coordinator).
- WebKit and Firefox safe-area checks: the inset override is Chromium only.
- A bisect of the 4h2 frame diffs: not needed, the diff reproduces within one build.
- A physical phone check (real notch in landscape, the home bar under the footer) and a real
  screen reader pass on the wheel and the Boss XI (owner actions).

## Carryovers

- The 13 SA rows left in `docs/queue/dispatch-7-deferred.md`, with their dispositions.
- Fixed-position sheets and toasts, which ignored the body inset before and still do, were not
  checked under a landscape notch. The scan covers the static content of five routes.
