# Set pieces from goalKind (Wave 2 row 2d)

Branch `feat/set-pieces` off `458c56e`. Matchday staging only (Yellow). No file under `src/engine`,
`src/data` or `src/scouting` changed, so the engine's goal kinds and outcomes are untouched and the
goldens pass unchanged.

## Scope

The kind comes from `Beat.goalKind`, which `buildTimeline` sets from the engine's `GoalEvent.kind`
and falls back to `"penalty"` or `"open-play"` from the `penalty` flag for engines that recorded no
kind (`src/ui/matchday/timeline.ts`, the `goalKind:` line in the goal beats loop). In-match penalties
only. The shootout is row 2e.

`stageGoal` in `timeline.ts` stages a goal by kind. Every kind starts from the live ball, strikes at
0.35 of the 2,600 ms staging and has the ball over the line at `GOAL_LANDS` (0.6), so the score still
lands with the ball.

- **Penalty.** Everyone but the taker and the keeper stays where they stood (the clock holds on the
  goal's minute through the staging). The ball rolls from the live ball to the spot at 89 (11) by
  0.18 while the taker walks to a run-up 5 behind it, steps up to the ball by 0.27, pauses until
  0.35, then kicks.
- **Free kick.** Same rhythm from the fixed spot at 75 (25). The three defending outfield players
  nearest the spot walk into a wall 9 toward goal at y 46, 50 and 54 by 0.18 and stand still. The
  shot flies a quadratic curve that bows 14 off the line (7 at its midpoint), and the trail draws
  that curve through `BallTrail.via`.
- **Header.** The ball goes from the live ball out to the near wing (x 84, y 12 or 88) by 0.2, to the
  recorded assister, or to the attacker nearest the wing when there is none. The cross then curls
  in to the meeting point (x 88, y within 8 of the middle) and the scorer meets it there at
  loft 0.85, which then falls to 0 at the line. The cross trail has kind `"cross"`.
- **Solo.** The scorer gathers the ball by 0.1 and dribbles a chain of four touches to the shooting
  spot. The defending outfield player nearest the run's midpoint steps into it by 0.2 (pose
  `press`), and the scorer swerves 5 around them. The trail has kind `"dribble"`.
- **Open play.** Unchanged.
- **Quick and reduced motion** (decision 1) keep the still frame: no trail, no wall, the ball in the
  net.

Files: `src/ui/matchday/timeline.ts` (`stageGoal`, the goal branch of `stagePitch`, two pose rules
for the wall and the beaten defender, `BallTrail.via` and the `"cross"` kind),
`src/components/matchday/Broadcast.tsx` (one line: the trail path bends through `via` when given),
the guard `src/ui/matchday/__tests__/set-pieces.test.ts`, and the browser proof
`e2e/set-pieces.spec.ts`. `player.ts` needed no change.

## Real goals the guards use

| Kind      | Run (engine 6)  | Match       | Goal                                  |
| --------- | --------------- | ----------- | ------------------------------------- |
| Solo      | golden cup8     | 0 (G1)      | 49', Talonflame (user)                |
| Header    | golden cup8     | 3 (R32)     | 9', Talonflame from Tapu Koko (user)  |
| Penalty   | golden cup8     | 3 (R32)     | 84', Zeraora (user)                   |
| Header    | golden cup8     | 5 (QF)      | 37', Talonflame for the opponent      |
| Free kick | golden kanto151 | 3 (R32)     | 17', Bulbasaur (user)                 |

Every kind is reached by a pinned replay in the browser too. No kind is unreached.

## RED

Commit `77a9454`, after the no-behaviour prefactor `4540e14` (the `via` field and `"cross"` kind,
and Broadcast reading `via`; nothing set either yet).
`pnpm vitest run src/ui/matchday/__tests__/set-pieces.test.ts`:

