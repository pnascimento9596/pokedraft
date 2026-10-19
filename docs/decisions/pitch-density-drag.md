# Pitch density and drag (Wave 4, row 4j)

Branch `perf/pitch-density-drag` off `origin/main` at `168a8f3` (after rows 4-0, 4e, 4a, 4c, 4b
and 4f). Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens
are untouched.

## Scope

- Below 540px (the existing `@container (max-width: 540px)` in `Pitch.module.css`) a filled pitch
  token:
  - shows its type as a 3px top bar in the type colour instead of a 2px frame;
  - drops the 15px type-icon column (the types stay in the accessible name through the
    visually hidden labels, and in the dossier);
  - draws a 48px sprite (`min(48px, 100cqi)`), up from 30px;
  - keeps the name on one line with `text-overflow: ellipsis`.
- Pitch token drag (`Pitch.tsx`): the drag lives in refs. Each pointermove stores the pointer and
  asks for one animation frame. The frame writes the token's `translate` and `data-dragging`, hit
  tests once with `elementFromPoint`, and sets the drop target state only when the slot under the
  pointer changes. A drag with no target change commits once, on drop.
- Candidate drag (`DraftBoard.tsx`): the same pattern. State commits on press (the preview edges
  and fit glow need the candidate), once when the drag passes the slop (the preview mounts), when
  the open slot under the pointer changes (the "+24" delta), and on drop. The window listeners
  attach once per drag: the effect depends on whether a drag is live, and the drop reads the
  lineup, `act` and the committed slot from a ref. The preview moves by `transform`, centred by a
  CSS `translate: -50% -50%`, never by `left` and `top`.
- Drawer swipe (`setSwipeY`): unchanged, by measurement (below).
- `scripts/perf/draft-drag.mts` (new): the 4x throttle drag harness.

