# Calibration

Measured on `pokedraft-engine-3` (dispatch 6 PR 6C). Dispatch 2 (GATE 6) tuned the coefficient table on engine-1; its history is kept under "Hillclimb log". Dispatch 6 moved scouting (PR 6B), weighted scorers by role, rescored Player of the Tournament and smoothed the ladder (PR 6C). Targets were not changed.

## How to reproduce

```
pnpm calibrate --n 5000            # every row, 4-3-3, ENGINE_COEFFICIENTS
pnpm calibrate --n 5000 --rows cup8-full --formation 3-5-2   # wing-back carryover check
pnpm calibrate --n 1000 --formation 4-2-3-1                  # goal share in another formation
pnpm tsx scripts/calibration/win-curve.mts --score 800        # win probability by score gap
```

The harness is deterministic: the run behind this page was reproduced byte for byte by a second invocation to a different output path. JSON sha256 `645113342390412893bf5a2631d97e5cfde1b9412bfba70a7dabefa17137c3c0`. Engine `pokedraft-engine-3`. N = 5,000 seeded drafts per row and bot, 90,000 cups in total, 0 errors.

**Bots.**

- **random** places uniformly random eligible species and never rerolls. This is the careless player.
- **good** fills each slot greedily by the attributes a player can see, the mean of the role's attributes, discounted off-role. It rerolls a weak roll.
- **oracle** does the same with the hidden role-relative quality.

Neither good nor oracle looks at synergy, bench depth or drag.

**Rows.**

- `cup8-full`: all gens, classic3.
- `cup8-full-open`: all gens, open.
- `cup8-retro`: gens 1 to 3, classic3.
- `kanto151`.
- `builder-leg-on` and `builder-leg-off`: separate rows, per the ruling.

P(8-0) intervals are 95% Wilson. A target is met when its value lies inside the measured interval; mean wins "about 6" is read as 5.8 to 6.2.

## Targets

| Target | engine-1 (dispatch 2) | engine-2 (PR 6B, old ladder) | engine-3 (PR 6C) | Verdict on engine-3 |
|---|---|---|---|---|
| A 900 team goes 8-0 about 12% | 11.9% [11.2%, 12.7%] | 12.06% [11.36%, 12.79%] | 986 of 8,070 = **12.22%** [11.52%, 12.95%] | met |
| A 950 team goes 8-0 about 30% | 30.0% [29.3%, 30.6%] | 30.64% [**30.01%**, 31.28%] | 6,147 of 20,194 = **30.44%** [29.81%, 31.08%] | met (engine-2 missed by 0.01 points) |
| A good player goes 8-0 about 1 in 30 | 3.5% [3.1%, 3.9%] | 3.47% [3.11%, 3.88%] | 307 of 8,667 = **3.54%** [3.17%, 3.95%] (1 in 28) | met |
| A good player averages about 6 of 8 wins | 6.03 | 6.03 | **6.09** | met |
| A good player scores about 840 | 811.5 classic3, 867.0 open | 811.7, 866.8 | **811.7** classic3, **866.8** open, 793.0 retro, 664.8 kanto151 | split, see below |
| A near-perfect team approaches 1000 | best 963 | best 963 | best observed **963** (builder, legendaries off, good bot); oracle builder 952 to 959 | short, see below |
| A careless 151 placement averages 3 to 4 wins | 3.65 | 3.64 | **3.05** | met, near the floor |
| Separation oracle > good > random | fails in builder-leg-off | same | holds in 5 of 6 rows; **fails in builder-leg-off** (good 963 > oracle 952) | miss, see below |
| Max round-to-round ladder step (dispatch 6) | 280 (R16 480 to QF 760) | 280 | **125** | smallest step found with every target met |

The 840, 900 and 950 rows are pooled score buckets (±20) over every row and bot.

### Misses, explained

- **Good-player score is about 840 only on average across styles.** The classic3 good bot averages 811.7 and the open good bot 866.8, and their midpoint is 839. Open lets the player take any species in the rolled combo, so it is strictly easier. The gap between styles is a design property, not a tuning error. Kanto151 good averages 664.8: a 151 roll is a single species, and 5 rerolls cannot buy the role fit that a region and type combo plus 3 offers can.
- **Near-perfect falls short of 1000.** The builder bots pick greedily per slot and ignore synergy and bench, so no bot measures the true ceiling. A 1000 needs every slot at its role's top percentile and every adjacency edge at full value, which the engine allows but no measured lineup reaches.
- **builder-leg-off inverts good and oracle.** Both bots are greedy per slot. With legendaries off, the oracle's quality-greedy XI scores 952 while the good bot's visible-attribute XI scores 963 on synergy edges. The inversion belongs to the bots, not the engine: neither maximises Team Score.
- **Careless 151 sits at 3.05 wins.** Smoothing raised the Round of 32 to 480, about a careless team's own score, so careless runs now go out there more often (cup8-full random: 2.97 wins, was 3.54). Every ladder with a smaller maximum step pushed careless 151 under 3 (see the dispatch 6 log).

