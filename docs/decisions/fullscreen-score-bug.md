# Landscape, full screen and score bug (Wave 3, row 3c)

Tier Yellow. Branch `feat/fullscreen-score-bug` off `origin/feat/follow-camera` at `be5a86f`
(row 3b, PR #106, which already holds main through #104), so the pitch cap and the score bug sit on
the camera layer they must work with. No file under `src/engine`, `src/data` or `src/scouting`
changed, so the engine goldens are untouched.

## Scope

Re-verified at `be5a86f`:

- `MatchPlayer.tsx` wrapped the Broadcast in `div.pitch` (`pitchRef`, measured by the sheet hook)
  with `min-width: 0` and no height cap. The Broadcast root is `.broadcast`, then `.view`
  (`pitch-view`, the camera's window, `overflow: hidden`), then `.pitch` (`data-testid="pitch"`,
  `aspect-ratio: 100 / 64`, the camera's transformed layer).
- The scoreboard (`matchday-scoreboard`) was a grid `minmax(0, 1fr) auto minmax(0, 1fr)` and each
  team name had `overflow-wrap: anywhere`.
- `layout.tsx` already sets `viewport-fit: cover`, and `globals.css` pads `body` with the left and
  right safe-area insets. The sheet pads its bottom with `env(safe-area-inset-bottom)`.

The change:

- `.frame`, a new wrapper inside `div.pitch` around the Broadcast:
  `max-width: calc(70svh * 100 / 64)` and `margin-inline: auto`. Capping the width rather than the
  height keeps the 100 by 64 ratio, so the pitch is letterboxed, never cropped or squashed, and
  the camera's percent transform and the badge projection work unchanged.
- `src/components/matchday/useFullscreen.ts` (new): `useFullscreen(ref)` returns `supported`
  (`document.fullscreenEnabled` or `document.webkitFullscreenEnabled`, false on the server) and
  `active` (the full-screen element is this one), through `useSyncExternalStore` on
  `fullscreenchange` and `webkitfullscreenchange`. `toggleFullscreen(el)` and `exitFullscreen()`
  call the standard API or the webkit one.
- `MatchPlayer.tsx`: in Watch live, where the API exists, a "Full screen" button (`btn btn--sm`,
  at least 44 by 44 px, `data-testid="fullscreen-toggle"`) ends the control row. Pressed, it shows
  `div.pitch` full screen. In full screen the same button reads "Exit full screen" and moves into
  `div.pitch`, top right, inset by the safe area. Esc leaves through the browser, and
  `fullscreenchange` brings the page back. Focus follows the button when it moves.
- In full screen `div.pitch` is a grid that centres the frame, padded by all four safe-area
  insets, and the frame is `min(100%, (100svh - top and bottom insets) * 100 / 64)` wide.
- `ScoreBug` (in `MatchPlayer.tsx`): "Your XI", the score as `1-0`, the club's first word
  (`clubShort` in `src/ui/matchday/copy.ts`, "Goldenrod United" is "Goldenrod"), the clock
  (`KO`, `67'`, `FT`; left out during the shootout) and `Pens 3-2` once kicks are shown. It is
  passed to the Broadcast as a new `scoreBug` slot and drawn in `.view`, the camera layer's parent,
  so it never zooms. It renders only while full screen is on. It is `aria-hidden`: the scoreboard's
  `role="status"` score still speaks.
- A stop (half time, an injury, extra time) leaves full screen, because its question is asked
  under the pitch where full screen cannot show it. Entering full screen closes an open sheet and
  releases its hold.
- The scoreboard's side columns are `minmax(min-content, 1fr)` and `overflow-wrap: anywhere` is
  gone, so a side is never narrower than its longest word and a name wraps between words only.

Files: `src/components/matchday/MatchPlayer.tsx` and its CSS module, `Broadcast.tsx` (the slot, 5
lines), `useFullscreen.ts` (new), `src/ui/matchday/copy.ts`. Tests:
`src/components/matchday/__tests__/MatchPlayer.fullscreen.test.tsx` (new),
`e2e/fullscreen-score-bug.spec.ts` (new).

## Carryover reproduced first

The Wave 1 320px scoreboard word break (`docs/decisions/mobile-pitch-fixes.md`, "Goldenro / d
United") reproduced at `be5a86f`. The guard's own output at 320x640, golden cup8 G1 watched live:
`320 scoreboard: broken words ["Goldenrod: 193, 215"]`, the letters of "Goldenrod" on two line
tops. A scratch measurement on the same build put the board at 254 px and each side column at
76.3 px; "Goldenrod" in bold 15 px needs about 80.

The literal check: for every word in the scoreboard's text, each letter's box (a one-character
`Range`) is read, and the word passes when all its letters share one rounded top. Wrapping between
words is allowed; any word with two tops is listed. The guard asserts the list is `[]`.

## RED output (verbatim excerpts)

RED commit `139417f`. Unit, `pnpm vitest run` on the new file: 6 of 8 failed.

```
     × no bug before full screen; the button puts the broadcast in full screen and the bug reads Your XI 0-0 Goldenrod KO 90ms
     × the bug sits in the camera's window, not in the zoomed pitch 18ms
     × the same button leaves full screen, and the bug goes 17ms
     × Esc (the browser leaving full screen by itself) takes the bug away 15ms
     × after a shootout the bug reads FT and Pens 3-2 with hyphens 24ms
     × the webkit-prefixed API (older Safari on iPad) works the same way 12ms
TestingLibraryElementError: Unable to find an element by: [data-testid="fullscreen-toggle"]
 Test Files  1 failed (1)
      Tests  6 failed | 2 passed (8)
```

The two that passed ("no Fullscreen API (iPhone Safari): no button and no bug" and
"fullscreenEnabled false: no button") are true before the change too, and stay as guards that a
browser without the API never gets a dead button.

Playwright `e2e/fullscreen-score-bug.spec.ts` as committed in `139417f`, on a build of `be5a86f`
(`CI=1`, chromium, no retries): 4 of 4 failed.

```
320 scoreboard: broken words ["Goldenrod: 193, 215"]
844x390: pitch {"top":-108.046875,"width":778,"height":497.90625,"ratio":1.5625431494382727,"inView":true,"innerHeight":390}, sheet elements 0
  ✘  3 [chromium] › e2e/fullscreen-score-bug.spec.ts:86:5 › no word break in the scoreboard at 320: every word of both names and the score sits on one line (catches 'Goldenro / d United') (1.1s)
  ✘  2 [chromium] › e2e/fullscreen-score-bug.spec.ts:66:5 › pitch height <= 70svh at 844x390: the whole pitch stays in view, letterboxed (catches a landscape phone where the pitch runs off the screen) (1.2s)
  ✘  1 [chromium] › e2e/fullscreen-score-bug.spec.ts:101:5 › score bug present only when fullscreen: ... (6.9s)
  ✘  4 [chromium] › e2e/fullscreen-score-bug.spec.ts:142:5 › in manager mode at 844x390 the touchline sits in the page under a pitch no taller than 70svh, and a sub goes through (catches a landscape phone with no usable touchline) (1.3m)
    Error: expect(received).toBeLessThanOrEqual(expected)
    Expected: <= 273
    Received:    497.90625
    - Array []
    + Array [
    +   "Goldenrod: 193, 215",
    + ]
    Error: expect(locator).toHaveText(expected) failed
    Expected: "Full screen"
    Error: element(s) not found
    Expected: <= 273
    Received:    499.1875
  4 failed
```

RED commit `cd472f4` extends the manager test: after the sub it turns on 2x, enters full screen
and waits for the half-time question, which must have left full screen. On the `be5a86f` build it
failed at the pitch cap as before (`Received: 499.1875`). To show the new step catches its own
bug, the GREEN code was built once with the stop effect disabled (scratch only, never committed):
3 of 4 passed and the manager test failed on the new step.

```
  ✘  3 [chromium] › e2e/fullscreen-score-bug.spec.ts:142:5 › in manager mode at 844x390 ... the half-time question leaves full screen (catches a landscape phone with no usable touchline, or a stop hidden behind full screen) (1.6m)
    Error: expect(received).toBeNull()
    Received: "ref: <Node>"
  1 failed
  3 passed (1.6m)
```

GREEN commit `3d76f09`: the unit file 8 of 8 and the spec 4 of 4 pass.

## Measurements

Pitch (the `pitch-view` box), golden cup8 G1 watched live, build of `3d76f09`, scratch script:

| Viewport | Column | Pitch before   | Pitch after    | Full screen button |
| -------- | ------ | -------------- | -------------- | ------------------ |
| 390x844  | 324    | 324 x 207.4    | 324 x 207.4    | 102 x 44           |
| 360x780  | 294    | 294 x 188.2    | 294 x 188.2    | 102 x 44           |
| 320x640  | 254    | 254 x 162.5    | 254 x 162.5    | 102 x 44           |
| 844x390  | 778    | 778 x 497.9    | 426.6 x 273    | 102 x 44           |
| 1280x720 | 1214   | 1214 x 777 (a) | 787.5 x 504    | 102 x 44           |
| 1280x900 | 1214   | 1214 x 777 (a) | 984.4 x 630    | 102 x 44           |

(a) Before, the pitch filled its column, so its size is the column at the 100 by 64 ratio; the
844x390 figure is the RED run's own reading. On portrait phones 70svh is far above the pitch, so
nothing moves there. In the guard at 844x390 the pitch reads 426.5625 by 273 with a ratio of
exactly 1.5625, and the camera's window shows all of it on Full pitch.

Landscape manager mode at 844x390 (`e2e/fullscreen-score-bug.spec.ts`, pinned `e2e-coach` draft):
the width is at least 600, so the sheet is `display: contents` and the touchline sits in the page
as on desktop, with its toggle hidden. Pitch 427 by 273, touchline 780 by 481, no button or select
under 44 px, no sideways scroll, and a substitution goes through ("Subs 1 of 5").

Full screen in headless Chromium: `requestFullscreen` on `div.pitch` works there, and
`document.fullscreenElement` is set. At 390x844 the frame is 390 wide and centred; at 844x390 it
is 609 wide (390 x 1.5625) with bands of 117 px each side, and the exit button sits in the right
band, overlapping the pitch's apron by a few pixels. Screenshots: `390x844-fullscreen.png`,
`844x390-fullscreen.png`.

## Product decisions applied

- Decision 3 (blind challenges): the score bug shows only the score, the clock and the shootout
  score, which the scoreboard already shows with ratings off. No new number.
- Decision 1: unchanged. Tactics stay on the touchline, which is visible in landscape.

## Implementation decisions

- Full screen holds `div.pitch`, the broadcast container in `MatchPlayer`, not the Broadcast root.
  The exit button has to live inside the full-screen element, and the Broadcast stays a pitch
  component with one new slot. (Laziness Protocol: the Broadcast gains 5 lines.)
- One button that moves. Out of full screen it ends the control row; in full screen it renders
  inside `div.pitch`. Only one exists at a time, with one handler and one test id. The control row
  is not inside the full-screen element, so a button left there could not be pressed.
- Hide where the API is missing. iPhone Safari exposes neither `fullscreenEnabled` nor
  `webkitFullscreenEnabled` for page elements (it only takes a video full screen), so no button
  shows there. This is from the platform's documented behaviour, not a device test; the owner's
  phone check confirms it. The webkit-prefixed path covers Safari before 16.4, including older
  iPads, and is unit-tested with a stub.
- A failed request (a browser that refuses full screen) is swallowed. The button keeps reading
  "Full screen", which is true.
- Watch live only. Quick is a still pitch, not a broadcast, so it gets no full screen, like the
  camera toggle.
- The state is a `data-fullscreen` attribute from `fullscreenchange`, not the `:fullscreen`
  pseudo-class, so one CSS rule serves the standard and the webkit API (a selector list with an
  unknown pseudo-class would drop the whole rule).
- A stop leaves full screen. In manager mode the half-time and injury questions sit in the sheet
  or under the pitch; full screen would show a frozen pitch with no question. (Experience First.)
- Short names are the club's first word, the town. In `src/engine/opponent-schedule.ts` the 30
  open clubs have 30 distinct first words and the 11 Kanto clubs 11 (checked with a scratch
  script). Three-letter codes were rejected:
  nothing in the data defines them, and invented codes could collide.
- The 70svh cap is on the width (via the ratio), not a `max-height` on the pitch. A `max-height`
  on an element with `width: 100%` and `aspect-ratio` squashes it. (Fix Root Causes.)
- The 320 fix gives each side its longest word as a floor instead of shrinking the type. The
  longest town, "Hammerlocke", is an estimated 95 px in bold 15 px (not measured); with "Your" and
  the 59 px centre, the 8 px gaps and the 12 px padding that is about 232 px against the 254 px
  board. A name with a single word wider than the room would now push the board wider instead of
  breaking; no club in the schedule has one.

Principles: Laziness Protocol (one wrapper, one slot, no new loop); Model the Domain (full screen
is an external store read through `useSyncExternalStore`, like the camera choice); Fix Root Causes
(the 320 break is the column floor, the 70svh cap must keep the ratio); Test Behavior Not
Implementation and tdd (literal cells, literal pixel bounds, two RED commits before GREEN);
Experience First (a stop leaves full screen).

## Brief vs code

- The hand-off says "`max-height: 70svh` on the pitch". Applied as a width cap with the same
  effect: a literal `max-height` on `.pitch` would break its aspect ratio and so the camera.
- The hand-off says the score bug sits "inside the pitch". It sits in `.view`, over the pitch and
  outside the camera transform, which is what the coordinator's brief asks.
- The 70svh cap applies on desktop too, so the pitch at 1280x720 is 787.5 px wide instead of
  1214, and from 1280 its sprites use the 0.7 tier (56 px) instead of 0.9 (72 px) when the pitch is
  under 820 px. Before, a 1280x720 screen could not show the whole pitch (777 px high).
- `useSheet` measures `pitchRef`. That element is still `div.pitch`, now full width with the frame
  inside it, so its height is the pitch's and the sheet's room cap is unchanged (touchline-sheet
  spec 8 of 8).

## Gates

At `3d76f09`: lint, typecheck and build exited 0; all seven `check:*` scripts exited 0; 1,580 unit
tests passed in 183 files; Prettier passed on the 7 touched code and test files.

Playwright (`CI=1`, fresh build of the `3d76f09` code): `fullscreen-score-bug` 4,
`follow-camera` 4, `touchline-sheet` 8, `team-readability` 7, `broadcast-frame-loop` 3,
`manager-mode` 7 on chromium and 7 on pixel-7, `mobile-targets` 93 and `mobile-acceptance` 277
on iphone-se, iphone-14 and pixel-7, `mobile-pitch-fixes` 1 of 4: 411 passed, 56 skipped by their
own project gates, 3 failed.

The 3 failures are `mobile-pitch-fixes.spec.ts` "the live pitch reads at 390px / 360px / 320px",
on `expect(badge!.scale).toBe(1)` with `Received: 1.6`. They are not from this row: a build of
`be5a86f` (row 3b, no change of mine) fails the same three the same way
(`carrier {"font":"11px","scale":1.6,"text":"Lurantis"}`). Follow is the phone default since 3b, so
the carrier nameplate inside the camera layer reads 1.6 times its layout size. The 3b gates did
not list this spec. Left for 3b's owner; not changed here.

## NOT RUN

- Physical phone check (owner action): iPhone Safari hides the button; Android Chrome full screen
  in portrait and landscape, the score bug visible, the safe-area padding under a notch.
- `env(safe-area-inset-*)` with real insets. Playwright cannot emulate them.
- WebKit for the new spec (chromium only, like the other pitch specs).
- Review (GLM), hosted CI and the full e2e suite.

## Carryovers

- The Full screen button takes a third control row at 390 (the row now wraps: play, speed, skip;
  sound, camera; full screen). Row 3e adds a chip to the same row in parallel; expect a merge
  conflict in the control row and a recheck of its wrap.
- With the goals-only note (runs recorded before match events) the broadcast is taller than its
  pitch, so in landscape full screen the note can sit below the screen's edge. Not measured.
- `mobile-pitch-fixes` fails at 390, 360 and 320 on the 3b base (above).
- At 1280 wide on a 720 high desktop the exit button overlaps the pitch's top right corner.
