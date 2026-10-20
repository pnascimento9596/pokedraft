# Engine 7: goal kind weighted by attributes (row 6b5, Red)

Branch `feat/engine7-goal-kind`, base `origin/main` `f7448f9b` (the 6b4 squash). Dormant: the
new behaviour sits behind `ENGINE_COEFFICIENTS.goalKind.weighted`, false live and true in
`ENGINE_COEFFICIENTS_V7`. Engine 6 output is unchanged (parity below).

## Scope

Under engine 7, who is in the attack decides how a goal goes in. A side whose forwards are strong
in the air scores more headers. A side whose forwards dribble and run scores more solo goals. Free
kicks keep their share and open play takes the rest.

The row also carries the three 6b4 Red review carryovers. The opponent's keeper cover no longer
builds a reserve every window. `bossRoster` and `bossReserve` share one sliding-window function.
Each opponent reserve draws on a scope of its own.

## Files

- `src/engine/coefficients.ts` and `coefficients-v7.ts` add `goalKind: { weighted, header, solo }`.
  Live is `{ weighted: false, header: 0, solo: 0 }`. V7 is `{ weighted: true, header: 1, solo: 1 }`.
- `src/engine/match.ts` adds the exported `goalKindOf(roll, pool, c)`, which `goalEvent` calls
  with the draw it already made. It also changes the opponent injury path (carryovers 1 and 3).
- `src/engine/opponents.ts` adds `rungWindow` and `bossHasReserve`, and gives `bossReserve` the
  reserve ordinal `n` (carryovers 1 to 3).
- Tests:
  - `src/engine/__tests__/goal-kind.test.ts` (new).
  - `opponent-injuries.test.ts` gains the re-injury guard and the new scope literal.
  - `rate-parity.test.ts` gains the `goalKind` mutation self-test.

## The rule

`goalKindOf` keeps the single kind draw on the `event` stream, at the same position and count.

- With `weighted` false, it returns engine 6's literal thresholds: header below 0.12, free kick
  below 0.2, solo below 0.38, otherwise open play. The code branches on the flag, so no live
  threshold goes through a multiply.
- With `weighted` true:
  - The attackers are the side's ATT line on the pitch at the moment of the goal. If that line is
    empty, the whole pool stands in.
  - The header share is 0.12 times `1 + header * (mean AER / dex mean AER - 1)`, clamped to 0.6 to
    1.5.
  - The solo share is 0.18 times the same form with `solo` and `mean(DRI, ACC)`, clamped the same
    way.
  - Free kick stays 0.08. The thresholds stack in engine 6's order: header, free kick, solo, open
    play.
- The dex means are computed once at module load from `SPECIES`: 1025 species, mean AER 61.634,
  mean `(DRI + ACC) / 2` 58.538. This uses no `exp`, `log`, `pow` or `Date`, and it does not read
  `ENGINE_COEFFICIENTS` at module scope, so the 6b1 source-scan guard still passes.

The two weights are the sensitivity of each share to the attackers. At weight 1 the share moves in
proportion to the ratio. At weight 0 it does not move at all. 6b8 can tune them.

## RED commits

Carryover 3, `15e45ed6`. 1 of 10 failed:

```
     × panel-87 match 3: Sawk (539) goes off at 6' for Hitmonlee (106), and Hitmonlee at 48' for Pheromosa (795) 8ms
AssertionError: expected [ [ 6, 8, 539, 795 ], …(1) ] to deeply equal [ [ 6, 8, 539, 106 ], …(1) ]
-     106,
+     795,
    ],
    [
      48,
      8,
-     106,
      795,
+     923,
 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
```

GREEN `8727a258`.

Goal kind, `fee98251`. 2 of 3 failed; the engine 6 regression guard passed:

