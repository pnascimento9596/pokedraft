# Broadcast frame loop out of React (Wave 2 row 2a, Yellow)

## Scope

A live match re-rendered the whole match screen in React on every animation frame. On `origin/main`
(`fe6d183`) the `MatchPlayer` rAF loop dispatched a `tick` and `setNow` each frame, so the
scoreboard, HUD, ticker, touchline and all 22 pitch players reconciled at 60 Hz. The guard test
counts 62 React commits in 62 frames.

After this change:

- `MatchPlayer` runs the `play` reducer every frame in a ref and publishes each frame to a
  `FrameSource` (`src/ui/matchday/feed.ts`). It hands the frame to React at most every 100 ms. It
  also hands it over at once when a beat fires, a hold or stop starts or ends, the stage or kick
  count changes, the whole minute on the clock changes, a goal lands, a new play starts (live
  phase sounds) or the beat on the pitch changes. It also renders at once when the broadcast's
  painter asks (see "Merge of rows 2g and 2b"). The guard counts 12 commits in the same 62 frames.
- `Broadcast` subscribes to the feed while motion is on. On each published frame it runs
  `stageFrame` (row 2b's `activeBeat` plus `stagePitch`) for that frame. It then writes `transform: translate3d(x cqi, y cqi, 0)`
  to the 22 players and the ball through refs. It also writes the ball's `--loft` and `--spin`, the
  trail path and the play badge position. It writes an attribute only when its value changed. React
  still renders which elements are on the pitch and their data attributes. A layout effect repaints
  after every commit, so a 10 Hz render never paints a stale position.
- The static pitch SVG is a module constant and the sprites are a memoised `PlayerImage` wrapper.
- Quick and reduced motion do not subscribe. Their pitch is painted once per commit from the
  props, so it stays still. Section 2 decision 1 holds.
- The goal score still lands at progress 0.6. The 1x and 2x staging, manager stops and injury
  staging keep their timings, because the reducer and its fired timestamps are unchanged and those
  moments trigger an immediate render. `MatchPlayer.score`, `.speed`, `.quick`, `.movesets`,
  `Broadcast.injury` and the matchday e2e specs pass unchanged.

`src/engine` and `src/ui/matchday/timeline.ts` are untouched.

## Merge of rows 2g and 2b

`origin/main` `458c56e` (PR #89 callouts and cut-ins, PR #90 continuous ball) merged in at
`6e9d509`.

- The painter calls row 2b's `stageFrame(timeline, {clock, fired, now, kicks, motion, speed, ...})`
  with the frame's values, and the render calls it with the props. `stageFrame` is pure, so the two
  never share state.
- Row 2g's `cutIns` prop, `cutInAt`, `TYPE_VARS`, `CUT_IN_LABEL` and the goal, save and duel cards
  are kept beside `feed`. A cut-in is rendered by React, so on its own it would wait up to 100 ms for
  the next gap render. To put it on the right frame, the painter computes a screen key per frame:
  the beat on the pitch, the goal's 0.25, 0.35, 0.6, 0.75 and 0.9 windows, the cut-in, the trail,
  the play badge, the ball effect and the carrier. When the key differs from the last render's,
  `publish` returns true and `MatchPlayer` renders on that frame. The guard `the frame where the
  goal reaches 0.25 of its staging asks for a render` checks this. With the painter forced to
  never ask, it fails (`expected false to be true`), and the commit count reads 10 instead of 12.
  That is a mutation proof on the merged code, not a separate RED commit, because the timing
  rule only exists once the merge brings in cut-ins.
- The whole minute joined MatchPlayer's glance. Row 2g's `MatchPlayer.quick` test watches the
  clock reach 35' exactly. At 10 Hz the minute label skipped from 34' to 36', so the clock now
  renders at once on each new minute.
- Player pose and facing remain React-rendered at the 10 Hz floor. Their positions move per frame.
- The frame-loop guard is re-pinned to `458c56e`'s own `left`/`top` for the same fixture and clocks.
  Row 2b moved the players and the goal ball. The commit count is re-pinned to 12, which was measured
  as 5 renders on the gap alone, 2 on the clock or play alone, 3 asked by the pitch alone, and 2 on
  both.
- `e2e/continuous-ball.spec.ts` reads the ball's spot from its `translate3d(x cqi, y cqi)`, with y
  divided by 0.64. On builds without the transform it falls back to `left`/`top`. Its metric is
  unchanged: the fastest speed over at least 100 ms, scaled to one 60 Hz frame, with a bound of 6.
  On this branch it reads 2.68 and passes. On a fresh build of `ae8ee22` it reads 9.00 and fails
  (`Received: 8.997818670370082`), so its RED still holds.

## Merge of row 2e

`origin/main` `85b292e` (PR #92 shootout) merged in at `f0f73b9`.

- `LiveFrame` carries `kickProgress`. `MatchPlayer`'s `frameOf` computes it per frame with
  `kickProgress(state, now, pace)`, and the painter passes it to `stageFrame`. The penalty moves on
  every frame.
- The render key adds the kick in progress (and with it the sudden-death banner) and the count of
  kick dots shown. MatchPlayer's glance adds how many of the kick's cues (whistle at 0, strike at
  0.35, outcome at 0.6) the frame has crossed. The shootout score and the kick sounds then render on
  their frame and do not wait for the gap.
- Guard `a frame at kickProgress 0.5 between renders at 0.2 paints the ball in flight`.
  - It pins the ball as a plain render at 0.5 draws it:
    `translate3d(95.00cqi, 33.92cqi, 0)`, loft 0.33.
  - Mutation: the painter passed the render's `kickProgress` and not the frame's. The guard failed
    with the ball still on the spot: `translate3d(89.00cqi, 32.00cqi, 0)`, loft 0.00.
- Guard `the frame where the kick lands asks for a render`.
  - It passes. With the kick-dot count removed from the key, it still passes, because the keeper's
    reaction also starts at 0.6 and changes the key on the same frame.
  - So this guard does not isolate the dots. The dots are covered by that shared render.
- The perf harness was not rerun after this merge. The numbers above are from `6e9d509`.

## Brief vs code

- The brief describes React "ticking at about 10 Hz" as a fact. At `fe6d183` React ticked once
  per frame. 10 Hz is what this PR delivers.
- The brief puts "a rAF loop inside `Broadcast`". The loop stays in `MatchPlayer` and `Broadcast`
  subscribes a painter to it. One rAF per frame means the painter always draws the state the tick
  just produced. Two loops would run in an arbitrary order and could lag a frame. The clock also
  has to run while the broadcast chunk is still loading.

## RED

`3129582`, then the open-play strengthening `6c06799` (the first version measured the kickoff hold,
where the clock waits for the movesets chunk). Run against `origin/main` code:

```
     × at 6.5' the user's slot 5 stands at origin/main's 26.60%, 45.01% of the pitch 36ms
     × at 12' with the goal 1.2 s in, the ball sits in the net at 89.89%, 50%, lofted 0.78 12ms
     × with motion off the user's slot 5 stands on its formation spot, 36.68%, 50% 9ms
     × commits about 10 times in a second of open play, not once per frame (62) 272ms
     × rolls the ball on every frame between commits 53ms
AssertionError: expected 'left: 26.597464022671865%; top: 45.00…' to be 'transform: translate3d(26.60cqi, 28.8…' // Object.is equality
Expected: "transform: translate3d(26.60cqi, 28.80cqi, 0) translate(-50%, -70%)"
Received: "left: 26.597464022671865%; top: 45.00745573093594%;"
AssertionError: expected 'left: 89.88828402366863%; top: 50%;' to be 'transform: translate3d(89.89cqi, 32.0…' // Object.is equality
Expected: "transform: translate3d(89.89cqi, 32.00cqi, 0) translate(-50%, -50%); --loft: 0.78; --spin: 3480"
Received: "left: 89.88828402366863%; top: 50%;"
AssertionError: expected 'left: 36.68%; top: 50%;' to be 'transform: translate3d(36.68cqi, 32.0…' // Object.is equality
Expected: "transform: translate3d(36.68cqi, 32.00cqi, 0) translate(-50%, -70%)"
Received: "left: 36.68%; top: 50%;"
AssertionError: expected 62 to be 10 // Object.is equality
AssertionError: expected 5 to be less than or equal to 1
      Tests  5 failed (5)
```

The pinned transforms are origin/main's own `left`/`top` for the same fixture and clock. They are
rounded to 0.01, and the vertical value is scaled by 0.64 because the pitch is 64 units tall per 100
wide.

## Measurements

Harness `scripts/perf/broadcast-frames.mts`. Each run opens a fresh headless Chromium context at
390x844 (DPR 3, touch, mobile) with a 4x CPU throttle through CDP. It watches group match 1 of the
golden cup8 run live at 1x, waits 1 s, then records 10 s of play (about minute 2 to 15). It records
every rAF timestamp, long tasks over 50 ms, MutationObserver records, and Chrome's task, script,
layout and style time. Each side ran 5 times, alternated A B B A, with `pnpm build` served by
`next start`. Other Wave 2 lanes were building on the same machine, with a load average of 6 to 13
on 12 cores. Raw runs are in `docs/reports/broadcast-frame-loop/frames.json`.

At the merged head, before is `origin/main` `458c56e` (PR #90 continuous ball) and after is
`6e9d509`. Two batches ran (load average 3 to 8 on 12 cores). Batch 1 is
`frames.json` and batch 2 is `frames-batch2.json`:

| Metric (median of 5, range)  | before batch 1      | after batch 1       | before batch 2      | after batch 2       |
| ---------------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| p50 frame interval           | 16.7 ms (16.7-16.7) | 16.7 ms (16.7-16.7) | 16.7 ms (16.7-16.7) | 16.7 ms (16.7-16.7) |
| p95 frame interval           | 16.7 ms (16.7-16.8) | 16.8 ms (16.7-16.8) | 16.7 ms (16.7-16.8) | 16.7 ms (16.7-16.8) |
| largest gap / dropped frames | 16.8 ms / 0         | 16.8 ms / 0         | 16.8 ms / 0         | 16.8 ms / 0         |
| long tasks (> 50 ms)         | 0 (0-0)             | 0 (0-0)             | 0 (0-0)             | 0 (0-0)             |
| DOM mutations per second     | 2206 (2201-2216)    | 1164 (1164-1165)    | 2208 (2205-2214)    | 1163 (1161-1164)    |
| main thread task time, 10 s  | 3022 ms (2915-4261) | 2824 ms (2478-3113) | 4167 ms (2764-5337) | 3764 ms (2464-3988) |
| script                       | 688 ms (650-936)    | 430 ms (372-473)    | 942 ms (618-1189)   | 584 ms (371-633)    |
| layout                       | 130 ms (114-216)    | 87 ms (78-90)       | 212 ms (101-304)    | 108 ms (79-126)     |
| style recalc                 | 257 ms (252-426)    | 484 ms (414-536)    | 397 ms (225-523)    | 676 ms (411-701)    |

p95 read 16.8 in 1 of 5 before runs and 3 of 5 after runs in batch 1, and in 2 before runs and 1
after run in batch 2. Over both batches that is 3 of 10 before and 4 of 10 after. Every run on both
sides had a 16.8 ms largest gap and no dropped frame, so the difference is one 0.1 ms timer tick.

Earlier, before `e7f2012` and after `f511c73` (PR #88 merged):

| Metric (median of 5, range)  | before (`e7f2012`)  | after (`f511c73`)   |
| ---------------------------- | ------------------- | ------------------- |
| p50 frame interval           | 16.7 ms (16.7-16.7) | 16.7 ms (16.7-16.7) |
| p95 frame interval           | 16.8 ms (16.7-16.8) | 16.7 ms (16.7-16.8) |
| largest gap / dropped frames | 16.8 ms / 0         | 16.8 ms / 0         |
| long tasks (> 50 ms)         | 0 (0-0)             | 0 (0-0)             |
| DOM mutations per second     | 2336 (2323-2340)    | 1229 (1224-1232)    |
| main thread task time, 10 s  | 2385 ms (2339-2827) | 1970 ms (1770-2104) |
| script                       | 555 ms (526-651)    | 267 ms (234-297)    |
| layout                       | 92 ms (89-131)      | 72 ms (61-77)       |
| style recalc                 | 211 ms (197-252)    | 351 ms (309-382)    |

Before the merge, `fe6d183` against `513d113` (same harness, under heavier load) read:

- p50 16.7 against 16.7 ms, and p95 16.7 against 16.7 ms.
- 0 dropped frames and 0 long tasks on both sides.
- Mutations 2329 against 1229 per second.
- Task time 5356 against 3755 ms.
- Script 1234 against 574 ms.
- Layout 307 against 118 ms.
- Style 601 against 715 ms.

Verdict. Not worse on any of the four gating metrics. Frame pacing shows no measurable difference.
Mutations per second fell 47%, main-thread task time fell 17 to 30% depending on load, and script
time halved.

- Frame intervals cannot separate the sides here. Headless Chromium paces rAF to 60 Hz, and every
  run on both sides drew all frames with a 16.8 ms largest gap. `performance.now()` is coarsened
  to 0.1 ms, so p95 moves between 16.7 and 16.8 on timer resolution alone. Over the four batches of
  the final code (20 runs per side), 8 before runs and 7 after runs read 16.8. Any gap is one timer
  tick, and neither side dropped a frame.
- Headless numbers do not include GPU raster. Chromium rasterises in software here.

Trace (`scripts/perf/broadcast-trace.mts`, 4 s at 4x throttle, three alternated pairs, raw in
`docs/reports/broadcast-frame-loop/trace.txt`). At the merged head, `458c56e` against `6e9d509`:

| Event (ms in 4 s)        | before (`458c56e`) | after (`6e9d509`) |
| ------------------------ | ------------------ | ----------------- |
| FunctionCall (script)    | 443-465            | 236-249           |
| UpdateLayoutTree (style) | 169-186            | 243-256           |
| elements restyled        | 9643-9726          | 11390-11548       |
| Layout                   | 146-155            | 54-56             |
| PrePaint                 | 241-254            | 160-176           |
| Paint                    | 505-521            | 257-271           |
| Layerize                 | 251-259            | 240-248           |

The pre-merge pairs were:

| Event (ms in 4 s)        | before (`fe6d183`) | after (`513d113`) |
| ------------------------ | ------------------ | ----------------- |
| FunctionCall (script)    | 517-533            | 235-244           |
| UpdateLayoutTree (style) | 209-236            | 279-295           |
| elements restyled        | 9249-9283          | 10314-10351       |
| Layout                   | 106-122            | 48-50             |
| PrePaint                 | 261-285            | 183-191           |
| Paint                    | 464-500            | 169-176           |
| Layerize                 | 172-182            | 159-170           |

Limiter. Before, React reconciliation (script) and paint led the frame: every frame re-rendered
the screen and moved players by `left`/`top`, which invalidated layout and repainted them. After,
style recalc is the largest single cost. Paint fell to about a third, because composited
transforms move players without repainting them.

Style recalc rose, and this is a known cost: about 60 ms per 4 s in the trace and 140 ms per 10 s in
the merged-head harness. The ball's inherited `--loft` and `--spin` restyle its SVG subtree every
frame, which accounts for the extra elements. A variant that wrote the ball's children directly
restyled 8,860 elements, but its style time did not drop (median 615 vs 509 ms before, in a separate
5-run batch). So per-element style cost also rose. The cause is not proven. The likely candidates
are container-relative units in transforms and `setAttribute("style")` reparsing. The kept version
writes 1 mutation per ball frame instead of 3. Total main-thread time still falls because script,
layout and paint fall by more.

Benchmark checklist. Both sides ran production builds. The work happened: the clock advanced from
minute 1 or 2 to minute 14 or 15 in every run, and the in-page rAF probe drew 600 or 601 frames. No
run errored.

## Product decisions applied

- Section 2 decision 1: Quick renders a still pitch. It does not subscribe to the frame loop, and
  its pitch is painted from props once per commit.
- Section 2 decisions 9 and 12: callouts, cut-ins and staging content are unchanged.

## Gates

At the merged head `6e9d509` (rows 2g and 2b):

- `pnpm lint` and `pnpm typecheck` exited 0. `pnpm test`: 1431 passed in 163 files. `pnpm build`
  exited 0.
- `pnpm check:mirrors`, `check:image-seam`, `check:image-packs`, `check:theme-contrast`,
  `check:theme-colors`, `check:theme-cvd` and `check:client-bundle` exited 0. Prettier `--check`
  passed on the touched files.
- Playwright with a fresh build, `PLAYWRIGHT_PORT=3521 CI=1`, on `broadcast-frame-loop`,
  `continuous-ball`, `callouts-type-effects`, `audio-polish`, `score-lands-with-ball`,
  `speed-aware-staging`, `mobile-pitch-fixes`, `injury-staging`, `one-shared-timeline` and
  `quick-not-broadcast`: 19 passed, 0 failed. `continuous-ball` read 2.68 per 60 Hz frame.

At the earlier merged head `f511c73`:

- `pnpm lint` and `pnpm typecheck` exited 0. `pnpm test`: 1415 passed in 160 files.
- Playwright with a fresh build of `f511c73`, `PLAYWRIGHT_PORT=3521 CI=1`: 425 passed, 54 skipped
  by project filters, 0 failed. The run covered the new `broadcast-frame-loop`, `audio-polish`,
  `one-shared-timeline`, `score-lands-with-ball`, `speed-aware-staging`, `quick-not-broadcast`,
  `injury-staging`, `watch-live`, `manager-mode`, `mobile-pitch-fixes`, `pitch-card-containment`,
  `pitch-ci-regressions`, `pitch-request-acceptance`, `honest-momentum`, `recorded-saves`,
  `highlights-honesty`, `builder-matchday`, `exhibition-two-legs`, `layout-shift`, `mobile-targets`
  and `mobile-acceptance`.
- `pnpm build` exited 0 at `f511c73`.

Before the merge, at `513d113`: lint, typecheck and build exited 0, 1392 tests passed in 156 files,
and the same Playwright set without `audio-polish` gave 423 passed, 54 skipped and 0 failed.

Browser proof is in `docs/reports/broadcast-frame-loop/{390,360,320}-live.png`, taken at `f0f73b9`.
`e2e/broadcast-frame-loop.spec.ts` checks at each width with touch that all 22 players carry
`translate3d` transforms and that their centers sit inside the pitch. It also checks that the ball
moves between samples and that the page has no horizontal overflow.

At `f0f73b9` (after the #92 merge):

- `pnpm lint` and `pnpm typecheck` exited 0, and `pnpm test` passed 1453 tests in 166 files.
- `pnpm build` and all 7 `check:*` scripts exited 0.
- Playwright with a fresh build, `PLAYWRIGHT_PORT=3521 CI=1`, ran the 10 specs above plus
  `shootout-suspense`. Result: 20 passed, 0 failed. `continuous-ball` read 2.68.

## NOT RUN

- Physical phone check (owner action, requested in the PR body).
- Full local Playwright suite. Hosted CI runs all eight shards.
- Independent review (the coordinator runs GLM).
- Perf harness and trace at `f0f73b9`. The last measurement is at `6e9d509`, before #92.
