# Golden Boot winners by role per formation

Dispatch 7 carryover 4. A read-only measurement: no engine file, no coefficient and no existing test changed. Engine `pokedraft-engine-3`, base commit `928e4b137811d6ef22699c6d33870039aa693f8a`.

## Result

**Do CB, FB, DM or GK win the Golden Boot in more than 10% of runs in any formation? No.** No cell is above 10%, for either bot, in either cup mode, so `docs/queue/golden-boot-by-role.md` was not created.

- Highest single-group share (cup8, 80,000 runs): **5.3%**, DM in 4-2-3-1 with the random bot, 265 of 5,000 runs (standard error 0.32 points).
- With the four groups added together (GK+CB+FB+WB+DM) the highest share is **8.6%**, also 4-2-3-1 with the random bot, 428 of 5,000 (standard error 0.40 points). That is 73 runs short of the 501 that would exceed 10%, and more than 3 standard errors below it. The next cell is 4-1-4-1 with the random bot at 8.0% (401 of 5,000).
- The good bot stays at or below 2.2% combined in cup8 and 3.2% in kanto151.
- The optional kanto151 pass (80,000 more runs) agrees: 4.9% single (DM, 4-2-3-1, random bot, 246 of 5,000) and 8.7% combined (4-2-3-1, random bot, 434 of 5,000).
- Each pass was run twice and the two JSON files were byte-identical (hashes below).
- Next step: none for the engine. The script takes about half a minute, so rerun it after any change to `roleFactor`, `penaltyShare` or the Boot tie-break and compare the combined share with the 10% line.

Highest cell per group, cup8 (500 of 5,000 is exactly 10.0%; 501 would exceed it):

| Group | Good bot, highest cell | Random bot, highest cell |
| --- | --- | --- |
| GK | 1 of 5,000 (0.0%) in 4-3-3, 4-4-2, 3-4-3 | 15 of 5,000 (0.3%) in 4-4-2 |
| CB | 29 of 5,000 (0.6%) in 3-4-2-1 | 138 of 5,000 (2.8%) in 3-4-2-1 |
| FB+WB | 11 of 5,000 (0.2%) in 4-1-4-1 | 121 of 5,000 (2.4%) in 4-1-4-1 |
| DM | 78 of 5,000 (1.6%) in 4-2-3-1 | 265 of 5,000 (5.3%) in 4-2-3-1 |
| GK+CB+FB+WB+DM | 110 of 5,000 (2.2%) in 4-2-3-1 | 428 of 5,000 (8.6%) in 4-2-3-1 |

## Purpose

Dispatch 6 PR 6C made scorer and assist choice depend on the slot's role (`roleFactor`, `src/engine/coefficients.ts:100-111`). It was tuned on the share of user goals scored by ST, W and AM in 4-3-3, 4-2-3-1 and 3-4-3. The Golden Boot is a different quantity: it goes to the single top scorer, so a good goal share does not bound how often a defender, defensive midfielder or keeper tops the tally.

`docs/reports/finish-ratings-notes.md` sampled only 20 runs in 4-3-3: 4 of 20 Boots went to a CB, DM or CM on engine-1, and 1 of 20 on engine-3. This report measures it at 5,000 runs per bot in all 8 formations and applies the carryover's rule: queue a finding only if CB, FB, DM or GK win the Boot in more than 10% of runs in any formation.

## What was measured

- A cell is one formation with one bot. There are 8 formations (`FORMATION_IDS`) and 2 bots (`good` and `random`, from `scripts/calibration/bots.ts`), so 16 cells of 5,000 runs: 80,000 runs per pass.
- Run `i` (1 to 5,000) of a cell uses the seed `gb7-<formation>-<bot>-<i>` and the draft rng `createEngineRng("play:gb7:<formation>:<bot>:<i>")`. The draft loop is the one in `scripts/calibration/play-seeded.mts`.
- cup8 settings: all nine generations, `classic3`, `squadFirst`. The second pass uses kanto151 mode with `squadFirst`.
- Winner role: `cup.awards.goldenBoot` is the player with the most goals, then the most assists, then the fewest appearances, then the lowest species id (`src/engine/stats.ts:52-54`). Its role is read from the starting slot that holds that species in `cup.rating.slots`. A species cannot be drafted twice (`src/engine/draft.ts:308`), and the script checks that all 16 squad species are distinct, so the lookup is unambiguous.
- `Bench`: the winner is not one of the 11 starters, so it is a substitute fielded for an absent starter (an absence has probability 0.125 per match, `src/engine/availability.ts:20-41`, `src/engine/coefficients.ts:115`). It is counted on its own and never folded into a role.
- `No goals`: `goldenBoot` is null because the team scored nothing in the whole cup (`src/engine/stats.ts:63`).
- `Tied on top`: runs where two or more players share the top goal count, so the tie-break picked the winner. It overlaps the other columns and is not part of any row total.
- The script throws on any run that breaks an assumption: 16 distinct squad species; rating slots equal to the lineup and the formation's roles; `goldenBoot` null only when nobody scored; the winner is a top scorer. Each cell's buckets (ten roles, Bench, No goals) add up to its 5,000 runs.
- Roles are the real `Role` union: GK, CB, FB, WB, DM, CM, AM, WM, W, ST. Groups: GK; CB; FB+WB; DM; CM+AM+WM; W; ST. "Combined" is GK+CB+FB+WB+DM.
- Limit: strictly more than 10% of the cell's 5,000 runs, tested in integers (`count * 100 > runs * 10`). The denominator is all 5,000 runs, including runs with no goals.
- The carryover's wording is ambiguous between "any one of these roles" and "these roles together". Both are computed and printed for every cell. Neither exceeds 10%.