```

 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-set-pieces

 ❯ src/ui/matchday/__tests__/set-pieces.test.ts (7 tests | 4 failed) 92ms
   ❯ set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot) (7)
     × penalty: the shape freezes, Zeraora walks the ball to the spot, steps up, pauses, then kicks from 89 (catches a penalty struck on the run before the taker reaches the ball) 10ms
     × free kick: exactly three defenders form a wall between the spot at 75 and goal, and the shot curls (catches a free kick flying straight through the defence) 2ms
     × header: Tapu Koko's cross from the wing, and Talonflame meets it at loft 0.85 (catches a header struck off the grass) 1ms
     × solo: Talonflame dribbles a chain of touches past the defender who steps in (catches a solo goal staged as a pass) 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/ui/matchday/__tests__/set-pieces.test.ts > set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot) > penalty: the shape freezes, Zeraora walks the ball to the spot, steps up, pauses, then kicks from 89 (catches a penalty struck on the run before the taker reaches the ball)
AssertionError: expected 76.50128249717415 to be close to 89, received difference is 12.498717502825855, but expected 5e-7
 ❯ expectNear src/ui/matchday/__tests__/set-pieces.test.ts:91:21
     89| function expectNear(actual: Point | undefined, expected: Point, digits…
     90|   expect(actual).toBeDefined();
     91|   expect(actual!.x).toBeCloseTo(expected.x, digits);
       |                     ^
     92|   expect(actual!.y).toBeCloseTo(expected.y, digits);
     93| }
 ❯ src/ui/matchday/__tests__/set-pieces.test.ts:117:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/ui/matchday/__tests__/set-pieces.test.ts > set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot) > free kick: exactly three defenders form a wall between the spot at 75 and goal, and the shot curls (catches a free kick flying straight through the defence)
AssertionError: expected [] to deeply equal [ 3, 5, 9 ]

- Expected
+ Received

- [
-   3,
-   5,
-   9,
- ]
+ []

 ❯ src/ui/matchday/__tests__/set-pieces.test.ts:142:20
    140|         : [],
    141|     );
    142|     expect(inWall).toEqual([3, 5, 9]);
       |                    ^
    143|     expectNear(point(set, "opp", 3), { x: 84, y: 46 });
    144|     expectNear(point(set, "opp", 9), { x: 84, y: 50 });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/ui/matchday/__tests__/set-pieces.test.ts > set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot) > header: Tapu Koko's cross from the wing, and Talonflame meets it at loft 0.85 (catches a header struck off the grass)
AssertionError: expected 'pass' to be 'cross' // Object.is equality

Expected: "cross"
Received: "pass"

 ❯ src/ui/matchday/__tests__/set-pieces.test.ts:161:31
    159|     expect(at(400).ball.carrier).toMatchObject({ side: "user", slot: 6…
    160|     const cross = at(650);
    161|     expect(cross.trail?.kind).toBe("cross");
       |                               ^
    162|     expectNear(cross.trail?.from, { x: 84, y: 12 });
    163|     expect(cross.ball.carrier).toMatchObject({ side: "user", slot: 8 }…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/ui/matchday/__tests__/set-pieces.test.ts > set pieces staged from goalKind (catches every goal kind staged as the same run onto a shot) > solo: Talonflame dribbles a chain of touches past the defender who steps in (catches a solo goal staged as a pass)
AssertionError: expected 'pass' to be 'dribble' // Object.is equality

Expected: "dribble"
Received: "pass"

 ❯ src/ui/matchday/__tests__/set-pieces.test.ts:179:29
    177|     for (const age of [260, 520, 780]) {
    178|       const s = at(age);
    179|       expect(s.trail?.kind).toBe("dribble");
       |                             ^
    180|       expect(s.ball.carrier).toMatchObject({ side: "user", slot: 8 });
    181|       expect(lengthwise(ballOf(s), point(s, "user", 8))).toBeLessThan(…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
   Start at  01:26:43
   Duration  461ms (transform 43%, import 34%, tests 23%)

```

The penalty guard's freeze assertions passed at RED, because the clock already holds through a
goal. The step-up and the pause failed it. The landing, still-motion and free-kick continuity guards
pin behaviour this change must keep, so they passed at RED and still pass. GREEN: `39c3c07`.

