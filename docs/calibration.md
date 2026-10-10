# Calibration

GATE 6 of dispatch 2. Tuning touched only the typed coefficient table `src/engine/coefficients.ts`, plus one new knob in it (`team.curve`, see decision log). Targets were not changed. Where a target is missed, the measured number is reported with its cause.

## How to reproduce

```
pnpm calibrate --n 5000            # every row, 4-3-3, ENGINE_COEFFICIENTS
pnpm calibrate --n 5000 --rows cup8-full --formation 3-5-2   # wing-back carryover check
pnpm tsx scripts/calibration/win-curve.mts --score 800        # win probability by score gap
```

The harness is deterministic: the run behind this page was reproduced byte for byte by a second invocation to a different output path. JSON sha256 `7d37938d5c791cc0bb199ff2fb37356f7619a0457ecf50c58e28ad6fff5f08f1`. Engine `pokedraft-engine-1`, coefficients at commit `da013e6`. N = 5,000 seeded drafts per row and bot, 90,000 cups in total, 0 errors.

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

P(8-0) intervals are 95% Wilson.

## Targets

| Target | Measured | Verdict |
|---|---|---|
| A 900 team goes 8-0 about 12% | 900±20 bucket: 967 of 8,103 = **11.9%** [11.2%, 12.7%] | met |
| A 950 team goes 8-0 about 30% | 950±20 bucket: 6,054 of 20,206 = **30.0%** [29.3%, 30.6%] | met |
| A good player goes 8-0 about 1 in 30 | 840±20 bucket: 302 of 8,633 = **3.5%** [3.1%, 3.9%] (1 in 29) | met |
| A good player averages about 6 of 8 wins | 840±20 bucket: **6.03** wins | met |
| A good player scores about 840 | good bot: **811.5** classic3, **867.0** open, 792.6 retro, 664.8 kanto151 | split, see below |
| A near-perfect team approaches 1000 | best observed: **963** (builder, legendaries off, good bot); oracle builder 951 to 953 | short, see below |
| A careless 151 placement averages 3 to 4 wins | kanto151 random: **3.65** wins | met |
| Separation oracle > good > random | holds on score, wins and P(8-0) in 5 of 6 rows; **fails in builder-leg-off** (good 963 > oracle 951) | miss, see below |

Owner priority (session note, logged in `docs/decisions/dispatch-2.md`): the 8-0 targets win over average wins if the two conflict. With the steep late ladder below, they did not have to conflict. The 840 bucket hits both 3.5% flawless and 6.03 wins.

### Misses, explained

- **Good-player score is about 840 only on average across styles.** The classic3 good bot averages 811.5 and the open good bot 867.0, and their midpoint is 839. Open lets the player take any species in the rolled combo, so it is strictly easier. The gap between styles is a design property, not a tuning error. Pulling classic3 up to 840 pushes open toward 890, where its 8-0 rate (now 7.6%) would run well past the 840 target. Kanto151 good averages 664.8: a 151 roll is a single species, and 5 rerolls cannot buy the role fit that a region and type combo plus 3 offers can.
- **Near-perfect falls short of 1000.** The builder bots pick greedily per slot and ignore synergy and bench, so no bot measures the true ceiling. The score curve maps a raw blend of 0.9 to 936 and 0.95 to 969. A 1000 needs every slot at its role's top percentile and every adjacency edge at full value, which the engine allows but no measured lineup reaches.
- **builder-leg-off inverts good and oracle.** Both bots are greedy per slot. With legendaries off, the oracle's quality-greedy XI scores 951 while the good bot's visible-attribute XI scores 963 on synergy edges. The inversion belongs to the bots, not the engine: neither maximises Team Score. The good bot also goes 8-0 more often in that row (33.4% against 29.7%), which is consistent with its higher score. A Team-Score-maximising oracle would remove the inversion; it is not built in this dispatch.

## Headline rows