## Goals by role (dispatch 6)

Scorer weight is SHO times the slot's role factor and assist weight PAS times it. The goalkeeper's factor is 0, so a keeper scores only as the penalty taker (the starter with the highest SHO). The share counts every user goal, penalties included, by the role of the slot the scorer filled in that match.

| Formation | Before (line factors, old ladder) | After (role factors, engine-3) |
|---|---|---|
| 4-3-3 (calibration default) | 51.0% | **71.5%** (N = 5,000: 71.5% of 1,600,784 goals) |
| 4-2-3-1 | 56.8% | **78.4%** |
| 3-4-3 | 54.5% | **73.5%** |
| 3-4-2-1 | 42.9% | 59.4% |
| 3-5-2 | 40.6% | 63.8% |
| 5-3-2 | 40.6% | 63.8% |
| 4-4-2 | 38.4% | 55.4% |
| 4-1-4-1 | 21.4% | 36.6% |

N = 1,000 per row and bot per formation unless noted. The 70 to 80% band was tuned for 4-3-3 and holds in every formation with three or more ST, W or AM slots except 3-4-2-1, which shares the AM factor with 4-2-3-1: raising AM for 3-4-2-1 pushes 4-2-3-1 past 80%. Formations with one or two attacking slots (4-1-4-1, 4-4-2, 3-5-2, 5-3-2) cannot reach 70% without starving the midfield, and their wide and central midfielders score the rest. Attribution draws one random number per goal whatever the weights, so scorelines and every result above are unchanged by the role factors.

4-3-3 by role, engine-3, N = 5,000: W 44.1%, ST 27.5%, CM 13.3%, DM 5.9%, CB 4.9%, FB 4.3%, GK 0.1% (penalties).

## Headline rows

| row | bot | score mean | p10 | p90 | mean wins | P(8-0) |
|---|---|---|---|---|---|---|
| cup8-full | random | 483.8 | 388 | 588 | 2.97 | 0.0% [0.0%, 0.1%] |
| cup8-full | good | 811.7 | 756 | 863 | 5.86 | 2.6% [2.2%, 3.1%] |
| cup8-full | oracle | 865.6 | 835 | 894 | 6.28 | 7.2% [6.5%, 7.9%] |
| cup8-full-open | random | 482.5 | 390 | 584 | 2.96 | 0.0% [0.0%, 0.1%] |
| cup8-full-open | good | 866.8 | 826 | 903 | 6.29 | 7.7% [7.0%, 8.4%] |
| cup8-full-open | oracle | 901.1 | 877 | 923 | 6.58 | 13.7% [12.8%, 14.7%] |
| cup8-retro | random | 467.1 | 379 | 563 | 2.81 | 0.0% [0.0%, 0.1%] |
| cup8-retro | good | 793.0 | 738 | 847 | 5.72 | 1.4% [1.1%, 1.8%] |
| cup8-retro | oracle | 853.6 | 815 | 886 | 6.18 | 4.9% [4.3%, 5.5%] |
| kanto151 | random | 484.9 | 404 | 571 | 3.05 | 0.0% [0.0%, 0.1%] |
| kanto151 | good | 664.8 | 558 | 761 | 4.68 | 0.2% [0.1%, 0.3%] |
| kanto151 | oracle | 713.8 | 617 | 814 | 5.02 | 0.4% [0.3%, 0.6%] |
| builder-leg-on | random | 456.9 | 366 | 555 | 2.73 | 0.0% [0.0%, 0.1%] |
| builder-leg-on | good | 942.0 | 942 | 942 | 6.88 | 25.7% [24.5%, 26.9%] |
| builder-leg-on | oracle | 959.0 | 959 | 959 | 7.03 | 33.1% [31.8%, 34.4%] |
| builder-leg-off | random | 435.8 | 348 | 528 | 2.52 | 0.0% [0.0%, 0.1%] |
| builder-leg-off | good | 963.0 | 963 | 963 | 7.05 | 33.3% [32.0%, 34.6%] |
| builder-leg-off | oracle | 952.0 | 952 | 952 | 6.98 | 29.9% [28.7%, 31.2%] |

The good and oracle builder bots pick one fixed lineup per row, so their runs share one score and the spread in wins is match variance alone.

## Score to results (pooled over all 90,000 cups)

