# Matchday carryovers (Wave 4, row 4-0)

Tier Yellow. Branch `fix/matchday-carryovers` off `origin/main` at `34af10e`. No file under
`src/engine`, `src/data` or `src/scouting` changed (`git diff --quiet 34af10e HEAD -- src/engine
src/data src/scouting` exits 0), so the engine goldens are untouched.

## Scope

The change, by file:

- `src/ui/matchday/player.ts`: in `tick`, a goal or save beat on the stop's own minute holds the
  clock first. The stop opens only after that hold, and its instant replay, ends.
- `src/ui/matchday/badge.ts`: `Box` and `keepInside(box, bounds)`. This is the 3d badge clamp
  rule, applied to a whole box.
- `src/ui/matchday/camera.ts`: `visibleRect(cam)`, the part of the pitch the follow camera shows,
  in pitch percent.
- `src/components/matchday/Broadcast.tsx`:
  - `CutInSprite` measures its circle and passes that pixel size to `PlayerImage size`. It falls
    back to 36, the circle's floor.
  - The ball carrier's nameplate is moved with `translate` into `visibleRect` clipped to the
    pitch, or into the whole pitch under the wide camera.
  - `Broadcast.module.css` drops the `.cutInSprite > *` rule that lost to PlayerImage's inline box.
- `src/components/matchday/MatchPlayer.tsx` and `.module.css`:
  - In full screen the toggle is a 44px icon button with the accessible name "Exit full screen".
  - A `takeFocus` prop focuses the play toggle on mount.
  - The edit is 17 lines.
- `src/components/matchday/MatchdayFlow.tsx` (4 lines): the heading takes focus only before a
  match, and the player gets `takeFocus`.
- `src/components/matchday/Touchline.tsx` and `.module.css`:
  - Each energy row is `<li><button aria-pressed>` instead of `li role="button"`.
  - The headings are h2 "Touchline", then h3 "Take off" and "Bring on".
- `e2e/a11y.spec.ts`: the touchline exclusion and its machinery are gone.

`PlayerImage` did not change. Its existing `size` prop was enough.

## RED

RED commit `d83bc1a`, "test(matchday): guards for the Wave 3 carryovers (RED)".

Unit, `pnpm vitest run src/ui/matchday/__tests__/player.stopGoal.test.ts`: 2 of 2 failed.

```
 ❯ src/ui/matchday/__tests__/player.stopGoal.test.ts (2 tests | 2 failed) 5ms
     × with instant replays, the 45' goal plays live and lands, then replays, before the half-time stop opens, and nothing replays after the answer 4ms
     × without instant replays, the 45' goal plays live and lands before the half-time stop opens 1ms
AssertionError: expected [ 'goal from 0 ms', …(5) ] to deeply equal [ Array(6) ]
  [
    "goal from 0 ms",
+   "stop halftime",
+   "answered",
    "goal lands",
    "replay",
    "replay ends",
-   "stop halftime",
-   "answered",
  ]
AssertionError: expected [ 'goal from 0 ms', …(2) ] to deeply equal [ Array(4) ]
  [
    "goal from 0 ms",
-   "goal lands",
    "stop halftime",
    "answered",
  ]
```

E2E, `CI=1 pnpm exec playwright test --project=chromium e2e/matchday-carryovers.spec.ts
e2e/a11y.spec.ts`, against a build of `d83bc1a`: 8 of 8 failed. The 8 were the 6 carryover
instances then in the spec, plus the managed a11y scan in the dark and light themes.

```
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:22:5 › cut-in sprite is not empty: the key duel's Remoraid fills its circle at 390px
    - 36, 36
    + 80, 80
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:69:7 › nameplate stays inside the pitch at 360px
    Expected: >= 0
    Received:    -23.4
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:69:7 › nameplate stays inside the pitch at 320px
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:131:7 › exit button never covers the field in full screen at 1280x720
    Expected: false
    Received: true
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:131:7 › exit button never covers the field in full screen at 844x390
  ✘  [chromium] › e2e/a11y.spec.ts:159:11 › dark theme › no axe violations on a managed live match at an injury stop with the skip warning open
    +   "aria-allowed-role (minor): li[data-testid=\"energy-slot-0\"]",
    ...  (energy-slot-1 to energy-slot-10, the same)
    +   "heading-order (moderate): h3",
    +   "list (serious): .arPBnq_energy",
  ✘  [chromium] › e2e/a11y.spec.ts:159:11 › light theme › (the same)
  ✘  [chromium] › e2e/matchday-carryovers.spec.ts:174:5 › Space after Kick off pauses
    Error: expect(locator).toBeFocused() failed
    Locator:  getByTestId('play-toggle')
    Expected: focused
    Received: inactive
  8 failed
```

After RED the spec gained more instances: the cut-in at 360, 320 and 1280, and the nameplate at
390. Those were not run against a pre-fix build (NOT RUN).

The follow camera guard is commit `ee397e0`. It is labelled "regression guard, no RED" because it
passes at the base. It has no RED commit; see the camera section below.

