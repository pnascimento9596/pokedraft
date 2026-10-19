# Accessible stops and controls (Wave 3, row 3j)

Branch `feat/accessible-controls` off `origin/main` at `eef865e`. Yellow. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- A stop's prompt takes the focus when it opens and hands it back when it closes.
- The momentum bar is a `role="meter"` named "Match momentum".
- Space pauses and resumes, and `2` toggles 2x speed, on the match player.
- In manager mode, Skip to full time first warns inline that the assistant answers the stops left.
- The 1e carryover: a speed toggle mid-beat no longer jumps the staging.

Files:

- Pure reducer: `src/ui/matchday/player.ts`. The `speed` action now carries `now`, and `toggleSpeed` rebases the staging times.
- UI: `src/components/matchday/MatchPlayer.tsx` (keys, `useStopFocus`, the meter, the skip warning) and `MatchPlayer.module.css` (`.skipWarn`).
- Unit tests: new `src/ui/matchday/__tests__/player.speed.test.ts` and `src/components/matchday/__tests__/MatchPlayer.a11y.test.tsx`. `MatchPlayer.seek.test.tsx` confirms the warning in its one manager-mode skip. After the merge of row 3g, `MatchPlayer.fatigueStop.test.tsx` gains a test that the 65' stop takes and returns the focus.
- e2e: `keyboard.spec.ts` gains a managed match by keyboard and the skip warning at 360 and 320. `a11y.spec.ts` gains an axe scan of an injury stop with the warning open. `speed-aware-staging.spec.ts` gains the speed-toggle timing. `helpers.ts` gains `skipManaged`, which `manager-mode`, `your-calls`, `prematch-merge` and `builder-matchday` now use for their manager-mode skips.

## RED commit and output (verbatim excerpt)

RED `4301fca`, 10 of 13 failed in 2 files. GREEN `074dc39`.

```
     × beat progress is identical immediately before and after a speed toggle: 0.5 at 1x becomes 0.5 at 2x, and 0.75 at 2x stays 0.75 back at 1x
     × the goal's hold keeps its remaining share: 1,300 ms left at 1x is 650 ms at 2x, so the hold ends at 18,622, not 19,272
     × a penalty at 0.4 stays at 0.4: kickAt moves from 1,000 to 1,240 at 2x and the next kick comes at 1,840
     × a speed change while paused keeps the frozen frame: 0.5 at the pause, and 0.5 again on resume
     × Space toggles running: Pause, then Resume, then Pause, and the page does not scroll
     × 2 toggles speed on and off
     × is a meter from 0 to 100 named Match momentum, at 50 and 'Your side 50%' at kickoff
     × focus is on the injury prompt after it opens: the assistant's pick, Gyarados, and back on 2x speed once answered
     × the half-time stop takes focus on its button, and a stop opened with nothing focused hands focus to Pause on close
     × in manager mode Skip warns inline first; Keep watching keeps the match on, Skip anyway ends it
AssertionError: expected true to be false // Object.is equality
AssertionError: expected 'false' to be 'true' // Object.is equality
AssertionError: expected undefined to be 'Match momentum' // Object.is equality
AssertionError: expected false to be true // Object.is equality
AssertionError: expected <body><div>…(1)</div></body> to be <button type="button" …(2)></button> // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="skip-warning"]
AssertionError: expected 16672 to be 17322 // Object.is equality
AssertionError: expected { key: 'goal:30:user:Charizard', …(1) } to deeply equal { key: 'goal:30:user:Charizard', …(1) }
AssertionError: expected 1000 to be 1240 // Object.is equality
AssertionError: expected 1 to be 0.5 // Object.is equality
 Test Files  2 failed (2)
      Tests  10 failed | 3 passed (13)
```

The 3 that pass at RED guard against a key handler that does too much: Space on a focused button,
a key with a modifier or held down, and Skip without manager mode. They pin behaviour that already
held.

One test changed after RED. "Space toggles running" pressed Space at 0', where the paused label
reads "Kick off", not "Resume". The GREEN commit waits for 1' first. Its RED failure was the
right one: the key did nothing (`expected true to be false` on `defaultPrevented`).

The 1e carryover reproduced at `eef865e` in that RED run. The 30' goal fires at 16,672 ms. At
17,972 ms it is at progress 0.5, and a 2x toggle moved it to 1 at once. It reproduced in a browser
too (below).

## Measurements

Playwright (`CI=1`, chromium, 390x844, fresh builds):

- Speed toggle. In the golden cup8 replay (match G1), the first goal's callout shows from 0.25 to 1 of its 2,600 ms staging. The spec switches to 2x 301 ms after the callout shows. At `1e7c832` the callout stayed 1,133 ms (predicted 300 + 1,650 / 2 = 1,125), and 1,134 ms in the full run at `119c971`. On a build of the pre-fix sources it stayed 665 ms (predicted 650) and the spec failed `Expected: > 1000, Received: 664.8999998569489`.
- Keyboard. Run `seed=e2e-a11y-47`, match 0, stops at an injury (16') then half time. Focus landed on the checked radio "Kingdra (assistant's pick)", then on Start the second half, and went back to the match player after each answer. Space paused and resumed without moving `scrollY`. Space on the focused 2x button toggled it once per press.
- Skip warning. At 390, 360 and 320 Skip anyway and Keep watching are at least 44 px tall and inside the viewport, with no sideways scroll. At 320 the two buttons stack.
- Axe (dark and light) on the injury stop with the warning open: no violations outside the touchline panel (see Carryovers).

