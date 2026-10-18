# Haptics (Wave 3, row 3e)

Tier Yellow. Branch `feat/haptics` off `origin/main` at `40221a8`. No file under `src/engine`,
`src/data` or `src/scouting` changed, so the engine goldens are untouched. The row touches the
matchday sound toggle, the beat sound effect in `MatchPlayer.tsx`, the matchday header in
`MatchdayFlow.tsx`, a new `src/components/matchday/haptics.ts`, and one hook in
`src/components/wheel/sound.ts`. `Broadcast.tsx` and the frame painter (row 3b) are untouched.

## Scope

- `haptics.ts` (new): `buzz(kind)` calls `navigator.vibrate` with a fixed pattern when the
  browser has it, and does nothing otherwise. Goal `[120]`, red card `[70, 90, 70]` (two short
  pulses), final whistle `[400]`.
- `MatchPlayer.tsx`: the beat sound effect buzzes next to the sound it already plays, only while
  `soundOn && view === "live"`.
  - A goal buzzes when it lands (the goal horn's gate), for the user's side only.
  - A red card buzzes when it fires, for the user's side only.
  - The final whistle buzzes on the "Full time" or "End of extra time" whistle beat.
- Once per event. The buzz uses the same `sounded` and `horned` sets as the beat sounds, so a
  beat that has fired once never buzzes again: not on a pause and resume, not on a re-render, and
  not when 3i adds seeking, as long as a seek keeps marking passed beats in those sets.
- The matchday toggle reads "Sound and haptics on" or "Sound and haptics off", keeps
  `aria-pressed`, and points `aria-describedby` at a hint under the controls: "Haptics work on
  Android phones only." The setting is still the one `useSoundEnabled` / `setSoundEnabled` value
  the draft wheel uses. The wheel's own toggle (`SoundToggle.tsx`) still reads "Sound on/off".
- `sound.ts`: `useAudioLocked()` is true while sound is on and the AudioContext is missing or not
  `running`. The context's `onstatechange` notifies the same listeners as the sound setting, so
  no new global is added.
- `MatchdayFlow.tsx`: while audio is locked the header shows a "Tap for sound" button (44px
  target), and a pointerdown or pointerup anywhere on the matchday calls `unlockAudio`. The chip
  goes when the context reports `running`.

## RED (commit `3115615`, output verbatim)

Unit, `pnpm vitest run` on the two new test files (6 of 10 failed):

```
   × tap-for-sound chip appears while audio is locked and disappears after the first tap anywhere on the matchday 155ms
     × vibrate called once with the goal pattern on a user goal, never on an opponent goal 1642ms
     × a red card for your team buzzes two short pulses; the opponent's red card does not 2004ms
     × the final whistle buzzes one long pulse, once, and a pause and resume buzzes nothing again 2674ms
     × a skip to full time buzzes the final whistle only, not the goals and cards it skips past 165ms
     × reads Sound and haptics on or off, keeps aria-pressed, and says haptics are Android only 7ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [] to deeply equal [ [ 120 ] ]
AssertionError: expected [] to deeply equal [ [ 120 ], [ 70, 90, 70 ] ]
AssertionError: expected [] to deeply equal [ [ 120 ], [ 70, 90, 70 ], [ 400 ] ]
AssertionError: expected [] to deeply equal [ [ 400 ] ]
AssertionError: expected 'Sound on' to be 'Sound and haptics on' // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="tap-for-sound"]
 Test Files  2 failed (2)
      Tests  6 failed | 4 passed (10)
```

The four that passed at RED pin silence that nothing broke yet: no vibrate with the toggle off,
no vibrate in Quick, nothing where `navigator.vibrate` is missing, and no chip with sound off.

Playwright `e2e/haptics.spec.ts` as committed in `3115615`, on a build of `40221a8` (`CI=1`,
chromium, no retries), 3 of 3 failed:

```
  ✘  1 [chromium] › e2e/haptics.spec.ts:118:5 › with Sound and haptics off Watch live never buzzes (6.2s)
  ✘  3 [chromium] › e2e/haptics.spec.ts:90:5 › Watch live buzzes once per user goal, never for the opponent's, and once at the final whistle (6.3s)
  ✘  2 [chromium] › e2e/haptics.spec.ts:128:5 › tap-for-sound chip appears after reload and disappears after the first tap (1.4m)
    Error: expect(locator).toHaveText(expected) failed
    Expected: "Sound and haptics on"
    Received: "Sound on"
    Error: expect(locator).toHaveText(expected) failed
    Expected: "Sound and haptics off"
    Received: "Sound off"
    Error: expect(locator).toHaveText(expected) failed
    Expected: "Tap for sound"
  3 failed
```

The chip scene got past `expect.poll(() => audioState(page)).toBe("suspended")` after the reload
and failed on the missing chip, so the locked audio itself reproduced at `40221a8`.

Changes to the tests after RED, in the GREEN commit `49c1ef2`:

- The skip test expected `[400]`. A skip to full time fires none of the beats it passes (the
  `skip` action in `player.ts` sets the minute and the stage and leaves `fired` alone), so it plays
  no whistle and no horn. Haptics follow the sounds, so the test now expects `[]` and is renamed.
  It passes at RED too, so it pins behaviour rather than proving a fix.
- For the same reason the e2e final whistle step plays the match out at 2x instead of skipping.
- The RED fixture's opponent scorer was a bare species id; the type wants
  `{ kind: "species", id }`. Vitest does not type-check, so RED ran with it; `pnpm typecheck` caught
  it.

## Carryovers

### 2h: audio needs a new tap after a reload (reproduced, fixed)

At `40221a8` a reload during the matchday comes back to the pre-match card. `PlayScreen`'s restore
effect calls `unlockAudio()` outside any tap, so the browser keeps the new AudioContext suspended
until a tap. The player's next tap on Kick off resumes it, but nothing on screen says that sound
is waiting.

Reproducing it took an emulation. Chromium under Playwright gives the reloaded page a user
activation: a scratch spec (not committed) logged `ctor active=true state=running` for the
context the restore effect created after `page.reload()`, at 390x844 with touch. Earlier scratch
runs read `running` after the reload too, with plain Chromium, with
`--autoplay-policy=user-gesture-required`, and with `browserName: "webkit"`. So
`e2e/haptics.spec.ts` replaces `AudioContext` with iOS Safari's rule: a context created or resumed
outside a trusted `touchend`, `pointerup`, `click` or `keydown` stays suspended. Under that rule the
context read `suspended` after the reload at `40221a8`, and the chip scene failed on the missing
chip. After the fix the chip shows, a tap on the matchday title resumes the context
(`running`), and the chip goes.

Inferred, not measured: Chrome on Android likely keeps audio allowed across a reload, like
Playwright's Chromium, so the chip matters mostly on iOS. The owner's phone check covers it.

### 2h: reduced motion keeps the crowd level constant (closed, by design)

Reduced motion governs motion. The Sound toggle governs sound. A player with reduced motion who
leaves Sound on still hears the crowd, and its level follows the staged ball like everyone
else's. Nothing changed.

## Measurements

- `e2e/haptics.spec.ts` at `49c1ef2`, golden cup8 G3 (Santalune Town; your goals at 3', 6', 17',
  30', 50' and 64', theirs at 10'), Watch live at 390x844 with touch:
  - At 2-1 (after their 10' goal landed) the recorded calls were `[[120], [120]]`.
  - Played out at 2x, the calls at full time were six `[120]` and one `[400]`.
  - With Sound and haptics off: `[]`.
- Unit fixture (seed `haptics-test`): your goal 20', theirs 40', your red 50', theirs 60'.
  At 45' `[[120]]`, at 65' `[[120], [70, 90, 70]]`, at full time after a pause and resume at 65'
  `[[120], [70, 90, 70], [400]]`. Quick and Sound off: `[]`.
- The chip's box is at least 44 by 44 px (asserted in the spec), and the page does not scroll
  sideways at 360 or 320 with the new hint (asserted; 390 is seen in the screenshot only).

## Product decisions applied

- Decision 1: Quick has no per-phase sounds, and now no haptics either.
- Decision 3: no new number on the touchline.

## Implementation decisions

- Red card for the user's team only. The brief says "a user goal, red card and final whistle".
  Reading "red card" as the user's red card mirrors "user goal": the buzz marks what happens to
  your side. This is an implementation reading of the brief.
- Haptics ride on the beat sounds' fired sets rather than a set of their own. One mechanism decides
  "this beat has played", so sound and touch cannot disagree, and 3i's seek has one place to keep
  in line.
- Final whistle is the last whistle beat of the match ("Full time" after 90', "End of extra time"
  after 120'). A match that goes to penalties buzzes at the end of extra time, when the fulltime
  whistle sound plays, and not after the last kick.
- The chip lives on the matchday flow, so it covers the pre-match card and the match. Watch live is
  always opened by a tap that unlocks audio, so `MatchReplay` has no chip.
- Pointerdown and pointerup both unlock. On touch screens browsers count the pointerup, not the
  pointerdown, as the gesture that may start audio; a pointerdown alone would create a context that
  stays suspended.
- The chip hides when the context reports `running`, not on the tap itself, so it stays if the
  browser refuses audio.

## Brief vs code

- The hand-off puts the toggle at `MatchPlayer.tsx:488` to `:492`. At `40221a8` it is at `:513`
  to `:525`; `:488` is the play toggle's `unlockAudio()` call.
- The hand-off says the first pointerdown unlocks. Touch pointerdown is not a user activation, so
  pointerup also unlocks (see above).
- The hand-off says the chip shows "when the matchday mounts without unlocked audio". At this head
  every route into a running match passes a tap that unlocks audio: Kick off on the pre-match card
  and Watch live. After a reload the locked state shows on the pre-match card, which is part of the
  matchday flow, so the chip shows there.

## Gates

Recorded in `STATE.md` at the code-identical head.

## NOT RUN

- Vibration on a real Android phone, and audio after a reload on a real iPhone (owner phone check).
- Playwright cannot vibrate; the spec stubs `navigator.vibrate` and records calls.
- iOS Safari's autoplay rule is emulated in the spec, not run on WebKit iOS.
- GLM review and hosted CI (coordinator).
- The full local Playwright suite (hosted CI runs it).

## Carryovers out

- 3i (deep links that autoplay a goal): such a link mounts the match without a tap. Mount the
  match inside the matchday flow's chip, or reuse `useAudioLocked` in `MatchReplay`, and keep
  seeks marking passed beats in `sounded` and `horned` so they never buzz.
