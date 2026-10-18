# Smooth movement (Wave 2, row 2c)

Tier Yellow. Branch `feat/smooth-movement` off `458c56e`, with `origin/main` merged in at `85b292e`
(PR #92, shootout). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine
goldens are untouched. The pens block of `stagePitch` (row 2e) is untouched.

## Scope

Re-verified at `458c56e`:

- Open play lerped each player from the phase's start shape to its waypoint with smoothstep. Every
  player stopped dead at every phase boundary (velocity zero at both ends).
- Pose and facing came from displacement since the phase started, so a player who had turned kept
  facing the old way until the next phase.
- Nothing kept teammates apart. 31.9% of sampled open-play frames had a same-side pair closer than
  4% of the pitch length. The kickoff shape clamped two central players onto one spot.
- A red-carded or substituted player vanished on the frame of the beat.

The change, all in pure staging (`src/ui/matchday/timeline.ts`, `player.ts`):

- Open play is a uniform Catmull-Rom spline through waypoints i-1, i and i+1, as cubic Hermite
  with tangent (next - prev) / 2 per phase. Every phase is 1.25 minutes, so the curve is C1 in
  time. Tangents are zero into and out of a kickoff and at phase 0.
- Pose and facing come from a backward finite difference over 0.02 minutes of the open-play path.
  Sprint above 7.2, run above 2 (pitch percent per minute); facing follows sideways speed above 1.
- One push-apart pass per side, Gauss-Seidel in slot order, in lengthwise space (y scaled by 0.64).
  Each player of a pair under 4% takes half the shortfall, faded by `min(1, d / 2)`.
- The kickoff shape squeezes each side's depth in order (past 36, depth beyond it shrinks by 7)
  instead of clamping to 46/54, so no two players share a spot.
- `walksAt` in `player.ts` times walks from the fired time of sub and red-card beats, scaled by
  speed, over `WALK = 1800` ms. A player going off leaves from their spot at the beat's minute in a
  straight line to the nearer touchline (chosen from the formation slot). A substitute walks on
  from the bench. `PitchStage.leaving` carries the walkers; `Broadcast.tsx` renders them after the
  slot players with `data-leaving`.
- The goal assist and both keepers ease in over the first 20% of the staging instead of snapping.
- An injured player stays down where the injury found them.

## RED output (verbatim excerpts)

RED 1, commit `9b8a0ca` (6 of 7 failed; the still pin passed):

```
 ❯ src/ui/matchday/__tests__/smooth-movement.test.ts (7 tests | 6 failed) 396ms
AssertionError: expected -0.00046126956476655323 to be close to -16.87, received difference is 16.869538730435234, but expected 0.05
AssertionError: expected { facing: 'right', pose: 'sprint' } to deeply equal { facing: 'left', pose: 'sprint' }
AssertionError: expected [ 'user 0-2 2.79', 'user 6-9 3.72' ] to deeply equal []
AssertionError: expected [] to deeply equal [ { side: 'user', slot: 2, …(2) } ]
AssertionError: expected [] to deeply equal [ { slot: 7, species: 175, y: 11.77 } ]
AssertionError: expected [ { match: +0, over: true }, …(5) ] to deeply equal []
      Tests  6 failed | 1 passed (7)
```

RED 2, commit `8fa9c1f` (2 of 9 failed):

```
     × parts the kickoff shape too, where two central players used to share one spot (catches a stacked kickoff after a goal) 4ms
     × leaves a sub the clock skipped past in their slot, not waiting on the touchline (catches substitutes stranded at the bench after Skip) 2ms
AssertionError: expected [ 'user 8-10 0.00' ] to deeply equal []
AssertionError: expected [ …(2) ] to deeply equal []
      Tests  2 failed | 7 passed (9)
```

RED 3, commit `a846a3f` (1 of 10 failed), found by the browser proof:

```
     × walks a red-carded player straight off from where the card found them while the clock runs on (catches the walker drifting 7% sideways with play they left) 5ms
AssertionError: expected [ { x: 10.15, y: 31.12 } ] to deeply equal [ { x: 17.2, y: 28.29 } ]
      Tests  1 failed | 9 passed (10)
```

## Measurements

Largest move of one player between two 60 Hz frames, live pace at 1x, kickoff to full time, golden
cup8 under `pd6.`, in percent of the pitch length (y scaled by 0.64). Walkers count by species.

| Match         | 0    | 1     | 2    | 3    | 4    | 5     |
| ------------- | ---- | ----- | ---- | ---- | ---- | ----- |
| Before 458c56e | 7.22 | 19.82 | 7.67 | 8.40 | 6.28 | 35.08 |
| After          | 4.94 | 3.33  | 3.01 | 3.48 | 3.53 | 3.32  |

- The 4.94 residual is the 300 ms save settle from row 2b (match 0, 59.27', user slot 3).
- Ball, same run: before 3.82, 3.56, 3.74, 3.07, 3.04, 3.50; after 3.88, 3.66, 3.70, 3.22, 3.12,
  3.36. Every match stays under the 4% unit bound from row 2b.
- At 2x (no guard): player worst 35.05 before, 9.85 after; ball worst 8.29 before, 8.84 after.
- Crowding, 17,400 sampled open-play frames: a same-side pair under 4% in 31.9% of frames before
  and 7.4% after; under 3%, 20.2% and 2.6%; under 2%, 8.7% and 1.0%.
- Sweep over 20 other broadcast seeds (120 views): ball worst 4.17 with 4 views over 4% before,
  4.41 with 6 over after; player worst 66.31 before, 5.07 after. Every view over 4% is a duel
  turnover phase, the class row 2b documented.
- Browser at 390x844 (chromium, page clock): the QF walker read y 30.55, 26.70, 17.81, 7.92 every
  400 ms at a fixed x, then left. G1 at 38' had its nearest same-side pair at 4.00%. The row 2b
  spec read the ball's fastest 100 ms speed at 2.70% per frame.

## Decisions

- The push fades with distance (`min(1, d / 2)`). When two teammates' paths cross, a full-strength
  push flips them across each other in one frame (a 4.63% ball step). A continuous push cannot
  hold 4% through a crossing, so the guard pins 4% at a sampled clock, not every frame.
- The kickoff squeeze keeps slot order. A clamp at 44/56 still stacked two central players.
- Walk timers come from fired beat times, not the active banner. A card banner over a sub used to
  cut the walk on short with a 30% snap.
- `WALK / speed`: 1800 ms at 1x, 900 ms at 2x, so 2x stays twice as fast throughout.
- The walker goes to the nearer touchline from the formation slot, so the edge never flips while
  they walk.
- A walker leaves from the beat's minute in a straight line. The browser showed them tracking the
  slot's open-play spot, 7% sideways in 300 ms. An injured player stays down at the injury's spot,
  so the walk off does not jump when the replacement comes on. The ball still follows play.
- The substitute waits on the touchline only while the clock stands exactly on the sub's minute. A
  sub the clock skipped past (Skip) never walks.
- Keeper and assist snaps ease over 20% of the staging. The row text does not name them, but they
  were the largest per-frame jumps left after the spline.
- Velocity reads the open-play path (spline plus push), not the staged point, so a set piece does
  not flip facing.
- Decision 1 holds: Quick and reduced motion get no walks, stand on their slots and do not move
  between frames.

## NOT RUN

- GLM review (the coordinator runs it).
- The full Playwright suite (hosted CI runs it in eight shards).
- A physical phone check.
- 360 and 320 proof. No layout changed.
- A per-frame guard at 2x.
