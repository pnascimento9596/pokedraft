# Calibration probe and engine 6 baselines

Tier Green. Wave 6 row 6p. Branch `chore/calibration-probe` off `origin/main` at `9e4802b`.
Scripts and docs only. `git diff origin/main -- src` is empty, so engine output cannot move and
`src/engine/__tests__/goldens.test.ts` is byte-identical.

Files:

- `scripts/calibration/probe.mts` is the CLI. `scripts/calibration/probe-modes.ts` holds the modes.
- `scripts/calibration/stats.ts` holds Wilson, Newcombe, bootstrap and quartile helpers.
- `scripts/calibration/coeffs.ts` is the `--coeffs` loader, now shared with `scripts/calibrate.mts`.
- `scripts/calibration/probe.test.ts` runs every mode at `--n 2` and checks the JSON shape.
- `scripts/calibration/summarize-baseline.mts` builds the committed summary from the raw outputs.
- `docs/reports/engine-7/baseline-v6.json` is the committed summary.
- `docs/reports/engine-7/type-matchup-prototype.patch` is the decision 10 prototype.

## Scope

The probe is audit A's scratch harness
(`/Users/paulo/Downloads/pokedraft-wave6-probe-2026-10-17/probe.mts`), ported:

- `@/` imports instead of absolute paths.
- `--coeffs <json>` deep-merges a patch file exactly like `pnpm calibrate`. Both now call
  `loadCoefficients` in `scripts/calibration/coeffs.ts`, so 6b1's `--coeffs v7` lands in one place.
- `--out` defaults to `scripts/calibration/out/probe-<mode>.json` (gitignored, `.gitignore:45`).
  The JSON holds no wall time, so two runs at one head give the same sha256. Stderr prints the
  sha256 and the wall time.
- `--bot` takes a comma list. Defaults: `manager`, `informed`, `noop`, `oracle` run good and
  random; `luck` and `upsets` run random, good and oracle; the rest run good.
- Seeds are unchanged: draft seed `probe-<formation>-<bot>-<i>`, bot rng
  `play:probe:<formation>:<bot>:<i>`, `luck` cup seeds `luck-<bot>-<i>-<s>`. Every output records
  its seed scheme.
- New modes: `informed`, `noop`, `oracle`, `shootouts`, `kinds` (definitions below).

Intervals. A proportion is count of n with a 95% Wilson interval. A difference against auto uses
Newcombe's hybrid score interval built from the two Wilson intervals. The probe's arms are paired
(the same matches), so that interval is conservative; each arm also reports its discordant win
counts. Squad share of variance and `luck` mean wins use a 1,000-resample percentile bootstrap over
squads, seeded `probe:bootstrap:luck:<bot>:<stat>`. Formation means use a normal interval.

## Gates

At `2a92ad3` (the later docs commit changes only `STATE.md` and this file):

- `pnpm lint`, `pnpm typecheck`, `pnpm build` exited 0.
- `pnpm test`: 2,013 passed in 230 files.
- `pnpm vitest run scripts/calibration`: 20 passed in 2 files (`probe.test.ts` 15,
  `golden-boot-by-role.test.ts` 5).
- `check-retained-replays.mts .next/server/chunks` exited 0 (10 emitted golden replays passed).
  `measure-retained-json.mjs` exited 0.
- All nine `check:*` scripts exited 0.
- Prettier passed on every touched file.

The test is new tooling, not a behaviour fix, so it has no RED commit. Regression guard, no RED:
behaviour already correct.

`calibrate.mts` parity. The refactor moved `deepMerge` into `coeffs.ts`. The old file
(`git show origin/main:scripts/calibrate.mts`) and the new one wrote byte-identical JSON at
`--n 30` with a patch (`--rows cup8-full,kanto151`, sha256 `bbba4550...`) and without one
(`--rows cup8-full`, sha256 `d98424fe...`). An unknown key still throws
`TypeError: --coeffs .shootout.bnd: unknown coefficient`.

