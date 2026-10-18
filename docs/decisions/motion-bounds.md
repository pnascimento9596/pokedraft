# Motion bounds (Wave 3, row 3-0)

Tier Yellow. Branch `fix/motion-bounds` off `bcf5493`. One code file changed,
`src/ui/matchday/timeline.ts`. No file under `src/engine`, `src/data` or `src/scouting` changed, so
the engine goldens are untouched.

## Scope

The hand-off row (section 4.3, "3-0 motion bounds") folds in three Wave 2 carryovers:

- At 2x a player moved 9.85% and the ball 8.84% of the pitch length in one frame, with no guard.
- Over 20 extra broadcast seeds the ball's worst open-play frame was 4.41%, above the 4% bound.
- Row 2c re-pinned row 2a's frame-loop positions from its own staging.

Files:

- `src/ui/matchday/timeline.ts`. `SETTLE.save` goes from 300 to 600 ms. A new `PARRY = 0.5` lets the
  parry carry the ball half way back toward open play. A duel's pass after the tackle leaves from
  where the winner won the ball, and its trail starts there too.
- `src/ui/matchday/__tests__/motion-bounds.test.ts` (new). The per-frame guards.
- `src/components/matchday/__tests__/Broadcast.frameLoop.test.tsx`. The painter and `stageFrame`
  parity pin, next to the existing literal pins, which stay.
- `e2e/continuous-ball.spec.ts`. A 2x case through the 59' save. Its sampling moves into helpers the
  two cases share.
- `docs/reports/motion-bounds/390-2x-after-save.png`. Browser proof.

## Row order

The coordinator kept the hand-off's recommended Wave 3 order (section 4.1). It moved the Green chore
(test flakes and the retained-replay check) to a fixed slot right after 3f. The chore must land
before Wave 6, and an "interleave whenever" slot risks it slipping.

## Measurements (measured first)

The metric is the largest move between two consecutive 60 Hz frames, as `hypot(dx, dy * 0.64)` in
percent of the pitch length. The `play` reducer runs at `PACE.live` with no manager stops, from
kickoff to the final whistle plus a 3 s tail, and `stageFrame` stages each frame with the match's
own windows, as `Broadcast.tsx` does. Walkers count by species. The shootout is excluded (its own
scene, row 2e). The 20 extra seeds are the broadcast seeds `sweep-0` to `sweep-19` that rows 2b, 2c
and 2d swept, over the six played golden cup8 matches (120 views per speed). They reproduce row 2c's
numbers exactly (4.41% worst ball, six views at or over 4%), so they are the same corpus. The
measuring scripts were throwaway, like rows 2b to 2d. The guards rerun the bounds.

Golden cup8 under `pd6.`, largest one-frame move per match:

| Golden cup8       | 0    | 1    | 2    | 3    | 4    | 5    |
| ----------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| Ball 1x, before   | 3.88 | 3.66 | 3.70 | 3.22 | 3.12 | 3.36 |
| Ball 1x, after    | 3.05 | 3.61 | 3.36 | 3.20 | 3.12 | 3.22 |
| Player 1x, before | 4.94 | 3.33 | 3.01 | 3.48 | 3.53 | 3.32 |
| Player 1x, after  | 3.33 | 3.33 | 3.01 | 3.48 | 3.53 | 3.32 |
| Ball 2x, before   | 8.84 | 7.22 | 7.40 | 6.32 | 5.62 | 6.72 |
| Ball 2x, after    | 5.67 | 5.78 | 6.77 | 5.91 | 5.09 | 5.28 |
| Player 2x, before | 9.85 | 6.26 | 5.38 | 6.01 | 6.97 | 5.84 |
| Player 2x, after  | 5.29 | 6.26 | 5.38 | 6.01 | 6.13 | 5.84 |

Sweep seeds, worst view per speed:

