# Engine v4 Golden Boot measurement

Measured on source commit `6b094332195f55d8b2c2deb5129fcd6f1643ec65`, engine `pokedraft-engine-4`. This report preserves the separate [engine v3 report](golden-boot-by-role.md).

Both modes completed 80,000 cups each, with 5,000 runs for every combination of eight formations and two bots. All processes exited 0. The script checks distinct squads, slot roles, a real top scorer, and bucket totals for every cup. It throws on a violated assumption.

No single defensive group or combined defensive group exceeded the measured 10% threshold. This is a finite sample result. The highest combined cells are close to 10%, and their 95% Wilson intervals cross 10%. The previous v3 margin does not describe v4.

| Mode | Highest single group | Highest combined defensive share | Combined 95% Wilson interval |
| --- | --- | --- | --- |
| cup8 | DM, 4-2-3-1, random, 279/5000 = 5.58% | 4-2-3-1, random, 480/5000 = 9.60% | 8.81% to 10.45% |
| kanto151 | DM, 4-2-3-1, random, 291/5000 = 5.82% | 4-2-3-1, random, 482/5000 = 9.64% | 8.85% to 10.49% |

## cup8 counts

| Formation | Bot | GK | CB | FB+WB | DM | Combined | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | good | 0 | 12 | 6 | 44 | 62 | 10 | 0 | 814 |
| 4-3-3 | random | 6 | 78 | 91 | 147 | 322 | 64 | 47 | 1388 |
| 4-4-2 | good | 0 | 15 | 9 | 0 | 24 | 2 | 0 | 693 |
| 4-4-2 | random | 20 | 74 | 102 | 0 | 196 | 76 | 89 | 1468 |
| 4-2-3-1 | good | 2 | 22 | 5 | 84 | 113 | 7 | 0 | 881 |
| 4-2-3-1 | random | 10 | 98 | 93 | 279 | 480 | 72 | 196 | 1421 |
| 4-1-4-1 | good | 0 | 22 | 8 | 56 | 86 | 11 | 0 | 458 |
| 4-1-4-1 | random | 10 | 106 | 123 | 180 | 419 | 73 | 212 | 1328 |
| 3-5-2 | good | 0 | 18 | 8 | 0 | 26 | 11 | 0 | 573 |
| 3-5-2 | random | 11 | 143 | 148 | 0 | 302 | 80 | 81 | 1265 |
| 3-4-3 | good | 0 | 18 | 5 | 0 | 23 | 10 | 0 | 833 |
| 3-4-3 | random | 11 | 143 | 121 | 0 | 275 | 74 | 46 | 1473 |
| 3-4-2-1 | good | 0 | 27 | 0 | 0 | 27 | 9 | 0 | 969 |
| 3-4-2-1 | random | 9 | 142 | 0 | 0 | 151 | 71 | 203 | 1499 |
| 5-3-2 | good | 0 | 17 | 8 | 0 | 25 | 4 | 0 | 604 |
| 5-3-2 | random | 6 | 142 | 151 | 0 | 299 | 66 | 73 | 1264 |

JSON `output/engine-v4/final-boot-cup8.json` sha256 `014b5f712078a0e4bc66293006e2b2ae21421df032ba7561a6598c84f517c8d0`.

## kanto151 counts

| Formation | Bot | GK | CB | FB+WB | DM | Combined | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | good | 1 | 25 | 13 | 50 | 89 | 24 | 2 | 1009 |
| 4-3-3 | random | 13 | 53 | 98 | 115 | 279 | 65 | 33 | 1420 |
| 4-4-2 | good | 0 | 27 | 22 | 0 | 49 | 12 | 3 | 844 |
| 4-4-2 | random | 13 | 75 | 97 | 0 | 185 | 73 | 60 | 1486 |
| 4-2-3-1 | good | 2 | 42 | 21 | 145 | 210 | 25 | 13 | 1164 |
| 4-2-3-1 | random | 8 | 81 | 102 | 291 | 482 | 93 | 131 | 1441 |
| 4-1-4-1 | good | 4 | 33 | 28 | 73 | 138 | 18 | 6 | 621 |
| 4-1-4-1 | random | 11 | 114 | 129 | 215 | 469 | 80 | 135 | 1377 |
| 3-5-2 | good | 2 | 47 | 37 | 0 | 86 | 28 | 2 | 720 |
| 3-5-2 | random | 6 | 136 | 150 | 0 | 292 | 76 | 50 | 1266 |
| 3-4-3 | good | 1 | 32 | 32 | 0 | 65 | 21 | 4 | 942 |
| 3-4-3 | random | 9 | 113 | 124 | 0 | 246 | 70 | 32 | 1440 |
| 3-4-2-1 | good | 1 | 62 | 0 | 0 | 63 | 28 | 13 | 1112 |
| 3-4-2-1 | random | 9 | 146 | 0 | 0 | 155 | 70 | 150 | 1595 |
| 5-3-2 | good | 3 | 54 | 44 | 0 | 101 | 13 | 2 | 779 |
| 5-3-2 | random | 11 | 141 | 135 | 0 | 287 | 72 | 56 | 1247 |

JSON `output/engine-v4/final-boot-kanto151.json` sha256 `bae521ead5576b018ab53e83272673f0a95a7fd5ae000bfe9a7c99060cd8d0d0`.

## Reproduce

```sh
pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode cup8 --runs 5000 --out output/engine-v4/final-boot-cup8.json
pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode kanto151 --runs 5000 --out output/engine-v4/final-boot-kanto151.json
```

Each mode ran once in this final measurement. Byte identity across a second final invocation was NOT RUN. JSON records counts and settings without timing. Timing logs were produced under concurrent calibration load and support no speed comparison. The integer rule requires at least 501 of 5,000 wins to exceed 10%. Bench winners remain separate from starting roles.

No runtime, coefficients, or tests were edited for this report. Recheck these distributions after changes to scorer role weights, penalty attribution, absences, or the Golden Boot tie break.
