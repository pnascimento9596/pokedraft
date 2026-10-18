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
  count changes, a goal lands, a new play starts (live phase sounds) or the beat on the pitch
  changes. The guard counts 10 commits in the same 62 frames.
- `Broadcast` subscribes to the feed while motion is on. On each published frame it runs
  `activeBeat` and `stagePitch` for that frame. It then writes `transform: translate3d(x cqi, y cqi, 0)`
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

At the merged head, before is `origin/main` `e7f2012` (PR #88 audio polish) and after is `f511c73`:

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
`docs/reports/broadcast-frame-loop/trace.txt`). The load fell during this run, so absolute times
drift by pair. The pre-merge pairs, run under steadier load, were:

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

At the merged head `f511c73`:

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

Browser proof is in `docs/reports/broadcast-frame-loop/{390,360,320}-live.png`, taken at `f511c73`.
`e2e/broadcast-frame-loop.spec.ts` checks at each width with touch that all 22 players carry
`translate3d` transforms and that their centers sit inside the pitch. It also checks that the ball
moves between samples and that the page has no horizontal overflow.

## NOT RUN

- Physical phone check (owner action, requested in the PR body).
- Full local Playwright suite. Hosted CI runs all eight shards.
- Independent review (the coordinator runs GLM).