Files: `src/components/pitch/Pitch.tsx`, `src/components/pitch/Pitch.module.css`,
`src/components/run/DraftBoard.tsx`, `src/components/run/DraftBoard.module.css`, new
`scripts/perf/draft-drag.mts`, new tests `src/components/pitch/__tests__/pitch-drag-commits.test.tsx`,
`src/components/run/__tests__/candidate-drag.test.tsx` and `e2e/pitch-density-drag.spec.ts`, and
one changed test in `src/components/pitch/__tests__/Pitch.test.tsx`. The `speed` prop line from
DraftBoard to RollReveal (PR #119) is untouched.

## RED commit and output (verbatim excerpt)

RED `883980e` adds the three test files only. GREEN `94260af`. The harness is its own commit,
`854bf7c`, between them.

Unit, in a clean export of `883980e` (`git archive 883980e`), 3 of 3 failed in 2 files:

```
 ❯ src/components/pitch/__tests__/pitch-drag-commits.test.tsx (1 test | 1 failed) 162ms
   ❯ pitch drag commits (1)
     × commits once on drop and once per hovered target, never per pointermove (catches a re-render on every move) 161ms
 ❯ src/components/run/__tests__/candidate-drag.test.tsx (2 tests | 2 failed) 997ms
   ❯ candidate drag (2)
     × attaches its window pointermove listener once per drag, not once per move (catches the effect re-running on every move) 903ms
     × moves the drag preview by transform to the pointer, not by left and top, and still drops on the slot under it (catches the preview drawn away from the finger) 93ms
AssertionError: expected { down: 1, moves: 20, drop: 1, …(1) } to deeply equal { down: +0, moves: 1, drop: 1, …(1) }
AssertionError: expected 11 to be 1 // Object.is equality
AssertionError: expected { transform: '', left: '150px', …(1) } to deeply equal { …(3) }
```

E2E, `e2e/pitch-density-drag.spec.ts` as committed in `883980e`, chromium, against a
`next start` build of `168a8f3` (the RED commit changes only tests, so its app code is
`168a8f3`'s). 9 of 11 failed:

```
  ✘   1 [chromium] › e2e/pitch-density-drag.spec.ts:69:9 › at 390x844 › token sprite is 48px and stays inside its token (catches the 30px sprite below 540px) (3.9s)
  ✘   2 [chromium] › e2e/pitch-density-drag.spec.ts:93:9 › at 390x844 › token name is one line with an ellipsis (catches names wrapped over two lines) (3.9s)
  ✘   3 [chromium] › e2e/pitch-density-drag.spec.ts:111:9 › at 390x844 › the type colour is a 3px top bar and the type icon column is gone, with the types still named (3.8s)
  ✓  10 [chromium] › e2e/pitch-density-drag.spec.ts:132:7 › at 390x844 › drag preview is drawn under the pointer and the drop lands in the hovered slot (catches the preview left behind at the drag start) (1.3s)
  ✓  11 [chromium] › e2e/pitch-density-drag.spec.ts:179:7 › at 390x844 › a pitch drag swaps the two players and the dragged token follows the pointer (1.2s)
    +   "30px 30px inside",
    +   "2 normal clip",
    Expected: "3px 0px 0px 0px hidden"
    Received: "2px 2px 2px 2px shown"
  9 failed
  2 passed (8.5s)
```

The same three density tests failed at 360 and 320. At 390, 5 of 16 names wrapped to two lines
("2 normal clip"), and all 11 starter sprites read "30px 30px inside".

The two passes:

- "a pitch drag swaps the two players" is a regression guard with no RED: the swap already
  worked. It stays to cover drop on the hovered slot after the move to refs.
- "drag preview is drawn under the pointer" passed in that parallel run. Run alone against the
  same build (`--workers 1 --repeat-each 3`) it failed 3 of 3 with `Expected: > 0.2`,
  `Received: 0`. The carryover section explains why it depends on timing. Its deterministic RED
  is the unit test on the preview's transform, above.

## Carryover from 4c: the drag preview did not follow the finger

Reproduced at `168a8f3` on 390x844, with Makuhita (#296) dragged from its offer card to the GK
slot after Gulpin at ST (`style=classic3&seed=run-test`):

- The preview's layout box was under the pointer. `getBoundingClientRect` gave a centre of
  (195, 732.59) for a pointer at (195, 732.61), with style `left: 195px; top: 732.605px`.
- The ancestor chain held nothing that makes a containing block for a fixed element: no
  `transform`, `filter`, `perspective`, `contain`, `container-type`, `will-change` or
  `backdrop-filter` above it. The brief's containing block premise does not hold.
- The paint was stale. A full viewport capture drew the preview at about (80, 485), where the drag
  passed the slop (79.7, 504), with the new "+24" text inside it. This matches the 4c screenshot.
- In a standalone Playwright script, the preview's layout box captured with the preview shown and
  then hidden differed in 0% of its pixels, at once and again after 1 frame, 3 frames and 300 ms,
  when nothing in the page asked for a frame before the first capture. With two
  `requestAnimationFrame`s before it, the box differed in 72%. In the test runner, a full viewport
  capture of a 40px square at the pointer also differed in 0% (3 of 3 runs), while a clipped
  capture of the same square differed in 51%.
- Moving the preview node to `body` drew it at the pointer. Rewriting its `left` and `top` as a
  `transform` drew it at the pointer or one move behind it.

So the defect is in paint, not layout. Headless Chromium left a `left`/`top` move of this fixed
element undrawn until something else requested a frame. Whether a phone shows the same is not
known. The physical phone check covers it. The fix writes the preview's `transform` inside a
`requestAnimationFrame` callback, so every move is part of a drawn frame. On the fixed build the
same full viewport square differed in 42% to 52% of its pixels in 3 runs (the sprite and the text
cover part of it), and the e2e guard passed 5 of 5 alone and in both full-file runs.

## Where the literals come from

- 48px: the brief's target and `PitchCard`'s `size={48}`. A 56px token minus 2px padding on each
  side leaves 52px of content once the side borders go, so 48px fits. Starters measured 48px at
  390, 360 and 320. Bench tokens measured 48px at 390 and 360 and 47.59px at 320, where the bench
  token is narrower and `min(48px, 100cqi)` takes the largest size that fits.
- Height: the fit token is 88px. 3px bar, 2px padding top and bottom, rows 14px, 48px and 14px
  with two 1px gaps total 85px.
- "3px 0px 0px 0px": the 3px top bar and no side or bottom border.
- `moves: 1` in the commit test: the one change of the slot under the pointer, from none to ST.
  `drop: 1`: the swap and the cleared drop target batch into one commit.
- 11 listener registrations at RED: one when the drag starts and one for each of the 10 moves.

## Measurements

`pnpm exec tsx scripts/perf/draft-drag.mts --target before=http://localhost:3911 --target
after=http://localhost:3912 --runs 5 --out docs/reports/pitch-density-drag/drag.json`. `before` is
a `next start` build of `168a8f3`, `after` a build of this branch's code at `94260af`. 4x CDP CPU
throttle, 390x844 at 3x, a 2 s scripted mouse drag per scene, 5 runs per side, sides alternated
run by run. Median (min to max). Load average 6.7 at the start and 2.7 at the end (another
worktree was building). Headless Chromium rasterises in software, so these numbers exclude GPU
raster.

Candidate drag (an offer card looped over the pitch):

| Metric          | before        | after         |
| --------------- | ------------- | ------------- |
| p50 frame ms    | 16.7          | 16.7          |
| p95 frame ms    | 16.8          | 16.7          |
| Dropped, long   | 0, 0          | 0, 0          |
| Mutations per s | 67 (66-71)    | 40 (40-40)    |
| Script ms       | 132 (129-135) | 36 (36-41)    |
| Layout ms       | 7 (6-10)      | 3 (1-3)       |
| Style ms        | 11 (10-14)    | 17 (14-18)    |
| Task ms         | 226 (217-237) | 125 (117-135) |

Pitch token drag (Gulpin looped over the pitch):

| Metric          | before     | after      |
| --------------- | ---------- | ---------- |
| p50 / p95 ms    | 16.7, 16.7 | 16.7, 16.7 |
| Dropped, long   | 0, 0       | 0, 0       |
| Mutations per s | 43 (42-44) | 42 (41-44) |
| Script ms       | 50 (48-59) | 31 (28-33) |
| Style ms        | 5 (4-9)    | 8 (5-10)   |
| Task ms         | 88 (86-108)| 70 (66-78) |

Picker swipe (unchanged code on both sides):

| Metric          | before        | after         |
| --------------- | ------------- | ------------- |
| p50 / p95 ms    | 16.7, 16.7    | 16.7, 16.7    |
| Dropped, long   | 0, 0          | 0, 0          |
| Mutations per s | 35 (33-36)    | 34 (33-35)    |
| Script ms       | 112 (101-117) | 114 (110-115) |

Verdict:

- Frame pacing and long tasks: no measurable difference. Every side drew every frame (largest gap
  16.8 ms) with no long task. The limiter is the 60 Hz frame clock. At 4x the old candidate drag
  spent about 2 ms of script per move, well inside a 16.7 ms frame.
- Main thread work: lower. Candidate drag script time fell from 132 to 36 ms per 2 s drag (73%)
  and task time from 226 to 125 ms, with no overlap in the ranges. Before, every move re-rendered
  the whole draft board. Pitch token drag script time fell from 50 to 31 ms. Before, every move
  re-rendered the pitch's 16 tokens.
- Mutations: the candidate drag fell from 67 to 40 a second. The pitch drag is level. A first
  build wrote `data-dragging` on every frame and read 71 a second against 40, so it now writes the
  attribute once per drag.
- Style recalc rose by 3 to 6 ms per 2 s on both drags, with ranges that barely overlap. It is
  under 0.3% of the window, and layout fell by about the same amount for the candidate drag.
- The harness's mouse moves arrived about every 30 ms (about 66 per 2 s) under the throttle,
  because each CDP dispatch waits for the page. So there was at most one move per frame, and the
  one rAF per frame cap did not get to merge moves here. On a phone that sends pointer events
  faster than the frame rate, the cap merges them.
- Work happened: the harness throws unless the drag is live at the end of each scene (the
  `data-dragging-candidate`, `data-dragging` or drawer `translateY` state). No run threw.

Drawer swipe: left as is. Its frame pacing matched the drags (no dropped frame, no long task at
4x), and its script time of about 112 ms per 2 s is a short close gesture. The decision applies the
ref pattern to swipes only if the measurement shows they matter, and it does not.

## Product decisions applied

- Density below 540px, as the hand-off wrote it: 3px top accent bar, no icon column, 48px sprite,
  one-line names with an ellipsis. 48px fits the 56px token (above), so no smaller size was
  needed.
- Drag through refs and rAF: pointer in refs, `translate`/`transform` written in one rAF per
  frame, `elementFromPoint` at most once per frame, drop target state set only on change, state
  committed on drop, window listeners once per drag, preview by transform.
- Measurement: before and after at 4x, p50 and p95 frame interval, long tasks and mutations per
  second, during a scripted 2 s drag at 390x844, with the 2a and 3b harness shape
  (`broadcast-frames.mts`). No hard bound in CI.
- Blind challenges: nothing in this row is a number. The token note (fit score) keeps its
  existing ratings gate.
- The matchday pitch is a different component (`src/components/matchday`), so 3d's sprite floor
  is untouched. `team-readability.spec.ts` passed (Gates).

## Implementation decisions

- The pitch token keeps the individual `translate` property instead of `transform`. Its CSS
  `transform` carries the centring and the counter tilt (`translate(-50%, -50%) translateZ(40px)
  rotateX(-26deg)`), and `translate` composes with it on the compositor without restating it.
  It is the same kind of compositor-only write as `transform`.
- The preview's centring moved to CSS (`translate: -50% -50%`), so the inline `transform` holds only
  the pointer position.
- The candidate drag still commits once when it passes the slop, to mount the preview, and once on
  press, because the fit glow and preview edges show from the press. Both happen once per drag.
- The drop reads the lineup, `act` and the committed slot through a ref that an effect keeps
  current. This is what lets the listeners stay attached for the whole drag.
- The drop hit test in `Pitch.tsx` runs before `data-dragging` is removed, while the dragged token
  still has `pointer-events: none`. Otherwise `elementFromPoint` would find the dragged token
  itself.
- Density applies to every `Pitch` below 540px: the draft, the builder and the results pitch share
  the component. The matchday pitch does not.
- The type labels stay in the DOM as a 1px clipped box at the token's corner, so the accessible
  name keeps the types and `pitch-card-containment` still finds them inside the card.

## Tests changed by design

- `Pitch.test.tsx`, "stretches a dragged starter's vertical move by 1/cos(26deg)": the translate
  is now written in the next animation frame, so the test fakes `requestAnimationFrame` and
  advances one frame before reading it. The literal `0px 111.26px` is unchanged.
- `e2e/pitch-density-drag.spec.ts`, the type bar test: the RED commit read the type box's width
  from `getBoundingClientRect`, which includes the tilted field's perspective scale, so the 1px box
  read wider than 1px on the fixed build. GREEN reads `offsetWidth`. At RED the test failed on the
  border ("2px 2px 2px 2px") as well as the 15px column, so it was RED either way.
- `e2e/pitch-request-acceptance.spec.ts`, the Crabominable phone pitch test (both engines): it
  asserted the full name fits its card with no horizontal clipping. The decision above makes a
  phone name one line with an ellipsis, so the full suite at `94260af` failed it on chromium and
  webkit, retries included. `4b62f25` changes it to the new literal behaviour: the name text is
  still "Crabominable", the computed style is `nowrap` and `ellipsis`, the line is not clipped
  vertically, and the card's accessible name contains "Crabominable". Renamed to say so.

## Gates

At `94260af` (the code head; `4b62f25` after it changes only one e2e spec):

- `pnpm lint`, `pnpm typecheck`, `pnpm build`: each exit 0.
- `pnpm test`: 1752 passed in 205 files.
- The eight `check:*` scripts (mirrors, image-seam, image-packs, client-bundle, theme-contrast,
  theme-colors, dashes, theme-cvd): each exit 0.
- Prettier check on the changed files: clean.
- Full Playwright suite, `CI=1`, 4 workers, headless, against the `94260af` build: 1015 tests,
  950 passed, 63 skipped, 2 failed (the Crabominable test on chromium and webkit, retries
  included, above). Projects: chromium, iphone-14, iphone-se, pixel-7, webkit-progress and
  webkit-wheel. The existing drag specs passed: `mobile-acceptance` (107 on iphone-14, 81 on
  iphone-se, 82 on pixel-7) and `mobile-draft` (26, 24, 24) on the phone projects, and
  `draft-safety` (9) and `live-team-score` (11) on chromium.
- `e2e/pitch-density-drag.spec.ts` inside that run: 11 of 11 passed. The preview paint guard alone
  (`--workers 1 --repeat-each 5`): 5 of 5 passed.
- After `4b62f25`, `e2e/pitch-request-acceptance.spec.ts` and `e2e/team-readability.spec.ts`
  against the same build: 11 of 11 passed. `team-readability` (the matchday sprite floor) also
  passed inside the full run; its narrowest matchday sprite reads 70.4px at 390, 360 and 320, so
  the token change does not reach the matchday pitch.

## Brief vs code

- The brief says sprites grow "from 31px". The code at `168a8f3` drew 30px
  (`min(30px, 100cqi)`, `Pitch.module.css:396-397`), and bench sprites at 320 drew 26.59px.
- The code map's lines moved with 4c and 4f: the drag state is at `Pitch.tsx:88-89` (map :87-88),
  the move handler at :179 (map :178-188), the candidate `setDragCandidate` at
  `DraftBoard.tsx:323` (map :302-327), the effect deps at :388 (map :374), the preview `left` at
  :892 (map :805-809), its CSS at `DraftBoard.module.css:353` (map :328-345), and the drawer swipe
  at :631 (map :579-582). `Pitch.module.css:98`, :115 and :368 matched.
- The 4c carryover guessed a containing block or transform ancestor. There is none (above), and
  the layout box was always under the pointer. A guard on the bounding box alone could never be
  RED, so the e2e guard reads paint and the unit guard reads the transform.

## NOT RUN

- Review and hosted CI.
- A physical phone check: drag feel, the 48px sprites and one-line names (owner action), and
  whether a phone ever showed the stale preview.
- A real screen reader pass over the shorter visible token (owner action).
- GPU raster timing: headless Chromium rasterises in software.
- WebKit and Firefox drag paint: the new spec runs in the chromium project only. The phone
  projects ran the existing drag specs (Gates).

## Carryovers

- Drawer swipe still sets React state per move. Measured not to matter at 4x (above). Revisit only
  if the phone check reports a stutter while closing the picker.
- The Builder Picker swipe (`Picker.tsx:226`) has the same per-move state and was not measured.
