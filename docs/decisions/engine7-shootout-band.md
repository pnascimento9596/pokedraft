# Engine 7: shootout band (row 6b6, Red)

Branch `feat/engine7-shootout-band`, base `origin/main` `5190287` (the 6b5 squash). Dormant: the
new value sits in `ENGINE_COEFFICIENTS_V7` only. The live coefficients keep `shootout.band: 0.1`,
so engine 6 output is unchanged (parity below).

## Scope

Under engine 7, a penalty taker's edge over the keeper matters more. Engine 6 converts a kick at
0.75 plus or minus at most 0.1. Engine 7 widens that to 0.18, so a +100 edge converts at 0.93 and a
-100 edge at 0.57. The band drives every penalty that `convertProb` decides: shootout kicks, and
under engine 7 the missable penalties in play (6b3).

The row also fixes the shootouts probe, which threw under V7 once the opponent could be injured
(6b4).

## Files

- `src/engine/coefficients-v7.ts` sets `shootout: { ...base.shootout, band: 0.18 }`.
- `src/engine/match.ts` exports `convertProb`. Its body is unchanged.
- `scripts/calibration/probe-modes.ts`: `onFieldAtEnd` replays the opponent's incidents, so the
  shootouts probe sees a Boss Club reserve and the keeper who holds slot 0 at the end.
- Tests:
  - `src/engine/__tests__/shootout-band.test.ts` (new).
  - `src/engine/__tests__/v6-parity.ts`: `rateTraces` appends each shootout kick after the observed
    chances.
  - `src/engine/__tests__/rate-parity.test.ts` counts kicks and gains the `shootout.band`
    mutation self-test.
  - `src/engine/__tests__/penalties.test.ts`: two V7 conversion literals move with the band.
  - `scripts/calibration/probe.test.ts` gains the V7 shootouts probe guard.

## The rule

`convertProb(edge, c)` is `clamp(base + band * edge / 100, base - band, base + band)` with
`base` 0.75. The band is both the slope and the clamp. Engine 6 has had this formula and the
`shootout.band` key since before engine 7, so the engine 6 identity needs no code change. The row
adds only the V7 value.

The hand-off's literals as doubles:

| Edge | Engine 6 (band 0.1) | V7 (band 0.18) |
| --- | --- | --- |
| +150 | 0.85 | 0.9299999999999999 |
| +100 | 0.85 | 0.9299999999999999 |
| +50 | 0.8 | 0.84 |
| 0 | 0.75 | 0.75 |
| -100 | 0.65 | 0.5700000000000001 |
| -150 | 0.65 | 0.5700000000000001 |

0.75 + 0.18 rounds to 0.9299999999999999 in a double, and 0.75 - 0.18 to 0.5700000000000001. The
guard asserts those exact values with `toBe`, so it would catch a formula that only came close.

## RED commits

`77eaf566` exports `convertProb` first, with no behaviour change, so the RED fails on its
assertions and not on a missing export.

Band, `d5f8876b`. 5 of 11 failed:

```
     × a +100 edge converts at 0.93 and a -100 edge at 0.57 3ms
     × an edge past 100 either way stays clamped at 0.93 and 0.57 0ms
     × a +50 edge converts at 0.84 0ms
     × 123 matches, 12946 chances and 110 shootout kicks, every one identical at the live coefficients 230ms
     × shootout.band 0.18: 2 matches diverge first on the user's side, at a shootout kick 178ms
AssertionError: expected { …(3) } to deeply equal { …(3) }
-   "kicks": 110,
+   "kicks": 0,
AssertionError: expected { user: +0, opp: +0, length: +0 } to deeply equal { user: 2, opp: +0, length: +0 }
AssertionError: expected 0.85 to be 0.9299999999999999 // Object.is equality
AssertionError: expected 0.85 to be 0.9299999999999999 // Object.is equality
AssertionError: expected 0.8 to be 0.84 // Object.is equality
 Test Files  2 failed (2)
      Tests  5 failed | 6 passed (11)
```

GREEN `ede2373d` (the rate harness sees kicks) and `acadcb7a` (V7 band 0.18).

Probe, `16c0473a`. 1 of 16 failed:

```
     × n 28 reconstructs every taker: 107 knockout matches, 9 shootouts, 3 won 174ms
Error: probe-4-3-3-good-28 match 4: taker order reconstruction disagrees
 Test Files  1 failed (1)
      Tests  1 failed | 15 passed (16)
```

GREEN `2215ce01`.

The engine 6 band guard (+100 at 0.85, -100 at 0.65, even at 0.75) is a regression guard with no
RED, because the behaviour was already correct.

## Parity