| Team Score | runs | mean wins | P(8-0) |
|---|---|---|---|
| 200-249 | 4 | 0.50 | 0.0% |
| 250-299 | 139 | 0.94 | 0.0% |
| 300-349 | 1,246 | 1.39 | 0.0% |
| 350-399 | 3,916 | 1.87 | 0.0% |
| 400-449 | 7,309 | 2.42 | 0.0% |
| 450-499 | 7,762 | 2.94 | 0.0% |
| 500-549 | 5,807 | 3.41 | 0.0% |
| 550-599 | 3,748 | 3.85 | 0.0% |
| 600-649 | 2,812 | 4.34 | 0.0% |
| 650-699 | 2,581 | 4.73 | 0.1% |
| 700-749 | 3,449 | 5.17 | 0.1% |
| 750-799 | 5,501 | 5.58 | 0.6% |
| 800-849 | 8,470 | 5.98 | 2.3% |
| 850-899 | 13,286 | 6.33 | 7.7% |
| 900-949 | 8,969 | 6.79 | 21.6% |
| 950-1000 | 15,001 | 7.02 | 32.1% |

Mean wins rise monotonically with score across the whole range. No cup below 650 went 8-0.

## The coefficients and why

| Knob | Start (wcdraft port) | Final | Why |
|---|---|---|---|
| `team.curve` | (new) | 0.4 | Score = x + 0.4·x·(1 − x) on the raw blend x. It lifts mid scores without touching the ends (0 → 0, 1 → 1). Without it, good classic3 sat at 734 and open at 806 against a target of about 840. Match strength is centred on Team Score, so the curve also shifts match odds, and the ladder below was tuned against the curved score. |
| `team.synergy.fullAt` | 0.5 | 0.8 | A random XI averages 0.29 edge value (p10 0.227, p90 0.348). At 0.5 nearly every decent XI hit the synergy cap, so synergy could not separate teams. |
| `match.spread` | 5.5 | 5 | Flattens the win curve slightly, so the 840 bucket wins its final a little more and the 950 bucket a little less. |
| `match.minLambda`, `maxLambda` | 0.3, 3.4 | 0.1, 5 | The old clamps put a ceiling near 0.95 on a heavy favourite's win probability, so no team could reach 30% flawless. |
| `match.knockoutFactor` | 0.82 | 1 | It scaled knockout goal rates down, which sends more favourites to extra time and shootouts. |
| `match.dispersion` group, knockout | {0.14, 0.4}, {0.2, 0.75} | {0.14, 0.2}, {0.2, 0.3} | With the wider amplitude, the win-curve probe showed favourites' win probability plateauing well below the clamps. The lighter amplitude keeps upsets while letting score gaps show. |
| `ladder.score` G1..F | 600, 650, 700, 750, 800, 850, 900, 950 | 300, 320, 340, 360, 480, 760, 850, 980 (dispatch 2); **280, 300, 355, 480, 605, 730, 855, 980** (dispatch 6) | See the next section. |
| `match.roleFactor` (dispatch 6) | line factors: scorer DEF 0.25, MID 0.6, ATT 1; assist GK 0.05, DEF 0.4, MID 1, ATT 0.7 | ST 1, W 0.85, AM 0.6, WM 0.45, CM 0.22, DM 0.2, WB 0.1, FB 0.08, CB 0.08, GK 0 | Open-play scorer weight is SHO times the slot role factor, assist weight PAS times it. Tuned from the dispatch table (ST 1, W 0.8, AM 0.7, WM 0.55, CM 0.4, DM 0.25, WB 0.2, FB 0.15, CB 0.15, GK 0) so ST, W and AM score 70 to 80% of user goals; see Goals by role. |
| `awards` (dispatch 6) | goal 3, assist 2, clean sheet GK 2, DEF line 1 | goal 3, assist 2, clean sheet GK 2 and CB, FB, DM 1 by the slot filled, 1 point per 180 minutes | Player of the Tournament is the top contribution total; `Awards.potContribution` exports the breakdown. |
| `shootout.maxSuddenDeath` (dispatch 6) | 20, then the user wins by decree | 200, then a seeded coin from the match stream | A decree is not a result. |

### The ladder shape

A cup is 3 group games and then 5 knockout games, and one knockout loss ends the run. Averaging about 6 wins needs the semifinal, and going 8-0 only 1 time in 30 needs the last games to be hard. Dispatch 2 met both with a cliff: an easy group and R32 (300 to 360), R16 480, then QF 760, SF 850 and Final 980. The R16 to QF step was 280.

Dispatch 6 searched for the smallest maximum step that keeps every target. The result is an even knockout climb of 125 a round, 480, 605, 730, 855, 980, after a gentle group (280, 300, 355). Two limits set it:

- **The 950/900 ratio needs a hard final.** The 950 bucket must go 8-0 about 2.5 times as often as the 900 bucket. That ratio comes from the last two games being close to the strongest teams' level. Ladders that moved difficulty earlier (smooth climbs to a final of 1000, or a softer final) brought the ratio down to 2.1 to 2.3, so one of the two buckets missed.
- **The careless 151 target sets the floor.** A 120 step with the final at 980 puts the R32 at 500 or more, and careless 151 runs fell to 2.65 to 2.93 wins. A meaningful group stage (opening at 350 or more) did the same, 0.91 to 2.21 wins. Easier group openers (280, 300) give back enough group wins to hold 3.

