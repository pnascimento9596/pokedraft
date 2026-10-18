# Score lands with the ball (Wave 1, row 1c)

Tier Yellow. Branch `fix/score-lands-with-ball`, built on row 1b (`fix/honest-momentum`, itself on
row 1a, PR #72). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine
goldens are untouched.

## Scope

The bug, re-verified at `86f7153` (row 1b head):

- `MatchPlayer.tsx:193` built the scoreboard, the HUD shot counts and the ticker from every beat
  `revealed` by the clock. A live goal is revealed when its staging starts.
- The ball reaches the net at progress 0.6 of the 2600 ms goal staging (`timeline.ts` `goalBall`),
  and the GOAL flash shows at 0.6 to 0.9 (`Broadcast.tsx:305`). So the score, the ticker, the
  polite live region (`MatchPlayer.tsx:444`) and the goal horn (`MatchPlayer.tsx:155`) called the
  goal about 1.56 s before the ball went in.
- The score had no status role. The live region repeated the newest ticker line on every change,
  several times a second in Quick view.

The fix:

- `SHOW` moves from `Broadcast.tsx` to `timeline.ts` with a new `GOAL_LANDS = 0.6`. `goalBall` and
  the GOAL flash read `GOAL_LANDS`, so the ball, the flash and the score share one number.
- `landed(beat, fired, now, staged)` in `player.ts`: a staged goal counts once
  `now - fired >= GOAL_LANDS * SHOW.goal`. Every other beat, and a goal that never fired (skip to
  full time), counts at once.
- `MatchPlayer` filters its shown beats through `landed`, so the score, both SoT counts, the
  ticker and the live region move together. `staged` is `motion && view === "live"`, so reduced
  motion and Quick count the goal at the beat start.
- The goal horn (and the opponent goal sound) plays when the goal lands. The scorer's typed move
  sound still plays at the strike. With no staging both play in the same frame, horn first.
- The score span gets `role="status"`. The role sits on the score, not the whole scoreboard,
  because a status region is atomic and the clock inside it changes every match minute.
- The live region announces every line not yet announced, oldest first, at most 3 lines, at most
  once every 1500 ms.

## Measurements

- Browser, live replay of the golden cup8 run's G1 at 390x844, score text by staging state up to
  the end of the first goal's GOAL flash (49', Talonflame).
  - RED build (`60f05e7`, tests only on top of 1b): `0 - 0`, then `1 - 0` before the move callout
    appears, `1 - 0` in flight, `1 - 0` at the flash.
  - Fix build (`ed2dec8`): `0 - 0` before, `0 - 0` in flight, `1 - 0` at the flash.
- Screenshots: `docs/reports/score-lands-with-ball/390-goal-in-flight.png` (0 - 0, 1 SoT, no goal
  line in the ticker) and `390-goal-landed.png` (1 - 0, 2 SoT, "49' Goal for Your XI! Talonflame").

## RED output (commit `60f05e7`, verbatim excerpts)

```
     × score reads 0-0 while progress is 0.5; 1-0 at 0.6 668ms
     × puts the score in a status region 89ms
     × announces whole event lines at most once every 1.5 s 467ms
 FAIL  src/components/matchday/__tests__/MatchPlayer.score.test.tsx > MatchPlayer score (catches a scoreboard, ticker and goal horn that call a goal about 1.5 s before the ball goes in) > score reads 0-0 while progress is 0.5; 1-0 at 0.6
AssertionError: expected '1 - 0' to be '0 - 0' // Object.is equality
 FAIL  src/components/matchday/__tests__/MatchPlayer.score.test.tsx > MatchPlayer score (catches a scoreboard, ticker and goal horn that call a goal about 1.5 s before the ball goes in) > puts the score in a status region
TestingLibraryElementError: Unable to find an accessible element with the role "status"
 FAIL  src/components/matchday/__tests__/MatchPlayer.score.test.tsx > MatchPlayer live region (catches a screen reader flooded several times a second in Quick view) > announces whole event lines at most once every 1.5 s
AssertionError: expected [ 'Kick off', …(4) ] to deeply equal [ 'Kick off', …(3) ]
      Tests  3 failed | 2 passed (5)
```

The reduced-motion and Quick cases passed at RED, as they should: the old code counted every goal
at once.

`e2e/score-lands-with-ball.spec.ts` on the RED build failed first on the missing status role. With
that one check removed it failed on the timing:

```
score snapshots to the first goal: [{"score":"0 - 0","flight":false,"flash":false},{"score":"1 - 0","flight":false,"flash":false},{"score":"1 - 0","flight":true,"flash":false},{"score":"1 - 0","flight":false,"flash":true}]
    -   "0 - 0",
    +   "1 - 0",
  1 failed
```

After RED, one change to the guard file: the live region gap check allows one 16 ms frame of
slack (`1500 - FRAME`), because the test samples once a frame. The first fix run measured 1488 ms.

## Product decisions applied

Section 2 decision 1 (Quick renders still) is row 1f. This row treats Quick as unstaged already,
so the score counts at the beat start there, as the row text asks.

## NOT RUN

- Hosted CI and the GLM review (the coordinator runs them).
- A physical phone check, and a real screen reader listening to the live region.
- Playwright at 360 and 320. The layout does not change.
