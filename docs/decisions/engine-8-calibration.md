# Engine 8 calibration, dormant (8e)

Wave 7 row 8e, Red. Branch `feat/engine8-calibration` off `origin/main` at `d6a165d1`. The first
commit (`51c9977a`) records the PR #172 merge. Only `ENGINE_COEFFICIENTS_V8` moves. The live
coefficients, `src/engine/match.ts`, `src/engine/coefficients.ts` and `goldens.test.ts` are untouched
against `origin/main`, so production engine output is exactly engine 7's.

## What changed

- `src/engine/coefficients-v8.ts`: `directDefendOwn` 1.05 and `styleEdges.direct.defend` `[1.05, 0.52]`
  (8c's placeholder was 0.95 and `[0.95, 0.7]`). Engine 7 is 0.655 and `[0.655, 0.4825]`.
- `scripts/calibration/summarize-calibration.mts`: `--coeffs v8` writes the engine 8 summary (label and
  command strings follow the flag; the default is unchanged, so the engine 7 summary reproduces).
- `docs/reports/engine-8/calibration.json`: the pin summary at the head.
- Tests: the V8 value pins in `direct-defend.test.ts`, `coeffs.test.ts` and `coefficient-boundaries.test.ts`.
  RED commit `37894142`: 2 of 21 failed against the old V8 value. GREEN commit `ae1af58c` is the
  V8 file change: 21 of 21 passed (`scratch/logs/8e/vitest-red.log` and `vitest-green.log`).

## Row 8d is dropped

The hand-off builds the goal-kind centring field only if 8e can use it, and drops it otherwise. No
pin P1 to P6 depends on the goal kind. P8 is recorded as measured (the owner accepted it at engine
7) and the owner did not ask for the centring. Open play is 49.56% of user goals at this head
(engine 7: 49.5%). The field is not built. If a later measurement ties a pin to the goal kind, reopen
it as its own row.

## Choosing the Defend against direct edge

Rule from the hand-off: pick the smallest change that brings P1 good to at least +3 while P2 stays at
most +10 for both bots; if none, take the largest P1 good under P2. Informed and oracle probes at 400
squads per bot, patch files over the live (engine 7) coefficients that set `directDefendOwn` and
`styleEdges.direct.defend` to `[own, gives]`, `--coeffs <patch>`, `nice -n 10`. Every cell is in points
of win rate over auto. Seeds `probe-<formation>-<bot>-<i>` as in 6p. Four grids were run: a coarse 4 by
4, then finer rows near the frontier, then the rows at own 1.0 and 1.02 to test for a smaller change.

| own | gives | informed good | informed random | oracle good | oracle random | meets rule |
| --- | --- | --- | --- | --- | --- | --- |
| 0.75 | 0.4825 | +1.79 | +4.40 | +4.28 | +9.70 | no |
| 0.75 | 0.55 | +1.54 | +3.93 | +4.14 | +9.38 | no |
| 0.75 | 0.62 | +1.25 | +3.51 | +3.89 | +9.17 | no |
| 0.75 | 0.7 | +1.07 | +3.35 | +3.75 | +9.01 | no |
| 0.85 | 0.4825 | +2.28 | +5.19 | +4.46 | +9.75 | no |
| 0.85 | 0.55 | +1.96 | +4.72 | +4.25 | +9.43 | no |
| 0.85 | 0.62 | +1.75 | +4.25 | +4.00 | +9.17 | no |
| 0.85 | 0.7 | +1.57 | +4.04 | +3.86 | +9.01 | no |
| 0.95 | 0.4825 | +2.78 | +6.18 | +4.57 | +9.91 | no |
| 0.95 | 0.55 | +2.46 | +5.77 | +4.32 | +9.64 | no |
| 0.95 | 0.62 | +2.25 | +5.45 | +4.07 | +9.38 | no |
| 0.95 | 0.7 | +2.11 | +5.19 | +3.93 | +9.12 | no |
| 1.0 | 0.45 | +2.93 | +6.44 | +4.61 | +10.06 | no |
| 1.0 | 0.46 | +2.89 | +6.39 | +4.57 | +10.01 | no |
| 1.0 | 0.47 | +2.89 | +6.39 | +4.57 | +10.01 | no |
| 1.0 | 0.4825 | +2.89 | +6.29 | +4.57 | +9.91 | no |
| 1.02 | 0.4825 | +2.89 | +6.45 | +4.57 | +9.96 | no |
| 1.02 | 0.5 | +2.89 | +6.45 | +4.57 | +9.96 | no |
| 1.05 | 0.4825 | +3.11 | +6.71 | +4.68 | +10.06 | no |
| 1.05 | 0.49 | +3.11 | +6.71 | +4.68 | +10.06 | no |
| 1.05 | 0.495 | +3.11 | +6.71 | +4.68 | +10.06 | no |
| 1.05 | 0.5 | +3.11 | +6.71 | +4.68 | +10.06 | no |
| 1.05 | 0.505 | +3.07 | +6.71 | +4.64 | +10.06 | no |
| 1.05 | 0.51 | +3.07 | +6.66 | +4.64 | +10.06 | no |
| 1.05 | 0.52 | +3.07 | +6.50 | +4.64 | +9.91 | yes |
| 1.05 | 0.53 | +3.03 | +6.45 | +4.61 | +9.85 | yes |
| 1.05 | 0.54 | +2.93 | +6.34 | +4.53 | +9.80 | no |
| 1.05 | 0.55 | +2.82 | +6.29 | +4.43 | +9.75 | no |
| 1.05 | 0.62 | +2.57 | +6.08 | +4.18 | +9.54 | no |
| 1.05 | 0.7 | +2.39 | +5.77 | +4.00 | +9.28 | no |
| 1.1 | 0.52 | +3.25 | +6.71 | +4.68 | +10.01 | no |
| 1.1 | 0.53 | +3.21 | +6.66 | +4.64 | +9.96 | yes |
| 1.1 | 0.54 | +3.11 | +6.50 | +4.57 | +9.85 | yes |

Results move in whole-match steps, so neighbouring gives values can repeat (own 1.05 at gives 0.4825
to 0.50). P2 random is the binding constraint: it crosses +10 between gives 0.51 and 0.52 at own 1.05.
No row at own 1.02 or below reaches +3 (own 1.0 tops out at +2.93). Of the 33 measured rows,
4 meet the rule, and own 1.05 with gives 0.52 is the smallest change from engine 7 among them
(smallest own and smallest gives). It is the smallest on this grid, not a proven optimum.

## Pins at the head

Every decisive number comes from one run at `50127bc7`, the code-identical head (docs commits follow).
Commands from the worktree root under `nice -n 10`, `--coeffs v8`, the ten jobs in parallel then
achievements, nothing else building. Engine 7 values are from `docs/reports/engine-7/calibration.json`.

| Pin | Command | Engine 7 | Engine 8 (V8) | Pass line | Verdict |
| --- | --- | --- | --- | --- | --- |
| P1 good | `probe.mts --probe informed --n 400` | +1.07 [-0.77, +2.91] | +3.07 [+1.29, +4.85] | +3 to +6 | pass |
| P1 random | same | +3.41 [+0.51, +6.30] | +6.50 [+3.65, +9.33] | at least +3 | pass |
| P2 good | `probe.mts --probe oracle --n 400` | +4.21 [+2.47, +5.96] | +4.64 [+2.91, +6.38] | at most +10 | pass |
| P2 random | same | +9.59 [+6.80, +12.36] | +9.91 [+7.12, +12.67] | at most +10 | pass |
| P3 good | `probe.mts --probe noop --n 400` | 0.00 | +0.00 [-1.87, +1.87] | cost at most 0.5 | pass |
| P3 random | same | 0.00 | +0.00 [-2.94, +2.94] | cost at most 0.5 | pass |
| P4 | `probe.mts --probe shootouts --n 17000` | +18.31 (5448 shootouts) | +18.37 [+14.64, +22.02] (5438 shootouts, 17000 cups) | at least 10, intervals apart | pass |
| P5 840±20 | `pnpm calibrate --n 5000 --coeffs v8` | 8678 of 8678: 3.65% | 8678 of 8678: 3.65% [3.28, 4.07] | inside [2.97, 3.72] | pass |
| P5 900±20 | `pnpm calibrate --n 5000 --coeffs v8` | 8063 of 8063: 11.81% | 8063 of 8063: 11.79% [11.11, 12.52] | inside [11.47, 12.90] | pass |
| P5 950±20 | `pnpm calibrate --n 5000 --coeffs v8` | 20194 of 20194: 29.55% | 20194 of 20194: 29.53% [28.91, 30.17] | inside [29.46, 30.72] | pass |
| P6 good | same | 5.9116 | 5.9116 [5.884, 5.939] | 5.8 to 6.2 | pass |
| P6 careless 151 | same | 3.3306 | 3.3308 [3.299, 3.363] | 3 to 4 | pass |
| P7 | `win-curve.mts --n 5000 --coeffs v8` | worst +0.046 at gap 0 | worst +0.046 at gap 0 | within 0.03 | FAIL, recorded as measured |
| P8 | `pnpm calibrate --n 5000 --coeffs v8` | 68.78% | 68.61% | 70% to 80% | FAIL, recorded as measured |

P7 and P8 are recorded as measured, as the hand-off says (the owner accepted both at engine 7). P4 and
P5 did not regress against engine 7. P1 good's interval [+1.29, +4.85] straddles +3, so the
pass is on the point estimate, as the pin says; oracle random's interval reaches +12.67 for the same
reason. The probes pair their arms on one set of 400 squads, so the intervals are conservative.

The win curve output hash (`c13af267657ab578`) equals engine 7's, so P7 did not move at all: the curve
uses flat user lines and never plays Defend against a direct side.

Also reported, without a pin (engine 7 in brackets where it exists): penalty goals per match
0.2087 [0.2043], penalty conversion
80.68%, saved or missed penalties per cup 0.349,
opponent injuries per match 0.2961 [0.2961]
and user 0.2186, shootout rate in knockouts
8.77%, extra-time rate 17.55%, open play share of
user goals 49.56%, good-bot squad share of variance 12.04%
[10.01, 14.19] and random 38.82%. Formations
(400 good-bot cups each, mean wins): 4-3-3 5.960, 4-4-2 5.965, 4-2-3-1 5.912, 4-1-4-1 6.015, 3-5-2 5.850, 3-4-3 5.895, 3-4-2-1 5.830, 5-3-2 5.843.

## Achievements check (200 good-bot cups, V8)

Giant killer (gap 100): 5 of 200
(2.50%, [1.07, 5.72]),
inside the 2% to 20% band, so the Wave 5 rule leaves the threshold at 100. Hat-trick hero:
146 of 200 (73.00%). It keeps its literal
definition.

## Outputs, seeds and wall times

Seeds: the probes draft `probe-<formation>-<bot>-<i>` with bot rng `play:probe:<formation>:<bot>:<i>`;
`pnpm calibrate` uses `cal:<row>:<i>` with bot rng `bot:<row>:<i>`, i = 0..4999; the win curve uses
`curve:<gap>:<i>`; achievements `achievements-0` to `achievements-199`. Kinds `--n 2000`, upsets `--n 600`,
formations `--n 400`, luck `--n 150 --seeds 40`. Full hashes are under `sources` in `calibration.json`.

| Run | sha256 (first 16) | Wall |
| --- | --- | --- |
| `informed.json` | `fb61bc3254864b3e` | 47 s |
| `noop.json` | `d1184027bd4c6512` | 47 s |
| `oracle.json` | `8a69ed796d91106a` | 180 s |
| `shootouts.json` | `6743f5dd4f2664ed` | 148 s |
| `calibrate-5000.json` | `bfaab5baf9f02b29` | 737 s |
| `wincurve.stdout` | `c13af267657ab578` | 124 s |
| `kinds.json` | `9079dd29ec13a3c3` | 23 s |
| `upsets.json` | `754cf3177cde5ba3` | 19 s |
| `formations.json` | `9167780cf5972e10` | 33 s |
| `luck.json` | `d1cc580beefb690f` | 141 s |
| `achievements.txt` | `fee1227a90c02d02` | 4 s |

## Decisions and risks for 8x

- Defend against direct now has an own multiplier above Balanced's 1.0 (1.05) with the opponent's rate
  cut to 0.52. Against a direct side Defend is the strongest tactic by the scout's ratio, and no copy
  promises that Defend lowers the user's own goals. If the owner wants Defend to keep a defensive
  identity, the alternative on the measured grid is own 1.0, where P1 good is +2.89 to +2.93 (short of
  the +3 line by 0.07 to 0.11) and P2 holds.
- The V8 edge changes unmanaged results wherever the user plays Defend against a direct side, so goldens
  and e2e pins re-pin at the flip (8x), and the scout line and tactic badges read the new ratio only then.
- `match.ts` applies `directDefendOwn` only when `styleEdges.direct.defend` exists, and
  `styleEdges.direct.defend[0]` is unread; 8x copies both values together and can drop one.
- Results move in whole-match steps at N = 400, so the chosen point sits within sampling noise of its
  neighbours. The pass is on point estimates, as the pins say.

## NOT RUN

- GLM review and the independent Red reviewer (the coordinator's job), hosted CI, live checks.
- The oracle probe on formations, and P9 (type matchups, 6b7 does not exist).
- Playwright (no UI change, no live engine output change). Owner phone check and screen reader pass.