The final's opponent is 980 ± 20 jitter, and opponent scores clamp at 1000, so the top of that jitter is one-sided: a drawn 1000 stays 1000.

## Hillclimb log

### Dispatch 6 (engine-3, ladder only)

Metric: the maximum round-to-round step of `ladder.score`, lower is better. Predicate: every target above inside its interval at N = 5,000 (840 bucket P(8-0) interval contains 1/30 and mean wins in 5.8 to 6.2; 900 interval contains 12%; 950 interval contains 30%; careless 151 mean wins in 3 to 4). One ladder per candidate, everything else fixed. Candidates were screened at N = 1,000 and decided at N = 5,000. "baseline" is the dispatch 2 ladder on this engine.

| id | N | ladder G1..F | max step | 840: P(8-0) | 840 wins | 900: P(8-0) | 950: P(8-0) | careless 151 wins | verdict |
|---|---|---|---|---|---|---|---|---|---|
| baseline | 5000 | 300, 320, 340, 360, 480, 760, 850, 980 | 280 | 3.47% [3.11, 3.88] | 6.03 | 12.06% [11.36, 12.79] | 30.64% [30.01, 31.28] | 3.64 | miss: 950 |
| S1 | 1000 | 300, 320, 340, 360, 515, 670, 825, 980 | 155 | 4.27% [3.41, 5.32] | 6.38 | 17.01% [15.25, 18.92] | 33.41% [31.97, 34.88] | 3.57 | miss: 840 8-0, 840 wins, 900, 950 |
| S2 | 1000 | 300, 320, 340, 400, 550, 700, 850, 980 | 150 | 3.92% [3.10, 4.94] | 6.22 | 14.47% [12.84, 16.27] | 30.68% [29.28, 32.12] | 3.37 | miss: 840 wins, 900 |
| S3 | 1000 | 360, 420, 480, 540, 660, 780, 870, 980 | 120 | 2.48% [1.85, 3.32] | 5.71 | 10.82% [9.40, 12.43] | 27.07% [25.72, 28.46] | 1.97 | miss: 840 8-0, 840 wins, 950, careless 151 |
| S4 | 1000 | 400, 450, 500, 560, 660, 760, 860, 980 | 120 | 2.59% [1.94, 3.45] | 5.79 | 11.19% [9.75, 12.82] | 28.11% [26.74, 29.51] | 1.64 | miss: 840 wins, 950, careless 151 |
| S5 | 1000 | 300, 340, 380, 440, 560, 700, 840, 980 | 140 | 3.98% [3.15, 5.00] | 6.22 | 15.40% [13.72, 17.24] | 31.53% [30.11, 32.98] | 3.08 | miss: 840 wins, 900, 950 |
| S6 | 1000 | 350, 400, 450, 520, 640, 760, 870, 980 | 120 | 2.59% [1.94, 3.45] | 5.83 | 11.19% [9.75, 12.82] | 27.91% [26.55, 29.31] | 2.21 | miss: 950, careless 151 |
| S7 | 1000 | 420, 480, 540, 600, 700, 790, 880, 980 | 100 | 2.07% [1.50, 2.86] | 5.48 | 9.40% [8.07, 10.92] | 25.04% [23.73, 26.40] | 1.29 | miss: 840 8-0, 840 wins, 900, 950, careless 151 |
| S8 | 1000 | 450, 520, 590, 660, 740, 820, 900, 980 | 80 | 0.86% [0.52, 1.42] | 5.07 | 7.36% [6.19, 8.74] | 21.17% [19.94, 22.46] | 0.91 | miss: 840 8-0, 840 wins, 900, 950, careless 151 |
| T1 | 1000 | 300, 320, 340, 400, 550, 700, 850, 1000 | 150 | 2.82% [2.14, 3.71] | 6.21 | 11.94% [10.44, 13.61] | 27.46% [26.11, 28.86] | 3.37 | miss: 840 wins, 950 |
| T2 | 1000 | 300, 320, 340, 410, 560, 710, 860, 1000 | 150 | 2.54% [1.89, 3.39] | 6.14 | 11.13% [9.69, 12.76] | 26.89% [25.55, 28.28] | 3.33 | miss: 950 |
| T3 | 1000 | 300, 320, 340, 390, 540, 690, 840, 990 | 150 | 3.57% [2.80, 4.55] | 6.28 | 13.85% [12.25, 15.62] | 29.97% [28.57, 31.40] | 3.44 | miss: 840 wins, 900 |
| T4 | 1000 | 300, 320, 340, 420, 560, 700, 840, 990 | 150 | 3.57% [2.80, 4.55] | 6.23 | 13.85% [12.25, 15.62] | 29.92% [28.52, 31.35] | 3.29 | miss: 840 wins, 900 |
| T6 | 1000 | 300, 320, 340, 440, 580, 720, 860, 1000 | 140 | 2.54% [1.89, 3.39] | 6.10 | 11.07% [9.63, 12.69] | 26.80% [25.45, 28.18] | 3.19 | miss: 950 |
| T7 | 1000 | 300, 330, 360, 480, 610, 740, 870, 1000 | 130 | 2.36% [1.75, 3.19] | 5.98 | 10.45% [9.05, 12.04] | 25.78% [24.45, 27.15] | 2.92 | miss: 840 8-0, 950, careless 151 |
| T8 | 1000 | 300, 340, 380, 490, 620, 750, 875, 1000 | 130 | 2.02% [1.45, 2.79] | 5.92 | 9.83% [8.48, 11.38] | 25.01% [23.70, 26.37] | 2.79 | miss: 840 8-0, 900, 950, careless 151 |
| T9 | 1000 | 300, 320, 340, 400, 550, 710, 860, 1000 | 160 | 2.54% [1.89, 3.39] | 6.15 | 11.13% [9.69, 12.76] | 26.89% [25.55, 28.28] | 3.37 | miss: 950 |
| U2 | 1000 | 300, 320, 340, 400, 560, 720, 860, 990 | 160 | 3.23% [2.49, 4.17] | 6.13 | 12.12% [10.62, 13.80] | 28.33% [26.96, 29.74] | 3.35 | miss: 950 |
| U2 | 5000 | 300, 320, 340, 400, 560, 720, 860, 990 | 160 | 3.16% [2.81, 3.55] | 6.13 | 10.94% [10.28, 11.64] | 27.94% [27.33, 28.57] | 3.35 | miss: 900, 950 |
| U3 | 1000 | 300, 320, 340, 380, 540, 700, 840, 990 | 160 | 3.57% [2.80, 4.55] | 6.25 | 13.85% [12.25, 15.62] | 29.92% [28.52, 31.35] | 3.47 | miss: 840 wins, 900 |
| U4 | 1000 | 300, 320, 340, 380, 520, 690, 850, 990 | 170 | 3.52% [2.75, 4.49] | 6.26 | 13.11% [11.55, 14.84] | 29.05% [27.67, 30.47] | 3.51 | miss: 840 wins |
| U5 | 1000 | 300, 320, 340, 360, 520, 690, 850, 985 | 170 | 3.63% [2.85, 4.62] | 6.26 | 13.54% [11.96, 15.30] | 29.89% [28.50, 31.32] | 3.56 | miss: 840 wins |
| U6 | 1000 | 300, 320, 340, 360, 540, 720, 860, 985 | 180 | 3.34% [2.59, 4.30] | 6.14 | 12.55% [11.03, 14.26] | 29.17% [27.79, 30.59] | 3.50 | PASS |
| U6 | 5000 | 300, 320, 340, 360, 540, 720, 860, 985 | 180 | 3.33% [2.98, 3.73] | 6.14 | 11.60% [10.92, 12.32] | 28.96% [28.34, 29.59] | 3.51 | miss: 950 |
| U7 | 1000 | 300, 320, 340, 360, 500, 700, 850, 985 | 200 | 3.63% [2.85, 4.62] | 6.23 | 13.61% [12.02, 15.36] | 29.87% [28.47, 31.30] | 3.60 | miss: 840 wins, 900 |
| U8 | 1000 | 300, 320, 340, 360, 480, 680, 850, 980 | 200 | 4.03% [3.21, 5.07] | 6.29 | 14.66% [13.02, 16.46] | 30.91% [29.50, 32.35] | 3.66 | miss: 840 wins, 900 |
| U9 | 1000 | 300, 320, 340, 360, 520, 720, 860, 980 | 200 | 3.52% [2.75, 4.49] | 6.15 | 13.30% [11.73, 15.04] | 30.06% [28.67, 31.50] | 3.54 | PASS |
| V1 | 1000 | 300, 320, 340, 380, 550, 720, 860, 985 | 170 | 3.34% [2.59, 4.30] | 6.14 | 12.55% [11.03, 14.26] | 29.15% [27.77, 30.57] | 3.43 | PASS |
| V2 | 1000 | 300, 320, 340, 370, 540, 710, 860, 985 | 170 | 3.34% [2.59, 4.30] | 6.17 | 12.62% [11.09, 14.32] | 29.15% [27.77, 30.57] | 3.49 | PASS |
| V3 | 1000 | 300, 320, 340, 390, 550, 710, 860, 990 | 160 | 3.23% [2.49, 4.17] | 6.16 | 12.18% [10.68, 13.87] | 28.33% [26.96, 29.74] | 3.40 | miss: 950 |
| V4 | 1000 | 300, 320, 340, 400, 560, 720, 870, 990 | 160 | 2.88% [2.19, 3.78] | 6.10 | 11.63% [10.15, 13.28] | 27.46% [26.11, 28.86] | 3.35 | miss: 950 |
| V5 | 1000 | 300, 320, 340, 380, 545, 710, 865, 985 | 165 | 3.11% [2.39, 4.04] | 6.15 | 12.43% [10.91, 14.13] | 28.78% [27.40, 30.19] | 3.45 | PASS |
| V6 | 1000 | 300, 320, 340, 400, 560, 720, 860, 985 | 160 | 3.34% [2.59, 4.30] | 6.13 | 12.55% [11.03, 14.26] | 29.15% [27.77, 30.57] | 3.35 | PASS |
| W1 | 5000 | 300, 320, 340, 360, 540, 720, 855, 980 | 180 | 3.60% [3.23, 4.01] | 6.15 | 12.48% [11.78, 13.22] | 30.65% [30.02, 31.29] | 3.51 | miss: 950 |
| W2 | 5000 | 300, 320, 340, 360, 540, 715, 855, 980 | 180 | 3.61% [3.24, 4.03] | 6.17 | 12.53% [11.82, 13.27] | 30.66% [30.03, 31.30] | 3.51 | miss: 950 |
| W3 | 5000 | 300, 320, 340, 380, 550, 720, 855, 980 | 170 | 3.60% [3.23, 4.01] | 6.15 | 12.48% [11.78, 13.22] | 30.60% [29.97, 31.24] | 3.44 | PASS |
| W4 | 5000 | 300, 320, 340, 380, 550, 715, 850, 980 | 170 | 3.82% [3.44, 4.24] | 6.18 | 12.90% [12.19, 13.65] | 31.10% [30.46, 31.74] | 3.44 | miss: 840 8-0, 900, 950 |
| W5 | 5000 | 300, 320, 340, 400, 560, 720, 850, 980 | 160 | 3.81% [3.42, 4.23] | 6.16 | 12.83% [12.11, 13.57] | 31.06% [30.42, 31.70] | 3.35 | miss: 840 8-0, 900, 950 |
| W6 | 5000 | 300, 320, 340, 400, 560, 715, 850, 975 | 160 | 4.11% [3.71, 4.55] | 6.18 | 13.62% [12.89, 14.38] | 32.46% [31.82, 33.11] | 3.36 | miss: 840 8-0, 900, 950 |
| W7 | 5000 | 300, 320, 340, 380, 545, 710, 855, 980 | 165 | 3.63% [3.26, 4.05] | 6.18 | 12.57% [11.86, 13.31] | 30.66% [30.03, 31.30] | 3.46 | miss: 950 |
| W8 | 5000 | 300, 320, 340, 360, 540, 720, 860, 980 | 180 | 3.53% [3.16, 3.94] | 6.14 | 12.18% [11.49, 12.91] | 30.12% [29.49, 30.76] | 3.51 | PASS |
| X1 | 5000 | 300, 320, 340, 400, 560, 720, 860, 980 | 160 | 3.53% [3.16, 3.94] | 6.13 | 12.16% [11.46, 12.89] | 30.06% [29.43, 30.69] | 3.35 | PASS |
| X2 | 5000 | 300, 320, 340, 400, 560, 720, 855, 985 | 160 | 3.40% [3.04, 3.81] | 6.14 | 11.86% [11.17, 12.58] | 29.42% [28.80, 30.05] | 3.35 | PASS |
| X3 | 5000 | 300, 320, 340, 400, 560, 720, 860, 985 | 160 | 3.33% [2.98, 3.73] | 6.13 | 11.57% [10.89, 12.29] | 28.91% [28.29, 29.54] | 3.35 | miss: 950 |
| X4 | 5000 | 300, 320, 340, 400, 560, 720, 855, 980 | 160 | 3.60% [3.23, 4.01] | 6.15 | 12.45% [11.75, 13.19] | 30.58% [29.95, 31.22] | 3.35 | PASS |
| X5 | 5000 | 300, 320, 340, 410, 565, 720, 860, 980 | 155 | 3.52% [3.15, 3.93] | 6.13 | 12.14% [11.45, 12.87] | 30.05% [29.42, 30.69] | 3.32 | PASS |
| X6 | 5000 | 300, 320, 340, 420, 570, 720, 860, 980 | 150 | 3.52% [3.15, 3.93] | 6.12 | 12.13% [11.44, 12.86] | 30.05% [29.42, 30.68] | 3.27 | PASS |
| X7 | 5000 | 300, 320, 340, 430, 575, 720, 860, 980 | 145 | 3.52% [3.15, 3.93] | 6.12 | 12.13% [11.44, 12.86] | 30.03% [29.41, 30.67] | 3.23 | PASS |
| X8 | 5000 | 300, 320, 340, 420, 570, 720, 855, 980 | 150 | 3.59% [3.22, 4.00] | 6.14 | 12.43% [11.73, 13.17] | 30.57% [29.94, 31.21] | 3.27 | PASS |
| Y1 | 5000 | 300, 320, 340, 440, 580, 720, 860, 980 | 140 | 3.52% [3.15, 3.93] | 6.12 | 12.11% [11.41, 12.84] | 30.02% [29.40, 30.66] | 3.19 | PASS |
| Y2 | 5000 | 300, 320, 340, 450, 590, 730, 860, 980 | 140 | 3.47% [3.11, 3.88] | 6.08 | 11.91% [11.22, 12.63] | 29.93% [29.31, 30.57] | 3.14 | PASS |
| Y3 | 5000 | 300, 320, 340, 470, 600, 730, 860, 980 | 130 | 3.46% [3.10, 3.87] | 6.07 | 11.90% [11.21, 12.62] | 29.90% [29.28, 30.54] | 3.05 | PASS |
| Y4 | 5000 | 300, 340, 380, 470, 600, 730, 860, 980 | 130 | 3.45% [3.09, 3.86] | 6.07 | 11.87% [11.18, 12.60] | 29.74% [29.11, 30.38] | 2.92 | miss: careless 151 |
| Y5 | 5000 | 300, 320, 340, 460, 590, 720, 850, 980 | 130 | 3.78% [3.40, 4.21] | 6.14 | 12.75% [12.04, 13.50] | 31.00% [30.37, 31.64] | 3.10 | miss: 840 8-0, 900, 950 |
| Y6 | 5000 | 300, 340, 380, 500, 620, 740, 860, 980 | 120 | 3.28% [2.92, 3.67] | 6.01 | 11.72% [11.04, 12.44] | 29.53% [28.90, 30.16] | 2.79 | miss: careless 151 |
| Y7 | 5000 | 320, 360, 400, 500, 620, 740, 860, 980 | 120 | 3.24% [2.89, 3.64] | 6.00 | 11.66% [10.98, 12.38] | 29.41% [28.79, 30.04] | 2.65 | miss: careless 151 |
| Y8 | 5000 | 300, 320, 340, 450, 580, 720, 860, 980 | 140 | 3.52% [3.15, 3.93] | 6.12 | 12.08% [11.39, 12.81] | 30.02% [29.39, 30.65] | 3.15 | PASS |
| Z1 | 5000 | 300, 330, 360, 485, 610, 735, 860, 980 | 125 | 3.39% [3.03, 3.79] | 6.05 | 11.87% [11.18, 12.60] | 29.72% [29.10, 30.36] | 2.93 | miss: careless 151 |
| Z2 | 5000 | 300, 320, 355, 480, 605, 730, 855, 980 | 125 | 3.53% [3.16, 3.94] | 6.08 | 12.19% [11.50, 12.93] | 30.35% [29.72, 30.99] | 2.99 | miss: careless 151 |
| Z3 | 5000 | 300, 320, 350, 475, 600, 725, 850, 975 | 125 | 4.03% [3.63, 4.46] | 6.12 | 13.40% [12.67, 14.16] | 32.25% [31.61, 32.90] | 3.02 | miss: 840 8-0, 900, 950 |
| Z4 | 5000 | 300, 320, 345, 470, 595, 720, 845, 970 | 125 | 4.62% [4.19, 5.08] | 6.16 | 14.68% [13.93, 15.47] | 34.27% [33.62, 34.93] | 3.05 | miss: 840 8-0, 900, 950 |
| Z6 | 5000 | 280, 300, 355, 480, 605, 730, 855, 980 | 125 | 3.54% [3.17, 3.95] | 6.09 | 12.22% [11.52, 12.95] | 30.44% [29.81, 31.08] | 3.05 | PASS |
| Z7 | 5000 | 250, 300, 355, 480, 605, 730, 855, 980 | 125 | 3.55% [3.18, 3.96] | 6.09 | 12.24% [11.55, 12.98] | 30.45% [29.82, 31.09] | 3.09 | PASS |