## Audit A reproduces

All runs used `nice -n 10` at `55aabb2`, the same engine as `9e4802b`. Raw outputs and their
sha256 are in `baseline-v6.json` under `sources`.

| probe | audit A (preserved output) | this harness |
| --- | --- | --- |
| `luck` good, 150 x 40 | share 0.113, mean wins 5.885, SD within 0.944, between 0.338 | 0.113, 5.885, 0.944, 0.338 |
| `luck` random | 0.379, 3.241 | 0.379, 3.241 |
| `luck` oracle | 0.072, 6.286 | 0.072, 6.286 |
| `manager` good, 400 | auto .848, styleRule .846, oracle .886, flip .118, 2,787 matches | identical |
| `manager` random, 400 | auto .682, oracle .741, flip .26, 1,910 matches | identical |
| `upsets`, 600 per bot | 6,017 KO, ET .185, shootouts .098, user wins .494 | identical, every gap row identical |
| `formations` good and oracle, 400 | for example 4-3-3 good 5.908 wins | 5.9075 (the audit rounded half up), every row equal |

The port changed nothing.

## Engine 6 baselines

Good bot, cup8, 4-3-3 unless stated. Values with a 95% interval.

**P1, informed vs auto** (`--probe informed --n 400`). The informed manager sets the scout's best
favourable tactic at kickoff and does nothing else.

| bot | matches | auto win | informed win | informed minus auto |
| --- | --- | --- | --- | --- |
| good | 2,787 | 84.8% [83.4, 86.1] | 83.7% [82.3, 85.0] | -1.1 points [-3.0, +0.8] |
| random | 1,910 | 68.2% [66.1, 70.3] | 63.6% [61.4, 65.7] | -4.7 points [-7.7, -1.7] |

**P3, no-op cost** (`--probe noop --n 400`, Balanced at kickoff):

| bot | no-op win | no-op minus auto | discordant (no-op only, auto only) |
| --- | --- | --- | --- |
| good | 84.0% [82.6, 85.4] | -0.75 points [-2.7, +1.2] | 1, 22 |
| random | 62.9% [60.7, 65.1] | -5.3 points [-8.3, -2.3] | 2, 103 |

**P2, hindsight** (`--probe oracle --n 400`, best of the five fixed tactics and auto per match):

| bot | oracle win | oracle minus auto |
| --- | --- | --- |
| good | 88.6% [87.4, 89.7] | +3.8 points [+2.0, +5.6] |
| random | 74.1% [72.1, 76.0] | +5.9 points [+3.0, +8.7] |

Engine 6 fails P1 and P3 today. One kickoff decision turns the assistant off, so the cost is the
lost auto tactic and fatigue subs, not the tactic choice. That matches audit A's 5-point finding.
6b1 (split `managed`) and 6b2 (larger edges) target exactly this.

**P4, shootouts** (`--probe shootouts --n 15000`, 15,000 cups, 59,226 KO matches): 5,245
shootouts, rate 8.9% [8.6, 9.1] of good-bot KO matches, user wins 50.5% [49.2, 51.9], 0 coin
deciders. The edge is the user's mean `penaltyEdge` over the first five takers against the
opponent keeper, minus the opponent's against the user keeper. Cuts -7.65, 3.10, 14.95.

| quartile | n | edge range | user win |
| --- | --- | --- | --- |
| 1 | 1,315 | -50.1 to -7.65 | 45.9% [43.3, 48.6] |
| 2 | 1,310 | -7.6 to 3.1 | 50.9% [48.2, 53.6] |
| 3 | 1,311 | 3.1 to 14.95 | 49.0% [46.3, 51.8] |
| 4 | 1,309 | 15.0 to 71.75 | 56.2% [53.5, 58.9] |

