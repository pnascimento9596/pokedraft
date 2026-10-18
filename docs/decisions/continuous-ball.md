# Continuous ball (Wave 2 row 2b)

Branch `feat/continuous-ball` off `fe6d183`. UI staging only (Yellow). No file under `src/engine`,
`src/data` or `src/scouting` changed.

## Scope

- On a turnover the defender nearest the previous ball point wins it. The ball travels from where
  the old carrier had it to the winner over the first 0.24 of the phase (the tackle lead-in).
- Goal and save flights start from the live ball, never the centre spot. A shot that fires while
  the last one is still settling hands the ball over from where that one left it.
- Penalties start from the spot at x 89 (user) or 11 (opponent). Free kicks start from a fixed
  spot at x 75 or 25, a quarter of the pitch from goal.
- After staging, the pitch blends back into open play over 300 ms (save) or 600 ms (goal).
- After every goal both teams walk back to kickoff shape. The conceding side's outfield player
  nearest the centre spot takes the kickoff, and the plays generator starts the next phase from
  the centre with that side on the ball.

Files: `src/ui/matchday/timeline.ts`, `src/ui/matchday/player.ts` (`shotOnPitch`, `stageFrame`),
`src/ui/matchday/clock.ts` (`PACE.live.holdSave`), `src/components/matchday/Broadcast.tsx` (uses
`stageFrame`, imports `OPP_SHAPE`), the guard `src/ui/matchday/__tests__/continuous-ball.test.ts`,
updated pins in `src/ui/matchday/__tests__/timeline.test.ts`, and the browser proof
`e2e/continuous-ball.spec.ts`.

## RED

Commit `e7b7ece` (after the no-behaviour prefactor `a4e7e66`, which adds the `stageFrame` seam
the guard drives). `pnpm vitest run src/ui/matchday/__tests__/continuous-ball.test.ts`:

```
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-continuous-ball

 ❯ src/ui/matchday/__tests__/continuous-ball.test.ts (4 tests | 4 failed) 343ms
   ❯ continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before) (4)
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup 338ms
     × starts a penalty's flight where the ball is, then sets it on the drawn spot at 89 (catches a penalty run from the centre spot) 1ms
     × restarts from the centre spot with the conceding side's central midfielder on the ball (catches play that carries on in the box after a goal) 2ms
     × walks both teams back to kickoff shape over 600 ms after the goal (catches players snapping from the celebration) 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/ui/matchday/__tests__/continuous-ball.test.ts > continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before) > never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup
AssertionError: expected [ { match: +0, over: true }, …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "match": 0,
+     "over": true,
+   },
+   {
+     "match": 1,
+     "over": true,
+   },
+   {
+     "match": 2,
+     "over": true,
+   },
+   {
+     "match": 3,
+     "over": true,
+   },
+   {
+     "match": 4,
+     "over": true,
+   },
+   {
+     "match": 5,
+     "over": true,
+   },
+ ]

 ❯ src/ui/matchday/__tests__/continuous-ball.test.ts:96:41
     94|     expect(played).toEqual([0, 1, 2, 3, 4, 5]);
     95|     const jumps = played.map((i) => ({ match: i, over: maxBallJump(i) …
     96|     expect(jumps.filter((j) => j.over)).toEqual([]);
       |                                         ^
     97|   });
     98|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/ui/matchday/__tests__/continuous-ball.test.ts > continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before) > starts a penalty's flight where the ball is, then sets it on the drawn spot at 89 (catches a penalty run from the centre spot)
AssertionError: expected { x: 50, y: 50 } to deeply equal { x: 19.602339092116658, …(1) }

- Expected
+ Received

  {
-   "x": 19.602339092116658,
-   "y": 41.71760015016389,
+   "x": 50,
+   "y": 50,
  }

 ❯ src/ui/matchday/__tests__/continuous-ball.test.ts:110:47
    108|     const live = ballAt({}, 10_000);
    109|     expect(live).not.toEqual({ x: 50, y: 50 });
    110|     expect(ballAt({ [key]: 10_000 }, 10_000)).toEqual(live);
       |                                               ^
    111|     const set = ballAt({ [key]: 10_000 }, 10_000 + 0.35 * SHOW.goal);
    112|     expect(set.x).toBeCloseTo(89, 6);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/ui/matchday/__tests__/continuous-ball.test.ts > continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before) > restarts from the centre spot with the conceding side's central midfielder on the ball (catches play that carries on in the box after a goal)
AssertionError: expected { from: 50, to: 51.25, …(8) } to match object { from: 50, side: 'opp', …(2) }
(11 matching properties omitted from actual)

- Expected
+ Received

  {
    "from": 50,
-   "fromSlot": 6,
-   "kickoff": 49,
-   "side": "opp",
+   "fromSlot": 8,
+   "side": "user",
  }

 ❯ src/ui/matchday/__tests__/continuous-ball.test.ts:120:21
    118|     goalAt(timeline, 49);
    119|     const restart = timeline.plays[40]!;
    120|     expect(restart).toMatchObject({ from: 50, side: "opp", fromSlot: 6…
       |                     ^
    121|     const waiting = stageFrame(timeline, viewFor(0, { clock: 49.5, fir…
    122|     expect({ x: waiting.ball.x, y: waiting.ball.y }).toEqual({ x: 50, …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/ui/matchday/__tests__/continuous-ball.test.ts > continuous ball (catches the ball teleporting between frames, 78.0% of the pitch before) > walks both teams back to kickoff shape over 600 ms after the goal (catches players snapping from the celebration)
AssertionError: expected { x: 66.5439728450063, …(1) } to deeply equal { x: 74, y: 50 }

- Expected
+ Received

  {
-   "x": 74,
-   "y": 50,
+   "x": 66.5439728450063,
+   "y": 47.170556562328365,
  }

 ❯ src/ui/matchday/__tests__/continuous-ball.test.ts:138:52
    136|       stageFrame(timeline, viewFor(0, { clock, fired: { [key]: 0 }, no…
    137|     const midway = at(SHOW.goal + 300, 49.5);
    138|     expect({ x: midway.ball.x, y: midway.ball.y }).toEqual({ x: 74, y:…
       |                                                    ^
    139|     const settled = at(SHOW.goal + 600, 49.9);
    140|     expect({ x: settled.ball.x, y: settled.ball.y }).toEqual({ x: 50, …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed (4)
   Start at  23:47:38
   Duration  777ms (tests 49%, transform 31%, import 20%)

```

