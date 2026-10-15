# Engine v4 calibration

The fresh 90,000-cup measurement meets the original flawless-cup and mean-win targets. Attacking goal shares meet the 70% to 80% band in all three checked formations. The greedy-bot score inversion remains open.

## Source and method

Measured source `6b094332195f55d8b2c2deb5129fcd6f1643ec65`, engine `pokedraft-engine-4`. Engine-core implementation commit `b1a4998c7750a3fbc4ea6768cabbb4a129f793d5`. Coefficient commit `7680519`. All final runs used committed `ENGINE_COEFFICIENTS`, without overrides.

The standard sweep completed 5,000 drafts per row and bot, six rows and three bots, or 90,000 cups. Added formation probes completed 15,000 cups each. All cells had zero errors. Golden Boot probes completed another 160,000 cups. The win-curve probe completed 170,000 matches. All six processes exited 0.

`scripts/calibrate.mts` records errors, completed drafts, cups, finish counts, goal counts, and 95% Wilson intervals. Its seeds are `cal:<row>:<i>`. Score buckets pool every selected row and bot, including builders. A target is met when its original probability lies within the interval. About six wins means 5.8 to 6.2.

## Target measurements

| Bucket | Flawless cups | Probability | 95% Wilson interval | Mean wins | Target |
| --- | --- | --- | --- | --- | --- |
| 840±20 | 288/8667 | 3.32% | 2.97% to 3.72% | 6.08838 | 1 in 30, met |
| 900±20 | 982/8070 | 12.17% | 11.47% to 12.90% | 6.53978 | 12%, met |
| 950±20 | 6076/20194 | 30.09% | 29.46% to 30.72% | 6.97638 | 30%, met |

Careless kanto151 placement averages 3.054 wins, inside the original three to four win target. Good-player Team Score averages 811.7308 in classic3 and 866.8416 in open. Their midpoint is 839.2862. The style difference remains explicit.

## Completed rows

Every cell completed 5,000 drafts and cups with zero errors.

| Row | Bot | Mean score | Mean wins | Flawless cups |
| --- | --- | --- | --- | --- |
| cup8-full | random | 483.7992 | 2.9708 | 0 |
| cup8-full | good | 811.7308 | 5.8554 | 134 |
| cup8-full | oracle | 865.6254 | 6.2822 | 359 |
| cup8-full-open | random | 482.5206 | 2.9524 | 0 |
| cup8-full-open | good | 866.8416 | 6.3070 | 385 |
| cup8-full-open | oracle | 901.1482 | 6.5890 | 688 |
| cup8-retro | random | 467.0606 | 2.8082 | 0 |
| cup8-retro | good | 793.0158 | 5.7210 | 75 |
| cup8-retro | oracle | 853.5622 | 6.1772 | 230 |
| kanto151 | random | 484.8936 | 3.0540 | 0 |
| kanto151 | good | 664.8454 | 4.6908 | 9 |
| kanto151 | oracle | 713.8178 | 5.0322 | 25 |
| builder-leg-on | random | 456.8760 | 2.7234 | 0 |
| builder-leg-on | good | 942.0000 | 6.8686 | 1241 |
| builder-leg-on | oracle | 959.0000 | 7.0216 | 1638 |
| builder-leg-off | random | 435.7928 | 2.5198 | 0 |
| builder-leg-off | good | 963.0000 | 7.0402 | 1656 |
| builder-leg-off | oracle | 952.0000 | 6.9746 | 1490 |

## Goals by role

| Formation | Cups | User goals | ST+W+AM goals | Attacking share | Errors |
| --- | --- | --- | --- | --- | --- |
| 4-3-3 | 90000 | 1583201 | 1135474 | 71.72% | 0 |
| 4-2-3-1 | 15000 | 254245 | 200386 | 78.82% | 0 |
| 3-4-3 | 15000 | 254713 | 188158 | 73.87% | 0 |

The 4-3-3 run pools all six rows. The other two formations use cup8-full only. This run does not establish the same band in every formation.

## Coefficient alternatives

Earlier inspected engine-v4 artifacts in `pokedraft-platform-overhaul/output/engine-v4` used the same 90,000-cup harness. Their JSON does not record a source head. Alternatives below were not freshly rerun. F985 received the fresh final run.

| Final Boss score | 840 flawless | 900 flawless | 950 flawless | 950 Wilson interval | Verdict |
| --- | --- | --- | --- | --- | --- |
| 980 | 310/8667 | 1034/8070 | 6324/20194 | 30.68% to 31.96% | misses 30% |
| 985 | 288/8667 | 982/8070 | 6076/20194 | 29.46% to 30.72% | met |
| 990 | 270/8667 | 944/8070 | 5859/20194 | 28.39% to 29.64% | misses 30% |

Fresh F985 counts, coefficients, and every measured field match the earlier F985 artifact exactly. Raw bytes differ because the earlier artifact records a temporary override path while the final run records no override.

