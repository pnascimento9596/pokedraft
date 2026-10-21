# Engine 7 calibration (6b8)

Wave 6 row 6b8, Red. Branch `feat/engine7-calibration` off `origin/main` at `6aad55b` (the 6b6
squash). Dormant: only `ENGINE_COEFFICIENTS_V7` moves. The live `ENGINE_COEFFICIENTS`, every engine
code path and `goldens.test.ts` are byte-identical to `origin/main`, so production engine output is
exactly engine 6's.

## Who notices

Nobody yet. From the flip (6b9), players get the calibrated candidate:

- Reading the opponent pays a little more. Each style edge sits 15% further from neutral than
  6b2's starting table. A player who follows the scout wins 3.4 points more matches than the
  assistant with a random draft and 1.1 points more with a good one.
- Penalties stay as common as in engine 6 (0.204 goals per match). About 1 in 5 is saved or
  missed.
- The Final Boss is 7 points stronger (992 against 985), which holds the flawless run rates where
  v4 set them.

The next engineer inherits one command per pin, `--coeffs v7` on every calibration tool, and a
generated `docs/reports/engine-7/calibration.json` that 6b9 can regenerate after the flip.

## Scope and files

- `src/engine/coefficients-v7.ts`. Style edges scaled by 1.15, `penalty.awardShare` 0.0745,
  `ladder.score.F` 992. Everything else keeps its 6b1 to 6b6 value.
- `src/engine/__tests__/tactic-edges.test.ts` and `opponent-injuries.test.ts`. V7-only literals
  that move with the new values (table below).
- `scripts/calibration/win-curve.mts` reads coefficients through the shared `loadCoefficients`, so
  `--coeffs v7` works there as in `probe.mts` and `pnpm calibrate`.
- `scripts/audit/achievements-rate.mts` takes `--coeffs`.
- `scripts/calibrate.mts` writes `meanWinsInterval` (95% normal) beside each row's `meanWins`.
- `scripts/calibration/summarize-calibration.mts` (new) builds `calibration.json` from one run
  directory.
- `docs/reports/engine-7/calibration.json` (new), this log and `STATE.md`.

`src/scouting`, `scripts/data`, `src/data` and every live engine file are untouched. No new
randomness, no new draw, no new output key.

## Calibrated values

| Value | 6b6 head | Calibrated | Why |
| --- | --- | --- | --- |
| `manager.styleEdges` | 6b2 start | every `[own, gives]` at `1 + 1.15 * (start - 1)` | largest scale under P2 (step 2) |
| `shootout.band` | 0.18 | 0.18 | P4 passes at 0.18 (step 1) |
| `penalty.awardShare` | 0.077 | 0.0745 | engine 6 penalty goals per match (carryover) |
| `ladder.score.F` | 985 | 992 | P5 (step 3, re-decided, below) |
| `match.base`, `match.dispersion` | engine 6 | engine 6 | tried, rejected (below) |
| `counterLead`, `pressFade`, `goalKind`, `takers`, `opponent` | 6b2 to 6b5 | unchanged | decisions below |

The edges are now pressing `counter [1.115, 0.8275]`, `attack [1.345, 1.46]`; possession
`press [1.2875, 0.9425]`, `counter [1.0, 0.77]`; direct `defend [0.655, 0.4825]`,
`press [1.0, 1.2875]`.

## Pins at the head

Every decisive number comes from one run at `c1f4f838`, the code-identical head (the docs commit
follows). Commands run from the worktree root under `nice -n 10`, each probe with
`--coeffs v7 --out scripts/calibration/out/6b8/final-c1f4f838/<mode>.json`. Proportions are count of
n with a 95% Wilson interval. Differences against auto use Newcombe's hybrid score interval (the arms
are paired, so it is conservative). Mean wins use a 95% normal interval. Pins pass on point
estimates unless the pin names an interval.