## Commands

Run from the repo root after `pnpm install --frozen-lockfile`. `$T` is a scratch directory outside the repo. Without `--out`, the JSON goes to `scripts/calibration/out/golden-boot-by-role-<mode>-<runs>.json`, which is gitignored.

```sh
shasum -a 256 scripts/calibration/golden-boot-by-role.mts

# throughput check, 200 runs per cell
nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode cup8 --runs 200 --out "$T/final-throughput200.json"

# primary pass, run twice
nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode cup8 --runs 5000 --out "$T/final-cup8-run1.json"
nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode cup8 --runs 5000 --out "$T/final-cup8-run2.json"

# optional second pass, run twice
nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode kanto151 --runs 5000 --out "$T/final-kanto151-run1.json"
nice -n 10 pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --mode kanto151 --runs 5000 --out "$T/final-kanto151-run2.json"

# compare the pairs, then print the tables used below
cmp "$T/final-cup8-run1.json" "$T/final-cup8-run2.json"
cmp "$T/final-kanto151-run1.json" "$T/final-kanto151-run2.json"
pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --render "$T/final-cup8-run1.json"
pnpm exec tsx scripts/calibration/golden-boot-by-role.mts --render "$T/final-kanto151-run1.json"
```

Each run prints a header, one line per cell, the throughput, the estimate for 5,000 runs per cell, the rule lines and `sha256 <hex>  <path>` of the JSON it wrote. Both `cmp` calls exit 0.

## Hashes

| Item | sha256 |
| --- | --- |
| `scripts/calibration/golden-boot-by-role.mts` | `bfd968f0c5f867d2f0f7c897d030ad47a8142c246a1a3ae8edba36448305cec6` |
| cup8 JSON, run 1 | `79b154dd6370c26e8b2fc734baf3fa10dbace8879ed69e9fd186a03bf360f9fc` |
| cup8 JSON, run 2 | `79b154dd6370c26e8b2fc734baf3fa10dbace8879ed69e9fd186a03bf360f9fc` |
| kanto151 JSON, run 1 | `35faeedb74458213443200cb60f337e96a8f58117c615794f0873c0c922358df` |
| kanto151 JSON, run 2 | `35faeedb74458213443200cb60f337e96a8f58117c615794f0873c0c922358df` |

The JSON holds counts only, in a fixed key order: no timestamps, timings or paths. The hashes pin the engine, species data and bots as of `928e4b1`. A later change to any of them changes the hash, and the numbers below then need a rerun.

## Runtime and machine

- Machine: arm64 (`uname -m`), Apple M4 Pro, 12 cores (`hw.ncpu`), Node v22.22.3. The Mac is shared with another project's CI runner, so it was loaded: the 1-minute load average at the start was 33.5 for the throughput check and 14.6 to 18.8 for the four 5,000-run passes (table below). The simulation uses one core.
- Throughput check, 200 runs per cell (3,200 runs): 1,785 runs/s in 1.8 s, which projects to 0.7 min for an 80,000-run pass. The task allowed up to 90 minutes of wall time and asked for the optional kanto151 pass only if the first finished in under about 40 minutes. Each pass took about half a minute, so the kanto151 pass was run.

| Run | Wall (`time`) | In-process runs/s | User CPU | Load average at start (1, 5, 15 min) |
| --- | --- | --- | --- | --- |
| cup8 run 1 | 29.8 s | 2,729 | 26.7 s | 17.30, 29.89, 28.96 |
| cup8 run 2 | 24.7 s | 3,301 | 25.2 s | 16.00, 28.47, 28.48 |
| kanto151 run 1 | 22.0 s | 3,724 | 22.5 s | 14.60, 27.12, 28.00 |
| kanto151 run 2 | 21.1 s | 3,859 | 21.7 s | 18.78, 27.26, 28.02 |

