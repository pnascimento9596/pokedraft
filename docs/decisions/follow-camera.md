# Follow camera (Wave 3, row 3b)

Tier Yellow. Branch `feat/follow-camera` off `feat/team-readability` at `d656db7` (row 3d, PR
#104), so the camera frames 3d's final sprite sizes. No file under `src/engine`, `src/data` or
`src/scouting` changed, so the engine goldens are untouched.

## Scope

The camera is one transform on the pitch layer. The frame painter from row 2a writes it through a
ref. Nothing new goes through React's render.

- `src/ui/matchday/camera.ts` (new, pure): the camera state `{x, y, vx, vy, wide}`, `stepCamera`
  (a critically damped spring on the ball, ω = 12/s, solved exactly per step, with the step
  clamped to 0 to 100 ms), `zoomOf` (1.6 in open play, smoothstep eased to 1.0 over 400 ms),
  `cameraTransform` (the literal `translate(x%, y%) scale(z)` string), `projectPoint`,
  `framesWhole` (which beats show the whole pitch), `defaultCamera` and `seeks`.
- The clamp: for each axis the shift is `min(0, max(100(1 - z), 50 - z·p))` percent of the pitch
  box, with `transform-origin: 0 0`. The view never shows past a touchline or goal line.
- `src/ui/matchday/player.ts`: `stageFrame` also returns the `shot` it staged (null with motion
  off), so the camera knows a shot is still settling.
- `Broadcast.tsx`: a `camera` prop (default `"full"`), `data-camera` on the root, a new
  `pitch-view` wrapper with `overflow: hidden` around the pitch, and `data-testid="pitch"` on the
  pitch. `aim()` steps the camera once per painted frame and writes the pitch's `style`. Full writes
  an empty style once and keeps no camera state.
- `useCamera.ts` (new): a `useSyncExternalStore` store for the choice. It reads `localStorage`
  key `pokedraft:camera` through the existing try/catch helpers and the two media queries once per
  mounted player, so a 10 Hz render touches neither.
- `MatchPlayer.tsx`: in Watch live only, a "Camera" group with "Full pitch" and "Follow" buttons
  (`btn btn--sm`, `aria-pressed`, at least 44 by 44 px), after the sound toggle. Quick gets
  `camera="full"` and no toggle.
- `scripts/perf/camera-motion.mts` (new): the largest on-screen ball move per frame, Full against
  Follow.
- `e2e/broadcast-frame-loop.spec.ts`: it measures players against `[data-testid="pitch"]`, since
  the first child of the broadcast is now the view wrapper.
- `perf(matchday)` commit `99ec77b`: the trail's glow and line now draw one shared `<path>` in
  `<defs>` through two `<use>` elements. See "Perf" below for why.

## RED output (verbatim excerpts)

RED commit `3251033`. Unit, `pnpm vitest run` on the four guard files: 15 of 19 failed in 4 of 4
files (`camera.test.ts` could not import `../camera`).

```
     × a badge over a player at the view's left edge moves right into the view: left 121.5px 1ms
     × a badge over a player at the view's top edge moves down into the view: top 77.76px 0ms
     × Follow is the default at 390: the broadcast follows and the Follow button is pressed 61ms
     × Full is the default at 1280: the broadcast shows the full pitch 19ms
     × with reduced motion a phone opens on the full pitch, and Follow can still be chosen 16ms
     × the choice is kept: Full pitch at 390 is stored and wins on the next match 107ms
     × Quick has no camera and no toggle 14ms
     × zoom is 1.6 in open play: after a second of open play at 6' the pitch reads scale(1.600) 107ms
     × zoom is 1.0 during a pinned goal beat: halfway through an open-play goal at 30' ... scale(1.000) 61ms
     × zoom is 1.0 during a pinned goal beat: halfway through a penalty goal at 30' ... scale(1.000) 24ms
     × zoom is 1.0 during a pinned goal beat: halfway through a free-kick goal at 30' ... scale(1.000) 27ms
     × zoom is 1.0 during a pinned goal beat: halfway through a save at 30' ... scale(1.000) 49ms
     × zooms back in to 1.6 once the goal and its settle are over 96ms
     × Full pitch writes no camera transform 43ms
     × with motion off, Follow cuts to the ball at 1.6 without easing 8ms
 FAIL  src/ui/matchday/__tests__/camera.test.ts [ src/ui/matchday/__tests__/camera.test.ts ]
Error: Cannot find module '../camera' imported from /Users/paulo/Projects/pokedraft-follow-camera/src/ui/matchday/__tests__/camera.test.ts
TestingLibraryElementError: Unable to find an element by: [data-testid="pitch"]
AssertionError: expected 42.44400000000002 to be close to 77.76, received difference is 35.31599999999999, but expected 0.0005
 Test Files  4 failed (4)
      Tests  15 failed | 4 passed (19)
```

(The three goal titles are shortened here at `...`; the full titles carried a garbled `%`
placeholder that was reworded before GREEN.)

Playwright `e2e/follow-camera.spec.ts` as committed in `3251033`, on a build of `d656db7`
(`CI=1`, chromium): 4 of 4 failed.

```
  ✘  2 [chromium] › e2e/follow-camera.spec.ts:90:5 › with reduced motion a phone opens on the full pitch at 390 (6.0s)
  ✘  1 [chromium] › e2e/follow-camera.spec.ts:78:5 › Full is the default at 1280 (catches a desktop that opens zoomed in) (6.0s)
  ✘  3 [chromium] › e2e/follow-camera.spec.ts:38:5 › Follow is the default at 390: ... (6.8s)
  ✘  4 [chromium] › e2e/follow-camera.spec.ts:98:5 › the first goal of the match shows the full pitch at 1.0 in Follow at 390 (catches a goal staged zoomed in) (9.5s)
    Error: expect(locator).toHaveAttribute(expected) failed
    Expected: "full"
    Received: ""
    Error: locator.evaluate: TypeError: Cannot read properties of null (reading 'getBoundingClientRect')
  4 failed
```

RED commit `59c844e`, after the first badge design failed in the browser (see "Badge" below). It
reverts the two view-clamp badge tests to `d656db7` and adds two `projectPoint` tests: 2 of 15
failed.

```
     × at the far corner flag a player at 80%, 70% of the pitch shows at 68%, 52% of the view 1ms
     × on the full pitch a point shows where it stands 0ms
TypeError: projectPoint is not a function
 Test Files  1 failed (1)
      Tests  2 failed | 13 passed (15)
```

The guards the brief names, all literal: "zoom is 1.0 during a pinned goal beat" (open play,
penalty, free kick and save, each `translate(0.00%, 0.00%) scale(1.000)`) and "1.6 in open play"
(`scale(1.600)`); "camera translation is clamped at the corner flag" (`translate(-60.00%,
-60.00%) scale(1.600)` for the far flag, `translate(0.00%, 0.00%) scale(1.600)` for the near
one); "Follow is the default at 390, Full at 1280".

## Per-element check

| Element                                 | Where                     | Under zoom                                                                                                                                         |
| --------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Players, nameplates, pips, stamina arcs | Inside the camera layer   | Zoom with the pitch. Sprites read 70 px at 1.6 on a 390 phone.                                                                                     |
| Ball                                    | Inside                    | Zooms with the pitch.                                                                                                                              |
| Trails                                  | Inside                    | Zoom with the pitch, strokes included (`390-follow-trail.png`).                                                                                    |
| Play effect                             | Inside                    | Zooms with its player.                                                                                                                             |
| Play badge (`pitch-ability`)            | Outside, in `pitch-view`  | Its player's point goes through `projectPoint`, then 3d's `badgeCorner` keeps the whole badge in the view at its own size. See "Badge".            |
| Goal-mouth and save effects             | Inside                    | Shown on goal and save beats, which ease out to 1.0.                                                                                               |
| Goal flash                              | Inside                    | Shows from 0.6 of the goal's staging (`GOAL_LANDS`), when the 400 ms ease has finished at 1x. The e2e goal test reads `scale(1.000)` there.        |
| Cut-ins, callouts, banners              | Outside, in `.overlay`    | Unchanged, at their own size.                                                                                                                      |
| Kick dots, sudden-death banner          | Outside                   | The shootout is shown at 1.0.                                                                                                                      |
| Goals-only note                         | Outside                   | Unchanged.                                                                                                                                         |
| HUD, scoreboard, touchline              | Outside the Broadcast     | Unchanged.                                                                                                                                         |

### Badge

3d keeps a badge inside the pitch box. The first design kept the badge inside the zoomed pitch and
clamped it to the view. At 320 px a long badge is wider than the view at 1.6, and the
team-readability spec read one badge cut off by 24.4 px ("Wishiwashi used Double-Edge!"). The
badge now sits outside the zoomed layer at its own size. The frame painter projects its player's
point through the camera and hands that to `badgeCorner`. At the code head the spec reads 13
badges at 390, 360 and 320, with a closest margin of 0 px and none clipped.

## Which beats show the whole pitch

`framesWhole` is true when:

- a goal of any `goalKind` (`open-play`, `header`, `solo`, `free-kick`, `penalty`) is the
  active beat,
- a save is the active beat,
- a shot is still settling (`stageFrame`'s `shot`), or
- the shootout is on (kicks exist and the clock is at the final minute).

Otherwise the camera is at 1.6 on the ball.

## Measurements

### Perf (4x CPU throttle, 390x844, 10 s window, 5 runs per side, alternated)

All three sides served `next start` builds: `main` is origin/main at `02e45cd` (the baseline the
brief asks for), `base` is `d656db7` (3d, this branch's parent), and `branch` is `99ec77b`. Median
(min to max). Headless Chromium rasterises in software, so these numbers exclude GPU raster.

Batch 3, `docs/reports/follow-camera/frames.json`, load 15.5 to 8.5:

| Metric          | main             | base             | branch           |
| --------------- | ---------------- | ---------------- | ---------------- |
| p50 frame       | 16.7             | 16.7             | 16.7             |
| p95 frame       | 16.8             | 16.7             | 16.8             |
| Largest gap     | 16.8             | 16.8             | 16.8             |
| Dropped frames  | 0                | 0                | 0                |
| Long tasks      | 0                | 0                | 0                |
| Mutations per s | 1155 (1153-1160) | 1156 (1153-1158) | 1144 (1140-1150) |
| Style recalc ms | 753 (721-786)    | 775 (677-845)    | 824 (788-878)    |
| Task ms         | 4137 (3790-4195) | 4165 (3655-4442) | 4670 (4417-4799) |
| Script ms       | 746              | 800              | 821              |
| Layout ms       | 99               | 108              | 110              |

Batch 4, `docs/reports/follow-camera/frames-camera.json`, load 12.2 to 13.7. The same branch build
was run in Follow and in Full, forced through the stored choice by a scratch copy of the harness:

| Metric          | main             | branch, Follow   | branch, Full     |
| --------------- | ---------------- | ---------------- | ---------------- |
| p50 / p95 frame | 16.7 / 16.7      | 16.7 / 16.8      | 16.7 / 16.8      |
| Dropped, long   | 0, 0             | 0, 0             | 0, 0             |
| Mutations per s | 1156 (1154-1161) | 1144 (1142-1150) | 1124 (1119-1127) |
| Style recalc ms | 826 (732-841)    | 783 (758-879)    | 822 (751-898)    |
| Task ms         | 4300 (3932-4491) | 4417 (4207-4962) | 4421 (4084-4575) |

Verdict on the four gating metrics from 2a:

- Frame pacing (p50 and p95): no difference. All sides drew every frame with a 16.8 ms largest
  gap. As 2a recorded, p95 moves between 16.7 and 16.8 on timer resolution alone.
- Long tasks: none on any side.
- Mutations per second: lower than main by about 11 a second.
- Style recalc: inside the run-to-run spread. Batch 3 read the branch 71 ms per 10 s above main,
  batch 4 read it 43 ms below, and base and main moved 22 to 88 ms apart between batches with no
  camera in either.

Not worse, so it ships under the 2a rule. Main-thread task time is the one figure that rose: 3% in
batch 4 and 12% in batch 3. A Chrome trace (below) puts the rise in Layerize, the per-frame
compositing update of a transformed layer, which is the camera's intrinsic cost. It is not a gating
metric. It is listed here so a phone check can watch for it.

Earlier batches, before the trail change, recorded in the scratch log only: batch 0 (load 34 to
54) read main against base; batch 1 (load 40 to 15) was disturbed by a concurrent build; batch 2
(load 13 to 15) read the branch at 1179 mutations a second against main's 1155. That gap is what the
trail change paid back.

### Mutations by target (scratch MutationObserver tally, 10 s, 390x844, no throttle)

| Target                    | main, per s | branch at `8a5a919` | branch at `99ec77b` |
| ------------------------- | ----------- | ------------------- | ------------------- |
| Player `style`            | 905         | 908                 | 903                 |
| Ball `style`              | 59          | 59                  | 59                  |
| Player `data-pose`        | 36          | 37                  | 37                  |
| Trail `d`                 | 35 + 35     | 34 + 34             | 34                  |
| Pitch `style` (camera)    | none        | 23                  | 23                  |
| Trail origin `cx` and `cy`| 12 + 12     | 12 + 12             | 12 + 12             |

Two tally runs: `8a5a919` alongside main, then `99ec77b` alongside main; the main column is the
second run, and the first run's main read the same as the `8a5a919` column apart from the pitch.

The camera writes the pitch's style 23 times a second, not 60, because `put()` skips a write when
the two-decimal string is unchanged. Drawing the trail from one shared path removes 34 or 35
writes a second, more than the camera adds.

### Style recalc investigation

The brief asked why style recalc rose in 2a (257 to 484 ms per 10 s) and whether the camera makes
it worse.

- The players already write only `transform` (no custom properties), 905 times a second. Each
  write restyles that one player element.
- With the match paused, `document.getAnimations()` still lists 27 running CSS animations, on main
  and branch alike: 19 `sprintStride`, plus `keeperDive`, `pressLunge`, `castBurst`, two
  `auraPulse`, `spriteIdle`, `shadowPulse` and `dribbleCrossover`. A trace of 60 paused frames
  restyled 1586 elements, about 26 a frame. That is the floor under every live frame, and it comes
  from the pose keyframes, not from the frame painter.
- A forced pitch transform write on each of 60 paused frames restyled 1620 elements, 34 more than
  idle: about one element per write. A forced ball write read 1619. The camera adds one restyled
  element per write, 23 a second.
- A CSSOM experiment (`style.setProperty` for every frame write instead of
  `setAttribute("style")`) read 781 ms style against main's 823 in batch 2. That is inside the
  spread, and it added 108 mutation records a second, so it was rejected.

Trace (`scripts/perf/broadcast-trace.mts`, 4 s, 4x, three alternating pairs, load 7.6 to 6.4):

| Event                         | main          | branch        |
| ----------------------------- | ------------- | ------------- |
| UpdateLayoutTree ms           | 295, 226, 242 | 283, 215, 300 |
| Elements restyled             | 12473, 12514, 12553 | 12823, 12907, 12823 |
| Paint ms                      | 275, 242, 245 | 268, 237, 272 |
| PrePaint ms                   | 166, 135, 136 | 148, 124, 172 |
| Layerize ms                   | 228, 194, 198 | 286, 253, 299 |

### Camera motion (informational, against the 4% bound)

`pnpm exec tsx scripts/perf/camera-motion.mts`, the six played matches of the golden cup8 run at
1x. The move is in percent of the view's width, the metric of the motion-bounds stage test.

| Match | Full worst | Follow worst | At     | Zoom |
| ----- | ---------- | ------------ | ------ | ---- |
| 0     | 3.05       | 4.88         | 51.19' | 1.6  |
| 1     | 3.61       | 4.89         | 8.68'  | 1.56 |
| 2     | 3.36       | 4.89         | 18.68' | 1.56 |
| 3     | 3.20       | 4.66         | 88.68' | 1.56 |
| 4     | 3.12       | 4.91         | 27.82' | 1.6  |
| 5     | 3.22       | 4.23         | 72.43' | 1.6  |

The Full column matches the motion-bounds after-fix table exactly. Follow's worst is 4.91%. That is
the 1.6 zoom applied to the ball's own move (3.05 x 1.6 = 4.88 on the same frame), and at 1.56 the
zoom easing back in after a save. No guard was added; the 4% bound is a Full-pitch bound, and a
zoomed view moving faster on screen is what zoom means.

The 2f waypoint work: NOT RUN as a separate figure. Its cost sits inside every side's script ms
above (2f is on main and base alike), and isolating it would need a pre-2f build.

## Decisions

- Reduced motion defaults to Full. Camera motion is a vestibular trigger, and the brief leaves
  this to the implementation. The toggle still allows Follow (unit guard).
- Follow with motion off cuts: the camera is placed on the ball every frame with no spring and no
  ease. This is the honest reading of "reduced motion" for someone who still chose Follow.
- A switch from Full to Follow places the camera on the ball at once. Easing in from a camera
  that did not exist would sweep across the pitch.
- The zoom ease is 400 ms of real time, not match time, so it also takes 400 ms at 2x.
- The spring and ease reset (`cameraAt`) on a new timeline (match change) and when the clock goes
  back or jumps more than 1 minute in a frame (`seeks`). That is the reset 3i needs for seek; no
  new API is needed.
- The stored choice wins over the screen-width default, so a phone player who picked Full keeps
  it, and a desktop player who picked Follow keeps that.
- The toggle reads "Full pitch" and "Follow", the brief's words, and sits in the control row
  next to the sound toggle.
- The trail draws from one shared path. The camera's 23 writes a second had to be paid back, and
  the trail's double `d` write was the cheapest saving that changes no pixel (main and branch Full
  trail screenshots match by eye).

Principles: Laziness Protocol (one transform on one existing layer, no new loop); Model the
Domain (the camera is a pure value stepped by the painter); Explain the Number and the benchmark
checklist (baseline first, alternated runs, load noted, GPU raster excluded); Test Behavior Not
Implementation (literal transforms and on-screen boxes); Sequence Work into Verifiable Units and
tdd (two RED commits before their fixes).

## Brief against code

- The brief says the camera runs in the frame painter. The painter's rAF loop lives in
  `MatchPlayer.tsx` (row 2a) and publishes frames; `Broadcast.tsx` draws them. The camera steps in
  Broadcast's draw, so it sees the same frames as every other write.
- The brief says badges must be inside the camera layer or re-projected. Inside failed at 320 px
  (above), so the badge is re-projected, which changes 3d's clamp from the pitch box to the view.
- `broadcast-frame-loop.spec.ts` assumed the pitch was the broadcast's first child. It now names
  the pitch by test id.

## NOT RUN

- Physical phone check (owner action), including whether the 10 Hz pose floor stutters under the
  zoom.
- Review (GLM), Sol, hosted CI, the full e2e suite.
- The 2f waypoint work as its own figure (above).

## Carryovers

- The pose keyframes keep running while the match is paused (19 sprinting players on a paused
  pitch), and they set the style recalc floor. Not in this row; a candidate for a later perf or
  pause row.
- Layerize time rose with the moving layer. If a phone check shows jank in Follow, the next step is
  to measure on the device with GPU raster, not in headless Chromium.