| row | bot | score mean | p10 | p90 | mean wins | P(8-0) |
|---|---|---|---|---|---|---|
| cup8-full | random | 484.0 | 390 | 588 | 3.54 | 0.0% [0.0%, 0.1%] |
| cup8-full | good | 811.5 | 756 | 863 | 5.84 | 2.5% [2.1%, 2.9%] |
| cup8-full | oracle | 865.6 | 836 | 894 | 6.25 | 6.9% [6.2%, 7.6%] |
| cup8-full-open | random | 482.6 | 390 | 584 | 3.51 | 0.0% [0.0%, 0.1%] |
| cup8-full-open | good | 867.0 | 826 | 903 | 6.26 | 7.6% [6.9%, 8.4%] |
| cup8-full-open | oracle | 901.1 | 877 | 923 | 6.56 | 13.7% [12.8%, 14.7%] |
| cup8-retro | random | 467.3 | 379 | 563 | 3.37 | 0.0% [0.0%, 0.1%] |
| cup8-retro | good | 792.6 | 738 | 846 | 5.70 | 1.2% [1.0%, 1.6%] |
| cup8-retro | oracle | 853.7 | 815 | 886 | 6.15 | 4.8% [4.2%, 5.4%] |
| kanto151 | random | 485.3 | 405 | 571 | 3.65 | 0.0% [0.0%, 0.1%] |
| kanto151 | good | 664.8 | 558 | 761 | 5.01 | 0.1% [0.1%, 0.3%] |
| kanto151 | oracle | 712.6 | 616 | 814 | 5.22 | 0.5% [0.3%, 0.7%] |
| builder-leg-on | random | 456.9 | 366 | 555 | 3.22 | 0.0% [0.0%, 0.1%] |
| builder-leg-on | good | 942.0 | 942 | 942 | 6.89 | 25.5% [24.3%, 26.7%] |
| builder-leg-on | oracle | 953.0 | 953 | 953 | 7.01 | 31.3% [30.1%, 32.6%] |
| builder-leg-off | random | 435.8 | 348 | 528 | 3.00 | 0.0% [0.0%, 0.1%] |
| builder-leg-off | good | 963.0 | 963 | 963 | 7.06 | 33.4% [32.1%, 34.8%] |
| builder-leg-off | oracle | 951.0 | 951 | 951 | 6.98 | 29.7% [28.5%, 31.0%] |

The good and oracle builder bots pick one fixed lineup per row, so their runs share one score and the spread in wins is match variance alone.

## Score to results (pooled over all 90,000 cups)

| Team Score | runs | mean wins | P(8-0) |
|---|---|---|---|
| 200-249 | 4 | 0.50 | 0.0% |
| 250-299 | 140 | 1.00 | 0.0% |
| 300-349 | 1,239 | 1.50 | 0.0% |
| 350-399 | 3,899 | 2.19 | 0.0% |
| 400-449 | 7,284 | 2.93 | 0.0% |
| 450-499 | 7,797 | 3.58 | 0.0% |
| 500-549 | 5,810 | 4.11 | 0.0% |
| 550-599 | 3,736 | 4.50 | 0.0% |
| 600-649 | 2,847 | 4.79 | 0.0% |
| 650-699 | 2,614 | 5.03 | 0.1% |
| 700-749 | 3,478 | 5.27 | 0.1% |
| 750-799 | 5,489 | 5.58 | 0.5% |
| 800-849 | 8,409 | 5.93 | 2.4% |
| 850-899 | 13,303 | 6.30 | 7.5% |
| 900-949 | 8,950 | 6.79 | 21.4% |
| 950-1000 | 15,001 | 7.02 | 31.5% |

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
| `ladder.score` G1..F | 600, 650, 700, 750, 800, 850, 900, 950 | 300, 320, 340, 360, 480, 760, 850, 980 | See the next section. |

### Why the ladder is steep at the end

A cup is 3 group games and then 5 knockout games, and one knockout loss ends the run. Averaging about 6 wins needs the semifinal. Going 8-0 only 1 time in 30 needs the last two games to be hard. A smooth climb cannot do both. The baseline smooth ladder gave the 840 bucket 4.02 wins and 0.7% flawless. So the group stage and R32 are easy (opponents 300 to 360), R16 is a step (480), and the QF (760), SF (850) and Final (980) carry the skill test. A careless team (about 480) usually exits between R32 and QF, which is where the 3 to 4 wins for a careless 151 run come from.

The final's opponent is 980 ± 20 jitter, and opponent scores clamp at 1000, so the top of that jitter is one-sided: a drawn 1000 stays 1000.

## Hillclimb log

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

These were measured with the final coefficients. The good bot drafted cup8-full, 5,000 drafts per formation. Numbers are copied into `docs/queue/scouting-carryovers.md`.

| # | Item | 4-3-3 placement | 4-3-3 mean Δ score | 3-5-2 placement | 3-5-2 mean Δ score |
|---|---|---|---|---|---|
| 1 | claw/blade handling at GK | 10 = 0.2% | 42.3 (n 10) | 7 = 0.1% | 28.0 (n 7) |
| 2 | no size signal for HAN/DIV at GK | 1,198 = 24.0% | 30.1 (n 1,189) | 1,201 = 24.0% | 30.0 (n 1,191) |
| 3 | pace-weak FB first at FB | 14 = 0.3% | 22.6 (n 14) | 0 = 0.0% | n/a |
| 4 | Barboach, Burmy, Tynamo at W/WB | 0 = 0.0% | n/a | 0 = 0.0% | n/a |
| 5 | squiggle shape at CB/ST | 512 = 10.2% | 27.8 (n 522) | 726 = 14.5% | 25.4 (n 760) |

Δ score is the Team Score of the final lineup minus the score with the flagged species swapped for the good bot's best other option from the same pick. A positive Δ means the flagged species rates above the alternative. Each item flags a rating that may be wrong, so Δ is how much Team Score rides on it; if the flag is a real error, that much is unearned. Items 2 (about 1 good-bot draft in 4 starts a size-extreme keeper) and 5 (10 to 15% start a squiggle CB or ST) are the ones typical players meet.