An earlier pair of cup8 runs, made before a rendering-only edit to the table printer (same simulation, same JSON hash), took 69.4 s and 124.7 s wall at a 1-minute load of 44.5 and 36.8, getting 57% and 31% of a core. Wall time follows the other project's load. The result does not.

## cup8 results

Percentages are of the cell's 5,000 runs, rounded half up to a tenth. In a by-role table each row sums to 5,000 across the role, Bench and No goals columns. `n/a` means the formation has no slot with that role (see the slots table); `0 (0.0%)` means the role had slots and never won. In a by-group table, `Tied on top` overlaps the other columns.

### Good bot, by role

| Formation | GK | CB | FB | WB | DM | CM | AM | WM | W | ST | Bench | No goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 1 (0.0%) | 15 (0.3%) | 6 (0.1%) | n/a | 26 (0.5%) | 67 (1.3%) | n/a | n/a | 2361 (47.2%) | 2519 (50.4%) | 5 (0.1%) | 0 (0.0%) |
| 4-4-2 | 1 (0.0%) | 14 (0.3%) | 9 (0.2%) | n/a | n/a | 63 (1.3%) | n/a | 215 (4.3%) | n/a | 4693 (93.9%) | 5 (0.1%) | 0 (0.0%) |
| 4-2-3-1 | 0 (0.0%) | 23 (0.5%) | 9 (0.2%) | n/a | 78 (1.6%) | n/a | 2194 (43.9%) | n/a | n/a | 2690 (53.8%) | 6 (0.1%) | 0 (0.0%) |
| 4-1-4-1 | 0 (0.0%) | 16 (0.3%) | 11 (0.2%) | n/a | 49 (1.0%) | 139 (2.8%) | n/a | 500 (10.0%) | n/a | 4278 (85.6%) | 7 (0.1%) | 0 (0.0%) |
| 3-5-2 | 0 (0.0%) | 6 (0.1%) | n/a | 3 (0.1%) | n/a | 82 (1.6%) | n/a | n/a | n/a | 4906 (98.1%) | 3 (0.1%) | 0 (0.0%) |
| 3-4-3 | 1 (0.0%) | 14 (0.3%) | n/a | 7 (0.1%) | n/a | 57 (1.1%) | n/a | n/a | 2537 (50.7%) | 2376 (47.5%) | 8 (0.2%) | 0 (0.0%) |
| 3-4-2-1 | 0 (0.0%) | 29 (0.6%) | n/a | n/a | n/a | 114 (2.3%) | 1703 (34.1%) | 369 (7.4%) | n/a | 2779 (55.6%) | 6 (0.1%) | 0 (0.0%) |
| 5-3-2 | 0 (0.0%) | 8 (0.2%) | n/a | 6 (0.1%) | n/a | 62 (1.2%) | n/a | n/a | n/a | 4923 (98.5%) | 1 (0.0%) | 0 (0.0%) |

### Good bot, by group

| Formation | GK | CB | FB+WB | DM | GK+CB+FB+WB+DM | CM+AM+WM | W | ST | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 1 (0.0%) | 15 (0.3%) | 6 (0.1%) | 26 (0.5%) | 48 (1.0%) | 67 (1.3%) | 2361 (47.2%) | 2519 (50.4%) | 5 (0.1%) | 0 (0.0%) | 815 (16.3%) |
| 4-4-2 | 1 (0.0%) | 14 (0.3%) | 9 (0.2%) | n/a | 24 (0.5%) | 278 (5.6%) | n/a | 4693 (93.9%) | 5 (0.1%) | 0 (0.0%) | 692 (13.8%) |
| 4-2-3-1 | 0 (0.0%) | 23 (0.5%) | 9 (0.2%) | 78 (1.6%) | 110 (2.2%) | 2194 (43.9%) | n/a | 2690 (53.8%) | 6 (0.1%) | 0 (0.0%) | 896 (17.9%) |
| 4-1-4-1 | 0 (0.0%) | 16 (0.3%) | 11 (0.2%) | 49 (1.0%) | 76 (1.5%) | 639 (12.8%) | n/a | 4278 (85.6%) | 7 (0.1%) | 0 (0.0%) | 465 (9.3%) |
| 3-5-2 | 0 (0.0%) | 6 (0.1%) | 3 (0.1%) | n/a | 9 (0.2%) | 82 (1.6%) | n/a | 4906 (98.1%) | 3 (0.1%) | 0 (0.0%) | 553 (11.1%) |
| 3-4-3 | 1 (0.0%) | 14 (0.3%) | 7 (0.1%) | n/a | 22 (0.4%) | 57 (1.1%) | 2537 (50.7%) | 2376 (47.5%) | 8 (0.2%) | 0 (0.0%) | 812 (16.2%) |
| 3-4-2-1 | 0 (0.0%) | 29 (0.6%) | n/a | n/a | 29 (0.6%) | 2186 (43.7%) | n/a | 2779 (55.6%) | 6 (0.1%) | 0 (0.0%) | 935 (18.7%) |
| 5-3-2 | 0 (0.0%) | 8 (0.2%) | 6 (0.1%) | n/a | 14 (0.3%) | 62 (1.2%) | n/a | 4923 (98.5%) | 1 (0.0%) | 0 (0.0%) | 552 (11.0%) |