| Pin | Command | N | Measured | Pass line | Verdict |
| --- | --- | --- | --- | --- | --- |
| P1 good | `probe.mts --probe informed --n 400` | 400 squads, 2,801 matches | +1.07 points [-0.77, +2.91] | +3 to +6 | FAIL, fallback 2 |
| P1 random | same | 400 squads, 1,908 matches | +3.41 [+0.51, +6.30] | at least +3 | pass |
| P2 good | `probe.mts --probe oracle --n 400` | 2,801 matches | +4.21 [+2.47, +5.96] | at most +10 | pass |
| P2 random | same | 1,908 matches | +9.59 [+6.80, +12.36] | at most +10 | pass |
| P3 good | `probe.mts --probe noop --n 400` | 2,801 matches | 0.00 [-1.87, +1.87], discordant 0 and 0 | cost at most 0.5 | pass |
| P3 random | same | 1,908 matches | 0.00 [-2.94, +2.94], discordant 0 and 0 | cost at most 0.5 | pass |
| P4 | `probe.mts --probe shootouts --n 17000` | 17,000 cups, 67,587 KO matches, 5,448 shootouts | top minus bottom +18.31 [+14.59, +21.96]; q1 42.11% [39.52, 44.75], q4 60.43% [57.80, 62.99] | at least 10 points, intervals apart | pass |
| P5 840 | `pnpm calibrate --n 5000 --coeffs v7` | 90,000 cups pooled | 317 of 8,678, 3.65% [3.28, 4.07] | inside [2.97, 3.72] | pass |
| P5 900 | same | | 952 of 8,063, 11.81% [11.12, 12.53] | inside [11.47, 12.90] | pass |
| P5 950 | same | | 5,967 of 20,194, 29.55% [28.92, 30.18] | inside [29.46, 30.72] | pass |
| P6 good | same | cup8-full good, 5,000 cups | 5.912 wins [5.884, 5.939] | 5.8 to 6.2 | pass |
| P6 careless 151 | same | kanto151 random, 5,000 cups | 3.331 wins [3.299, 3.363] | 3 to 4 | pass |
| P7 | `win-curve.mts --n 5000 --coeffs v7` | 5,000 matches per gap and phase | worst row KO W at gap 0, 0.571 against 0.525 (+0.046) | every row within 0.03 | FAIL, fallback 4 |
| P8 | `pnpm calibrate --n 5000 --coeffs v7` | 1,743,160 user goals | 68.78% [68.71, 68.84] | 70% to 80% | FAIL, fallback 4 |
| P9 | not applicable | | 6b7 does not exist | | n/a |

Seeds. The probes draft `probe-<formation>-<bot>-<i>` with bot rng `play:probe:<formation>:<bot>:<i>`
for i = 1..n (P4: one cup per squad). `pnpm calibrate` uses `cal:<row>:<i>` with bot rng
`bot:<row>:<i>`, i = 0..4999. The win curve uses `curve:<gap>:<i>` with flat user lines at 800
against the G1 roster of `buildLadder("probe")`.

Outputs and wall times at `c1f4f838` (from `suite.log`, whole seconds; the ten jobs ran in parallel, nothing else building):

| Run | sha256 | Wall |
| --- | --- | --- |
| `informed.json` | `9c76155d29d33503...` | 47 s |
| `noop.json` | `4a46050e235e1bdf...` | 47 s |
| `oracle.json` | `6cca9e6ae92ecc8f...` | 183 s |
| `shootouts.json` | `950a5512954e28a4...` | 151 s |
| `calibrate-5000.json` | `787362b1fb10e7e2...` | 711 s |
| `wincurve.stdout` | `c13af267657ab578...` | 129 s |
| `kinds.json` | `8154d49d0e6a0982...` | 22 s |
| `upsets.json` | `07c7caddc774350b...` | 18 s |
| `formations.json` | `e60367d955fdf4b2...` | 34 s |
| `luck.json` | `d012f4fec304600a...` | 143 s |
| `achievements.txt` | `890c6ecc99586622...` | not timed (run alone after the suite) |

`calibration.json` records every full hash under `sources`. The informed and noop JSONs hash the same
as the run before the F change (`final-1`). Only cups that reach the final see a 992 boss, and no
informed or noop outcome flipped. The oracle moved by one match (good +4.25 to +4.21).

## Tuning path

Start, the 6b6 head's V7 (`v7-start`, same commands): P1 good +1.22 [-0.62, +3.06], P1 random +2.83
[-0.07, +5.74], P2 good +4.15, P2 random +9.03 [+6.22, +11.82], P3 0 and 0, P4 +19.30 [+15.34,
+23.18] (4,798 shootouts from 15,000 cups, under the 5,000 floor, so every later P4 run uses 17,000
cups), P5 3.91%, 12.74%, 30.88% (840 and 950 out), P6 good 5.912, kanto151 random 3.331, P7 worst
+0.046, P8 68.68%.

**Step 1, band.** 0.18 already meets P4 with intervals apart. The rule is to tune toward P4, not to
minimise, so the band stays (Laziness Protocol: a passing value does not move). At the head the gap
is +18.31.