Kept: **Z6**, tied with Z7 for the smallest passing step (125); Z6 keeps the opener closer to the old ladder (G1 280, against 250). The other 125 candidates (Z1 to Z4) missed, and every 120 candidate missed. A 950 lower bound of 30.01% kept the dispatch 2 ladder itself from passing on this engine.

### Dispatch 2 (engine-1)

Every candidate ran under the same harness. A, B and C ran at N = 1,000, M at N = 1,500, and baseline and final at N = 5,000. The 8-0 columns are pooled score buckets.

| Candidate | Change | 840: wins, 8-0 | 900: 8-0 | 950: 8-0 | random 151 wins | good classic3 / open score |
|---|---|---|---|---|---|---|
| baseline | wcdraft port, smooth ladder 600..950 | 4.02, 0.7% | 4.1% | 15.5% | 0.12 | 765 / 836 |
| A | logistic match fix plus analytic ladder fit | 6.19, 3.0% | 13.8% | 29.1% | about 2 | 734 / 806 |
| B | A plus `team.curve` 0.4 | 6.21, 2.0% | 13.2% | 33.2% | 3.58 | 811 / 868 |
| C | B with group 300/320/340 and R32 360 | 6.21, 2.0% | 13.2% | 33.2% | 3.84 | 811 / 868 |
| M | C with spread 5, SF 850, F 990 | 6.03, 3.1% | 11.7% | 28.3% | 3.60 | 812 / 867 |
| M at N = 5,000 | same | 6.03, 3.1% | 10.8% | 27.8% | 3.65 | 812 / 867 |
| **final (O)** | M with F 980 | **6.03, 3.5%** | **11.9%** | **30.0%** | **3.65** | **812 / 867** |