### Random bot, by role

| Formation | GK | CB | FB | WB | DM | CM | AM | WM | W | ST | Bench | No goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 6 (0.1%) | 86 (1.7%) | 73 (1.5%) | n/a | 112 (2.2%) | 264 (5.3%) | n/a | n/a | 2617 (52.3%) | 1742 (34.8%) | 57 (1.1%) | 43 (0.9%) |
| 4-4-2 | 15 (0.3%) | 83 (1.7%) | 75 (1.5%) | n/a | n/a | 285 (5.7%) | n/a | 802 (16.0%) | n/a | 3615 (72.3%) | 53 (1.1%) | 72 (1.4%) |
| 4-2-3-1 | 12 (0.2%) | 76 (1.5%) | 75 (1.5%) | n/a | 265 (5.3%) | n/a | 2200 (44.0%) | n/a | n/a | 2128 (42.6%) | 67 (1.3%) | 177 (3.5%) |
| 4-1-4-1 | 14 (0.3%) | 93 (1.9%) | 121 (2.4%) | n/a | 173 (3.5%) | 396 (7.9%) | n/a | 1204 (24.1%) | n/a | 2746 (54.9%) | 68 (1.4%) | 185 (3.7%) |
| 3-5-2 | 10 (0.2%) | 101 (2.0%) | n/a | 111 (2.2%) | n/a | 454 (9.1%) | n/a | n/a | n/a | 4184 (83.7%) | 70 (1.4%) | 70 (1.4%) |
| 3-4-3 | 11 (0.2%) | 102 (2.0%) | n/a | 95 (1.9%) | n/a | 245 (4.9%) | n/a | n/a | 2670 (53.4%) | 1791 (35.8%) | 45 (0.9%) | 41 (0.8%) |
| 3-4-2-1 | 9 (0.2%) | 138 (2.8%) | n/a | n/a | n/a | 292 (5.8%) | 1431 (28.6%) | 878 (17.6%) | n/a | 1997 (39.9%) | 65 (1.3%) | 190 (3.8%) |
| 5-3-2 | 9 (0.2%) | 115 (2.3%) | n/a | 100 (2.0%) | n/a | 450 (9.0%) | n/a | n/a | n/a | 4211 (84.2%) | 54 (1.1%) | 61 (1.2%) |

### Random bot, by group

| Formation | GK | CB | FB+WB | DM | GK+CB+FB+WB+DM | CM+AM+WM | W | ST | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 6 (0.1%) | 86 (1.7%) | 73 (1.5%) | 112 (2.2%) | 277 (5.5%) | 264 (5.3%) | 2617 (52.3%) | 1742 (34.8%) | 57 (1.1%) | 43 (0.9%) | 1406 (28.1%) |
| 4-4-2 | 15 (0.3%) | 83 (1.7%) | 75 (1.5%) | n/a | 173 (3.5%) | 1087 (21.7%) | n/a | 3615 (72.3%) | 53 (1.1%) | 72 (1.4%) | 1437 (28.7%) |
| 4-2-3-1 | 12 (0.2%) | 76 (1.5%) | 75 (1.5%) | 265 (5.3%) | 428 (8.6%) | 2200 (44.0%) | n/a | 2128 (42.6%) | 67 (1.3%) | 177 (3.5%) | 1420 (28.4%) |
| 4-1-4-1 | 14 (0.3%) | 93 (1.9%) | 121 (2.4%) | 173 (3.5%) | 401 (8.0%) | 1600 (32.0%) | n/a | 2746 (54.9%) | 68 (1.4%) | 185 (3.7%) | 1287 (25.7%) |
| 3-5-2 | 10 (0.2%) | 101 (2.0%) | 111 (2.2%) | n/a | 222 (4.4%) | 454 (9.1%) | n/a | 4184 (83.7%) | 70 (1.4%) | 70 (1.4%) | 1263 (25.3%) |
| 3-4-3 | 11 (0.2%) | 102 (2.0%) | 95 (1.9%) | n/a | 208 (4.2%) | 245 (4.9%) | 2670 (53.4%) | 1791 (35.8%) | 45 (0.9%) | 41 (0.8%) | 1451 (29.0%) |
| 3-4-2-1 | 9 (0.2%) | 138 (2.8%) | n/a | n/a | 147 (2.9%) | 2601 (52.0%) | n/a | 1997 (39.9%) | 65 (1.3%) | 190 (3.8%) | 1467 (29.3%) |
| 5-3-2 | 9 (0.2%) | 115 (2.3%) | 100 (2.0%) | n/a | 224 (4.5%) | 450 (9.0%) | n/a | 4211 (84.2%) | 54 (1.1%) | 61 (1.2%) | 1236 (24.7%) |

