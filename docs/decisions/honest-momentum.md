# Honest momentum (Wave 1, row 1b)

Tier Yellow. Branch `fix/honest-momentum`, built on row 1a (`fix/one-shared-timeline`, PR #72). No
file under `src/engine`, `src/data` or `src/scouting` changed, so the engine goldens are untouched.

## Scope

The bug, re-verified at `22d216a` (row 1a head):

- `timeline.ts:362-380` gave each five-minute frame a `ball` lean from the goals and saves inside
  its own window `(from, to]`. A frame is on screen for all of `(from, to]`, so the lean showed a
  goal or save from the first second of its window.
- Three consumers read it through `frameAt`. The HUD momentum bar (`MatchPlayer.tsx:234-236`), the
  ambient ball (`ambientBall`) and the possession bias (`timeline.ts:408`, the audit's `406`).

The fix, one line of logic in `buildTimeline`:

- A frame's `ball` now counts the goals and saves of the window that just finished,
  `(from - 5, from]`. Every consumer reads only windows with `to <= clock` without a new API.
- The first frame reads 0, so the HUD shows 50% / 50% until the first window is played.
- The `line` field still reads the tactic snapshot at the window's end. It is out of this row's
  scope and recorded as a carryover.

Boundary: at a clock of exactly 5.0 `frameAt` still returns the first frame, so the lean moves an
instant after 5', not at 5' itself. The guard asserts 4.99 and 5.01, not 5.0.

## Measurements

- Browser, live replay of the golden cup8 run's G1 at 390x844, momentum text by whole minute.
  The user's keeper saves at 3'.
  - Row 1a build (`018fd21` holds only tests on top): 0' to 4' read `36%64%`, 5' to 9' read
    `50%50%`. The bar leaned toward the 3' save from kickoff, the audit's 36/64.
  - Fix build (`43c5a5d`): 0' to 4' read `50%50%`, 5' to 9' read `36%64%`.
- Possession phases whose side changed, old versus new code, on the six played golden cup8
  matches (probe, not committed; `cup.seed`, match index as the position in `cup.matches`,
  canon movesets): G1 8 of 72, G2 2, G3 15, R32 4, R16 2, QF 2 of 96. The HUD at 0' changed only
  for G1 (36 to 50).
- The 1a guard's pinned phases (3, 10 and 30 on the `tl` fixture) did not change.
- How often the bar reads a flat 50/50 is not changed by this row. The audit's 56 to 72% stands;
  the xG river row owns it.

## RED output (commit `018fd21`, verbatim excerpts)

```
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > momentum (catches a lean that shows a goal or a save before it happens) > reads 0 at kickoff even when the first window holds a goal
AssertionError: expected 0.5 to be +0 // Object.is equality
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > momentum (catches a lean that shows a goal or a save before it happens) > does not move the lean for a goal at 4' before 5'
AssertionError: expected [ 0.5, 0.5, 0.5, 0.5, 0.5, 0.5 ] to deeply equal [ +0, +0, +0, +0, +0, +0 ]
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > momentum (catches a lean that shows a goal or a save before it happens) > keeps possession before a goal free of the goal later in the same window
AssertionError: expected [ 's8', 's10', 's14', 's20' ] to deeply equal []
      Tests  3 failed | 18 passed (21)
```

Playwright `e2e/honest-momentum.spec.ts` at the RED build:

```
momentum by minute: {"0":["36%64%"],"1":["36%64%"],"2":["36%64%"],"3":["36%64%"],"4":["36%64%"],"5":["50%50%"],"6":["50%50%"],"7":["50%50%"],"8":["50%50%"],"9":["50%50%"],"10":["50%50%"],"11":["50%50%"]}
  1 failed
```

The fix commit also rewrites the existing frame test, which pinned the leaking lean
(`frames[2].ball` 2/3 for the 12' goal and save). It now pins `frames[2]` at 0 and `frames[3]` at 2/3.

## Product decisions applied

None from section 2 apply. The lean keeps its scale (`50 + lean * 28`).

## NOT RUN

- Hosted CI and the GLM review (the coordinator runs them).
- A physical phone check.
- Playwright at 360 and 320. The layout does not change.
