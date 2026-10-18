# Touchline bottom sheet (Wave 3, row 3a)

Tier Yellow. Branch `feat/touchline-sheet` off `origin/main` at `b08c68c`. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the engine goldens are untouched.

## Scope

Re-verified at `b08c68c`:

- `play` in `src/ui/matchday/player.ts` had one clock switch, `running`, flipped by `toggle`.
  `tick` skipped while `!running`, but `kickAt`, `hold.until` and the `fired` stamps are wall-clock
  times, so a pause did not stop them.
- `MatchPlayer` rendered the Broadcast, the controls, the stop prompts and the `Touchline` in one
  column below 600px. At 390x844 the pitch ran from y 323 to 531 and the controls sat at 543, so
  the Touchline started below the fold.

The change:

- The reducer gets `uiHold` and `pausedAt`. `{ type: "sheet"; open; now }` sets `uiHold` and never
  touches `running`, so a player who paused stays paused when the sheet closes. `toggle` now carries
  `now`. `frozen(s)` is `!running || uiHold`, and `tick` returns early while frozen.
- When the clock stops, `pausedAt` records the time. When it starts again, every `fired` stamp,
  `hold.until` and `kickAt` (pens only) move forward by the paused time. `frameNow(state, now)`
  returns `pausedAt` while frozen, and the Broadcast frame and the rAF loop read it, so the whole
  broadcast stops where it is. `skip` clears both fields.
- Below 600px the stop prompts and the Touchline sit in a `.sheet` wrapper fixed to the bottom,
  with `padding-bottom: env(safe-area-inset-bottom)` and a spacer of the same height under the page.
  At 600px and up `.sheet` is `display: contents`, so the desktop layout is the old one.
- Collapsed, the sheet shows the five tactic pills (dense: five columns, no hints), "Subs n of 5",
  the stop prompt when there is one, and a "Bench and energy" toggle. Expanded, it adds the bench,
  the sub form and the energy rows in one column, scrolls inside itself, and the toggle reads "Back
  to the match".
- Opening the sheet holds the clock. Confirming a sub, answering a stop (`stop-go`,
  `injury-confirm`) or tapping "Back to the match" closes it and releases the hold. Tactic taps
  keep it open.

Files: `src/ui/matchday/player.ts`, `src/components/matchday/MatchPlayer.tsx` and its CSS module,
`src/components/matchday/Touchline.tsx` and its CSS module, `src/components/matchday/TacticPills.tsx`
and its CSS module. Tests: `src/ui/matchday/__tests__/player.test.ts`,
`src/components/matchday/__tests__/Touchline.test.tsx`,
`src/components/matchday/__tests__/MatchdayFlow.sheet.test.tsx` (new),
`src/components/matchday/__tests__/MatchPlayer.score.test.tsx`, `e2e/touchline-sheet.spec.ts` (new),
`e2e/mobile/scenes.ts`, `e2e/prematch-merge.spec.ts`, `e2e/manager-mode.spec.ts`.

## Carryover 2e reproduced first

At `b08c68c`, a scratch script ran the reducer on the same pens fixture the guard uses (kick
started at 1000, pause at kick progress 0.4, resume 10 s later). It printed kick progress 1 while
paused, `kickAt` 1000 after resume, progress 1 after resume, and 1 kick finished on the first tick
after resume. So the paused kick played out and the next kick started at once. The guard below
pins the fix.

## RED output (verbatim excerpt)

RED commit `7579d8b` (12 of 27 failed across 3 files):

```
 ❯ src/ui/matchday/__tests__/player.test.ts (16 tests | 7 failed) 13ms
   ❯ the touchline sheet holds the clock apart from the player's own pause (3)
     × opening the sheet freezes the clock (catches a sheet that lets the match run while the manager decides): 10.08' before and 2 s after 2ms
     × closing the sheet once the sub is confirmed resumes the clock (catches a sheet that leaves the match stopped): 13.68' 2 s later 0ms
     × a player who paused stays paused after the sheet closes (catches a sheet that reuses the play toggle) 0ms
   ❯ a pause stops the broadcast where it is (catches the 2e carryover: a paused kick plays out and the next starts on resume) (4)
     × pause at kick progress 0.4 resumes at 0.4: kickAt moves from 1000 to 11000 after a 10 s pause 2ms
     × while paused the broadcast's frame stays at the pause: kick progress 0.4 at 1480, and still 0.4 at 5000 0ms
     × the sheet pauses a kick the same way: open at 1480, close at 4480, kickAt 4000 0ms
     × a goal's hold and its staging resume where the pause left them: hold until 19272 becomes 29272 2ms
 ❯ src/components/matchday/__tests__/Touchline.test.tsx (8 tests | 2 failed) 130ms
   ❯ Touchline as a phone sheet (catches a collapsed sheet without its tactics, sub count or toggle) (3)
     × collapsed: the five tactics, Subs 2 of 5 and a closed toggle that asks to open 13ms
     × expanded: the toggle goes back to the match 9ms
 ❯ src/components/matchday/__tests__/MatchdayFlow.sheet.test.tsx (3 tests | 3 failed) 471ms
   ❯ touchline sheet (catches a sheet that lets the clock run while the manager decides) (3)
     × opening the sheet freezes the clock: 2' before and still 2' 2 s after 280ms
     × confirming a sub resumes the clock: 5' after 1600 ms more 105ms
     × a player who paused stays paused after the sheet closes 85ms
TestingLibraryElementError: Unable to find an element by: [data-testid="sheet-toggle"]
TypeError: Cannot read properties of undefined (reading 'stage')
TypeError: Cannot read properties of undefined (reading 'running')
AssertionError: expected 1000 to be 11000 // Object.is equality
TypeError: frameNow is not a function
AssertionError: expected { key: 'goal:30:user:Charizard', …(1) } to deeply equal { key: 'goal:30:user:Charizard', …(1) }
-   "until": 29272,
+   "until": 19272,
 Test Files  3 failed (3)
      Tests  12 failed | 15 passed (27)
```