### Slots per role in each formation

| Formation | GK | CB | FB | WB | DM | CM | AM | WM | W | ST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 1 | 2 | 2 | 0 | 1 | 2 | 0 | 0 | 2 | 1 |
| 4-4-2 | 1 | 2 | 2 | 0 | 0 | 2 | 0 | 2 | 0 | 2 |
| 4-2-3-1 | 1 | 2 | 2 | 0 | 2 | 0 | 3 | 0 | 0 | 1 |
| 4-1-4-1 | 1 | 2 | 2 | 0 | 1 | 2 | 0 | 2 | 0 | 1 |
| 3-5-2 | 1 | 3 | 0 | 2 | 0 | 3 | 0 | 0 | 0 | 2 |
| 3-4-3 | 1 | 3 | 0 | 2 | 0 | 2 | 0 | 0 | 2 | 1 |
| 3-4-2-1 | 1 | 3 | 0 | 0 | 0 | 2 | 2 | 2 | 0 | 1 |
| 5-3-2 | 1 | 3 | 0 | 2 | 0 | 3 | 0 | 0 | 0 | 2 |

### Rule check, cup8

- Limit: strictly more than 10% of the 5000 runs of one cell (one formation and one bot).
- Single-group cells over the limit (GK, CB, FB+WB, DM): none.
- Combined cells over the limit (GK+CB+FB+WB+DM): none.
- Highest single-group share: 5.3% (DM, 4-2-3-1, random bot, 265 of 5000, standard error 0.32 points).
- Highest combined share: 8.6% (GK+CB+FB+WB+DM, 4-2-3-1, random bot, 428 of 5000, standard error 0.40 points).
- Excluding the no-goal runs from the denominator, the highest combined share is 8.9% (428 of 4,823 runs with a Boot, 4-2-3-1, random bot) and the highest single-group share is 5.5% (265 of 4,823, DM, same cell). The answer does not change.

## kanto151 results (optional second pass)

Same seeds, bots, checks and layout as cup8. The slots per role are the same as in the cup8 slots table.

Highest cell per group (500 of 5,000 is exactly 10.0%; 501 would exceed it):

| Group | Good bot, highest cell | Random bot, highest cell |
| --- | --- | --- |
| GK | 3 of 5,000 (0.1%) in 4-2-3-1, 3-5-2 | 13 of 5,000 (0.3%) in 4-4-2 |
| CB | 51 of 5,000 (1.0%) in 3-4-2-1 | 116 of 5,000 (2.3%) in 5-3-2 |
| FB+WB | 28 of 5,000 (0.6%) in 3-4-3 | 115 of 5,000 (2.3%) in 4-1-4-1 |
| DM | 98 of 5,000 (2.0%) in 4-2-3-1 | 246 of 5,000 (4.9%) in 4-2-3-1 |
| GK+CB+FB+WB+DM | 159 of 5,000 (3.2%) in 4-2-3-1 | 434 of 5,000 (8.7%) in 4-2-3-1 |

### Good bot, by role

