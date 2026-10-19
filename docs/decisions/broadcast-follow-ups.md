# Broadcast follow-ups

Wave 3 row 3k, Yellow, size S. Branch `feat/broadcast-follow-ups` off `8247f20`. The row bundles
four carryovers from Waves 1 and 2, plus a fifth test-only item the coordinator added mid-row. No
file under `src/engine`, `src/data` or `src/scouting` changed. `MatchPlayer.tsx` is untouched.

Files:

- `src/ui/matchday/timeline.ts`: the build-up share and the callout gap scale by match length.
- `src/ui/matchday/cutin.ts`: new `stillCutInAt`, the cut-in with motion off.
- `src/components/matchday/Broadcast.tsx`: picks `cutInAt` or `stillCutInAt` by `motion`.
  `screenKey` now takes the cut-in itself instead of the `cutIns` flag.
- `src/ui/matchday/__tests__/timeline.test.ts`, `src/components/matchday/__tests__/Broadcast.cutin.test.tsx`:
  the guards.
- `e2e/broadcast-follow-ups.spec.ts` (new), `e2e/score-lands-with-ball.spec.ts`.
- `src/components/matchday/__tests__/MatchPlayer.haptics.test.tsx`: item 5.

## RED

Commit `cb990d0`. `pnpm vitest run src/ui/matchday/__tests__/timeline.test.ts src/components/matchday/__tests__/Broadcast.cutin.test.tsx`:
2 failed, 31 passed of 33.

```
     × a pinned extra-time match yields between 10 and 18 open-play callouts (catches 120' matches calling 21, a third more than 90' ones) 11ms
     × shows the key duel's card, still, with reduced motion (catches reduced motion dropping the duel card it keeps for goals) 9ms
 FAIL  src/components/matchday/__tests__/Broadcast.cutin.test.tsx > cut-ins (catches a big lower-third card that is missing on a goal, or shows for an ordinary pass) > shows the key duel's card, still, with reduced motion (catches reduced motion dropping the duel card it keeps for goals)
AssertionError: expected null not to be null
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > callout budget (catches open play that calls a move on most phases instead of the big moments) > a pinned extra-time match yields between 10 and 18 open-play callouts (catches 120' matches calling 21, a third more than 90' ones)
AssertionError: expected 21 to be less than or equal to 18
 Test Files  2 failed (2)
      Tests  2 failed | 31 passed (33)
```

The fix is commit `e2aef96`. The companion check "with reduced motion the duel's goal takes the card over once it fires"
passed at RED, as a constraint should.

`e2e/broadcast-follow-ups.spec.ts` on a `cb990d0` build (`CI=1`, chromium) failed 1 of 1, on
both attempts: `page.waitForFunction: Timeout 90000ms exceeded`, because no duel card ever drew.

## 1. Extra-time callouts (2g carryover)

### Measured at the head before the fix

Scratch script over real cups, as row 2g measured them: `cup8`, formations 4-2-3-1, 4-3-3 and
4-4-2, seeds `a1` to `f6`, every pick the first offer, movesets loaded. 504 played matches.

| Open-play callouts per match | n | mean | min | p10 | median | p90 | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 90', before | 460 | 13.54 | 7 | 11 | 14 | 16 | 19 |
| 120', before (`8247f20`) | 44 | 17.32 | 14 | 15 | 17 | 21 | 23 |
| 120', option A (share and gap) | 44 | 13.34 | 11 | 12 | 13 | 16 | 20 |
| 120', option B (gap only) | 44 | 13.64 | 11 | 12 | 13 | 16 | 21 |
| 90', after | 460 | 13.54 | 7 | 11 | 14 | 16 | 19 |

The hand-off said "about 20". The measured mean was 17.32, with 9 of 44 matches at 20 or more.

### Fix

`length = finalMinute / 90`. The build-up share becomes `BUILD_UP_SHARE / length` and the gap
`CALLOUT_GAP * length`. A 90' match has `length` 1, so its callouts are unchanged; the 460
90' rows above are identical, and the pinned 90' guard still reads 12. The build-up roll is the
same `playRng` draw as before, so the choreography does not move. Key duels stay outside the
budget, as row 2g decided: they lead straight to a shot.

Option A was chosen over B because it scales both parts of the rate, which is what "scale the
per-phase rate by 90 / finalMinute" asks, and it lands the 120' mean closest to the 90' one.