```
     × a high-AER attack heads in 1,706 of 10,000 goals and a low-AER one 922 5ms
     × a high-DRI and ACC attack scores 2,674 solo goals of 10,000 and a low one 1,301 2ms
AssertionError: expected { Object (header, free-kick, ...) } to deeply equal { Object (header, free-kick, ...) }
-   "free-kick": 793,
-   "header": 1706,
-   "open-play": 5422,
-   "solo": 2079,
+   "free-kick": 783,
+   "header": 1266,
+   "open-play": 6134,
+   "solo": 1817,
 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

Both sides in a match, `13e8ebbd`. 3 of 4 failed:

```
     × panel runs 0 to 49: 63 of 495 user goals and 7 of 177 opponent goals change kind, none moves 401ms
    "moved": 0,
    "opp": {
-     "changed": 7,
+     "changed": 0,
      "goals": 177,
    },
    "user": {
-     "changed": 63,
+     "changed": 0,
      "goals": 495,
    },
 Test Files  1 failed (1)
      Tests  3 failed | 1 passed (4)
```

GREEN `ef73c0d7`. `c5050a04` adds one comment line and changes no behaviour.

The guard's attacks, three forwards each:

| Attack | Species | Attribute | Header | Solo |
| --- | --- | --- | --- | --- |
| High AER | Honchkrow, Conkeldurr, Fearow | AER 85, 85, 84 | 1,706 | 2,079 |
| Low AER | Kartana, Shaymin, Togedemaru | AER 44, 46, 44 | 922 | 2,706 |
| High carry | Dodrio, Krookodile, Darmanitan | mean(DRI, ACC) 89.5, 82, 83.5 | 1,716 | 2,674 |
| Low carry | Armaldo, Druddigon, Golurk | mean(DRI, ACC) 42, 41, 41.5 | 1,762 | 1,301 |

Each row counts 10,000 draws from `createEngineRng("goal-kind-guard")` under V7. At the live
coefficients all four attacks give the same 1,266 headers, 783 free kicks, 1,817 solo goals and
6,134 open-play goals. That is the regression guard with no RED, because the behaviour was already
correct. Every factor in the table sits inside the clamp, so the guard checks the linear part of
the rule.

Refactors with no RED, because they change no output:

- `1afaa90d` shares `rungWindow` and adds `bossHasReserve` (carryovers 1 and 2). 300 golden panel
  runs, each in cup8 and kanto151, hash the same before and after at both coefficient sets: live
  `50b57abb...`, V7 `bc5920f8...`.
- `c99360b7` moves the kind thresholds into `goalKindOf(roll)` unchanged. `pnpm vitest run
  src/engine` passed 359 tests at that commit.

## Carryovers from the 6b4 Red review

1. **Keeper cover built a reserve every window.** The keeper's injury item called `bossReserve`
   before the hazard check, building the reserve list and an rng each time. The review counted
   7,848 such draws for about 100 injuries in 90 runs; I did not re-count. `bossHasReserve` now
   answers "can someone take the gloves" from the themed pool alone, with no rng. The reserve is
   built only after the injury roll succeeds. The two always agree: `bossReserve` returns null only
   when no unused member is left, and any unused member makes the window non-empty.
2. **Two copies of the sliding-window formula.** Both now call `rungWindow`. `bossRoster`'s themed
   pools always hold at least eleven members, so the shared `Math.max(0, ...)` never changes its
   start. The hashes above confirm it.
3. **A re-injured slot reused its scope.** Each reserve now draws on `inj:<match>:<slot>:<n>`, where
   `n` is the number of reserves the club has already sent on in this match. The first scan of
   golden panel runs under V7 found the first re-injured slot at panel-87 match 3. Pheromosa came on
   for Sawk and then Pawmot for Pheromosa, both drawn on scope `inj:3:8`. Six such matches appear
   in runs 0 to 299.

V7 literals that moved with carryover 3: panel-87 match 3, now Hitmonlee then Pheromosa. The first
reserve moved too, because the scope rename applies to every reserve. The 6b4 literals did not
move: panel-10's Monferno, the 50-run census (71 injuries, 71 reserves, 425 rotations) and
`e2e/opponent-injuries.spec.ts` (Tinkatuff for Tinkatink). The scope guard now pins the first draw
of `inj:0:9:0` (2134766504). Engine 6 is unchanged: the live 300-run hash stayed `50b57abb...`.

## Measurements

Kinds probe, `nice -n 10 pnpm exec tsx scripts/calibration/probe.mts --probe kinds --n 2000`.
Good bot, 4-3-3, draft seeds `probe-4-3-3-good-<i>`, i = 1..2000. Intervals are Wilson 95%. The
middle column patches only `{"goalKind":{"weighted":true,"header":1,"solo":1}}` onto the live
coefficients, so it isolates this row. The V7 column is the whole candidate (6b1 to 6b5).

| | Live (engine 6) | goalKind only | V7 |
| --- | --- | --- | --- |
| sha256 | `7bef9749...` | `4810ddbb...` | `06a0f6d4...` |
| wall | 13.8 s | 14.0 s | 15.3 s |
| matches | 13,914 | 13,914 | 13,949 |
| user goals | 42,344 | 42,344 | 45,006 |
| user header | 0.1118 [0.1088, 0.1148] | 0.1357 [0.1325, 0.1390] | 0.1355 [0.1324, 0.1387] |
| user solo | 0.1673 [0.1638, 0.1709] | 0.2365 [0.2324, 0.2405] | 0.2381 [0.2342, 0.2420] |
| user free kick | 0.0733 [0.0709, 0.0758] | 0.0752 [0.0728, 0.0778] | 0.0751 [0.0727, 0.0775] |
| user open play | 0.5884 [0.5837, 0.5931] | 0.4935 [0.4887, 0.4982] | 0.4955 [0.4909, 0.5001] |
| opponent header | 0.1076 [0.0996, 0.1161] | 0.1357 [0.1269, 0.1451] | 0.1374 [0.1288, 0.1464] |
| opponent solo | 0.1701 [0.1604, 0.1803] | 0.2128 [0.2021, 0.2238] | 0.2166 [0.2063, 0.2273] |

The live column reproduces `docs/reports/engine-7/baseline-v6.json` exactly: 13,914 matches,
42,344 user goals and the same quartile counts.

User header share by the ATT line's mean AER (quartile cuts 69, 75 and 80.67, the same as the
baseline):

| Quartile | Mean AER | Baseline v6 | goalKind only | V7 |
| --- | --- | --- | --- | --- |
| 1 | 63.61 | 0.1118 [0.1059, 0.1180] | 0.1169 [0.1109, 0.1232] | 0.1167 [0.1108, 0.1228] |
| 2 | 72.11 | 0.1141 [0.1082, 0.1203] | 0.1335 [0.1271, 0.1400] | 0.1339 [0.1278, 0.1403] |
| 3 | 77.90 | 0.1082 [0.1024, 0.1143] | 0.1365 [0.1300, 0.1432] | 0.1359 [0.1297, 0.1424] |
| 4 | 85.04 | 0.1129 [0.1071, 0.1190] | 0.1555 [0.1487, 0.1624] | 0.1552 [0.1487, 0.1619] |

Engine 6's header share is flat across the quartiles. With the rule, it rises from 0.117 to 0.155.
The two intervals do not overlap.

The rule also lifts the overall header and solo shares. This is a consequence of the rule as
specified, and it matters for 6b8. A drafted attack is stronger than the average Pokémon. The
probe's lowest AER quartile still averages 63.6 against a dex mean of 61.6, so almost every drafted
attack scores more headers and more solo goals than engine 6 gives. Open play falls from 0.588 to
0.494. Goal counts do not change (42,344 in both live columns), because the kind decides only how
a goal is scored, not whether. 6b8 can lower the weights, or it can centre the rule on a drafted
attack instead of the dex. This row does not change the formula.

V7 user goals moved from 6b4's 45,004 to 45,006. Carryover 3 gives some opponent reserves new
players, and a reserve's stamina and shooting change the club's energy and scorer pool.

Parity:

- `v6-parity.test.ts`: 50 runs byte for byte.
- `v6-parity.slow.test.ts` (`SLOW_TESTS=1`): 200 runs byte for byte.
- `rate-parity.test.ts`: 123 matches and 12,946 trials, each identical at the live coefficients,
  plus five mutation self-tests. The new self-test switches `goalKind` on. It finds 24 matches that
  diverge first on the user's side. At each first divergence the trial differs in `kind`, or in
  `kind`, `shooter` and `slot`, and in no other field.
- `goalKind` reaches the opponent's goals as well: the 50-run match-level guard changes the kind of
  7 of 177 opponent goals. The rate self-test reports no opponent-first divergence because the
  user's goals diverge earlier in every match that diverges.
- `goldens.test.ts` has an empty diff against `origin/main` and passes.

## Product decisions applied

- The hand-off's 6b5 rule: one kind draw on `event`, header scaled by AER, solo by mean(DRI, ACC),
  each over the dex mean and clamped to 0.6 to 1.5 times the base share, free kick fixed, open play
  the remainder, dex means precomputed.
- No UI. The broadcast already renders every goal kind.

## Implementation decisions

- **The attackers are the ATT line on the pitch.** The probe already measures header share by "mean
  AER of the ATT-line starters", so the rule and its measurement use the same definition. Using
  players on the pitch means substitutes and injury reserves count from the minute they come on.
  The whole pool stands in only when the ATT line is empty, for example after a red card in a
  one-striker formation.
- **Two weights as sensitivities.** The hand-off names "two weights" without a formula. A linear
  sensitivity, `1 + w * (ratio - 1)`, needs no `pow`, makes weight 0 a no-op even with the flag
  on, and gives 6b8 one number per share to tune.
- **Live weights are 0.** With `weighted` false the weights are never read. Setting them to 0 means
  a calibration patch that turns on only `weighted` also changes nothing.
- **A pure exported `goalKindOf`.** The guard drives the kind draw directly with 10,000 seeded
  rolls, so the counts depend on nothing but the attack. A first commit moved the thresholds out of
  `goalEvent` unchanged, so the RED fails on its assertions, not on a missing export.
- **The assist draw.** Engine 6 already draws for an assist only after an open-play goal or a
  header (`match.ts`, `goalEvent`). A weighted kind therefore changes the `event` stream's later
  draws under V7. This is engine 6's existing variable count on `event`, not a new draw, and it
  never touches `struct` or `hazards`: the match-level guard shows no goal moving in minute or
  side.
- **The reserve ordinal is club-wide.** `n` counts the club's reserves in the match, which already
  exists as `oppSubs`. It is unique per injury because each reserve increments it.

## Brief vs code

- **Where AER, DRI and ACC live.** The row brief points to `src/data/pokedex.json` for them. That
  file holds base stats only. The football attributes come from `src/data/scouting.json` `attrs`,
  which `species.ts` loads into `SPECIES`. The dex means read `SPECIES`, and `src/data` is
  byte-identical.
- **Goal kind code location.** The hand-off codemap places the kind roll at `match.ts:352-361`. At
  this branch's base it was in `goalEvent` at `match.ts:440-449` (`origin/main`). The behaviour matched.
- **Kind already in the rate observation.** The row brief asks to extend the observation to compare
  kind if it does not already. `ChanceObservation` already carries `kind`, so the rate self-test
  needed no harness change.
- **The 6b4 opponent injury literals held** under the scope change, as listed above.

## NOT RUN

- GLM review and the independent Red reviewer (the coordinator's job).
- Hosted CI.
- The full Playwright suite. I ran these on chromium only: `opponent-injuries`, `v7-switch`,
  `penalty-takers`, `set-pieces`, `watch-live`, `results-reveal`, `share` and `injury-staging`.
- A probe of the V7 candidate without this row's flag. The CLI's `v7` loads the whole candidate,
  and the goalKind-only column isolates this row instead.
- A recount of the keeper-cover draws the 6b4 review reported.
- Owner phone check and screen reader pass. The row has no UI change.

## Carryovers

- For 6b8: the weighted rule lifts header and solo shares for nearly every drafted attack (header
  0.112 to 0.136, solo 0.167 to 0.237 on the kinds probe). Decide whether to lower the weights or to
  centre the ratio on a drafted attack's mean.
- `e2e/data-split.spec.ts` still routes only `**/_next/static/chunks/**` (from 6b4, untouched here).