- `v6-parity.test.ts`: 50 runs byte for byte.
- `v6-parity.slow.test.ts` (`SLOW_TESTS=1`): 200 runs byte for byte.
- `rate-parity.test.ts`: 123 matches with 12,946 chances and 110 shootout kicks, each identical at
  the live coefficients, plus six mutation self-tests. The five earlier self-tests kept their
  literals, because the kicks come after every chance and the first divergence of those matches is
  still a chance.
- `goldens.test.ts` has an empty diff against `origin/main` and passes.

The new self-test sets `shootout.band` to 0.18 on a clone of the live coefficients. Two matches
diverge, both first on the user's side and both at a shootout kick: panel-1 match 3 under Counter
and under Press. Both arms reach the same shootout. The user's first kick turns from a miss into a
goal.

This self-test is thin, and I measured how thin. The rate panel holds 12 shootouts and 110 kicks.
The kick trace carries the outcome, not the conversion chance, because the frozen engine 6 bundle's
observer has no kick hook and its `convertProb` is not exported. So the comparison sees a band
change only where it flips a kick. At 0.18 and 0.25 it flips one shootout (two arms). At 0.15 it
flips none. The `convertProb` guard pins the value directly, and the 50-run and 200-run output
parity compares every kick of every shootout byte for byte. The rate self-test proves only that
the rate comparison is no longer blind to kicks.

## Measurements

Shootouts probe, `nice -n 10 pnpm exec tsx scripts/calibration/probe.mts --probe shootouts --n
15000`, good bot, 4-3-3, one cup per squad, draft and cup seeds `probe-4-3-3-good-<i>`, i =
1..15000. Intervals are Wilson 95%. The difference uses Newcombe's hybrid score interval. The band
column patches only `{"shootout":{"band":0.18}}` onto the live coefficients, so it isolates this
row. The V7 column is the whole candidate (6b1 to 6b6).

| | Live (engine 6) | band only | V7 |
| --- | --- | --- | --- |
| sha256 | `10db0f0f...` | `63d503ba...` | `e63ea234...` |
| wall | 99 s | 106 s | 118 s |
| knockout matches | 59,226 | 59,297 | 59,547 |
| shootouts | 5,245 | 5,248 | 4,798 |
| shootout rate | 0.0886 [0.0863, 0.0909] | 0.0885 [0.0862, 0.0908] | 0.0806 [0.0784, 0.0828] |
| user wins | 0.5052 [0.4917, 0.5188] | 0.5109 [0.4973, 0.5244] | 0.5100 [0.4959, 0.5241] |
| coin deciders | 0 | 0 | 0 |

The live column is byte-identical to the 6p baseline's `shootouts.json` (sha256 `10db0f0f...` in
`docs/reports/engine-7/baseline-v6.json` `sources`).

P4, user shootout win rate by the mean taker edge difference (quartile cuts about -7.7, 3.1 and
15.0):

| Quartile | Baseline v6 | band only | V7 |
| --- | --- | --- | --- |
| 1 | 0.4593 [0.4325, 0.4863] | 0.4350 [0.4084, 0.4619] | 0.4147 [0.3871, 0.4427] |
| 2 | 0.5092 [0.4821, 0.5362] | 0.5057 [0.4787, 0.5328] | 0.4971 [0.4688, 0.5253] |
| 3 | 0.4905 [0.4635, 0.5175] | 0.5038 [0.4768, 0.5308] | 0.5208 [0.4925, 0.5490] |
| 4 | 0.5623 [0.5352, 0.5889] | 0.5991 [0.5723, 0.6253] | 0.6077 [0.5797, 0.6349] |
| top minus bottom | 0.1029 [0.0647, 0.1407] | 0.1641 [0.1261, 0.2014] | 0.1930 [0.1534, 0.2318] |

The band alone widens the P4 gap from 0.103 to 0.164. 6b3 measured the V7 gap at 0.1169
[0.0770, 0.1563] before this row (`engine7-penalties.md`). The shootout rate does not move with the
band (0.0886 against 0.0885), as it should: the band acts only once a match is level after extra
time. The knockout match count moves a little, because a different shootout winner plays a
different next round. The V7 shootout rate falls to 0.0806 because of the earlier rules (missable
penalties, tactic edges, opponent injuries), not this one.

In-play penalties under V7, kinds probe (n 2000, good, 4-3-3). The middle column is the V7
candidate with this row's band removed, built from the module itself. It reproduces the 6b5 V7
column exactly (13,949 matches, 45,006 user goals).