Pinned guard: seed `d3`, 4-3-3, match index 3 (a 120' match, 96 phases). 21 callouts before, 15
after. The one match still above 18 is `d5`, 4-3-3, match index 3, at 20: 11 of its calls are key
duels, which the budget does not limit.

## 2. Reduced motion and key-duel cards (2g carryover)

### Check first

Reduced motion does show goal and save cut-ins. Row 2g pins it ("still shows the goal card,
unanimated, with reduced motion in a live match" in `Broadcast.cutin.test.tsx`, and
`callouts-type-effects.spec.ts` in a browser). With motion off `activeBeat` returns the last
fired beat at progress 1 (`player.ts`), so a goal or save card shows still and holds until the
next beat. Key-duel cards came only from `stage.playCallout`, which `stagePitch`'s motion-off
branch always sets to null. So the hand-off's first branch applies: show key-duel cards the same
static way.

### Fix

`stillCutInAt(timeline, active, clock)` finds the key-duel phase on the clock (`from <= clock <
to`). Its card shows until a beat fired after the phase began (the goal or save it leads to) takes
over. Otherwise it falls back to `cutInAt(active, null)`, the old goal and save cards. The pitch
badge stays off with reduced motion, as before; only the lower-third card shows. Broadcast with
motion off renders on MatchPlayer's commits, every 100 ms, so the card appears within one commit
of the phase.

Browser proof (`CI=1`, chromium, 390x844, reduced motion): the golden G1's first key duel at 2',
"KEY DUEL | Remoraid used Hyper Beam! | Normal", `animation-name: none`, no pitch badge. The
spec pauses in the same task that draws the card, so the screenshot shows it:
`docs/reports/broadcast-follow-ups/390-duel-cut-in-reduced-motion.png`.

## 3. Short trail on a missed penalty (Wave 1 carryover)

Does not reproduce. Closed.

The carryover from row 1i (`mobile-pitch-fixes.md`) said a missed penalty's ball ended at
`x: 91 / 9`, 2 units from the spot, so the miss drew a short trail. Row 2e's `stageKick`
(`src/ui/matchday/shootout.ts`) now aims every miss at the keeper on the goal line (`lineX`, 97
or 3) and draws the trail from the spot to there. Only the ball parries back to 91 or 9; the
trail stays at full length. In-match penalties have no miss to stage: the engine records goals
and saves only.

Command: `pnpm exec tsx <scratch>/miss-cup.ts`, which stages every shootout kick of the same 108
cups as above through `stagePitch` at `kickProgress` 0.9. Output:

```
seed a3 4-2-3-1 match 4 kick 0 (user) missed: trail 89,50 -> 97,55.00 length 9.43, ball at 91.94
seed a3 4-2-3-1 match 4 kick 1 (opp) missed: trail 11,50 -> 3,45.00 length 9.43, ball at 8.06
staged trail length at kickProgress 0.9: goals n 294, min 11.18, max 11.18; misses n 87, min 9.43, max 9.43
```

A miss draws 9.43 units against a goal's 11.18. `shootout-suspense.spec.ts` passed at the head.

## 4. `score-lands-with-ball.spec.ts` polling (Wave 1 carryover)

### Brief vs code

The hand-off says "the same deterministic clock control". `speed-aware-staging.spec.ts` does not
control the clock; since #79 it waits with `page.waitForFunction` on the frames its own
`MutationObserver` logged, instead of `toBeVisible` polls. The conversion copies that.

### Change

The spec already logged score snapshots. Its three visibility waits (`move-callout` visible,
`goal-flash` visible, `goal-flash` hidden) became waits on that log: a frame with the callout in
flight, a frame with the flash, and a `flashGone` flag the observer sets on the first frame
after the flash. The assertions are unchanged.

### Measured

The old flake did not reproduce here. Temporary copies of the old and new spec with a 6x CDP CPU
throttle, `--repeat-each 4`, on a build of `f930146`: old 4 of 4 passed, new 4 of 4 passed (both
about 37 s a run). The copies were deleted. At normal speed the new spec passed at `632d117` and
`099ddc7`, logging `0 - 0` in flight and `1 - 0` at the flash.

## 5. `MatchPlayer.haptics.test.tsx` hosted timeouts (added by the coordinator)

### RED is the hosted run

It does not reproduce locally, so, as in `test-chores.md` (#100), the RED is the hosted
failure. Run 39178857787 (PR #108), attempt 1, `pnpm test --maxWorkers=4`:

```
 ❯ src/components/matchday/__tests__/MatchPlayer.haptics.test.tsx (8 tests | 2 failed) 67286ms
 FAIL  src/components/matchday/__tests__/MatchPlayer.haptics.test.tsx > haptics (catches a phone that buzzes for the wrong side, twice for one event, or with sound and haptics off) > the final whistle buzzes one long pulse, once, and a pause and resume buzzes nothing again
Error: Test timed out in 15000ms.
 FAIL  src/components/matchday/__tests__/MatchPlayer.haptics.test.tsx > haptics (catches a phone that buzzes for the wrong side, twice for one event, or with sound and haptics off) > no vibrate when the toggle is off
Error: Test timed out in 15000ms.
```

Attempt 2 of the same run passed, with the file at 37,175 ms. The hosted log prints no per-test
duration for passing tests.

### Fix

The file stepped 16 ms frames through whole matches, one `act` each, up to 12,000 of them. Two
changes, the pattern row 3g measured on `MatchdayFlow.intel.test.tsx` (commits `632d117`, then
`5e4b90d`):

- `beforeEach` fakes only `performance`, `setTimeout` and `clearTimeout`, and stubs
  `requestAnimationFrame` with a 100 ms `setTimeout` (`cancelAnimationFrame` with
  `clearTimeout`). 100 ms is the largest `dt` the frame loop takes (`Math.min(100, t - last)` in
  `MatchPlayer.tsx`), the same step `test-chores.md` used for `MatchPlayer.quick`. Faking
  `clearTimeout` matters: without it the stubbed cancel would not clear a fake timer, and a
  paused loop could run one more frame.
- `frames` advances 1 s per `act` (at most 200), so each `act` runs ten frames. A stop or a goal
  hold keeps the clock where it is, so no beat is skipped: every beat still fires inside a 100 ms
  frame.

Every assertion is unchanged. The pause test still pauses for one `FRAME`, now 100 ms. The
timeout was not raised.

### Local durations (this machine, `--reporter=verbose`, two runs each)

| test | before (`f930146`) | 100 ms acts (`632d117`) | 1 s acts (`5e4b90d`) |
| --- | --- | --- | --- |
| goal pattern on a user goal | 2,124 / 2,301 ms | 715 / 737 ms | 450 / 419 ms |
| red card for your team | 2,709 / 2,826 ms | 611 / 666 ms | 344 / 363 ms |
| final whistle, pause and resume | 3,781 / 3,871 ms | 785 / 771 ms | 431 / 434 ms |
| skip to full time | 214 / 211 ms | 50 / 51 ms | 42 / 38 ms |
| toggle off | 3,743 / 3,629 ms | 798 / 862 ms | 405 / 455 ms |
| Quick | 104 / 104 ms | 34 / 36 ms | 14 / 22 ms |
| no `navigator.vibrate` | 1,970 / 1,957 ms | 472 / 518 ms | 220 / 227 ms |
| toggle copy | 7 / 8 ms | 7 / 7 ms | 7 / 7 ms |
| file | 15.48 / 15.78 s | 4.23 / 4.39 s | 2.97 / 2.74 s |

"Before" ran at `f930146`, the file as `main` has it. The hosted duration after the fix is NOT
RUN: no CI run of this branch existed when this was written.

### The tests still catch their bugs

Each mutation was applied to `MatchPlayer.tsx`, run at `5e4b90d` (and the same at `632d117`), and
reverted with `git checkout`:

- Red card buzz for either side (`b.side === "user"` dropped): 2 failed,
  `expected [ [ 120 ], [ 70, 90, 70 ], …(1) ] to deeply equal [ [ 120 ], [ 70, 90, 70 ] ]`.
- Final whistle buzz without the toggle (`haptics &&` dropped): 2 failed,
  `expected [ [ 400 ] ] to deeply equal []`.
- Goal buzz without the toggle: 2 failed, `expected [ [ 120 ] ] to deeply equal []`.

## Product decisions applied

- Decision 12: about 12 to 15 callouts per match. A 120' match now averages 13.34, against
  13.54 for 90'. Big cards only on goals, saves and key duels; reduced motion now shows all three.
- Decision 1: Quick still renders no card (`cutIns` is false there, before either function runs).

## Gates

At `5e4b90d` (code identical at the docs commit):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on
  the 8 touched code and test files.
- Unit tests: 1,585 passed in 184 files.
- Playwright (`CI=1`, fresh build at `099ddc7`, whose app code is identical to `5e4b90d`; only
  `MatchPlayer.haptics.test.tsx` changed after it): chromium `broadcast-follow-ups`,
  `score-lands-with-ball`, `speed-aware-staging`, `callouts-type-effects`, `one-shared-timeline`,
  `shootout-suspense`, `haptics`, `follow-camera`, `broadcast-frame-loop`, `set-pieces`,
  `pitch-card-containment`, `team-readability`, `quick-not-broadcast` and `watch-live` 46 passed;
  `mobile-targets` and `mobile-acceptance` 370 passed, 56 skipped by their own project gates.

## NOT RUN

- Review, hosted CI and the full e2e suite (the coordinator runs them).
- The hosted duration of `MatchPlayer.haptics.test.tsx` after the fix.
- A physical phone check, with reduced motion on, of the duel card (owner action).
- Playwright at 360 and 320 for the duel card. The card is the existing lower third, whose layout
  row 2g already checks at all three widths; nothing in its layout changed.
- Typecheck at the RED commit (not needed: the guards use only existing exports).

## Carryovers

- The cut-in sprite can look empty. `PlayerImage` draws an 80 px box with an inline size, which
  wins over `.cutInSprite > *`'s `width: 100%`, so the 36 to 56 px circle shows the middle of the
  box. A small pixel sprite such as Remoraid then shows only transparent pixels (seen in
  `390-duel-cut-in-reduced-motion.png`); the image itself loaded, 96 px wide. Predates this row,
  and the goal card has the same box. Not changed here.
- One 120' match of 44 (`d5`, 4-3-3, match index 3) still calls 20 moves, 11 of them key duels.