## Measurements

The ball's largest move between consecutive frames, as `hypot(dx, dy * 0.64)` in percent of pitch
length, at `PACE.live`, 1x, 60 Hz, kickoff to the final whistle (the same metric as
`continuous-ball.md`).

Golden runs, whole match, after (`39c3c07`):

| Run      | 0    | 1    | 2    | 3    | 4    | 5    |
| -------- | ---- | ---- | ---- | ---- | ---- | ---- |
| cup8     | 3.82 | 3.56 | 3.74 | 3.07 | 3.04 | 3.50 |
| kanto151 | 3.59 | 3.39 | 3.91 | 3.19 |      |      |

Inside each set piece's staging on the golden runs, at `39c3c07`: cup8 solo 49' 2.04, header 9'
1.14, penalty 84' 1.11, opponent header 37' 1.03; kanto151 free kick 17' 1.00, headers 6' 1.21 and
83' 2.06.

Sweep of 20 other broadcast seeds (`sweep-0` to `sweep-19`) over the 10 golden matches, 200 match
viewings, worst move inside a goal's staging per kind, measured with a throwaway script:

| Kind      | Before (`458c56e`) | After |
| --------- | ------------------ | ----- |
| Solo      | 2.35               | 3.67  |
| Header    | 2.41               | 2.45  |
| Penalty   | 1.47               | 2.86  |
| Free kick | 0.97               | 0.97  |
| Open play | 2.77               | 2.77  |

The four viewings at or over 4 (worst 4.17, at 87.9' and 74.1') are open-play residuals from row
2b and read the same before and after.

The first build eased the ball onto the spot, the wing and the scorer's feet with a smoothstep.
That peaks at 1.5 times the average speed and reached 4.67 (solo) and 4.28 (penalty) in the sweep.
A linear roll keeps the arrival times and brought them to 3.67 and 2.86.

Browser, 390x844 with touch, chromium: `e2e/continuous-ball.spec.ts` sampled 2,254 frames, largest
rendered move 2.70%, fastest over 100 ms 2.68% per frame (its bound is 6).

## Decisions

- **One staging function keyed by kind.** `stageGoal` switches on `goalKind` and returns the ball,
  loft, carrier, trail, the wall and the beaten defender. The goal branch of `stagePitch` shrinks to
  a call. Principle: model the domain (a table of kinds, not flags threaded through one path).
- **The defender a solo run beats is the one nearest the run.** The open-play phase's presser can
  stand behind the scorer at the goal's minute (G1 49': slot 6 at x 43.4, the scorer at 56.6), so
  "past the presser" would read backwards. The defending outfield player nearest the run's midpoint
  steps in instead (slot 3 there).
- **The recorded assister delivers the cross.** When the engine names an assist, that player takes
  the ball wide, even from far away, so the pitch never credits someone else. Only an unassisted
  header uses the attacker nearest the wing.
- **The cross goes to the wing on the live ball's side,** so the ball's first leg stays short.
- **The wall forms from the three outfield players nearest the spot,** ordered by where they stood
  so they never cross. The keeper never joins it.
- **`STRIKE` (0.35) and `GOAL_LANDS` (0.6) stay shared** by every kind, so `landed()` and the goal
  horn need no change.
- **Broadcast stays thin.** Its only change reads the trail's `via` control point. Row 2a moves
  that path into a `trailPath` helper; the merge carries the same one-line rule there.

## NOT RUN

- The full local Playwright suite. Run locally: `set-pieces`, `continuous-ball`,
  `score-lands-with-ball`, `speed-aware-staging`, `watch-live`, `callouts-type-effects`,
  `quick-not-broadcast`, `one-shared-timeline`, `mobile-targets` and `mobile-acceptance`. Hosted CI
  runs every shard.
- A continuity guard at 2x. The guards pin 1x, as row 2b's do.
- Browser proof at 360 and 320. No layout changed.
- The GLM review, the merge and the live production check (coordinator).
- A physical phone check (owner action).