**Step 2, edges.** Each edge's distance from 1 is scaled by s, as in `[1 + s(own - 1), 1 + s(gives -
1)]`. That scales each read's own-over-gives advantage against Balanced, which is how 6b2 sized
them. counterLead and pressFade stay, because the hand-off scales "all style edges" and names no
other term. Informed and oracle at 400 squads per bot, before awardShare and F moved:

| s | informed good | informed random | oracle good | oracle random |
| --- | --- | --- | --- | --- |
| 1.0 | +1.22 | +2.83 | +4.15 | +9.03 |
| 1.1 | +1.00 | +3.52 | +4.14 | +9.76 |
| 1.15 | +1.07 | +3.57 | +4.25 | +9.76 |
| 1.2 | +1.07 | +3.46 | +4.25 | +9.92 |
| 1.25 | +1.14 | +3.56 | +4.32 | +10.10 |
| 1.5 | +1.50 | +3.71 | +5.07 | +10.87 |
| 1.75 | +1.14 | +4.65 | +5.60 | +12.34 |
| 2.0 | +0.39 | +4.18 | +6.28 | +13.38 |

The good bot never reaches +3 at any scale. Oracle random crosses +10 at s = 1.25, before informed
good reaches +3. That is the P1 and P2 conflict the fallback names, so P2 holds. The largest informed
gain under it is s = 1.15. Random +3.57 is the highest under +10, and the two bots' sum (+4.64) is
the highest too. Every interval above is about 3.7 points wide for good and 5.8 for random, so
neighbouring scales are not separable. The paired seeds make the ordering more trustworthy than the
intervals suggest (inferred, not tested).

Why the good bot is flat. The scout's rule picks the tactic with the best own-over-gives ratio. That
is Counter against pressing, Press against possession and Defend against direct. Defend's own
multiplier (0.7, and 0.4 at s = 2) cuts a favourite's own goals, and a favourite needs goals to turn
a draw into a win. Raising Defend-against-direct's own multiplier at a similar ratio confirms it.
Informed good rose to +1.79 to +2.61 with almost no auto-only wins:

| Variant (base s = 1 unless stated) | informed good | informed random | auto-only wins (good, random) |
| --- | --- | --- | --- |
| `direct.defend [0.95, 0.75]` | +1.79 | +4.15 | 4, 3 |
| `direct.defend [0.9, 0.65]` | +1.97 | +4.30 | 8, 11 |
| `direct.defend [1.0, 0.75]` | +1.90 | +4.30 | 54 armOnly, 1 |
| s = 1.5 with `direct.defend [0.95, 0.7]` | +2.61 | +5.93 | 5, 3 |

These depart from "scale all style edges together", and the oracle was not run on them. So they are
a finding for 6b9 and the owner, not a tuning (carryovers).

**awardShare (carryover).** The 0.18 band raised in-play conversion, so V7 penalty goals per match
rose to 0.2111 against engine 6's 0.2036 (`kinds --n 2000`). At s = 1.15: 0.077 gives 0.2107, 0.0745
0.2042, 0.074 0.2029 and 0.073 0.2002. 0.0745 is closest. At the head it gives 0.2043.

**Step 3, goal rate and dispersion.** Exploration at `pnpm calibrate --n 1000` (18,000 cups, seeds a
prefix of the 5,000 run) put all three P5 buckets inside for base 1.0 to 1.1, but the 840 bucket
holds about 1,736 runs there, so that was noise. At full size (`--n 5000`) with s = 1.15 and
awardShare 0.0745 (`final-1`, sha `58f16607...`, 712 s), 840 sat at 3.95% and 950 at 30.97%, both
out. Full-size candidates:

| Candidate | 840 | 900 | 950 | P6 good | informed random | oracle random |
| --- | --- | --- | --- | --- | --- | --- |
| as `final-1` | 3.95% | 12.85% | 30.97% | 5.914 | +3.41 | +9.59 |
| base 1.0 | 3.83% | 12.38% | 30.64% | 5.913 | +2.20 | +8.37 |
| dispersion group 0.16/0.23, KO 0.23/0.34 | 3.98% | 12.71% | 30.78% | 5.909 | +3.08 | +9.41 |
| dispersion group 0.17/0.25, KO 0.25/0.37 | 3.98% | 12.69% | 30.64% | 5.898 | +3.36 | +9.65 |
| dispersion group 0.18/0.27, KO 0.27/0.40 | 3.96% | 12.65% | 30.43% | 5.888 | +3.36 | +9.40 |

Base 1.0 breaks P1 random. Dispersion pulls 950 inside but leaves 840 flat (3.98%, 3.98%, 3.96%).
The 840 bucket was already out at engine 6 (4.1%, 6p). The step's premise, that goal rate and
dispersion restore P5, fails for 840.

Re-decided on the same principle: restore P5 with the lever its reference was tuned by. v4 chose
the Final Boss score (F985) to land exactly these three buckets (`engine-v4-calibration.md:62-66`).
F moves 950 about five times faster than 840, so the window is narrow:

| Candidate | 840 | 900 | 950 |
| --- | --- | --- | --- |
| dispersion 0.17/0.25 + F990 | 323, 3.722% | 11.96% | 29.69% |
| dispersion 0.17/0.25 + F991 | 321, 3.70% | 11.86% | 29.49% |
| dispersion 0.17/0.25 + F995 | 310, 3.57% | 11.36% | 28.85% |
| F992 | 317, 3.65% | 11.81% | 29.55% |
| F993 | 315, 3.63% | 11.66% | 29.36% |
| F994 | 308, 3.55% | 11.57% | 29.18% |

The exact v4 upper bound for 840 is 0.037215 (288 of 8,667), so F990's 0.037221 is one flawless run
over it. F992 with engine 6 dispersion meets all three. One value moves instead of two (Subtract
Before You Add), so the dispersion change is dropped. P6 does not move (5.912 good, 3.331
kanto151 random). The hand-off expected the base rate to rise slightly. The measurement says
otherwise: at a higher base, draws fall further (group D at gap 0 is 0.252 at base 1.25, against v4's
0.299).

**Step 4, P7 and P8.** P5 and P6 win. P7 and P8 are recorded as measured.

- P7. The excess is engine 7's own penalty rules, measured on the win curve at s = 1.15:

  | Variant | worst row | KO W at gap 0 | group D at gap 0 |
  | --- | --- | --- | --- |
  | V7 as tuned (awardShare 0.077) | +0.046 | 0.571 | 0.274 |
  | band 0.15 | +0.039 | 0.564 | |
  | band 0.10 | +0.036 (group W at 50) | 0.550 | 0.274 |
  | band 0.10, penalties not missable | +0.030 (KO W at -50) | 0.548 | 0.289 |
  | base 1.25 | -0.047 (group D at 0) | | 0.252 |
  | base 1.35 | -0.052 (group D at 0) | | 0.247 |

  With band 0.1 and engine 6's penalty rule the curve returns to engine 6's own (KO W 0.548). The
  win curve plays a fixed strong XI against Probe FC's G1 roster with equal synthetic lines. Engine
  7 gives penalties to the better taker more often (band) and adds penalty goals on top of the base
  rate (missable), which cuts draws. Neither is a goal rate or dispersion effect. The band stays,
  because P4 is its pin.
- P8. 68.78% at the head. Engine 6 was 68.5% (6p). Base, dispersion and F do not move it (68.77% to
  68.80% across every full-size candidate above). The lever is `match.roleFactor`, which the tuning order does not
  name (carryover).

## Reported without a pin

At `c1f4f838`, good bot, cup8, 4-3-3. Engine 6 values from `baseline-v6.json`.

- Penalties (`kinds --n 2000`, 13,960 matches). Awarded 0.2532 per match. Scored 2,852, 0.2043 per
  match (engine 6 0.2036). Conversion 80.70% [79.37, 81.97] (engine 6 1 by construction). Saved 260,
  missed 422, so 0.341 saved or missed per cup, both sides.
- Opponent injuries. 0.2961 per match against the user's 0.2186. 25.52% [24.80, 26.25] of matches
  see one. Each injured player is replaced. Rotations 1.53 per match.
- Header share by the user's ATT-line AER quartile (cuts 69, 75, 80.67). 11.62% [11.04, 12.23],
  13.38% [12.76, 14.02], 13.61% [12.99, 14.26], 15.52% [14.87, 16.20]. Engine 6 was flat at about
  11%.
- User goal kinds (44,925 goals). Open play 49.54%, solo 23.80%, header 13.54%, free kick 7.51%,
  penalty 5.61%. Engine 6 was open play 58.8%, solo 16.7%, header 11.2%.
- Knockout (`upsets --n 600`, random, good and oracle, 6,044 KO matches). Extra time 17.57% [16.63,
  18.55] (engine 6 18.55%). Shootouts 8.80% [8.11, 9.54] (engine 6 9.76%). User wins 49.25% of
  shootouts. 0 coin deciders. The good bot alone shoots out in 8.06% [7.86, 8.27] of KO matches
  (engine 6 8.9%).
- Upset curve (user win by user score minus opponent score, same probe). Gap -200 0.101 (engine 6
  0.107). Gap -100 0.256 (0.273). Gap 0 0.520 (0.519). Gap 100 0.824 (0.813). Gap 200 0.916
  (0.909). Every row is in `calibration.json`.
- Formations (`formations --n 400`, good). Mean wins 4-3-3 5.960, 4-4-2 5.965, 4-2-3-1 5.912,
  4-1-4-1 6.018, 3-5-2 5.850, 3-4-3 5.895, 3-4-2-1 5.830, 5-3-2 5.843. Each interval is about
  ±0.09. Engine 6 spanned 5.758 to 6.003.
- Squad share of variance (`luck --n 150 --seeds 40`). Good 12.0% [10.0, 14.1] (engine 6 11.3%),
  random 38.8% [33.4, 44.0], oracle 8.1% [6.1, 10.1].

## Achievements check (report only)

`pnpm exec tsx scripts/audit/achievements-rate.mts --n 200 --coeffs v7`, seeds `achievements-0`
to `achievements-199`, good bot, cup8 4-3-3 classic3:

- Giant killer at gap 100: 5 of 200, 2.5% [1.07, 5.72]. That is inside Wave 5's 2% to 20% band, so
  6b9 keeps the threshold at 100. Engine 6 on the same seeds is also 5 of 200.
- Hat-trick hero: 143 of 200, 71.5% [64.9, 77.3] (engine 6 136 of 200). Its definition stays.

## Carryover decisions

- **6b7 does not exist.** 6p's decision 10 prototype measured a good-bot squad share of 11.1% against
  the 18% pin. P9 is not applicable. The share is 12.0% [10.0, 14.1] at the head.
- **goalKind weights stay at 1.** Lowering them shrinks the AER slope in proportion, and the slope
  is the rule's point. Centring the ratio on a drafted attack's mean is a formula change, which this
  row may not make (scope: V7 values only). No pin reads the shares. Drafted attacks are stronger
  than the average Pokémon, so they heading and dribbling more is defensible. The open-play fall
  (58.8% to 49.5%) goes to the owner (carryovers).
- **Opponent injury hazard stays.** Both sides use one formula, `injuriesPerMatch` scaled by
  `1.5 - STA / 100` and by 1.3 while pressing (`match.ts:884-888`). No V7 field reaches only the
  opponent, so matching the user's 0.219 means new engine code. The hand-off's target is "near the
  user's 0.3", the coefficient, and 0.296 is there. Which factor (roster stamina or the opponent's
  press) drives the gap is not measured.
- **awardShare retuned** to 0.0745, above.
- **Press fade bound holds.** `perPoint * below` is 0.004 x 70 = 0.28. The smallest press own is
  1.0 (direct, unchanged by scaling because its own sits at 1), then 1.1 (flat) and 1.2875
  (possession).
- **The auto arm is not V7-invariant.** The state terms apply to either side, and the opponent's
  default is Press against a pressing style and Counter against a direct one. So an uncoached match
  moves under V7. Good-bot auto wins moved from engine 6's 2,363 of 2,787 (`baseline-v6.json`) to 2,384 of 2,801 here.
  P1 to P3 compare arms on the same V7 matches, so they stay valid.
- **The band also sets in-play conversion.** 0.18 gives 80.70% in play. awardShare absorbs the goal
  rate.

## V7 literals moved

Each follows from the new values. None is a behaviour fix, so there is no RED commit. The parity
guard is the row's RED/GREEN equivalent.

| Test | Old | New | Why |
| --- | --- | --- | --- |
| tactic-edges, 79' counter at 1-1 (V7 and flat) | 0.0883224358583112 | 0.08952683271092454 | own 1.1 to 1.115: 0.0883224 x 1.115 / 1.1 |
| tactic-edges, 81' while leading (V7) | 0.12379820331400296 | 0.12548636063192117 | same scaling, lead ratio still 1.1000 |
| tactic-edges, 81' flat | 0.11254382119454814 | 0.11407850966538287 | same scaling |
| tactic-edges, 103' press fresh (V7 and fresh) | 0.06876124705797915 | 0.07082408446971854 | own 1.25 to 1.2875: 0.0687612 x 1.2875 / 1.25 |
| tactic-edges, 120' press tired | 0.08690112151169856 | 0.08955540998560824 | same own, same 0.004 fade |
| tactic-edges, 120' press without fade | 0.08847628246365548 | 0.09113057093756514 | same own |
| tactic-edges, direct side's 1' against Press | 0.053901450854319154 | 0.055518494379948734 | gives 1.25 to 1.2875 (28.75%, was 25%) |
| tactic-edges, Press against direct | 7-2 | 8-2 | the larger gives adds a 13' goal |
| opponent-injuries, `oppEnergyKeys` | 4,482 | 4,488 | panel-45 match 4 now goes to extra time (21 to 22 extra times in runs 0 to 49), 6 windows |
| opponent-injuries, same Boss Clubs | V7 equals live | V7 equals live built with V7's ladder | F differs by design, rosters and rules must not |

I checked the extra-time count with a throwaway test over panel runs 0 to 49 at both
coefficient sets. It listed the same 21 matches plus `45:4`. The awardShare change reaches
uncoached matches.

## Parity guard and gates

At `c1f4f838` (code-identical to the docs commit):

- `pnpm lint`, `pnpm typecheck`, `pnpm build` exited 0.
- `pnpm test`: 2,188 passed in 251 files. `pnpm vitest run src/engine`: 369 passed in 34 files.
- Parity: `v6-parity.test.ts` 50 runs and `v6-parity.slow.test.ts` (`SLOW_TESTS=1`) 200 runs byte
  for byte. `rate-parity.test.ts` 7 of 7 (123 matches, 12,946 chances, 110 shootout kicks at the live
  coefficients, plus six self-tests). `goldens.test.ts` and `src/engine/coefficients.ts` are
  byte-identical to `origin/main`.
- `check-retained-replays.mts .next/server/chunks` exited 0 (10 golden replays, live v6 replay
  `2b26ee82...`). `measure-retained-json.mjs` exited 0.
- All nine `check:*` scripts exited 0. `pnpm e2e:pins --check` reported the pins current.
- Prettier passed on every touched file.
- The tooling changes print byte-identical output without the flag. `achievements-rate.mts --n 200`
  matched before and after. `win-curve.mts --n 300` matched before and after, live (`78ca7e23...`)
  and with the V7 JSON (`667b0f44...`), and `--coeffs v7` equals the JSON dump.

## Brief vs code

- P4's 15,000 cups (the 6p size) gave 4,798 V7 shootouts, under the pin's 5,000. The rate fell from
  8.9% to 8.1% under V7. Every P4 run here uses 17,000 cups.
- P6's "careless 151 placement" names no `pnpm calibrate` row. Following 6p, it is kanto151 random.
- `win-curve.mts` had its own merge and no `v7` alias, and `pnpm calibrate` gave no interval for
  mean wins. Both are fixed above.
- The hand-off expects the base rate to rise slightly. It did not need to, and raising it costs
  draws (above).
- Step 3 names goal rate and dispersion. Neither moves the 840 bucket, so F did the work
  (re-decision above).
- The opponent injury rate the hand-off assumed for the user (about 0.3) is the coefficient. The
  user's measured rate is 0.219.

## NOT RUN

- GLM review and the independent Red reviewer (the coordinator's job).
- Hosted CI.
- Playwright. The row changes no UI and no live engine output.
- A second decisive run at the head to confirm each sha256 reproduces. The coordinator re-runs P1
  to P6.
- The oracle probe on the Defend-against-direct reshape variants.
- Owner phone check and screen reader pass (no UI change).

## Carryovers

- For 6b9 and the owner: P1 good fails at +1.07. The cause is the scout's ratio rule against
  direct sides. Defend's own multiplier is what holds the good bot back. Raising it at a similar
  ratio lifted informed good to +2.61 in exploration. Options are a different Defend-against-direct
  edge (re-measure P2) or a scout rule that weighs own goals for a favourite.
- For the owner: P7 fails by 0.016 because of engine 7's penalty rules on the synthetic win curve,
  not the goal rate. Either accept the curve or re-baseline P7 against engine 7.
- For a later row: P8 needs `match.roleFactor`, outside this tuning order. It was already 68.5% at
  engine 6.
- For the owner: goal kinds. Open play is 49.5% of user goals under V7 (58.8% in engine 6).
  Centring the AER and DRI ratios on a drafted attack would restore the mean and keep the slope.
  That is an engine change.
- For 6b9: the flip copies these V7 values into `ENGINE_COEFFICIENTS`, then re-runs
  `summarize-calibration.mts` on a fresh run directory to confirm the numbers with the live object.