| Sweep, 120 views per speed | Before                       | After                       |
| -------------------------- | ---------------------------- | --------------------------- |
| Ball 1x                    | 4.41 (sweep-19, match 2), 6 views at or over 4 | 3.97 (sweep-17, match 3), none |
| Player 1x                  | 5.07 (sweep-18, match 0)     | 4.32 (sweep-0, match 5)     |
| Ball 2x                    | 8.14 (sweep-19, match 2)     | 7.27 (sweep-7, match 0)     |
| Player 2x                  | 10.07 (sweep-5, match 0)     | 7.65 (sweep-16, match 5)    |

Where each maximum occurs, before the fix:

- Golden player at 1x, 4.94: match 0 at 59.27', user slot 3, in the 59' save's settle (t 0.50 of
  300 ms). The save pulls the attacker up to the shot spot at x 78 while open play at 59' is a duel
  near the user's own goal. The gap from the save's last frame to resumed play is 66.3% of the pitch,
  and a 300 ms smoothstep carries it at up to 1.5 x 66.3 x 16.67 / 300 = 5.5% per frame.
- Golden player at 2x, 9.85: the same settle (59.36', t 0.56). It is twice the 1x outlier, as the
  hand-off guessed.
- Golden ball at 1x, 3.88: the same save at 59', staging progress 0.97. The parry flies from the
  goal mouth at x 98 back to open play's ball near x 8 over the last 0.35 of the staging (385 ms, 23
  frames), a steady 3.88% per frame.
- Golden ball at 2x, 8.84: the same parry. It steps 7.75% per frame at 2x, and the first settle frame
  adds open play's own move (59.06', settle t 0.00). This is not a duel turnover.