| Formation | GK | CB | FB | WB | DM | CM | AM | WM | W | ST | Bench | No goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 2 (0.0%) | 30 (0.6%) | 12 (0.2%) | n/a | 29 (0.6%) | 112 (2.2%) | n/a | n/a | 2499 (50.0%) | 2300 (46.0%) | 14 (0.3%) | 2 (0.0%) |
| 4-4-2 | 1 (0.0%) | 18 (0.4%) | 16 (0.3%) | n/a | n/a | 103 (2.1%) | n/a | 310 (6.2%) | n/a | 4534 (90.7%) | 17 (0.3%) | 1 (0.0%) |
| 4-2-3-1 | 3 (0.1%) | 41 (0.8%) | 17 (0.3%) | n/a | 98 (2.0%) | n/a | 2452 (49.0%) | n/a | n/a | 2364 (47.3%) | 14 (0.3%) | 11 (0.2%) |
| 4-1-4-1 | 0 (0.0%) | 29 (0.6%) | 14 (0.3%) | n/a | 71 (1.4%) | 162 (3.2%) | n/a | 579 (11.6%) | n/a | 4128 (82.6%) | 14 (0.3%) | 3 (0.1%) |
| 3-5-2 | 3 (0.1%) | 46 (0.9%) | n/a | 23 (0.5%) | n/a | 151 (3.0%) | n/a | n/a | n/a | 4757 (95.1%) | 18 (0.4%) | 2 (0.0%) |
| 3-4-3 | 2 (0.0%) | 27 (0.5%) | n/a | 28 (0.6%) | n/a | 111 (2.2%) | n/a | n/a | 2519 (50.4%) | 2295 (45.9%) | 15 (0.3%) | 3 (0.1%) |
| 3-4-2-1 | 2 (0.0%) | 51 (1.0%) | n/a | n/a | n/a | 137 (2.7%) | 1794 (35.9%) | 456 (9.1%) | n/a | 2529 (50.6%) | 20 (0.4%) | 11 (0.2%) |
| 5-3-2 | 0 (0.0%) | 40 (0.8%) | n/a | 20 (0.4%) | n/a | 150 (3.0%) | n/a | n/a | n/a | 4774 (95.5%) | 14 (0.3%) | 2 (0.0%) |

### Good bot, by group

| Formation | GK | CB | FB+WB | DM | GK+CB+FB+WB+DM | CM+AM+WM | W | ST | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 2 (0.0%) | 30 (0.6%) | 12 (0.2%) | 29 (0.6%) | 73 (1.5%) | 112 (2.2%) | 2499 (50.0%) | 2300 (46.0%) | 14 (0.3%) | 2 (0.0%) | 962 (19.2%) |
| 4-4-2 | 1 (0.0%) | 18 (0.4%) | 16 (0.3%) | n/a | 35 (0.7%) | 413 (8.3%) | n/a | 4534 (90.7%) | 17 (0.3%) | 1 (0.0%) | 837 (16.7%) |
| 4-2-3-1 | 3 (0.1%) | 41 (0.8%) | 17 (0.3%) | 98 (2.0%) | 159 (3.2%) | 2452 (49.0%) | n/a | 2364 (47.3%) | 14 (0.3%) | 11 (0.2%) | 1061 (21.2%) |
| 4-1-4-1 | 0 (0.0%) | 29 (0.6%) | 14 (0.3%) | 71 (1.4%) | 114 (2.3%) | 741 (14.8%) | n/a | 4128 (82.6%) | 14 (0.3%) | 3 (0.1%) | 546 (10.9%) |
| 3-5-2 | 3 (0.1%) | 46 (0.9%) | 23 (0.5%) | n/a | 72 (1.4%) | 151 (3.0%) | n/a | 4757 (95.1%) | 18 (0.4%) | 2 (0.0%) | 725 (14.5%) |
| 3-4-3 | 2 (0.0%) | 27 (0.5%) | 28 (0.6%) | n/a | 57 (1.1%) | 111 (2.2%) | 2519 (50.4%) | 2295 (45.9%) | 15 (0.3%) | 3 (0.1%) | 930 (18.6%) |
| 3-4-2-1 | 2 (0.0%) | 51 (1.0%) | n/a | n/a | 53 (1.1%) | 2387 (47.7%) | n/a | 2529 (50.6%) | 20 (0.4%) | 11 (0.2%) | 1121 (22.4%) |
| 5-3-2 | 0 (0.0%) | 40 (0.8%) | 20 (0.4%) | n/a | 60 (1.2%) | 150 (3.0%) | n/a | 4774 (95.5%) | 14 (0.3%) | 2 (0.0%) | 749 (15.0%) |

### Random bot, by role

