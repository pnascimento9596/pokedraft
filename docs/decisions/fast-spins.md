# Fast spins (Wave 4, row 4d)

Branch `feat/fast-spins` off `origin/main` at `337f9df` (after rows 4-0, 4e, 4a, 4c and 4b).
Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are
untouched.

## Scope

- `PanelSettings.spinSpeed: "normal" | "fast"`, default `"normal"`, in `src/ui/settings.ts`.
  `parsePanel` keeps a stored `"normal"` or `"fast"` and turns a missing or unknown value into
  `"normal"`, so a `pokedraft:panel` saved before this row loads unchanged.
- `SPIN_FAST_FACTOR = 0.4` and `spinMs(ms, speed)`, which rounds `ms x 0.4` to whole ms for Fast.
- `Wheel` and `RollReveal` take a required `speed` prop. `Wheel` scales `DURATION_MS`.
  `RollReveal` scales `STAGE_PAUSE_MS` and `DONE_PAUSE_MS` and passes `speed` to each `Wheel`.
- `LiveRun` reads the setting once per run, beside `kickOff`, and passes it to `DraftBoard`.
  `DraftBoard` only passes it on to `RollReveal`.
- Home settings, Setup group: a `Segmented` "Spin speed" with Normal and Fast, under Generations.

Files: `src/ui/settings.ts`, `src/components/wheel/Wheel.tsx`,
`src/components/wheel/RollReveal.tsx`, `src/components/run/LiveRun.tsx`,
`src/components/run/DraftBoard.tsx`, `src/components/home/SidePanel.tsx`. Tests: new
`src/components/wheel/__tests__/spin-speed.test.tsx`, new cases in
`src/ui/__tests__/settings.test.ts`, `speed="normal"` added to the existing renders in
`wheel.test.tsx` and `announce.test.tsx`, new `e2e/fast-spins.spec.ts`, and the measurement
`e2e/fast-spins-measure.spec.ts` (skipped unless `MEASURE_FAST_SPINS=1`).

## RED commit and output (verbatim excerpt)

RED `a2d3d05`: 4 of 22 failed in 2 files. GREEN `930fe0b`.

```
 ❯ src/ui/__tests__/settings.test.ts (18 tests | 3 failed) 25ms
   ❯ spinSpeed (catches a saved panel that resets on upgrade or turns fast spins on by accident) (3)
     × an old panel without spinSpeed parses as normal 8ms
     × loads a stored fast and drops values of the wrong type 1ms
     × round-trips through savePanel 1ms
 ❯ src/components/wheel/__tests__/spin-speed.test.tsx (4 tests | 1 failed) 279ms
   ❯ spin speed (catches a Fast setting that leaves the draft spins at their normal length) (4)
     × fast spin uses 680/840/920 ms and 128/104 ms pauses 88ms

 Test Files  2 failed (2)
      Tests  4 failed | 18 passed (22)
```

Failures: `expected { ms: 1700, calls: [ [ 'finished' ] ] } to deeply equal { ms: 680, calls: [
[ 'finished' ] ] }`, `expected undefined to be 'fast'`, and the old-panel case missing
`"spinSpeed": "normal"`.

Three cases in `spin-speed.test.tsx` passed at RED, as labelled regression guards with no RED:
normal keeps 1700/2100/2300 ms and 320/260 ms, tap to skip lands both reels at Fast, and reduced
motion settles at once at Fast.

`e2e/fast-spins.spec.ts` against a build of the RED production code: 3 of 3 failed, each on the
missing "Spin speed" group (`waiting for getByRole('group', { name: 'Spin speed' })`). The
normal-time case fails there for the same reason. It is a guard that Normal keeps its length,
not a fix. The RED build ran with the two new unit test files moved aside, because `next build`
type-checks them and they name a prop that did not exist yet. The production sources were those
of `a2d3d05`.

## Where the literals come from

None comes from the code under test. 680, 840 and 920 are 1700, 2100 and 2300 x 0.4. 128 and 104
are 320 and 260 x 0.4. All five are whole numbers, so rounding does not move them. The unit test
steps the reel 1 ms per frame and the pause timers 1 ms per tick, so a spin of 681 ms or a pause
of 127 ms fails it.

## Measurements

Chromium, headless, 390x844, `next start` on a build of `930fe0b`, one run each.

- First reveal of an 8-0 run, from the first spinning reel to both reels settled, timed in the page
  with `performance.now()`: Normal 4,172 ms (sum of the timers 4,120), Fast 1,672 ms (sum 1,648).
  The e2e bound is "under 2,000 ms" for Fast and "at least 4,000 ms" for Normal.
- A full 16-round draft, clicking the first candidate and the first empty slot as soon as each
  shows (`MEASURE_FAST_SPINS=1 pnpm exec playwright test e2e/fast-spins-measure.spec.ts`):