`sheet-toggle` was missing 5 times. The Touchline "no toggle" test passed before the fix and stays
as a guard that desktop and sim mode get no toggle.

RED commit `ca4a99f` (1 of 7 failed, run with the `7579d8b` source and this test file):

```
 ❯ src/components/matchday/__tests__/MatchPlayer.score.test.tsx (7 tests | 1 failed) 1769ms
   ❯ MatchPlayer pause (catches a goal that plays out and is counted while the match is paused) (2)
     × paused at goal progress 0.498 the score stays 0-0 for 5 s; 17 frames after Resume it reads 1-0 438ms
AssertionError: expected '1 - 0' to be '0 - 0' // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

The second test in that block (a goal that landed before the pause still reads 1-0 after resume)
passed at `7579d8b` and failed on the GREEN code before `send` set the frame time on resume, which
showed 0-0 for one frame. It stays as a guard.

In the GREEN commit `e094fc8` the sub guard reads "5' after 2400 ms more" instead of 1600 ms. The
replayed match has a 3' save that holds the clock 1,100 ms, so 1600 ms after the sub only reaches
3'. The arithmetic is in a comment above the test: 3 + (2,400 - 67 - 1,100) x 45 / 25,000 = 5.22'.

## Measurements

Playwright (chromium, `CI=1`, build at `e094fc8`), from `e2e/touchline-sheet.spec.ts`:

| Viewport | Collapsed sheet         | Pitch bottom | Open sheet            | Pitch with sheet open |
| -------- | ----------------------- | ------------ | --------------------- | --------------------- |
| 390x844  | 115 px high, top y 729  | 532          | 461 px high, top y 383 | y 166 to 375         |
| 360x780  | 115 px high, top y 665  | 512          | 417 px high, top y 363 | y 166 to 355         |
| 320x640  | 115 px high, top y 525  | 309          | 302 px high, top y 338 | y 145 to 309         |

At 320 the Kick off tap had scrolled the page 204 px before the collapsed reading; at 390 and 360
it had not. In every row the pitch ends above the sheet. The clock read 1' and held with the sheet
open.

At 1280 the touchline box is 928x386, the same as at `b08c68c`. A pixel diff of the touchline crop
against the base screenshot found 0 differing pixels out of 358,208.

## Product decisions applied

- Decision 1 (tactics are the main lever): unchanged. The five pills stay in the collapsed sheet.
- Decision 3 (blind challenges): the sheet adds no new number. It moves the existing touchline into
  a different box, so the ratings-off rules already in `Touchline` apply as before.

## Implementation decisions

- Freeze the whole broadcast, not only `kickAt` and `hold.until`. Shifting the hold alone lets a
  goal's staging play out during the pause, so on resume the clock waits out a hold with nothing on
  screen. Freezing the frame time and shifting the `fired` stamps keeps the picture and the clock in
  step. (Fix root causes; one source of time.)
- Separate `uiHold` from `running`, as the hand-off asked. A player who paused stays paused.
- `--sheet-room` caps the open sheet at the space below the pitch when the player section is at the
  top, never below 120 px, and the sheet scrolls the player to the top when it opens or a stop
  arrives and the pitch would be covered. The hand-off's 55svh alone covers the pitch at 390x844
  (see below). (The pitch stays visible while deciding.)
- The stop prompts move into the sheet, so the half-time and injury answer sits under the thumb
  with the tactics. Answering a stop or confirming a sub closes the sheet, since both end the
  decision. A tactic tap keeps it open, so the manager can also sub in the same stop.
- The tactic takeover line, the sub form and the energy rows hide when collapsed, to keep the
  collapsed sheet near 115 px.
- If the layout leaves the fixed sheet (a phone rotated to landscape past 600px), the sheet closes
  and the hold is released, because there is no toggle left to release it.

## Brief vs code

- The hand-off says `max-height: 55svh` keeps the pitch visible at 390x844. Measured: the pitch
  sits at y 323 to 531, and 55svh is 464 px from the bottom, so the sheet top would be at y 380 and
  cover most of the pitch. The fix is the room cap plus the scroll to the top described above.
- The hand-off does not cover a phone that rotates while the sheet is open. Added the release.
- The hand-off names "the stop CTA" in the collapsed sheet; in code the stop is a separate prompt
  in `MatchPlayer`, not part of `Touchline`. It now renders inside the same sheet wrapper.
- Two e2e specs reached hidden controls on phones once the sheet existed: `prematch-merge` (the
  takeover line) and `manager-mode` (`energy-slot-4` at half time on pixel-7). Both now open the
  sheet first.

## NOT RUN

- `env(safe-area-inset-bottom)` on a device with a home indicator. Playwright cannot emulate it.
- Physical phone check (owner action).
- Review, hosted CI and the full e2e suite.

## Risks and carryovers

- In a very short landscape window below 600px the 120 px floor on the open sheet can cover part
  of the pitch.
- The speed toggle while paused is not changed here (row 3j).
- The `docs/reports/prematch-merge/` screenshots show the old phone layout under the pitch.
- The injury prompt is the tallest stop prompt; with it the collapsed sheet is taller than 115 px.
  Not measured.