| Formation | GK | CB | FB | WB | DM | CM | AM | WM | W | ST | Bench | No goals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 8 (0.2%) | 60 (1.2%) | 64 (1.3%) | n/a | 109 (2.2%) | 234 (4.7%) | n/a | n/a | 2624 (52.5%) | 1825 (36.5%) | 52 (1.0%) | 24 (0.5%) |
| 4-4-2 | 13 (0.3%) | 56 (1.1%) | 81 (1.6%) | n/a | n/a | 283 (5.7%) | n/a | 798 (16.0%) | n/a | 3664 (73.3%) | 54 (1.1%) | 51 (1.0%) |
| 4-2-3-1 | 9 (0.2%) | 92 (1.8%) | 87 (1.7%) | n/a | 246 (4.9%) | n/a | 2272 (45.4%) | n/a | n/a | 2113 (42.3%) | 76 (1.5%) | 105 (2.1%) |
| 4-1-4-1 | 9 (0.2%) | 112 (2.2%) | 115 (2.3%) | n/a | 181 (3.6%) | 388 (7.8%) | n/a | 1300 (26.0%) | n/a | 2703 (54.1%) | 82 (1.6%) | 110 (2.2%) |
| 3-5-2 | 4 (0.1%) | 104 (2.1%) | n/a | 96 (1.9%) | n/a | 468 (9.4%) | n/a | n/a | n/a | 4238 (84.8%) | 49 (1.0%) | 41 (0.8%) |
| 3-4-3 | 11 (0.2%) | 89 (1.8%) | n/a | 85 (1.7%) | n/a | 242 (4.8%) | n/a | n/a | 2644 (52.9%) | 1852 (37.0%) | 54 (1.1%) | 23 (0.5%) |
| 3-4-2-1 | 8 (0.2%) | 112 (2.2%) | n/a | n/a | n/a | 268 (5.4%) | 1457 (29.1%) | 881 (17.6%) | n/a | 2075 (41.5%) | 71 (1.4%) | 128 (2.6%) |
| 5-3-2 | 10 (0.2%) | 116 (2.3%) | n/a | 92 (1.8%) | n/a | 462 (9.2%) | n/a | n/a | n/a | 4223 (84.5%) | 49 (1.0%) | 48 (1.0%) |

### Random bot, by group

| Formation | GK | CB | FB+WB | DM | GK+CB+FB+WB+DM | CM+AM+WM | W | ST | Bench | No goals | Tied on top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-3-3 | 8 (0.2%) | 60 (1.2%) | 64 (1.3%) | 109 (2.2%) | 241 (4.8%) | 234 (4.7%) | 2624 (52.5%) | 1825 (36.5%) | 52 (1.0%) | 24 (0.5%) | 1359 (27.2%) |
| 4-4-2 | 13 (0.3%) | 56 (1.1%) | 81 (1.6%) | n/a | 150 (3.0%) | 1081 (21.6%) | n/a | 3664 (73.3%) | 54 (1.1%) | 51 (1.0%) | 1422 (28.4%) |
| 4-2-3-1 | 9 (0.2%) | 92 (1.8%) | 87 (1.7%) | 246 (4.9%) | 434 (8.7%) | 2272 (45.4%) | n/a | 2113 (42.3%) | 76 (1.5%) | 105 (2.1%) | 1528 (30.6%) |
| 4-1-4-1 | 9 (0.2%) | 112 (2.2%) | 115 (2.3%) | 181 (3.6%) | 417 (8.3%) | 1688 (33.8%) | n/a | 2703 (54.1%) | 82 (1.6%) | 110 (2.2%) | 1361 (27.2%) |
| 3-5-2 | 4 (0.1%) | 104 (2.1%) | 96 (1.9%) | n/a | 204 (4.1%) | 468 (9.4%) | n/a | 4238 (84.8%) | 49 (1.0%) | 41 (0.8%) | 1259 (25.2%) |
| 3-4-3 | 11 (0.2%) | 89 (1.8%) | 85 (1.7%) | n/a | 185 (3.7%) | 242 (4.8%) | 2644 (52.9%) | 1852 (37.0%) | 54 (1.1%) | 23 (0.5%) | 1328 (26.6%) |
| 3-4-2-1 | 8 (0.2%) | 112 (2.2%) | n/a | n/a | 120 (2.4%) | 2606 (52.1%) | n/a | 2075 (41.5%) | 71 (1.4%) | 128 (2.6%) | 1541 (30.8%) |
| 5-3-2 | 10 (0.2%) | 116 (2.3%) | 92 (1.8%) | n/a | 218 (4.4%) | 462 (9.2%) | n/a | 4223 (84.5%) | 49 (1.0%) | 48 (1.0%) | 1237 (24.7%) |

### Rule check, kanto151

- Limit: strictly more than 10% of the 5000 runs of one cell (one formation and one bot).
- Single-group cells over the limit (GK, CB, FB+WB, DM): none.
- Combined cells over the limit (GK+CB+FB+WB+DM): none.
- Highest single-group share: 4.9% (DM, 4-2-3-1, random bot, 246 of 5000, standard error 0.31 points).
- Highest combined share: 8.7% (GK+CB+FB+WB+DM, 4-2-3-1, random bot, 434 of 5000, standard error 0.40 points).
- Excluding the no-goal runs from the denominator, the highest combined share is 8.9% (434 of 4,895 runs with a Boot, 4-2-3-1, random bot) and the highest single-group share is 5.0% (246 of 4,895, DM, same cell). The answer does not change.

## Reading the numbers