- Sweep ball at 1x, 4.41 (sweep-19, match 2, 2.95'): a duel phase at u 0.36, after the 0.24 tackle.
  All six views at or over 4% sit at u 0.325 to 0.44. The pass flies `lerp(fromSpot, toSpot, f)`,
  and `fromSpot` is the duel's winner. They start the phase where the turnover found them, far
  from their waypoint, and sprint at up to 3.8% per frame, so the ball inherits that run plus its
  own flight. The tackle window itself peaks near 2.7%.

After the fix, both golden 2x maxima are open play or a goal settle, about twice the matching 1x
frame. The largest settle gap over the golden cup and all 20 sweep seeds is 68.3% for a save and
75.5% for a goal. A 600 ms smoothstep carries 68.3 at up to 1.5 x 68.3 x 16.67 / 600 = 2.85% per
frame (analytic, from the measured gaps). The settle term alone stays under 4% at 1x for every save
in the corpus.

Browser, 390x844 in chromium, the new 2x case through the 59' save of group match 1: fastest 100 ms
speed 5.67% per 60 Hz frame at `2e7d125`, raw step 5.71%. The same case against a build with
`bcf5493`'s `timeline.ts` read 7.91% (raw step 8.81%), so it passes the 8 bound there too. The 1x
case read 2.23% (2.70% at row 2c).

## RED

Commit `e847c38`, the guard alone at `bcf5493`'s staging. `pnpm vitest run
src/ui/matchday/__tests__/motion-bounds.test.ts` (8 of 22 failed):

```
 ❯ src/ui/matchday/__tests__/motion-bounds.test.ts (22 tests | 8 failed) 15164ms
   ❯ motion bounds (catches the 59' save and duel passes jumping further in one frame than the 4% bound, 4.94% at 1x and 9.85% at 2x before) (22)
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-3 (catches a duel pass riding its sprinting winner, 4.41% before) 709ms
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-4 (catches a duel pass riding its sprinting winner, 4.41% before) 700ms
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-9 (catches a duel pass riding its sprinting winner, 4.41% before) 699ms
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-15 (catches a duel pass riding its sprinting winner, 4.41% before) 695ms
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-17 (catches a duel pass riding its sprinting winner, 4.41% before) 695ms
     × never moves the ball 4% of the pitch length or more in one 60 Hz frame at 1x on broadcast seed sweep-19 (catches a duel pass riding its sprinting winner, 4.41% before) 698ms
     × never moves a player 4% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup (catches the 59' save settle, 4.94% before) 699ms
     × at 2x never moves the ball or a player 8% of the pitch length or more in one 60 Hz frame, in any match of the golden cup (catches the 59' save, ball 8.84% and player 9.85% before) 381ms
AssertionError: expected [ { match: 2, ball: 4.32 } ] to deeply equal []
AssertionError: expected [ { match: 3, ball: 4.08 } ] to deeply equal []
AssertionError: expected [ { match: 1, ball: 4.27 } ] to deeply equal []
AssertionError: expected [ { match: 1, ball: 4.03 } ] to deeply equal []
AssertionError: expected [ { match: 5, ball: 4.29 } ] to deeply equal []
AssertionError: expected [ { match: 2, ball: 4.41 } ] to deeply equal []
AssertionError: expected [ { match: +0, player: 4.94 } ] to deeply equal []
AssertionError: expected [ { match: +0, ball: 8.84, …(1) } ] to deeply equal []
      Tests  8 failed | 14 passed (22)
```

The last failure in full reads `"ball": 8.84, "match": 0, "player": 9.85`. GREEN is `c434959`, 22 of
22. `d758f67` adds a floor to each guard (the largest move is over 2% at 1x and over 4% at 2x), so
a run that staged no play cannot pass an empty list. That version also fails 8 of 22 on `bcf5493`'s
staging and passes 22 of 22 at the fix.

Contract pin, not a RED guard: `364b537` adds the painter parity test. For three published frames
(open play at 6.5', the 12' goal in flight, and the settle after it at 2x) every player's transform
and the ball's style equal what `stageFrame` stages for the same clock and time. It passed at
`bcf5493`, because it guards a contract that already held. With the painter changed to paint the
rendered props instead of the feed's frame, it failed 3 of 3. The change was reverted.

## Product decisions applied

- Decision 1. Quick and reduced motion are unchanged. The fix runs only on the `motion` path, and
  the still path of `stagePitch` is untouched.
- Decision 3. No new number on the touchline.

## Implementation decisions

- **The 2x bound is 4% x speed.** The brief states the 4% bound at 1x only. At speed `s` the clock and
  every staging run `s` times as fast, so 4% per 1x frame is the same on-pitch speed per match minute
  as 8% per real frame at 2x. This reading is an implementation decision, not a loosened guard. The
  1x bound stays 4%, and every guard measures at an exact 60 Hz clock.
- **`SETTLE.save` 600 ms, the goal's length.** A grid over 600, 700 and 800 ms (with the parry and
  duel changes in place): 700 raised the sweep's worst player to 4.85% and 800 to 8.53%. When the
  settle is longer, a later shot fires while the earlier one still settles and takes the ball from
  it. 600 is the only tested length that clears every bound.
- **`PARRY = 0.5`.** The parry's flight covers half the gap over 385 ms, linear (0.0216 x gap per
  frame). The settle carries the other half over 600 ms on a smoothstep (0.0208 x gap per frame at
  its peak). The halves peak at about the same speed, which keeps the larger of the two lowest. The
  measured grid agrees within noise: sweep 1x ball worst 3.99, 3.97 and 3.94 at 0.4, 0.5 and 0.6;
  4.15 with the old full parry. The parry still falls toward open play (row 2b's decision); it gets
  there through the settle.
- **The duel's pass leaves from where the winner won the ball.** The release point is the winner's
  open-play spot at `phase.from + TACKLE` of the phase, plus `TOUCH` toward goal. That is exactly
  where the tackle's ease leaves the ball, so the flight starts with no step (before, it stepped
  1.6% back at u 0.24). The pass trail starts there too. The change is pure in `(beat, progress)`:
  one more `shapeAt` read per frame during a duel's flight.
- **Duels only.** In every other kind of phase the passer is the last receiver and starts near their
  waypoint. Only the duel's winner starts the phase where the turnover found them. Other passes keep
  their trails and their timing, so callouts do not move. Principle: Laziness Protocol (the
  smallest change the evidence supports).
- **The fix is not a speed clamp.** A clamp on the ball needs its last position, so it is not pure in
  `(beat, progress)`. Lengthening the 0.24 tackle window would not touch these frames, which all
  come after it. Principle: Fix Root Causes (each maximum traced to the beat and phase share that
  produced it before any change).
- **A 1x player guard on the golden cup at 4%.** Fix item 2 asks for the save settle under 4% at 1x.
  The existing 1x player guards stay at 6% (row 2c) and 5.5% (row 2f, tired). The sweep is not held
  to 4% for players: its 4.32% is an open-play sprint during a duel, and it reads 4.32% before the
  fix too.
- **Parity beside the literal pins.** The pins in `Broadcast.frameLoop.test.tsx` stay. The parity
  test proves row 2a's contract on its own, whatever the staged spots are. Its expected strings are
  built from the pitch geometry in the test, not from Broadcast's helpers.
- **The e2e 2x case is proof, not a RED guard.** Its 100 ms speed window smooths the parry's steady
  7.75% steps to 7.91%, under 8, on the old build. The unit guard at an exact 60 Hz clock is the RED
  one. The 8 bound stays the speed-aware one rather than a number tuned to fail the old build.

Principles cited: Fix Root Causes, Explain the Number (each maximum traced to a beat and a phase share,
and the settle term worked out from the measured gaps), Laziness Protocol, Test Behavior, Not
Implementation (the floors on each guard), Sequence Work into Verifiable Units (RED, the contract
pin, GREEN, then the browser case, each in its own commit).

## Brief vs code

- The hand-off reads the 2x ball maximum (8.84%) as twice the duel-turnover outlier (4.41%). At
  `bcf5493` the 8.84% is the golden 59' save's parry. The 4.41% is on the sweep seeds, not the golden
  cup, so the near-doubling is a coincidence. The 2x player maximum (9.85%) is twice the 1x save
  settle, as the hand-off guessed.
- The hand-off places the duel jumps in "the first 0.24 of the phase" and suggests lengthening that
  window or clamping speed. At `bcf5493` every sweep view at or over 4% falls at u 0.325 to 0.44, in
  the pass that follows the tackle. The tackle's ease peaks near 2.7%.
- The hand-off calls the save settle "a fixed short blend". Confirmed: a 300 ms smoothstep offset
  decay (`SETTLE.save`, `settleStage`). The parry inside the staging, which the hand-off does not
  name, is the ball's half of the same save.
- Code map items checked at `bcf5493`: `stageFrame` at `src/ui/matchday/player.ts:257`;
  `Broadcast.tsx` is 608 lines with `paint` at `:141`; the frame loop draws `feed?.latest() ?? props`
  in `useLayoutEffect`. `phaseAt` is not exported from `timeline.ts`.

## NOT RUN

- GLM review, hosted CI and the live production check (the coordinator runs them).
- The full Playwright suite (hosted CI runs it in eight shards). The 14 related matchday specs ran.
- 360 and 320 proof. No layout changed.
- A CPU-throttled run of the new 2x case. The 1x case's history (row 2b) shows the 100 ms window
  holds under 6x throttle; the 2x case has 2.3 points of margin to its bound.
- A performance trace. The duel flight adds one `shapeAt` call per frame. Not measured.
- A physical phone check (owner action).
- The row 2f tired table (every slot at 50 energy) re-measured. Its guard (players 5.5%, ball 4%)
  passes.

## Carryovers

- The pass landing still steps by `TOUCH` (1.6%) when the ball reaches the receiver's feet at
  `PASS_LANDS`. The next largest 1x sweep views after the fix (3.78% to 3.86%) sit at u 0.944, at
  that step. They are under the bound, but row 3b's 1.6x zoom magnifies them.
- A duel won by the player who keeps the ball (`fromSlot === toSlot`) carries it at the feet of a
  sprinting winner. That is the sweep's worst 1x view after the fix, 3.97% (sweep-17, match 3,
  72.96', a push-apart spike on the carrier), a 0.03 margin to the bound.
- A save's staging runs the shooter to the shot spot (x 78 or 22) from wherever open play has them,
  even when play is in the other half (the 59' save starts from a ball at x 8). That gap is why the
  settle has so much to carry. It is row 2b's design and unchanged here.
- Players at 1x on the sweep reach 4.32% in open play (sweep-0, match 5, 54.39'), the same as
  before. Only the 6% guard from row 2c bounds them.