## Decisions applied from the hand-off

### Cut-in sprite

Fixed through PlayerImage's own API. `CutInSprite` reads its circle's `clientWidth` in a layout
effect and a `ResizeObserver`, then passes that number as `PlayerImage size`. The CSS override is
gone.

| Viewport | Before: circle, picture | After: circle, picture, img |
| -------- | ----------------------- | --------------------------- |
| 390x844  | 36, 80 x 80             | 36, 36 x 36, 32 x 32        |
| 360x740  | not measured            | 36, 36 x 36, 32 x 32        |
| 320x640  | not measured            | 36, 36 x 36, 32 x 32        |
| 1280x720 | not measured            | 56, 56 x 56, 48 x 48        |

The circle is `clamp(36px, 9cqi, 56px)`. The guard asserts the circle and the picture box are
both equal to the literal circle size. It also asserts the img is non-empty and no bigger than the
circle, and that the duel line reads "Remoraid used Hyper Beam!".

### Carrier nameplate

The fix uses the same rule 3d used for badges, through `keepInside` in `badge.ts`. The bounds are
what is visible, not the whole pitch: under the follow camera the frame shows only
`visibleRect(cam)`, so a nameplate clamped to the pitch can still sit off screen.

| Viewport | Before: left gap | After: left gap |
| -------- | ---------------- | --------------- |
| 390x844  | not measured     | 0.3             |
| 360x740  | -23.4            | 0.3             |
| 320x640  | -24.8            | 0.3             |

The guard pauses on the first frame with the carrier in the pitch's leftmost 6%. It asserts the
nameplate is inside `pitch-view` on all four sides.

### Full screen exit button

The button is a 44px square in the screen's top right corner, with an 8px inset plus the safe
area inset. The hand-off asked for the band when it is at least 52px wide, otherwise the score bug
row. The corner covers both cases in CSS alone, with no measuring:

- With a side band at least 52px wide, the corner is in that band.
- With a top band at least 52px tall, the corner is in that band.
- When the pitch fills the screen, the corner is in the score bug's row.

| Viewport | Before: button x | Field right edge | After: button x |
| -------- | ---------------- | ---------------- | --------------- |
| 1280x720 | 1141.7 to 1272   | 1202.5           | 1228 to 1272    |
| 844x390  | 705.7 to 836     | 726.7            | 792 to 836      |

The visible text "Exit full screen" became a crossed-corners icon. The text is kept as visually
hidden text, so the accessible name is unchanged; the guard asserts it. Outside full screen the
toggle still reads "Full screen".

### Kick off focus

`MatchdayFlow` focused its heading on every `index` and `phase` change, so focus landed on the
h1, not on body as the hand-off said. The heading now takes focus only in the `pre` phase.
`MatchPlayer` gets `takeFocus` and focuses the play toggle with `preventScroll`. The guard checks:

1. Enter on "Kick off".
2. The toggle is focused.
3. Space reads "Resume", with the scroll position unchanged.
4. Space again reads "Pause".

### Touchline axe

Each energy row is now a `<li>` holding a `<button type="button" aria-pressed>`, and it is
disabled when no pick is possible. The heading outline was measured, not guessed. The Touchline
is mounted only by `MatchdayFlow`, under its h1, and no h2 sits between them. So "Touchline"
became an h2, and "Take off" and "Bring on" became h3. The exclusion in `e2e/a11y.spec.ts` is
gone. The scan comment now says the touchline is scanned too.

Before the fix the managed scan found:

- 11 `aria-allowed-role` (one per energy row);
- `heading-order` on the h3;
- `list` on the energy `ul`.

After the fix it is clean in dark and light.

### 3i: a goal on a stop minute

The script `stop-goal.mts` (scratch, not committed) does this:

1. It drafts cup8 runs with the calibration `good` bot over seeds `stopgoal-1` and up.
2. It finds user goals on a stop minute.
3. It drives the reducer the way MatchPlayer does: 100 ms ticks, no ticks while a stop is open,
   and the answer 5 s after the stop opens.

Before the fix it found 4 such matches:

