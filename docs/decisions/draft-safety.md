# Draft safety (Wave 1, row 1i, bundle)

Yellow, S. Branch `fix/draft-safety` off `f4489cb` (#69). UI only. No file under `src/engine`,
`src/data` or `src/scouting` changed.

## Scope

Six fixes from the row, each re-verified at `f4489cb` before editing (the audits read `40f3c92`):

1. **New run mid-draft.** `DraftBoard.tsx` footer button called `onNewRun` directly, which runs
   `forgetRun` in `LiveRun.tsx`. Now, once any player is signed, the first tap swaps the button for
   "Start over? The N players you signed will be lost." with Start over and Keep drafting. Focus
   moves to Keep drafting; Escape or Keep drafting puts it back on New run. With nothing signed,
   one tap still starts over.
2. **Draft keys behind a modal.** The window `keydown` listener now returns when the dossier is
   open (`inspectId !== null`), when any `dialog[open]` exists, or while the New run question is
   open (Escape there cancels the question). This gates 1 to 3 and the draft's own Escape.
3. **Sticky.** `globals.css` body `overflow-x: hidden` became `clip` (html has no `overflow-x`
   rule), so body is no longer
   a scroll container and `position: sticky` works. Measured on the home Control desk. The results
   pitch column uses the same rule; inferred, not measured.
4. **Card scroll.** `.token` defaults to `touch-action: pan-y`; `.token[data-dragging]` is `none`.
   A vertical swipe that starts on a pitch card scrolls the page. A drag that starts sideways still
   swaps; a drag that starts vertically on touch now scrolls instead (the two-tap swap remains).
5. **Picker backdrop.** After #69 the "drawer" is a centered pop-up at every width, not a bottom
   sheet. Its backdrop now takes taps (`pointer-events` default) and a tap closes the picker. The
   backdrop still drops to `pointer-events: none` while a candidate is dragged, so drag to place
   is unchanged. That rule predates this PR
   (`.board[data-dragging-candidate] .drawerBackdrop`, `DraftBoard.module.css` line 399), so it is
   not in the diff. `e2e/mobile-draft.spec.ts` "pointer drag from candidate card directly drops onto
   empty slot" now asserts the picker is open before it drags. On a fresh build at `904951a` plus that assertion it passed
   3 of 3 (iphone-14, iphone-se, pixel-7, no retries). With the `pointer-events: none` line removed
   from that rule it failed 3 of 3 (`Expected: "Round 2 of 16"`, `Received: "Round 1 of 16"`). Swipe down to close sits on the pop-up's top bar ("Minimize draft picker"), which
   gets `touch-action: none` while open, following the builder Picker's header swipe (80px).
6. **Drag drift.** A dragged starter's `translate` y is divided by `cos(26deg)`, rounded to 0.01px.
   Bench tokens sit outside the tilted field and keep the raw delta.

## RED output (verbatim excerpts)

Guards committed before the fix: `8660698`, `e8ef69d`, `b3faa46`. `b3faa46` corrects two harness
mistakes in the first two: at 1280x720 the default Control desk (1922px) is taller than the home
main column, so sticky had no room and `clip` alone still read `top: -915`; and the 151 challenge
offers one pre-selected species, so its picker renders no backdrop. The guard now pads the main
column with a 4000px spacer and the touch guards use the 8-0 cup. All six Playwright guards were
then re-run against a fresh build of `f4489cb` code with the `b3faa46` spec: 6 failed.

```
3) the home side panel stays stuck at top 16 after a 1000px scroll
   -   "top": 16,
   +   "top": -915,
1) one tap on New run mid-draft keeps the round header
   Locator: getByTestId('round-header')  Expected: "Round 2 of 16"  Error: element(s) not found
4) "2" with the scouting dossier open signs nothing
   Expected: "Round 2 of 16"  Received: "Round 3 of 16"
2) a tap on the dimmed pitch around the open picker closes it and places nothing
   getByRole('button', { name: 'Choose a player' })  Error: element(s) not found
5) a swipe down on the open picker's top bar closes it
   getByRole('button', { name: 'Choose a player' })  Error: element(s) not found
6) a vertical swipe that starts on a player card scrolls the page
   Expected: > 100  Received: 0
6 failed
```

Drag drift unit guard (`Pitch.test.tsx`) against the `f4489cb` `Pitch.tsx`:

```
AssertionError: expected '0px 100px' to be '0px 111.26px' // Object.is equality
```

## Measurements

- Home at 1280x720: Control desk height 1922.5px, grid height 1922.5px, document 2183px. On
  default content the side panel is the tall column, so the sticky fix shows only where the other
  column is taller. Measured with a probe, not committed.
- cos(26deg) = 0.8988; a 100px pointer move now translates a starter 111.26px on the field plane.
  Perspective (1200px) adds a smaller position-dependent factor that this does not correct.

## Product decisions applied

- **Confirm, not undo (Experience First).** A 5 s undo would show the start screen and then have to
  restore a run that `forgetRun` already removed from both storages, across a screen swap owned by
  `PlayScreen`. An inline two-button question in the footer keeps the player on the board, says
  exactly what is lost (the signed count), costs one extra tap on a rare action, and defaults focus
  to the safe choice. No `window.confirm`, no modal, so the board stays readable and automation is
  unaffected.
- **No confirm with nothing signed.** Round 1 with an empty squad loses nothing a fresh Start does
  not give back.
- **Backdrop taps close, not pass through.** #69 recorded that a tap on a placed player or a slot
  around the pop-up reached the pitch. That pass-through is gone: the first tap outside closes the
  picker, the second acts. The row asks for this, and the dimmed look now behaves as a modal.

## Tests changed with the behaviour

- `run.test.tsx` (three cases) and `progress-isolation.spec.ts` press Start over after New run,
  since those runs have signed players.
- `platform-experience.spec.ts`, `theme-type.spec.ts` and `mobile-draft.spec.ts` (the expanded
  drawer keeper case) tapped hub controls or a placed keeper through the old pass-through backdrop.
  They now minimize or tap-close the picker first. #69 had already recorded this for 320px.
- Two `mobile-acceptance.spec.ts` harness comments called `overflow-x: hidden` the app's setting.

## Gates at `681cd5e` (later commits change only docs)

- Lint, typecheck, build and Prettier on every changed file exited 0.
- Unit tests: 1,314 passed in 144 files.
- Playwright on a fresh build, full suite, `CI=1`: 823 passed, 0 failed, 0 retried, 61 skipped.
  It includes the six guards, the 390, 360 and 320 proof scenes, `mobile-targets` and
  `mobile-acceptance`.
- Browser proof: `docs/reports/draft-safety/picker-{390,360,320}.png` and
  `new-run-{390,360,320}.png`, written by the proof scenes in `e2e/draft-safety.spec.ts`.

## NOT RUN

- Physical phone check (iOS Safari, Android Chrome).
- Real touch swipe and scroll on WebKit: no API. The touch guards run on Chromium only.
- GLM review: the coordinator runs it.