Ladder probes D to G (on B) and spread and ladder probes H to L (on C) ran at N = 1,500. L (spread 5.5, SF 840, F 985) also landed all three 8-0 buckets inside their intervals at that N, with the 840 bucket at 2.7%. M was kept instead because its 840 bucket (3.1%) sat closer to 1 in 30, the owner's priority target. O then moved only the final to bring 900 and 950 onto target at N = 5,000.

## Scouting carryovers

Measured on engine-3, good bot on cup8-full, 5,000 drafts per formation. Team Score does not depend on the ladder, so engine-2 measured the same numbers. Items 2 and 5 were fixed in PR 6B; their flagged lists are the pre-fix predicates, so the rows show how often those species still start and how far they rate above the alternative. `docs/queue/scouting-carryovers.md` carries the same numbers.

| # | Item | 4-3-3 placement | 4-3-3 mean Δ score | 3-5-2 placement | 3-5-2 mean Δ score |
|---|---|---|---|---|---|
| 1 | claw/blade handling at GK | 10 = 0.2% | 40.4 (n 10) | 8 = 0.2% | 36.0 (n 8) |
| 2 | keeper size at GK (fixed in 6B) | 1,294 = 25.9% | 30.2 (n 1,285) | 1,290 = 25.8% | 29.9 (n 1,281) |
| 3 | pace-weak FB first at FB | 14 = 0.3% | 22.6 (n 14) | 0 = 0.0% | n/a |
| 4 | Barboach, Burmy, Tynamo at W/WB | 0 = 0.0% | n/a | 0 = 0.0% | n/a |
| 5 | squiggle shape at CB/ST (fixed in 6B) | 465 = 9.3% | 25.9 (n 472) | 654 = 13.1% | 23.9 (n 679) |