Top minus bottom: +10.3 points [+6.5, +14.1], and the quartile intervals do not overlap. Engine 6
already meets P4's wording. The 0.1 band does reward quality at the tails, which the 49.4% overall
rate hid. The probe rebuilds each side's taker order from the final on-pitch eleven and throws if
it disagrees with the recorded kicks. It never threw.

**Goal kinds** (`--probe kinds --n 2000`, 13,914 matches, 42,344 user goals): open play 58.8%
[58.4, 59.3], solo 16.7% [16.4, 17.1], header 11.2% [10.9, 11.5], free kick 7.3% [7.1, 7.6],
penalty 5.9% [5.7, 6.1]. Opponent goals (5,466): open play 57.8% [56.5, 59.1], solo 17.0%
[16.0, 18.0], header 10.8% [10.0, 11.6], free kick 8.4% [7.7, 9.2], penalty 6.0% [5.4, 6.6]. The kind
roll is the same for both sides and implies 7.5% free kicks. The opponent's interval sits just
above it. With ten intervals at 95%, one miss is expected, so I do not read it as a signal (guess,
not tested). Penalties:
2,833 goals, 0.204 per match. Conversion is 1 by construction, because engine 6 relabels a goal
(`match.ts:790-791`) and has no missed penalty. Header share by the user's mean ATT-line AER
quartile (cuts 69, 75, 80.7): 11.2% [10.6, 11.8], 11.4% [10.8, 12.0], 10.8% [10.2, 11.4],
11.3% [10.7, 11.9]. Flat, as expected from the team-independent kind roll (6b5's target).

**P9, squad share of variance** (`--probe luck --n 150 --seeds 40`): good 11.3% [9.5, 13.3],
random 37.9% [32.7, 42.9], oracle 7.2% [5.4, 8.9].

**P5, P6, P8** (`pnpm calibrate --n 5000`, 90,000 cups, sha256 `9bf7876f...`):

- Flawless buckets, pooled: 840 4.1% [3.7, 4.6] (357 of 8,678), 900 12.8% [12.1, 13.6] (1,036 of
  8,063), 950 30.1% [29.5, 30.8] (6,085 of 20,194). Against the v4 intervals, 900 and 950 overlap
  and 840 sits above [2.97, 3.72] already at engine 6.
- Mean wins, cup8-full: good 5.86, oracle 6.26, random 3.24. kanto151 random 3.30.
- Attacking roles scored 68.5% of 1,640,586 user goals, under P8's 70% to 80% band at engine 6.

**P7, win curve** (`win-curve.mts --n 5000`): every row within 0.030 of the v4 table. The
largest gap is KO W at -50 (0.377 against 0.347). Full table in `baseline-v6.json`.

**Upsets and formations** match audit A (table above); full rows in `baseline-v6.json`.

## Wall times on this machine

Under `nice -n 10`, sequential, with the sibling 6-0 worktree possibly building:

| run | seconds |
| --- | --- |
| `luck` 150 x 40, three bots | 108 |
| `manager` 400, two bots | 132 |
| `upsets` 600 per bot | 11 |
| `formations` 400, two bots | 44 |
| `informed` 400, two bots | 32 |
| `noop` 400, two bots | 34 |
| `oracle` 400, two bots | 143 |
| `shootouts` 15,000 cups | 108 |
| `kinds` 2,000 | 13 |
| `pnpm calibrate --n 5000` | 678.4 |
| `win-curve.mts --n 5000` | 91 |
| prototype `luck` good 150 x 40 | 41 |
| prototype `win-curve.mts --n 5000` | 89 |

## Decision 10 prototype: FAIL, 6b7 is dropped

Applied audit A's formula (A:1929-1934) to `src/engine/match.ts` on a local branch,
`scratch/type-matchup-prototype`. It was never pushed and is deleted. The patch is saved as
`docs/reports/engine-7/type-matchup-prototype.patch` and applies cleanly to `origin/main`.

- `typeEdge` = mean over user ATT-line starters of "one of its types is super effective against
  the opponent's theme" minus the mean over opponent ATT-line starters of "the share of user
  DEF-line starters it hits super effectively". Both use `superEffective` (`type-chart.ts:23-25`).
- The user's rate is scaled by `1 + 0.06 * edge` and the opponent's by `1 - 0.06 * edge`, each
  clamped to [0.92, 1.08].

| measure | engine 6 | prototype | pass line |
| --- | --- | --- | --- |
| good-bot squad share (150 x 40) | 11.3% [9.5, 13.3] | 11.1% [9.3, 13.1] | at least 18% |
| good-bot mean wins | 5.885 | 5.867 [5.81, 5.92] | |
| win curve, largest row gap to v4 | 0.030 | 0.022 (group W at +100) | at most 0.03 |

P9 fails by 7 points and the share did not move. The win curve stays inside P7. Per decision 10
the measurement decides: 6b7 does not exist, and 6b8 records it. The hand-off expected this. The
edge is at most plus or minus 6% of one side's rate. The seed-to-seed spread is 0.95 wins against
0.34 between squads, so the edge is too small to move the share.

## Decisions

- **The informed tactic comes from the coefficients under test.** It applies `intel.ts`'s rule
  (own over gives, `EDGE_MARGIN` 0.04) to the probe's `--coeffs` table. At the flip the scout
  reads the candidate table, so 6b8 measures the manager the UI will coach. A test proves it agrees
  with `tacticEdge` on the live table. (Model the domain: one rule, read from one table.)
- **The audit's `styleRule` stays in `manager`.** It maps direct to Balanced, while the scout's
  rule picks Defend against direct (0.65 / 0.62 = 1.048, favourable). Keeping both lets the audit's
  .846 reproduce and gives P1 the scout's rule.
- **Shootouts use one cup per drafted squad** (`--seeds 1`), so the seed scheme is the audit's.
  15,000 cups give at least 5,000 shootouts.
- **The prototype's opponent side is a share of defenders hit.** The formula's
  `covers(oppAttacker, user DEF types)` does not match the code's `covers(a, b)`, which takes two
  species and asks whether a covers b's weaknesses. The share keeps both sides on [0, 1].
- **The prototype derives the theme when `Opponent.theme` is absent**, as the ladder does (the
  type every starter shares). `win-curve.mts` builds an opponent with no `theme` field.
- **The calibrate refactor is the only change to an existing script.** It moves code without
  changing it and is proven byte-identical above. (Laziness Protocol: one loader, no second copy
  for 6b1 to keep in step.)
- **The summary is generated, not hand-written.** `summarize-baseline.mts` rebuilds
  `baseline-v6.json` from `scripts/calibration/out/` and records each source's sha256. (Build the
  lever: 6b8 reruns the same command against the V7 candidate.)

## Brief vs code

- The hand-off says the oracle takes the best of "six fixed tactics". `TACTICS` has five
  (`types.ts:320`). The oracle is the best of the five fixed tactics and auto, six options, as in
  audit A.
- The hand-off cites the shootout rate as 9.8% of knockout matches. That figure pools the random,
  good and oracle bots (`upsets` reproduces it). The good bot alone shoots out in 8.9% [8.6, 9.1].
- `covers` (`type-chart.ts:27-31`) is not the matchup check the audit's formula names. See the
  prototype decision above.
- P6's "careless 151 placement" has no row of that name in `pnpm calibrate`. The closest is
  kanto151 random, 3.30 wins. 6b8 should name the row it pins.

## NOT RUN

- GLM review and any reviewer (the coordinator runs them).
- Playwright: no UI changed.
- The coordinator's re-run of `luck` at the head.
- A second `pnpm calibrate --n 5000` to confirm the sha256 reproduces.

## Carryovers

- P8 (68.5%) and the 840 bucket (4.1%) are outside their pins at engine 6. 6b8 starts from there,
  not from the v4 numbers.
- P4 already passes at engine 6. 6b6's wider band should keep it passing. The pin's 10-point bar
  is not a stretch.