- `stopgoal-1` match 0 (45');
- `stopgoal-6` match 3 (45');
- `stopgoal-10` match 0 (45');
- `stopgoal-10` match 1 (45', with an injury stop at 65').

In every one, `onPitchStarts=0`. The stop opened on the goal's minute before the goal staged, and
the instant replay began only after the answer. With replays off the goal never staged at all.
So it reproduces.

After the fix, the same 4 matches read `onPitchStarts=2 instantReplays=1` with replays on: the
live goal, then its replay. With replays off they read `onPitchStarts=1 instantReplays=0`. In
both cases this happens before the stop opens. The script measures "on pitch" with `activeBeat`,
which the half-time whistle beat can win, so its progress figures are rough. The unit guard
measures with `shotOnPitch` instead. It asserts the order "goal from 0 ms, goal lands, replay,
replay ends, stop halftime, answered".

Re-decided. The hand-off said to mark the goal beat as passed when the stop holds the clock. At
`34af10e` that premise does not hold. `MatchPlayer`'s frame loop does not tick while
`state.stop !== null`, and the broadcast draws only on a feed publish. A goal marked as passed
under an open stop would never be seen live; with replays on it would be seen only as a replay,
after the answer. That is the wrong information the hand-off wanted gone. The same principle,
show the goal once and correctly, gives the fix: the stop waits for that minute's goal or save
hold, and its instant replay, before it opens.

### Follow camera

Kept at 1.6x. The bound is `4% x zoom`, or `4% x zoom x 2` at 2x. The guard is
`camera-motion.test.ts`. It runs the golden cup's 6 played matches at an exact 60 Hz clock. It
divides each frame's on-screen ball step by that frame's zoom.

- Measured worst at 1x: 3.36%, under 4. The hand-off's 4.91 / 1.6 = 3.07 was a different frame;
  the worst frame is in match 2.
- Measured worst at 2x: 6.77%, under 8.

The guard also has floors (above 2.8 at 1x, above 4 at 2x), so a run that staged no play fails.
It passes at `34af10e`, so it is a regression guard with no RED. As a mutation check, a 50 ms
`ZOOM_EASE` made it fail at 8.28 to 9.64. The mutation was reverted.

## Closed with evidence, no change

- **70svh cap.** At 1280x720 the column is 1214 wide, and at the pitch's 100 by 64 ratio that is
  777 tall. It cannot fit a 720 high screen. The cap gives 787.5 x 504, so the whole pitch shows
  (`docs/decisions/fullscreen-score-bug.md`, the pitch table, measured at `3d76f09`). Kept as
  intended.
- **20 callouts in one 120' match** (d5, 4-3-3, match index 3, 11 key duels). Decision 12 allows
  about 12 to 15 a match. 3k scales that by match length: 15 x 120 / 90 = 20. So 20 is inside the
  scaled budget, and key duels sit outside it by 2g's design. The count is the hand-off's. It was
  not measured again here (NOT RUN).

## Brief vs code

- The touchline headings were h3 "Touchline" and h4 "Take off" and "Bring on". The hand-off
  named only the h3; the h4s moved down a level with it.
- After Kick off, focus landed on the flow's h1, via `focusHeading`, not on body.
- `STATE.md` listed the touchline a11y fix under 4g. The hand-off moves it to 4-0, and this row
  ships it.
- The hand-off's follow camera figure (4.91 / 1.6 = 3.07) is not the worst frame per zoom. The
  measured worst is 3.36 at 1x, in match 2. Both are under 4.
- 3i: the hand-off's "mark the goal beat as passed" would hide the goal. This is re-decided above.

## Gates

All at `5399d1e`, the GREEN commit and the code-identical head. The docs commit follows.

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,669 tests passed in 196 files. That is 10 new tests in 2 new files over the base:
  2 stop-goal, 2 camera motion, 4 nameplate box and 2 camera window.
- All seven `check:*` scripts exited 0: `mirrors`, `image-seam`, `image-packs`, `client-bundle`,
  `theme-contrast`, `theme-colors` and `theme-cvd`.
- Prettier passed on the 16 files changed since `34af10e`.
- `git diff --quiet 34af10e HEAD -- src/engine src/data src/scouting` exited 0.
- Playwright, `CI=1`, headless, against the `5399d1e` build. The chromium project ran 16 specs,
  88 passed:

  | Spec | Passed |
  | ---- | ------ |
  | `a11y` | 22 |
  | `matchday-carryovers` | 10 |
  | `touchline-sheet` | 8 |
  | `manager-mode` | 7 |
  | `keyboard` | 6 |
  | `touchline-intel` | 6 |
  | `prematch-merge` | 5 |
  | `replay-deep-links` | 5 |
  | `callouts-type-effects` | 4 |
  | `fullscreen-score-bug` | 4 |
  | `follow-camera` | 4 |
  | `broadcast-frame-loop` | 3 |
  | `broadcast-follow-ups` | 1 |
  | `injury-staging` | 1 |
  | `your-calls` | 1 |
  | `quick-not-broadcast` | 1 |

- The `iphone-se`, `iphone-14` and `pixel-7` projects ran `mobile-targets`, `mobile-acceptance`
  and `manager-mode`: 377 passed and 56 skipped. The skips are the specs' own project skips.

The proof screenshots are in `docs/reports/matchday-carryovers/`:

- the duel cut-in at 390, 360, 320 and 1280;
- the nameplate at the left edge at 390, 360 and 320;
- full screen at 1280x720 and 844x390.

The other rows' PNGs that the runs rewrote were reverted.

## NOT RUN

- The widened guard instances (the cut-in at 360, 320 and 1280; the nameplate at 390) against a
  pre-fix build.
- A new count of the 120' callouts.
- WebKit and Firefox desktop projects.
- The owner phone check, and a screen reader pass on the touchline buttons and the icon exit
  button.

## Carryovers

- The exit button icon has no visible label. Its name comes from visually hidden text. A screen
  reader pass should confirm it is announced as "Exit full screen, button".