- **How a back-line or midfield player wins at all.** Open-play scorer weight is SHO times the role factor (`src/engine/match.ts:173-176`): ST 1, W 0.85, AM 0.6, WM 0.45, CM 0.22, DM 0.2, WB 0.1, FB 0.08, CB 0.08, GK 0 (`src/engine/coefficients.ts:100-111`). A DM or CB slot still gets goals, so in a low-scoring cup one of them can top the tally.
- **How a keeper wins.** The GK factor is 0, which removes it from open play (`src/engine/match.ts:166-167`). Its only route is a penalty: 6% of user goals are penalties (`penaltyShare`, `src/engine/match.ts:153`) and go to the highest-SHO starter whatever the slot (`src/engine/match.ts:168`). Keepers won 89 of 80,000 cup8 runs and 85 of 80,000 kanto151 runs. The most in any cell is 15 of 5,000 (0.3%, 4-4-2, random bot, cup8).
- **Ties.** In cup8 the Boot is shared on goals in 14.3% of good-bot runs (5,720 of 40,000) and 27.4% of random-bot runs (10,967 of 40,000). The tie-break is assists, then fewer appearances, then the lowest species id. The random bot's squads score less, so shared totals are common.
- **Bench winners are rare.** In cup8: 0.1% of good-bot runs (41 of 40,000) and 1.2% of random-bot runs (479 of 40,000). In kanto151: 0.3% (126 of 40,000) and 1.2% (487 of 40,000).
- **Formation.** For the random bot, the two highest combined cells are 4-2-3-1 and 4-1-4-1, the only formations with a DM slot and no W slot. The DM column is the largest part of both (265 of 428 and 173 of 401). The other six formations range from 2.9% to 5.5%. This is a reading of the tables and the role factors, not a tested cause.
- **Bots.** The random bot puts random species into random slots (`randomBot` in `scripts/calibration/bots.ts`), so a strong shooter often sits in a low-factor slot. The good bot fills slots by role value (`visible`). Which part explains the gap between them (at most 2.2% combined for the good bot, up to 8.6% for the random bot, cup8) was not isolated.
- **Scale check against the earlier sample.** `docs/reports/finish-ratings-notes.md` logged 1 of 20 Boots to a CB, DM or CM on engine-3. In 4-3-3 with the two bots pooled, this run measures 570 of 10,000 (5.7%) for CB+DM+CM (108 for the good bot, 462 for the random bot), in line with that note. CM is not a rule role; it is included only to compare with the note.

## Checks beyond the unit test

The pure helpers (`winnerBucket`, `exceedsLimit`, `GROUPS`) have literal-input tests in `scripts/calibration/golden-boot-by-role.test.ts`. Three further checks used throwaway scripts that are not committed, so they cannot be reproduced from this change alone:

- Against `play-seeded.mts`: for the good bot in 4-3-3, seeds 1, 3, 5 and so on to 59 (30 runs), the winner, role, goals, assists and appearances equal the `awards boot=` line of `play-seeded.mts --n 60 --prefix gb7-4-3-3-good`.
- Bench winners: in four cup8 cells (4-3-3 good bot, and 4-3-3, 4-2-3-1, 4-1-4-1 random bot) all 197 bench winners were in the lineup's bench, covered an absence in a played match, and had goal events equal to their tally.
- Keeper winners: all 33 keeper wins in those four cells were penalty goals only. The 1,154 winners from GK, CB, FB, WB and DM in those cells averaged 2.04 goals, and 505 of them shared the top goal count.

## Caveats

- Bots are not people. `good` is a greedy picker on visible role value and `random` picks a random offer into a random empty slot. Real squads sit elsewhere, and a player who stacks defenders or plays players out of position can land outside these shares. This measures the engine under two fixed policies, not user behavior.
- The seeds (`gb7-...`) are fixed and differ from any user's seeds. The runs are deterministic, so rerunning adds no information. The standard errors (binomial, from the observed share) say how far a different set of 5,000 seeds would move a cell: 0.3 to 0.4 points for the top cells.
- Bench winners are counted as `Bench` (see the tables), not as the slot they covered, so a substitute who covered a DM slot is not in the DM column.
- Scope: engine-3 at `928e4b1`; cup8 and kanto151 only (builder mode has no cup); the `good` and `random` bots (`oracle` was not run). A later change to the engine, coefficients, species data or bots needs a rerun.
- The rule is applied per cell (one formation, one bot) on all 5,000 runs. Dropping the no-goal runs from the denominator raises the top cells slightly and does not change the answer.
- Columns outside the rule (CM, AM, WM, W, ST) are shown only so each row accounts for all 5,000 runs. For example, WM at 10.0% in 4-1-4-1 for the good bot in cup8 (500 of 5,000) is not a rule cell.