Screenshots: `docs/reports/accessible-controls/390-injury-focus.png`, `390-halftime-focus.png`,
`390-skip-warning.png`, `360-skip-warning.png` and `320-skip-warning.png`.

## Product decisions applied

- Decision 3 (blind challenges). No new number. The meter's value is the momentum figure the bar already shows.
- Decision 1 (manager mode plays live). The warning shows in manager mode only, during the first watch. A replay, or a managed match after full time, skips at once as before.

## Implementation decisions

- Every fired time is rebased, not only the beats still in flight. Every reader of `fired` (`activeBeat`, `landed`, `shotOnPitch`, `walksAt`, `startOf`) reads `(now - fired) * speed`. Rebasing about the frame on screen keeps that product the same for every beat, so a beat that has landed stays landed and needs no in-flight test. The hold's `until` and the penalty's `kickAt` use the same rebase.
- The rebase uses `frameNow`, so a toggle while paused, with the sheet open, or during an instant replay keeps the frozen frame. The pause's own resume shift then applies on top. The instant replay runs at its own 0.5x and is unchanged.
- The keys live on the match player `section`, which gets `tabIndex={-1}`. A click or tap anywhere on the player that is not a control gives it the keys. The player is not a tab stop.
- Space on a focused button or link is left to that control, so it clicks once and never toggles twice. `2` still works on a focused button, since a button has no use for it. Both keys are ignored in an input, select or textarea, with a modifier, and on key repeat. Space does nothing during a stop, where Pause is disabled too.
- Stop focus keys off the prompt element (`[role="dialog"]` in the sheet), not a list of stop kinds, so row 3g's 65' fatigue stop gets it too. It focuses the checked radio if there is one, else the first enabled control. On close it gives the focus back to where it was, else to Pause, and only when the focus was lost. It never pulls the focus away from where the player moved it.
- The warning does not say whether an injury is still to come, because that would reveal a future event. It always reads "Skip to full time? Your assistant answers every stop left in this match, injuries included." The focus moves to Skip anyway. Keep watching returns it to Skip to full time.
- The warning is a `role="group"` labelled by its text, not `role="alert"`, because it holds buttons and the focus move already reads it.

## Brief against code

- The code map's lines were from `bcf5493`. At `eef865e` the momentum bar was at `MatchPlayer.tsx:557` (brief :416), the play toggle at :620 (:453), the speed toggle at :632 (:465) and `InjuryPrompt` at :939 (:620).
- `PlayAction` is no longer `tick | toggle | speed | answer | skip`. Rows 3a and 3i added `sheet`, `seek` and `endReplay`. The `speed` action had no `now`, so it could not rebase. It now carries one.
- The hand-off rebased beats "fired but not landed". Every fired beat is rebased instead (see Implementation decisions). It is the same on screen and needs no in-flight test.
- The hand-off said to ignore keys when the target is an input, select or button. Ignoring `2` on a button would make it dead while the focus sits on Pause, so only Space is left to a focused button.
- Row 3i added no seek keys, so nothing clashes. The draft's hotkeys are a `window` listener in `DraftBoard.tsx`, on another route.
- There is no kickoff stop any more (row 3f). The stops are half time, extra time and injuries, plus 3g's fatigue stop once it lands.

## Merge of origin/main after row 3g

`git merge origin/main` at `d6476b5` brought in PR #103 (`6fb14b7`) with no conflicts. Its 65'
fatigue stop renders through the same `role="dialog"` prompt as half time, so `useStopFocus`
covers it with no change. `119c971` adds a test for it: focus lands on Play on and goes back to
2x speed once answered. With the `useStopFocus` call removed the test failed
(`expected <button …(3)> to be <button …(2)>`, 1 of 3). The call was then restored. That test
passed from its first run, so it is coverage, not a RED guard. The touchline violations are still
there after 3g (its energy list keeps `li role="button"` and the `h3`), so the scan keeps its
exclusion.

## Gates

At `1e7c832` (before the merge): lint, typecheck, build and all seven `check:*` scripts exited 0,
and 1,630 unit tests passed in 191 files.

At `119c971` (after the merge):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 15 touched code and test files.
- Unit tests: 1,659 passed in 194 files.
- Playwright: see STATE.md.

## NOT RUN

- Review (GLM), hosted CI, a real screen reader (VoiceOver, TalkBack) and a physical phone check.

## Carryovers

- Axe on the matchday finds three violations in the touchline panel, which predate this row: `aria-allowed-role` on each `li[data-testid="energy-slot-N"]` with `role="button"`, `list` on the `ul` that holds them, and `heading-order` on its `h3`. Row 3g (PR #103, now merged) rewrote that list and kept all three, so the scan excludes `[data-testid="touchline"]`. Fix them in the Wave 4 4g a11y bundle and drop the exclusion.
- The keyboard and axe scenes depend on `seed=e2e-a11y-47` stopping for an injury at 16' in match 0, which holds on engine 6. Add it to the W6b checklist, or generate it in `scripts/e2e/render-pins.ts`.
- A keyboard user who presses Kick off lands on the page body, since Kick off unmounts. Space only works after a click on the player or a Tab into it.