The restart guard's RED literal pinned `fromSlot: 6`. That was my hand calculation and it was
wrong: in 4-3-3 the holding midfielder (slot 5) stands nearer the centre spot than the left
central midfielder. The GREEN commit `0ea0c23` corrects the literal to 5 (and the waiting
carrier to slot 5). The test still asserts a literal, not a value computed by the code.

## Measurements

The metric is the ball's move between consecutive frames, as `hypot(dx, dy * 0.64)` in percent
of pitch length (the pitch is drawn 100 by 64). The `play` reducer runs at `PACE.live`, 1x, 60 Hz,
with no manager stops, from kickoff to the final whistle plus a 3 s tail. The penalty shootout is
excluded because it is its own scene (row 2e).

| Golden cup8 match | 0    | 1    | 2    | 3    | 4    | 5    | Worst    |
| ----------------- | ---- | ---- | ---- | ---- | ---- | ---- | -------- |
| Before (`fe6d183`) | 54.2 | 63.6 | 73.2 | 78.0 | 47.0 | 68.8 | **78.0** |
| After (`0ea0c23`)  | 3.82 | 3.87 | 3.74 | 3.19 | 3.27 | 3.81 | **3.87** |

Before, with the shootout included, match 5 reached 80.6 at the 120th minute switch to pens.

Robustness sweeps, measured with throwaway scripts and not part of the guard:

- 20 other broadcast seeds on the same cup: worst 4.21, with 4 of 120 match viewings at 4 or
  over.
- The Kanto golden fixture over 10 seeds: worst 4.13, with 1 of 40 at 4 or over.
- Every residual case is a forced long pass to a scorer or shooter right after a tackle.
- At 2x the per-frame moves roughly double. The guard pins 1x.

In the browser, at 390x844 in chromium, watching group match 1 live through its first goal and
the kickoff after it: 2,259 rendered frames, largest move between rendered frames 2.70% of pitch
length (2.70% scaled to one 60 Hz frame).

## Decisions

- **Shot channel separate from banners.** `shotOnPitch` picks the goal or save on the pitch from
  the fired beats and keeps it while it settles, independent of `activeBeat`. Banners, cards,
  injuries and subs keep their own timing. Principle: one seam per concern, so the settle cannot
  shorten or stretch a banner.
- **`PACE.live.holdSave` 900 to 1,100 ms**, equal to `SHOW.save`. Open play then resumes from the
  save's minute, as it does after a goal. Before, the clock restarted 200 ms before the save
  staging ended, and play had already run ahead when it released. The cost: each save holds the
  live clock 200 ms longer.
- **The parry falls into resumed play.** A save deflects the ball to where open play has it once
  the clock moves on, instead of a fixed corner. That removed a 28.2% jump where the fixed
  deflection flipped sides mid-staging.
- **Offset-decay settle, not a lerp.** The settle adds the gap between the last staged frame and
  resumed play, shrinking to zero on a smoothstep, to the live open-play frame. A plain lerp from
  a fixed point grew as play ran away from it.
- **Linear pass flight landing at 0.94 of the phase** (was ease-out to 0.86). This is the lowest
  top speed that still lands the pass, so long balls take more frames.
- **Duel receivers come from the nearest half of the winner's teammates.** The draws and their
  order are the same, but the pool is cut, so a won tackle no longer fires the ball the length of
  the pitch.
- **No assist priority on turnovers.** The brief says the nearest defender wins it. Routing the
  tackle to the eventual assister caused 6.8% jumps.
- **Kickoff shape.** The taker stands 1.6 behind the centre spot. Everyone else keeps their
  formation point clamped to their own half (x 46 or below for the user, 54 or above for the
  opponent).
- **Shootout excluded from the guard.** The shootout is staged kick by kick from the spot at 89,
  which was already in place from row 1g. Its continuity is row 2e.
- **Free-kick spot is not exercised by golden data.** No golden goal is a free kick, so
  `freeKickSpot` is covered by its definition only.

`GOAL_LANDS` (0.6) is unchanged.

## NOT RUN

- The full local Playwright suite. Run locally: `e2e/continuous-ball.spec.ts`, the two mobile
  specs, and the matchday specs listed in STATE.md. Hosted CI runs every shard.
- The GLM review and the live production check (coordinator).
- Browser proof at 360 and 320. No layout changed.
- A guard at 2x.