| Run | Normal | Fast | Saved |
| --- | --- | --- | --- |
| 8-0 (open, Squad First) | 77,678 ms | 29,806 ms | 47.9 s |
| 151 (Squad First) | 45,811 ms | 21,778 ms | 24.0 s |

- Against the brief's "about 40 s". The timers alone save 2,628 ms per 8-0 roll (4,380 to 1,752)
  and 1,536 ms per 151 roll (2,560 to 1,024). Over 16 rolls with no rerolls that is 42.0 s and
  24.6 s. The 8-0 run measured 5.9 s more saving than the timers explain. That gap is not
  explained: it is one run per speed and was not investigated. The 151 run matches its timers
  within 0.6 s. Each reroll adds about 1.4 s (type) or 2.6 s (region) of saving. So the brief's
  40 s holds for an 8-0 run and is about 24 s for a 151 run.

## Gates

At `aa9022c`. The production sources are the same as GREEN `930fe0b`. `aa9022c` changes only the
spec's Setup locator, after the first GREEN run of the spec hit a strict-mode error: two
`section`s hold the Setup heading.

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0.
  Prettier passed on the 12 changed files and this log.
- Unit tests: 1,733 passed in 203 files (1,726 on `main` plus this row's 7).
- Playwright (`CI=1`, headless, build of `930fe0b`), full suite: 938 passed, 67 skipped (63 by
  their own project gates, 4 in the opt-in measurement spec), 0 failed, 0 retries, in 17.7
  minutes. `fast-spins` passed 3 of 3. The run rewrote proof PNGs of earlier rows under
  `docs/reports`. Those were reverted with `git checkout --`.
- A sibling implementer ran `pkill -f "next start --port"` at about 13:36, during this row's RED
  e2e run. The RED failures were all on the missing "Spin speed" group, not on connection errors,
  so the RED result stands. One earlier foreground attempt at the same run ended with exit 144
  after one test and was rerun.

## Product decisions applied

From hand-off 4.3, row 4d:

- `spinSpeed: "normal" | "fast"`, default `"normal"`. Old stored panels default it.
- Fast multiplies `DURATION_MS` and both pauses by `SPIN_FAST_FACTOR = 0.4`, rounded to whole ms.
- A `Segmented` "Spin speed: Normal / Fast" in the Setup group of the home settings.
- Reduced motion still wins (`instant` returns the settled reels before any timer runs). Tap to
  skip works at both speeds.
- Draft only. Matchday pacing reads nothing from `spinSpeed`.
- Blind challenges: the setting shows no number, so nothing hides with ratings off.

## Implementation decisions

- **One scaling function.** `spinMs` sits beside the factor in `src/ui/settings.ts`, and both
  components call it. The factor and the rounding live in one place.
- **`speed` is a required prop.** A missing speed is a type error, so a new `RollReveal` caller
  cannot drop the setting. The cost is `speed="normal"` in four existing test renders.
- **Read once per run.** `LiveRun` reads the panel in a `useState` initializer, as it does for
  `showRatings` and `kickOff`. A change on the home page applies to the next run.
- **Tests drive the real timers.** The unit test steps `requestAnimationFrame` by hand and fakes
  only `setTimeout` and `clearTimeout` (hand-off 3.5), and asserts the ms at which the reel settles
  and the pauses end. It does not read the constants.
- **The measurement is a committed spec, skipped by default.** A reviewer can rerun the numbers
  with one command. It is not a guard and does not slow the suite.
- **Proof at 390 only.** The control is the same `Segmented` as Draft style. It changes no width
  and adds one row, and the spec checks that `scrollWidth` stays at 390.

## Brief vs code

- The 4.2 code map holds at `337f9df` except one line number. `DURATION_MS` is at
  `Wheel.tsx:30-34` and the pauses at `RollReveal.tsx:22-23`, as mapped. `instant={reduced}` is
  at `DraftBoard.tsx:655` (map said `:606`), with `useReducedMotion()` at `:142`.
  `PanelSettings` had no `spinSpeed`.
- 4b moved Setup into the collapsible settings region (`SidePanel.tsx:224`), collapsed below
  1024px. The spec opens it with `openHomeSettings()`.
- The brief says "saves about 40 s per run". Measured 47.9 s for 8-0 and 24.0 s for 151 (above).

## NOT RUN

- The review (the coordinator runs GLM) and hosted CI.
- A physical phone check ("fast spins feel fast but readable") and a screen reader pass (owner
  actions).
- Proof at 360 and 320 (no layout change at those widths; see above).
- `pnpm data:pokedex` and `pnpm data:scouting` (no data change).
- The full-draft measurement under CPU throttle, and more than one run per speed.

## Carryovers

None new.
