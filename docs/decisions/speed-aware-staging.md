# Speed-aware staging (Wave 1, row 1e)

Tier Yellow. Branch `fix/speed-aware-staging`, built on row 1d (`fix/injury-staging`, head
`d3683c2`). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine goldens
are untouched.

## Scope

The bug, re-verified at `d3683c2`:

- `tick` holds the clock on a goal for `holdGoal / speed` (`player.ts`), 1300 ms at 2x.
- `activeBeat` staged every beat for `SHOW[kind]` whatever the speed, 2600 ms for a goal. At 2x
  play resumed halfway through the goal staging, with the ball still in the net.
- Carry-in from row 1c: `landed` counted a staged goal at `0.6 * SHOW.goal` (1560 ms) after it
  fired. At 2x the ball crosses the line at 780 ms, so the score would land 780 ms late once the
  staging is sped up.

The fix:

- `activeBeat(timeline, fired, now, motion, clock, speed)` divides `SHOW` by `speed`, both for the
  staging length and for the row 1d handoff from an injury to its replacement.
- `landed(beat, fired, now, staged, speed)` counts a staged goal at `0.6 * SHOW.goal / speed`.
- `MatchPlayer` passes `state.speed` to both, and `Broadcast` takes a `speed` prop.

## RED output (commit `a8795fd`, verbatim excerpts)

```
     × at 2x the goal beat ends when its hold ends 423ms
     × at 2x the score lands with the ball: 0-0 at progress 0.49, 1-0 at 0.62 284ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected true to be false // Object.is equality
AssertionError: expected '0 - 0' to be '1 - 0' // Object.is equality
      Tests  2 failed (2)
```

## Measurements

- Browser, live replay of the golden cup8 run's G1 at 390x844 and 2x. The move callout covers 0.25
  to 1 of the goal staging, so it should be on screen for 975 ms at 2x and 1950 ms at 1x.
  - Pre-fix build (row 1d, `3130f82`): 1967 ms. The spec failed on `< 1300`.
  - Fix build (`4ad326e`): 983 ms. The score read `0 - 0` until the GOAL flash and `1 - 0` with it.
- Screenshot: `docs/reports/speed-aware-staging/390-2x-goal-landed.png` (49', 1 - 0, GOAL flash,
  2x on).

## Product decisions applied

None of section 2 applies. The row is display only.

## NOT RUN

- Hosted CI, the GLM review and a physical phone check.

## Carryover

- Toggling speed in the middle of a beat rescales that beat's progress at once, so the staging can
  jump forward or back by up to half its length. Not measured on screen.