The selected ladder is G1 280, G2 300, G3 355, R32 480, R16 605, QF 730, SF 855, F 985. Jitter is 20 and tilt is 5. The maximum step is 130, from SF to F. The historical engine-v3 claim of 125 remains historical.

## Win curve

The synthetic user lines stay flat at score 800. Opponent strength varies by gap. Real Boss roster identity supplies attribution. Each gap contains 5,000 group and 5,000 knockout matches. This probes match probabilities rather than full drafts. The script exits on an uncaught error but has no separate error counter.

| gap | group W | group D | KO W |
|---|---|---|---|
| -300 | 0.004 | 0.059 | 0.023 |
| -250 | 0.006 | 0.072 | 0.031 |
| -200 | 0.007 | 0.098 | 0.043 |
| -150 | 0.047 | 0.146 | 0.103 |
| -100 | 0.106 | 0.232 | 0.214 |
| -50 | 0.211 | 0.268 | 0.347 |
| 0 | 0.351 | 0.299 | 0.525 |
| 50 | 0.509 | 0.272 | 0.698 |
| 100 | 0.685 | 0.207 | 0.836 |
| 150 | 0.816 | 0.147 | 0.928 |
| 200 | 0.899 | 0.093 | 0.976 |
| 250 | 0.920 | 0.075 | 0.979 |
| 300 | 0.943 | 0.053 | 0.987 |
| 350 | 0.951 | 0.045 | 0.988 |
| 400 | 0.966 | 0.032 | 0.993 |
| 450 | 0.971 | 0.028 | 0.995 |
| 500 | 0.978 | 0.020 | 0.996 |

## Reproduce

```sh
pnpm calibrate --n 5000 --out output/engine-v4/final-433.json
pnpm calibrate --n 5000 --formation 4-2-3-1 --rows cup8-full --out output/engine-v4/final-4231.json
pnpm calibrate --n 5000 --formation 3-4-3 --rows cup8-full --out output/engine-v4/final-343.json
pnpm exec tsx scripts/calibration/win-curve.mts --n 5000
```

Golden Boot counts and commands are in [Engine v4 Golden Boot measurement](engine-v4-boot.md).

## Evidence hashes

Raw JSON and logs remain in ignored `output/engine-v4`. These hashes identify the artifacts.

| Artifact | SHA-256 |
| --- | --- |
| `output/engine-v4/final-433.json` | `275c972476dc045f64e1ed69db8bed71ca0012cfb836577c4baef6add24a66d8` |
| `output/engine-v4/final-4231.json` | `3d97fd9d5db10e61aa3bed7d402a6221088501b2ac99580965c86567161d4afe` |
| `output/engine-v4/final-343.json` | `72fe57b7a5241d281cd42565435937ce8ff21dc84032cd24704156742e452233` |
| `output/engine-v4/final-win-curve.md` | `e4b08d6e4c571c01f397779e3b078d13c9b7162c3c7cefde614dc80222295fbd` |
| `output/engine-v4/final-boot-cup8.json` | `014b5f712078a0e4bc66293006e2b2ae21421df032ba7561a6598c84f517c8d0` |
| `output/engine-v4/final-boot-kanto151.json` | `bae521ead5576b018ab53e83272673f0a95a7fd5ae000bfe9a7c99060cd8d0d0` |
| Earlier `pokedraft-platform-overhaul/output/engine-v4/calibration-433.json` | `1b2a5db18476be1fda264eae039331b426ce26a84a1085d073a9d57186c468eb` |
| Earlier `pokedraft-platform-overhaul/output/engine-v4/calibration-f985.json` | `606aebf8485010ea492e7e82dc47eafae6cfc067415dc6bd66d0a5e1d5bfb286` |
| Earlier `pokedraft-platform-overhaul/output/engine-v4/calibration-f990.json` | `7403ee2937e8d878fbc063a059c00f529d6f9c4e16e2f577469ebe90019fda7e` |

## Limits and carryovers

Greedy oracle score exceeds good score in five of six rows. Builder-leg-off still inverts them, good 963 versus oracle 952. Neither bot optimizes whole-team synergy or bench. The measured best score of 963 does not establish the true ceiling.

No measured defensive Golden Boot group exceeds 10%. Combined maxima are 9.60% and 9.64%, and their Wilson intervals cross 10%. See the linked report for the narrow margin.

Each final command ran once. A second full final sweep was NOT RUN. These distribution measurements make no speedup claim. Initial machine load averages were 3.95, 4.52, and 3.27 on 12 logical CPUs. Node v24.11.0 and pnpm 11.5.1 ran the probes concurrently with other repository work. Profiling, five-run timing comparisons, and end-user latency benchmarks were NOT RUN.

No runtime or test sources were edited for these reports. This report does not establish browser acceptance, production deployment, independent review, or full application gates. Those belong to the dispatch closeout.