| | V7 without the band | V7 |
| --- | --- | --- |
| awarded | 3,650 | 3,654 |
| scored | 2,843 | 2,946 |
| conversion | 0.7789 [0.7652, 0.7921] | 0.8062 [0.7931, 0.8187] |
| saved, missed | 299, 508 | 274, 434 |

## Product decisions applied

- The hand-off's 6b6 rule: `shootout.band` 0.18 in V7, the engine 6 value an exact identity, 6b8
  tunes it between 0.15 and 0.25.
- The nominated penalty taker kicks first. 6b3 built this, gated on `penalty.missable`, and
  `penalties.test.ts` already guards it under V7 (panel-2 match 3, 857 first with slot 10
  nominated). That guard passes unchanged at band 0.18, so the row adds no second copy.
- No UI. The shootout UI reads only `shootout.kicks` from the live coefficients.

## Implementation decisions

- **The band reaches in-play penalties.** `takePenalty` and `shootoutOf` share `convertProb`, and
  6b3's rule is that a missable penalty "scores with the shootout's conversion chance". Keeping one
  conversion function keeps that rule true, so the band moves in-play conversion too (0.779 to
  0.806). Two V7 literals in `penalties.test.ts` move with it: panel-7's 9' and 11' kicks from
  0.80725 to 0.85305, and panel-24's 71' kick from 0.7695 to 0.7851. Both follow from the formula by
  hand. Panel-7's taker edge is 57.25 (0.75 + 0.18 x 0.5725 = 0.85305). Panel-24's is 19.5
  (0.75 + 0.18 x 0.195 = 0.7851). No outcome changes. 6b8 should tune the band knowing it moves
  both.
- **Export `convertProb` rather than probe a constructed match.** The hand-off asks for literal
  `convertProb` values. Calling it directly pins the exact doubles with no seed in between.
  `penaltyEdge` is already exported the same way.
- **Kicks in the rate trace come from the result.** Adding a kick hook to `MatchObserver` would
  give the live engine a hook the frozen bundle lacks, so the two traces could never be equal.
  Reading kicks from both played results keeps the comparison symmetric. The cost is outcome-only
  visibility, measured above.
- **Fix the probe instead of skipping the V7 column.** The probe rebuilt the opponent's takers from
  the starting roster and its keeper from roster slot 0. Under V7 a reserve can replace an injured
  starter, so the reconstruction disagreed and threw. It now replays the opponent's `red`,
  `injury` and `sub` incidents. The live output still hashes `10db0f0f...`, the same as before the
  fix and the baseline. `rotate` only rests a player, so it changes no slot.

## Brief vs code

- **The field already existed.** The hand-off's common shape says to add the rule's field to
  `EngineCoefficients`. `shootout: { kicks, maxSuddenDeath, base, band }` was already there, with
  live `band: 0.1` (`coefficients.ts`, `ENGINE_COEFFICIENTS.shootout`). The engine 6 identity is
  the current value, with no new key.
- **0.93 and 0.57 are not exact doubles.** The guard asserts 0.9299999999999999 and
  0.5700000000000001, as the row brief allows.
- **The nominated taker guard was not missing.** See product decisions.
- **The shootouts probe did not run under V7** at the base (it threw at `probe-4-3-3-good-28`
  match 4), so the row fixed it. 6b3 last ran this mode under V7 (`engine7-penalties.md`), before
  6b4 let the opponent be injured. The 6b4 and 6b5 logs record no shootouts run.
- **`merged-152.txt` did not exist** while the code was built. Production had not yet deployed
  6b5. The coordinator allowed the PR #152 merged paragraph as its own commit at any point in the
  branch, so its order relative to the other commits does not matter for this row. If it lands
  after this log's STATE section, it still goes at the end of the 6b5 section, where
  `add-merged.py` would have put it before this row's section existed.

## NOT RUN

- GLM review and the independent Red reviewer (the coordinator's job).
- Hosted CI.
- The full Playwright suite. I ran these on chromium only: `penalty-takers`, `v7-switch`,
  `opponent-injuries`, `shootout-suspense`, `results-reveal`, `watch-live` and `set-pieces`.
- A browser proof. The row changes no UI.
- A rate self-test at band 0.15. It would see nothing on this panel, as measured above.
- Owner phone check and screen reader pass. The row has no UI change.

## Carryovers

- For 6b8: the band moves in-play penalty conversion as well as shootouts (0.779 to 0.806 on the
  kinds probe). The P4 gap is 0.193 [0.153, 0.232] with the whole V7 candidate and 0.164 with the
  band alone.
- For 6b8 and 6b9: the rate guard sees kick outcomes only. A tuned band near 0.15 would pass it
  even if it leaked into engine 6. The `convertProb` engine 6 guard and the output parity panels
  remain the ones that catch that.