Before PR 6B (engine-1): item 2 placed 24.0% at +30.1, item 5 10.2% at +27.8 (3-5-2 14.5% at +25.4).

Δ score is the Team Score of the final lineup minus the score with the flagged species swapped for the good bot's best other option from the same pick. A positive Δ means the flagged species rates above the alternative.

## Current engine v4 measurement, 2026-10-15

The sections above retain historical engine-v3 evidence. The current engine is `pokedraft-engine-4`. The fresh final measurement on source `6b094332195f55d8b2c2deb5129fcd6f1643ec65` completed 90,000 cups with zero errors.

The 840 bucket went flawless in 288 of 8,667 cups, 3.32% with a 95% Wilson interval of 2.97% to 3.72%, and averaged 6.08838 wins. The 900 bucket went flawless in 982 of 8,070 cups, 12.17% with an interval of 11.47% to 12.90%. The 950 bucket went flawless in 6,076 of 20,194 cups, 30.09% with an interval of 29.46% to 30.72%. Every original target probability lies within its interval. Careless kanto151 placement averages 3.054 wins.

Final Boss score is 985. The maximum ladder step is 130, replacing the historical v3 maximum of 125. Attacking goal shares are 71.72% in 4-3-3, 78.82% in 4-2-3-1, and 73.87% in 3-4-3. The extra formation probes completed 15,000 cups each with zero errors.

The builder-leg-off greedy-bot inversion remains, good 963 versus oracle 952. The score ceiling remains unproven by these bots. Golden Boot measurements completed 80,000 cups per mode with no measured defensive group above 10%, although combined maxima of 9.60% and 9.64% have intervals that cross 10%.

The [v4 calibration report](reports/engine-v4-calibration.md) preserves commands, counts, coefficient alternatives, win curves, hashes, and limitations. The [v4 Golden Boot report](reports/engine-v4-boot.md) preserves all formation and bot counts.
