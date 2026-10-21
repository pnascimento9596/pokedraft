# STATE

Measured ground truth. Each PR's section cites its reviewed head and the gates run there; the merge
and its squash SHA are recorded in the next PR's STATE update.

## Engine 7 calibration

Branch `feat/engine7-calibration` off `origin/main` at `6aad55b` (the 6b6 squash). Wave 6 row 6b8 (Red). Dormant: only `ENGINE_COEFFICIENTS_V7` changes, the live coefficients and every engine code path are untouched and tokens stay pd6, so production engine output is exactly engine 6's. `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #153 merge.

- Nothing changes for a player yet.
- From the flip, reading the opponent pays a little more: every style edge sits 15% further from neutral. With a random draft, following the scout wins 3.4 points more matches than the assistant; with a good draft, 1.1 points more.
- Penalties stay as common as in engine 6 (0.204 goals per match), with about 1 in 5 saved or missed.
- The Final Boss is 7 points stronger (992 against 985), which holds flawless runs at v4's rates.

Calibrated values: `styleEdges` at scale 1.15, `penalty.awardShare` 0.0745, `ladder.score.F` 992. The band stays 0.18.

Pins at `c1f4f838`, every run `--coeffs v7` under `nice -n 10`:

- P1 informed (400 squads per bot): good +1.07 points [-0.77, +2.91], FAIL (the P1 and P2 conflict rule holds P2); random +3.41 [+0.51, +6.30], pass.
- P2 oracle: good +4.21 [+2.47, +5.96], random +9.59 [+6.80, +12.36], pass. P3 no-op: 0.00 for both bots, pass.
- P4 (17,000 cups, 5,448 shootouts): top minus bottom quartile +18.31 points [+14.59, +21.96], intervals apart, pass.
- P5 (`pnpm calibrate --n 5000`, 90,000 cups): 840 3.65% [3.28, 4.07], 900 11.81% [11.12, 12.53], 950 29.55% [28.92, 30.18], all inside v4's intervals, pass.
- P6: cup8-full good 5.912 wins [5.884, 5.939], kanto151 random 3.331 [3.299, 3.363], pass.
- P7 win curve (n 5000): worst row +0.046 (KO W at gap 0), FAIL, recorded under fallback 4. P8: 68.78% [68.71, 68.84], FAIL, recorded under fallback 4. P9 not applicable (6b7 does not exist).
- Achievements (200 good-bot cups): Giant killer at 100 2.5% [1.07, 5.72], inside 2% to 20%, so the threshold stays. Hat-trick hero 71.5% [64.9, 77.3].

No behaviour fix, so no RED commit. The parity guard covers the row: the live engine and its tests are unchanged and pass unchanged. Moved V7 literals in `tactic-edges.test.ts` and `opponent-injuries.test.ts` are listed in the decision log with old, new and why.

Gates at `c1f4f838` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,188 passed in 251 files. `pnpm vitest run src/engine`: 369 passed in 34 files.
- Parity: the 50-run test and the 200-run slow test are byte-identical, rate parity passed 7 of 7. `goldens.test.ts` and `src/engine/coefficients.ts` are byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs` exited 0.
- NOT RUN:
  - Review and hosted CI.
  - Playwright (no UI or live engine change).
  - A second decisive run to reproduce each output hash.
  - The phone check and screen reader pass.

Decision log: `docs/decisions/engine-7-calibration.md`. Summary: `docs/reports/engine-7/calibration.json`. No browser proof: the row has no UI change. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

## Engine 7 shootout band

Branch `feat/engine7-shootout-band` off `origin/main` at `5190287` (the 6b5 squash). Wave 6 row 6b6 (Red). Dormant: the live coefficients keep `shootout.band: 0.1` and tokens stay pd6, so production engine output is exactly engine 6's. `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green.

- Nothing changes for a player yet.
- From the flip, the better penalty taker wins more often. A kick converts at 0.75 plus 0.18 times the taker's edge over the keeper per 100 points, between 0.57 and 0.93 (engine 6 uses 0.1, so 0.65 to 0.85). This covers shootout kicks and engine 7's missable penalties in play. The nominated penalty taker still kicks first (6b3, already guarded).
- On the shootouts probe the band alone widens the gap in shootout wins between the best and worst taker quartiles from 0.103 to 0.164. In-play penalty conversion under V7 rises from 0.779 to 0.806.
- The shootouts probe runs under V7 again. It now follows a Boss Club reserve onto the pitch instead of throwing.

RED commits:

- `d5f8876b`: 5 of 11 failed (V7 conversion at +100, -100, +50 and past the clamp, and the rate comparison blind to kicks).
- `16c0473a`: 1 of 16 failed (the V7 shootouts probe threw at `probe-4-3-3-good-28` match 4).

GREEN commits are `ede2373d`, `acadcb7a` and `2215ce01`. `77eaf566` exports `convertProb` with no behaviour change.

Regression guard with no RED, because the behaviour was already correct: at the live coefficients +100 converts at 0.85, -100 at 0.65 and an even kick at 0.75.

Gates at `2215ce01` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` (fresh `.next`) exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,188 passed in 251 files. `pnpm vitest run src/engine`: 369 passed in 34 files.
- Parity: the 50-run test and the 200-run slow test are byte-identical. Rate parity passed 7 of 7: 123 matches with 12,946 chances and 110 shootout kicks at the live coefficients, plus six mutation self-tests. The new one sets `shootout.band` to 0.18 and sees 2 user-side divergences, each at a shootout kick. It sees kick outcomes only, so it is thin (the decision log measures how thin). `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Shootouts probe (n 15000, good, 4-3-3):
  - Live is byte-identical to the 6p baseline (`10db0f0f...`): 5,245 shootouts in 59,226 knockout matches.
  - Top minus bottom edge quartile: live 0.1029 [0.0647, 0.1407], band only 0.1641 [0.1261, 0.2014], V7 0.1930 [0.1534, 0.2318].
  - Shootout rate: live 0.0886 [0.0863, 0.0909], band only 0.0885 [0.0862, 0.0908], V7 0.0806 [0.0784, 0.0828]. The band does not change how often a shootout happens.
- Kinds probe (n 2000, good, 4-3-3): V7 in-play penalty conversion 0.8062 [0.7931, 0.8187], against 0.7789 [0.7652, 0.7921] for V7 without the band.
- Playwright (Chromium, headless, `CI=1`): 34 passed over `penalty-takers` 6, `v7-switch` 1, `opponent-injuries` 5, `shootout-suspense` 1, `results-reveal` 14, `watch-live` 3 and `set-pieces` 4. No UI changed. Screenshot churn was reverted.
- NOT RUN:
  - Review and hosted CI.
  - The full Playwright suite.
  - The phone check and screen reader pass.

Decision log: `docs/decisions/engine7-shootout-band.md`. No browser proof: the row has no UI change. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #153 (shootout band rule, plus the calibration probe onFieldAtEnd fix, dormant, Red) merged as squash `6aad55b`, reviewed head `f806b11`, GLM 5.3 Flash APPROVE in round 1 with canary `6b6-9881de54bb0fd2b33348f9be1670950a` echoed and the independent executing Red reviewer PASS on the same head. At `f806b11` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main` and 2,188 unit tests passed in 251 files (369 in `src/engine`); hosted check and all eight e2e shards green on the first run. Parity against the frozen v6 bundle held on the 50-run and 200-run panels and the per-trial rate guard (with a band self-test); the Red reviewer's own 150-run script found 0 output, rate or full-observation mismatches over 71,433 trials including 361 shootout kicks, the only live engine change is `export` on `convertProb`, live `shootout.band` stays 0.1, and the live shootouts probe was byte-identical at base and head. Production `/api/health?db=1` served `6aad55b` with engine `pokedraft-engine-6` and `db.status` ok; live check on chromium (the 6b5 set plus `shootout-suspense`) 53/53 with retries off. Engine 6 output unchanged.

## Engine 7 goal kind weighted by attributes

Branch `feat/engine7-goal-kind` off `origin/main` at `f7448f9` (the 6b4 squash). Wave 6 row 6b5 (Red). Dormant: the live coefficients keep `goalKind.weighted: false` and tokens stay pd6, so production engine output is exactly engine 6's. `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #151 merge.

- Nothing changes for a player yet.
- From the flip, a side whose forwards are strong in the air scores more headers, and a side whose forwards dribble and run scores more solo goals. Each share moves with the forwards' mean against the average Pokémon, between 0.6 and 1.5 times engine 6's share. Free kicks keep their share and open play takes the rest. On the kinds probe, the header share rises from 0.117 in the lowest AER quartile to 0.155 in the highest; engine 6 is flat at about 0.11.
- The 6b4 review carryovers: the Boss Club's keeper cover is checked without building a reserve every window, `bossRoster` and `bossReserve` share one window function, and each opponent reserve draws on its own scope `inj:<match>:<slot>:<n>`, so a re-injured slot no longer repeats the first draw.

RED commits:

- `15e45ed6`: 1 of 10 failed (the re-injured slot).
- `fee98251`: 2 of 3 failed (high against low AER, and high against low DRI and ACC, over 10,000 seeded kind draws).
- `13e8ebbd`: 3 of 4 failed (both sides' goals in a match).

GREEN commits are `8727a258` and `ef73c0d7`. `1afaa90d` and `c99360b7` are refactors with no output change.

Regression guards with no RED, because the behaviour was already correct:

- At the live coefficients every attack gets engine 6's 1,266 headers, 783 free kicks and 1,817 solo goals of 10,000.
- A rate parity self-test: `goalKind` on gives 24 user-side divergences, each first in a goal's kind.

Gates at `c5050a04` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` (fresh `.next`) exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,182 passed in 250 files. `pnpm vitest run src/engine`: 364 passed in 33 files.
- Parity: the 50-run test and the 200-run slow test are byte-identical. Rate parity passed 6 of 6: 123 matches and 12,946 trials at the live coefficients, plus five mutation self-tests. `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Kinds probe (n 2000, good, 4-3-3):
  - Live reproduces the 6p baseline: 13,914 matches and 42,344 user goals.
  - With only `goalKind` on, user header share is 0.1357 [0.1325, 0.1390] (live 0.1118) and solo 0.2365 [0.2324, 0.2405] (live 0.1673). Goal counts do not change.
  - Header share by AER quartile: 0.1169, 0.1335, 0.1365 and 0.1555 (baseline 0.1118, 0.1141, 0.1082 and 0.1129). The whole V7 candidate gives 0.1167, 0.1339, 0.1359 and 0.1552.
  - Drafted attacks sit above the dex mean, so header and solo shares rise for nearly every squad. 6b8 decides whether to lower the weights.
- Playwright (Chromium, headless, `CI=1`): 51 passed over `opponent-injuries` 5, `v7-switch` 1, `penalty-takers` 6, `set-pieces` 4, `watch-live` 3, `results-reveal` 14, `share` 17 and `injury-staging` 1. No UI changed. Screenshot churn was reverted.
- NOT RUN:
  - Review and hosted CI.
  - The full Playwright suite.
  - A probe of V7 without this row's flag.
  - The phone check and screen reader pass.

Decision log: `docs/decisions/engine7-goal-kind.md`. No browser proof: the row has no UI change. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #152 (goal kind weighted by attributes, plus the 6b4 reserve cleanups, dormant, Red) merged as squash `5190287`, reviewed head `999565b`, GLM 5.3 Flash APPROVE in round 1 with canary `6b5-b30d47f94e569338b539fcaf8fabad64` echoed and the independent executing Red reviewer PASS on the same head. At `999565b` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current and 2,182 unit tests passed in 250 files (364 in `src/engine`); hosted check and all eight e2e shards green on the first run. Parity against the frozen v6 bundle held on the 50-run and 200-run panels and the per-trial rate guard (with a goal kind self-test); the Red reviewer's own 150-run script found 0 output, rate or full-observation mismatches over 71,716 trials, the live kind branch is engine 6's literal thresholds, and the keeper-cover cleanup cut V7 `inj:` draws from 7,848 to 156 over 90 runs. The adversarial parity review found parity holds. Deploy note: Vercel did not start a production build for the merge (preview builds kept working); after 15 minutes production still served `f7448f9`, the connector was refused (403) and the classifier blocked the CLI call, so the owner approved a Git-sourced production deployment of exactly `5190287` through `vercel api /v13/deployments`. Production `/api/health?db=1` then served `5190287` with engine `pokedraft-engine-6` and `db.status` ok; live check on chromium `penalty-takers` 6, `opponent-injuries` 5, `v7-switch` 1, `share` 17, `old-links` 1, `watch-live` 3, `set-pieces` 4, `results-reveal` 14 and `health` 1, 52/52 with retries off. Engine 6 output unchanged.

## Engine 7 opponent injuries and rotation incidents

Branch `feat/engine7-opponent-injuries` off `origin/main` at `cee1ad1` (the 6b3 squash). Wave 6 row 6b4 (Red). Dormant: the live coefficients keep `opponent.injuries: false` and tokens stay pd6, so production engine output is exactly engine 6's. `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #150 merge.

- Nothing changes for a player yet.
- From the flip, a Boss Club player can be injured, with the same chance and the same draw as one of yours (0.296 per match on the kinds probe). A reserve from the club's own themed pool comes on, about as strong as its starting eleven. When it has no reserve or no sub left, it plays a player short.
- From the flip, the ticker reads "Tinkatink is injured. Tinkatuff comes on." and "Hau'oli City rotate: Magnemite rested." at the 60' and 75' rotations. Both lines get a border in the opponent's colour. The injured opponent lies down on the pitch, as your players already do. The results list shows the same lines. An opponent's injury never stops a managed match, and it never counts against your match star.
- Each window records the Boss Club's rounded outfield energy (`oppEnergy`) under engine 7.
- The e2e engine 7 switch now also matches Vercel's `/_next/static/immutable/chunks/` path (6b3 live-check carryover). A guard keeps live `takers.freeKickWeight` at 1 while tokens are pd6 (6b3 review carryover).

RED commits:

- `b42ab5a7`: 5 of 9 failed.
- `5fbcff44`: 7 of 7 failed.
- `cb7382cf`: 1 of 1 failed (the route saw only `/_next/static/chunks/`).

GREEN commits are `91e1a27d`, `508e65e4` and `df0e1e53`.

Regression guards with no RED, because the behaviour was already correct:

- Engine 6 output carries none of the new output: 241 matches over panel runs 0 to 49.
- The rung scopes of `opponent_roster` draw what they drew, and `buildLadder` under V7 equals live.
- Two pd6 coefficient guards, each checked by mutation.
- A rate parity self-test: `opponent.injuries` gives 11 user-side and 23 opponent-side divergences.

Gates at `dceeb6ef` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` (fresh `.next`) exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,176 passed in 249 files. `pnpm vitest run src/engine`: 358 passed in 32 files.
- Parity: the 50-run test and the 200-run slow test are byte-identical. Rate parity passed 5 of 5: 123 matches and 12,946 trials at the live coefficients, plus four mutation self-tests. `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Kinds probe (n 2000, good, 4-3-3):
  - Live reproduces the 6p baseline: 13,914 matches, 42,344 user goals and 5,466 opponent goals.
  - V7 has 4,129 opponent injuries in 13,949 matches, 0.296 per match, each one replaced.
  - Matches with an opponent injury: 0.2551 [0.2479, 0.2624].
  - User injuries: 0.2182 per match (live 0.2186).
  - Rotation incidents: 1.53 per match.
  - Penalty goals: 0.2037 per match.
- Playwright (Chromium, headless, `CI=1`):
  - `e2e/opponent-injuries.spec.ts` 5 passed. At engine 6 there is no injury or rotation line. With `opponent.injuries` rewritten in the downloaded chunks (test only), seed `e2e-opp-11` shows Tinkatink down in the opponent's slot 4 at 25', and the injury line and both rotation lines show with a 3 px border in the opponent's colour. Each line stays inside the viewport with no side scroll at 390x844, 360 and 320; 308 is measured only.
  - The related specs on the same build passed 44: opponent-injuries, v7-switch, penalty-takers, injury-staging, fatigue, watch-live, results-reveal, results-interactions, touchline-intel and your-calls. Screenshot churn in other reports was reverted.
- NOT RUN:
  - Review and hosted CI.
  - The production run of `penalty-takers` with the widened glob (the coordinator's live check).
  - The full Playwright suite, and WebKit and phone projects for the new spec.
  - A probe with only this row's flag flipped.
  - The phone check and screen reader pass.

Decision log: `docs/decisions/engine7-opponent-injuries.md`. Browser proof: `docs/reports/engine7-opponent-injuries/`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #151 (opponent injuries and rotation incidents, dormant, Red) merged as squash `f7448f9`, reviewed head `7057871`, GLM 5.3 Flash APPROVE in round 1 with canary `6b4-a057cac4d2d2982d26ccb9986b5d437b` echoed and the independent executing Red reviewer PASS on the same head. At `7057871` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current and 2,176 unit tests passed in 249 files (358 in `src/engine`); hosted check and all eight e2e shards green on the first run. Parity against the frozen v6 bundle held on the 50-run and 200-run panels and the per-trial rate guard (with an opponent injuries self-test); the Red reviewer's own 150-run script found 0 output, rate or full-observation mismatches over 72,678 trials and no engine 7 key at engine 6, and an instrumented draw census found no `inj:` scope and no draw change at engine 6. The adversarial parity review found parity holds. The row also widened the e2e V7 chunk switch to `**/_next/static/**/chunks/**`, fixing the PR #150 live-check failures. Production `/api/health?db=1` served `f7448f9` with engine `pokedraft-engine-6` and `db.status` ok; live check on chromium `penalty-takers` 6, `opponent-injuries` 5, `v7-switch` 1, `share` 17, `old-links` 1, `watch-live` 3, `set-pieces` 4 and `health` 1, 38/38 with retries off. Engine 6 output unchanged.

## Engine 7 missable penalties and nominated takers

Branch `feat/engine7-penalties` off `origin/main` at `6b7d40a` (the 6b2 squash). Wave 6 row 6b3 (Red). Dormant: the live coefficients keep `penalty.missable: false`, `penalty.awardShare: 0` and `takers.freeKickWeight: 1`, and tokens stay pd6, so production engine output is exactly engine 6's and the new control is hidden. `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #149 merge.

- Nothing changes for a player yet.
- From the flip, penalties come from their own draw (two draws per side per five-minute window on the new `set_pieces` stream) instead of relabelling a goal, and about a quarter of them miss: saved by the keeper or put wide. Penalty goals per match hold at engine 6's level (0.2038 against 0.2036).
- From the flip, manager mode adds a "Set pieces" row with "Penalties" and "Free kicks" selects ("Auto (best shooter)" or a player on the pitch) on the pre-match card and in the touchline's expanded view. The penalty nominee takes the side's penalties and kicks first in a shootout; the free-kick nominee's pick weight is 1.5 times. A nomination does not switch the assistant off. Sim mode never shows it.
- From the flip, the broadcast stages a missed penalty as a kick from the spot past the post and a saved one as a save, with "Penalty missed." and "Penalty saved." commentary.
- Tokens: `managerSchemaFor(version)` carries the `p` and `f` tuples from pd7 only, and `encodeToken` refuses a taker while tokens are pd6. A guard keeps `penalty.missable` off until `RUN_TOKEN_VERSION` is 7.

RED commits `e79487e4` (9 of 42 failed), `aea5b54e` (4 of 4 failed) and `ad4437a9` (11 of 61 failed); GREEN `955960a9`, `74d385f7` and `41a2243c`. Regression guards with no RED (behaviour already correct): `f8766c35` pins the first draw of the 11 existing substreams (checked against `origin/main`'s `rng.ts`) and widens per-trial rate parity to 123 matches and 12,946 trials with a self-test that each engine 7 term (counterLead, pressFade, missable penalties) diverges on both sides; `96844719` couples `missable` to pd7. Three V7 score literals in the 6b1 and 6b2 tests gain one penalty goal each.

Gates at `4d50018b` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` (fresh `.next`) exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,157 passed in 246 files. `pnpm vitest run src/engine`: 346 passed in 31 files. Parity: 50 runs and the 200-run slow test byte-identical; rate parity 4 of 4. `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Probes under V7 against the 6p baseline: kinds (n 2000, good, 4-3-3) 0.2617 penalties awarded per match, conversion 0.7787 [0.7649, 0.7919], 300 saved and 508 wide (0.404 unscored per cup), penalty goals 0.2038 per match (0.2036); shootouts (n 15000) rate 0.0808 [0.0786, 0.0830] (0.0886), user wins 0.5055 (0.5052).
- Playwright (Chromium, headless, `CI=1`): `e2e/penalty-takers.spec.ts` 6 passed: no row at engine 6; with this row's coefficients rewritten in the downloaded chunks (test only), both selects 44 px tall inside the viewport with no side scroll at 390x844, 360, 320 and 308 on both surfaces, and none in sim mode. Related specs on the same build (penalty-takers, prematch-merge, manager-mode, touchline-sheet, touchline-intel, your-calls, matchday-carryovers, exhibition-broadcast, builder-matchday, a11y, keyboard, all projects they match): 85 passed, 0 flaky; screenshot churn in other reports reverted.
- NOT RUN: review and hosted CI, the other probe modes, WebKit and phone projects for the new spec, a browser run that records a nomination (refused by the pd6 codec by design), the phone check and screen reader pass.

Decision log: `docs/decisions/engine7-penalties.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #150 (missable penalties and nominated takers, dormant, Red) merged as squash `cee1ad1`, reviewed head `9487be0`, GLM 5.3 Flash APPROVE in round 1 with canary `6b3-40a2f8044188f80d568783b46a34841d` echoed and the independent executing Red reviewer PASS on the same head. At `9487be0` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current and 2,157 unit tests passed in 246 files (346 in `src/engine`); hosted check and all eight e2e shards green on the first run. Parity against the frozen v6 bundle held on the 50-run and 200-run panels and the per-trial rate guard (now with mutation self-tests on both sides); the Red reviewer's own 160-run script found 0 output, rate or full-observation mismatches over 73,264 trials, a draw census found exactly two `set_pieces` draws per side per window under V7 and none at engine 6, and hand-crafted pd6 tokens carrying a taker were refused by both codecs and by a local server (422). The adversarial parity review found parity holds; its post-flip finding (the retained reader decodes pd6 with the live codec) is a required 6b9 guard. Production `/api/health?db=1` served `cee1ad1` with engine `pokedraft-engine-6` and `db.status` ok. Live check on chromium: `share` 17, `old-links` 1, `watch-live` 3, `set-pieces` 4, `health` 1 and the `penalty-takers` engine 6 test (no Set pieces row) passed, 27/32; the 5 `penalty-takers` V7-proof tests failed against production because Vercel serves client chunks from `/_next/static/immutable/chunks/`, which the spec's route glob does not match, so its rewrite never ran (a test-harness defect, not a production one; fixed in the next engine row). Engine 6 output unchanged.

## Engine 7 tactic edges with state dependence

Branch `feat/engine7-tactic-edges` off `origin/main` at `233be7e` (the 6b1 squash). Wave 6 row 6b2 (Red). Dormant: the live coefficients keep the engine 6 tactic table, `manager.counterLead: 1` and `manager.pressFade.perPoint: 0`, so production engine output is exactly engine 6's. Only `src/engine` changed among code paths (plus a UI test); `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #148 merge.

- Nothing changes for a player yet.
- From the flip, the right tactic against a pressing, possession or direct side moves the goal rate in the user's favour by 25 to 32% (engine 6: 5 to 20%), and pressing a direct side hands it 25% more chances.
- From the flip, Counter gets 10% more from each chance while its side leads, and a pressing side whose mean outfield energy is below 70 loses 0.004 of its own multiplier per point. Both apply to either side, so a tired pressing opponent fades late.
- The scout line and tactic badges keep the engine 6 table until the flip.

RED commit `045fb20` (8 of 8 failed), GREEN `8bdaad0`. Regression guards with no RED (behaviour already correct): `8ba5d60` pins the scout's engine 6 badges and lines, and a per-trial rate parity guard in `8bdaad0` compares the live `playMatchCore` with the frozen engine 6 bundle on three runs that reach both new terms. Output parity alone missed a live `pressFade.perPoint` of 0.004 in both the 50 and 200-run panels; the rate guard failed 3 of 3 on it and 2 of 3 on a live `counterLead` of 1.1 (both mutations reverted).

Gates at `8bdaad0` (code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,105 passed in 240 files. `pnpm vitest run src/engine`: 313 passed in 28 files. Parity: 50 runs byte-identical; slow parity, 200 runs byte-identical (871 played matches, 638 coached, 95 chosen injury answers, 58 extra time, 36 shootouts, all four shapes, 8 formations); rate parity 3 of 3. `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Probes at n 400 (bots good and random, 4-3-3): engine 6 reproduces the 6p baseline hashes for informed, noop and oracle. Under V7, P1 informed minus auto is +0.0144 [-0.0041, +0.0328] good and +0.0272 [-0.0020, +0.0564] random (6b1: -0.0022 and +0.0016), so P1 still falls short of 3 points; P2 oracle minus auto is +0.0474 [+0.0298, +0.0649] good and +0.0880 [+0.0597, +0.1160] random (baseline +0.0380 and +0.0586), the random interval already above 10 points; P3 stays 0.0000 with 0 discordant pairs.
- NOT RUN: review and hosted CI, Playwright (no UI source change, engine output unchanged), the other probe modes, the phone check and screen reader pass.

Decision log: `docs/decisions/engine7-tactic-edges.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #149 (engine 7 tactic edges with state dependence, dormant, Red) merged as squash `6b7d40a`, reviewed head `002ee80`, GLM 5.3 Flash APPROVE in round 1 with canary `6b2-ebecd1c028aae0fd16402945b64ca894` echoed and the independent executing Red reviewer PASS on the same head. At `002ee80` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current and 2,105 unit tests passed in 240 files (313 in `src/engine`); hosted check and all eight e2e shards green on the first run. Output parity against the frozen v6 bundle held on the 50-run and 200-run panels. Because output panels cannot see small rate changes, the row added a per-trial rate parity guard; the Red reviewer's own 93,750-trial rate comparison found 0 mismatches with both state terms live on both sides, and five live mutations (down to `perPoint` 1e-12) were each caught by the guard. The adversarial parity review (draws, bytes, behaviour) found parity holds, including a 5,120-match dump byte-identical between base and head; its nit (the in-repo guard reaches the state terms on few trials and does not assert it) is carried into 6b3. Production `/api/health?db=1` served `6b7d40a` with engine `pokedraft-engine-6` and `db.status` ok; live check on chromium `share` 17, `old-links` 1, `watch-live` 3, `set-pieces` 4 and `health` 1, 26/26. Engine 6 output unchanged.

## Engine 7 split managed and scaffolding

Branch `feat/engine7-split-managed` off `origin/main` at `7045ccd` (the 6g squash). Wave 6 row 6b1 (Red). Dormant: the live coefficients keep `manager.splitManaged: false`, so production engine output is exactly engine 6's. Only `src/engine`, `scripts/calibration` and `eslint.config.mjs` changed among code paths; `src/scouting`, `scripts/data` and `src/data` are untouched and `goldens.test.ts` is byte-identical to `origin/main` and green. The first commit records the PR #146 merge.

- Nothing changes for a player yet.
- From the flip, a sub (including a chosen injury replacement) switches off only the assistant's fatigue subs, and a tactic from 45' switches off only its tactics. An early tactic still applies and the assistant keeps its late reaction on top of it. Balanced at kickoff plays exactly the uncoached match.
- For the next rows: `src/engine/coefficients-v7.ts` holds the engine 7 candidate (`ENGINE_COEFFICIENTS_V7`), `--coeffs v7` runs it in `pnpm calibrate` and the probe, ESLint keeps it out of `src/ui`, `src/components` and `src/app`, and a parity guard plays the live engine against the frozen engine 6 bundle (50 runs in `pnpm test`, 200 in `v6-parity.slow.test.ts`).
- `recap.ts` no longer reads `ENGINE_COEFFICIENTS` at module scope; a source scan refuses any such read in `src/engine`.

RED commit `1f9d738` (11 of 17 failed), GREEN `6dbe958`. Parity guard `1eed662`, regression guard with no RED (behaviour already correct); a mutation (`autoSubEnergy` 82 to 83) made it fail, then was reverted. Review-driven: RED `b11eaa8` (1 of 9 failed: the spread V7 shared nested objects with the live coefficients), GREEN `55cdad3` (V7 built from `structuredClone`; the parity tally now asserts extra-time matches and shootouts, so recap's injected `c.shootout.kicks` is exercised). The branch merged `origin/main` at `2551dce` (PR #147) in `34aac0f`.

Gates at `55cdad3` (after the `origin/main` merge, code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. `pnpm e2e:pins --check` reported the pins current.
- Unit tests: 2,092 passed in 239 files. `pnpm vitest run src/engine`: 302 passed in 27 files. Parity: 50 runs byte-identical (211 played matches, 17 extra time, 13 shootouts); slow parity, 200 runs byte-identical (871 played matches, 638 coached, 95 chosen injury answers, 58 extra time, 36 shootouts, all four shapes, 8 formations). `goldens.test.ts` is byte-identical to `origin/main`.
- `check-retained-replays.mts`: 10 golden replays passed. `measure-retained-json.mjs`: 4 copies, 2,891,853 bytes.
- Probes at n 400 (bots good and random, 4-3-3): engine 6 reproduces the 6p baseline hashes. Under V7, P3 no-op cost is 0.0000 with 0 discordant pairs for both bots (baseline -0.0075 good, -0.0529 random); P1 informed minus auto is -0.0022 [-0.0211, +0.0168] good and +0.0016 [-0.0279, +0.0311] random (baseline -0.0111 and -0.0466), so P1 still fails until 6b2 and 6b8.
- NOT RUN: review and hosted CI, Playwright (no UI change, engine output unchanged), the other probe modes, the phone check and screen reader pass.

Decision log: `docs/decisions/engine7-split-managed.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #148 (split managed and engine 7 scaffolding, dormant, Red) merged as squash `233be7e`, reviewed head `4262f07`, GLM 5.3 Flash APPROVE in round 1 with canary `6b1-6325b57d21fa756c440ee9edec5a7558` echoed and the independent executing Red reviewer PASS on the same head. At `4262f07` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current and 2,092 unit tests passed in 239 files (302 in `src/engine`); hosted check and all eight e2e shards green on the first run. Parity against the frozen v6 bundle: the 50-run test (211 matches, 17 extra time, 13 shootouts), the 200-run slow test (871 matches, 638 coached, 95 injury answers, 58 extra time, 36 shootouts, 4 shapes, 8 formations) and the Red reviewer's own 150-run script on separate seeds all matched byte for byte, and a V7 negative control diverged as expected. The adversarial parity review (draws, bytes, behaviour) found parity holds; its two nits (shootout and extra-time coverage asserted, V7 built with `structuredClone`) were folded in with a RED commit. Production `/api/health?db=1` served `233be7e` with engine `pokedraft-engine-6` and `db.status` ok; live check on chromium `share` 17, `old-links` 1, `watch-live` 3, `set-pieces` 4 and `health` 1, 26/26. Engine 6 output unchanged.

## Territory, xG river and real commentary

Branch `feat/xg-river` off `origin/main` at `969ca1c`. Wave 6 row 6a2 (Yellow). UI only: nothing under `src/engine`, `src/scouting`, `scripts/data` or `src/data` changed, and `goldens.test.ts` is byte-identical. The first commit records the PR #142 merge above.

- In Live match, a live-engine cup match shows an xG river under the momentum bar: one column per five-minute window, yours above the line and theirs below, labelled "Chances (xG)" with each side's running total. A window appears only once the clock has passed its end.
- The momentum bar and the possession drift now follow the engine's territory for each completed window instead of goals and saves. Kickoff reads 50%.
- Goal lines in the ticker can add "Late drama at 86'", "Tapu Koko's second" (or hat-trick) and "Against the run of play" when the run's chances back it.
- A friend's link on the live engine shows the river with "this squad" for "you". Retained runs (older engine links) and exhibitions show no river and keep the old lean; Quick view shows no river.

RED commit: `5fbf33a` (unit 24 of 57 failed in the five touched test files). GREEN `19213f6`. `21fe650` adds `e2e/xg-river.spec.ts` and `scripts/perf/story-timing.mts`. `1749ebc` merges `origin/main` at `2992500` (#144, #145). `3d6a972` builds the generated pins' timelines with the story's territory, as `MatchPlayer` does, and adds an `XG_RIVER` pin. Pins that moved: `HONEST_MOMENTUM.second` `36%64%` to `77%23%`, `SET_PIECES.solo.presser` `3` to `5` (the solo presser rule now asks for a defender level with the scorer mid-run and behind by the shot, since under the territory lean it steps in from upfield). No other pin moved. `aaa64d2` merges `origin/main` at `7045ccd` (#146).

Gates at `aaa64d2`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. `check-retained-replays.mts` (10 golden replays), `measure-retained-json.mjs` (4 copies) and all nine `check:*` scripts exited 0. `pnpm e2e:pins --check` current. Prettier passed on every touched file. `goldens.test.ts` is byte-identical to `origin/main`.
- Unit tests: 2,073 passed in 235 files. Touched tests (`scripts/e2e`, matchday UI, `MatchReplay`): 368 passed in 56 files.
- Playwright (`CI=1`, headless, muted, `--retries=0`), the full suite at `3d6a972` (after #144 and #145): 1,086 passed, 67 skipped, 0 failed. At `aaa64d2`: `grace-submit`, `xg-river`, `honest-momentum` and `set-pieces` specs 14 passed.
- Story cost at 4x CPU throttle: at most 29.6 ms for one match, 108 to 153 ms for a cup's six. River layout at 390, 360, 320 and 308 px: 6 px under the meter, 11 px inside the HUD, no overlap, no page scroll.
- NOT RUN: the full suite after the #146 merge, the new spec on WebKit and the phone projects, review and hosted CI, the phone check and screen reader pass.

Decision log: `docs/decisions/xg-river.md`. Browser proof: `docs/reports/xg-river/` (`river-{30,ht,ft}-{390,360,320}.png`) and `docs/reports/set-pieces/390-solo.png`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #147 (xG river on the Broadcast, Yellow) merged as squash `2551dce`, reviewed head `d9eaba6`, GLM 5.3 Flash APPROVE in round 1 with canary `6a2-3b896958e455926b70b6a79a86892bd0` echoed. At `aaa64d2` (code-identical to the head) lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current, 2,073 unit tests passed in 235 files and Prettier passed on 20 touched files; hosted check and all eight e2e shards green on the first run. The implementer's full local Playwright suite at `3d6a972` gave 1,086 passed, 67 skipped, 0 failed. Pins moved: `HONEST_MOMENTUM.second` 36%64% to 77%23% and `SET_PIECES.solo.presser` 3 to 5 (the bar and the shape now follow the story's territory); `XG_RIVER` is new. Browser proof at 390, 360 and 320 with a 308 measurement (chart 95 px, no overlap, no page scroll). Production `/api/health?db=1` served `2551dce` with `db.status` ok; live check on chromium `xg-river` 5, `honest-momentum` 1, `set-pieces` 4, `watch-live` 3 and `health` 1, 14/14. Engine untouched.

## Engine grace window and version plumbing

Branch `feat/engine-grace` off `origin/main` at `8059458` (the 6b0 squash). Wave 6 row 6g (Red). Dormant: `GRACE` is `null`, so production behaviour is exactly today's. No file under `src/engine`, `src/scouting`, `scripts/data` or `src/data` changed; `goldens.test.ts` is byte-identical to `origin/main`. The first commit records the PR #144 merge, and the branch merged `origin/main` at `2992500` (PR #145) with its merged paragraph below.

- Nothing changes for a player yet.
- When engine 7 goes live and 6b9 sets `GRACE`, an engine 6 run finished just before the flip can still be submitted for about a day, whether the page says engine 6 or engine 7. It replays on the frozen engine 6 bundle, is stored as an engine 6 row and is ranked among engine 6 rows. The submit result says "Ranked on the engine 6 board." and its board link opens All engines.
- The flip day's Daily accepts only engine 7 runs, so one date never mixes engines. The day before stays open to engine 6 runs.
- Coached engine 7 runs keep their Coached marker (`MANAGER_TOKEN_VERSIONS = [6, 7]`).
- A new proxy guard checks a golden share link of every retained and live version plus engine 6. It passes today and goes RED at the flip until pd6 links get their own codec branch.

RED commit `82e5bcd` (9 of 19 failed), GREEN `c93e5ea`. Regression guards with no RED, behaviour already correct: the proxy guard `cd524a2` and the canonical-form guard (a stored engine 6 token, plain and coached, re-encodes to the exact stored string). Build fix `34069ba`: a static import of the retained dispatcher emitted a second live scouting payload (`measure-retained-json.mjs`: `5 !== 4`); it is now loaded only for a grace run.

Gates at `4c275fa` (the merge of `origin/main`, code-identical to this docs commit):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files.
- Unit tests: 2,046 passed in 233 files. `pnpm vitest run src/engine`: 286 passed in 24 files. `pnpm e2e:pins --check` reported the pins current.
- `check-retained-replays.mts`: 10 golden replays passed. `measure-retained-json.mjs`: 4 payloads, 2,891,853 bytes.
- Playwright on chromium against a fresh build: `grace-submit`, `leaderboard`, `seed-board`, `board-ux`, `old-links`, `share` and `health`, 43 passed. The grace line has 37 px of headroom at 320 and 25 px at 308. Browser proof: `docs/reports/engine-grace/`.
- NOT RUN: review and hosted CI, the preview-branch API proof (the coordinator runs it with the Red reviewer), the full Playwright suite, the calibration probes (engine output cannot move), the phone check and screen reader pass.

Decision log: `docs/decisions/engine-grace.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #146 (engine grace window and version plumbing, dormant, Red) merged as squash `7045ccd`, reviewed head `242c169`, GLM 5.3 Flash APPROVE with canary `6g-f61e4e1b51f410939f95cb77b57a8383` echoed and the independent executing Red reviewer PASS on the same head. At `242c169` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main` and 2,046 unit tests passed in 233 files. The first hosted run failed the `check` job on `src/components/run/__tests__/coach-mark.test.tsx` (1 of 2,046; the file is not touched by 6g and passed 3 of 3 runs locally); the failed job was rerun with `gh run rerun 39465358138 --failed`, no commit, and passed; all eight e2e shards were green on the first run. Preview API receipt (local `next start` on the Neon preview branch because the Vercel preview is protected): POST pd6 Daily 201, retry 200 same entry, `db:delete-entry` deleted 1 row, preview left with its 2 seed rows. Production `/api/health?db=1` served `7045ccd` with engine `pokedraft-engine-6`, token versions 1 to 6 and `db.status` ok; live check on chromium `grace-submit` 4, `leaderboard` 8, `seed-board` 9, `old-links` 1, `share` 17 and `health` 1, 40/40. No production rows written (grace-submit mocks the POST). GRACE is null, so engine output is unchanged.

## Live-token pins

Branch `test/live-token-pins` off `origin/main` at `eceb581`. Wave 6 row 6t (Green). Only e2e specs, the generated `e2e/pins.ts`, `scripts/e2e/render-pins.ts` and its test changed. No file under `src/` changed; `goldens.test.ts` is byte-identical to `origin/main`. The first commit records the PR #143 merge below.

- Every e2e spec that built a live token from a v5 body, held a literal `pd6` token, or asserted an engine 6 outcome (round, minute, slot, species, score) reads it from `e2e/pins.ts`, which `pnpm e2e:pins` regenerates from the live engine. After an engine bump the specs replay the new engine, not a retained bundle.
- Property pins (giant killer, champion, shootout, injury stop) search seed families for the first match and reproduce today's seeds; fixed-round pins throw in the generator when the event is gone.
- Guard: `render-pins.test.ts` fails on the live token prefix, `pd${` or the live engine name in any e2e source outside `pins.ts`; `pnpm e2e:pins --check` fails on a stale `pins.ts`.

RED commit: `37d9ee1` (`scripts/e2e`, 1 of 2 tests failed, 45 offender lines in 33 files). GREEN `9340dec`.

Gates at `9340dec` (later commits add docs only):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. `check-retained-replays.mts`, `measure-retained-json.mjs`, all nine `check:*` scripts and `pnpm e2e:pins --check` exited 0. Prettier passed on 40 touched files.
- Unit tests: 2,018 passed in 230 files.
- Playwright (`CI=1`, headless, 4 workers), the full suite, all projects: before at `b3199e9` 1,081 passed, 67 skipped, 0 failed (18.4m); after at `9340dec` 1,081 passed, 67 skipped, 0 failed (18.7m). No retries in either run.
- NOT RUN: review and hosted CI, the phone check.

Decision log: `docs/decisions/live-token-pins.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #145 (live-token pins, Green) merged as squash `2992500`, reviewed head `19cac51`, GLM 5.3 Flash APPROVE in round 1 with canary `6t-4ab7d06a4d8ac7e5f358f567b1de42f3` echoed. At `19cac51` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, `pnpm e2e:pins --check` reported the pins current, 2,031 unit tests passed in 231 files and Prettier passed on 40 touched files; hosted check and all eight e2e shards green on the first run. The implementer's full local Playwright suite gave identical counts before (`b3199e9`) and after (`9340dec`): 1,081 passed, 67 skipped, 0 failed. Production `/api/health?db=1` served `2992500` with `db.status` ok; live check on chromium `watch-live`, `set-pieces`, `achievements`, `results-reveal`, `shootout-suspense`, `head-to-head` and `health` 43/43. No runtime change.

## Freeze engine 6

Branch `chore/freeze-engine-6` off `origin/main` at `969ca1c` (the 6a1 squash). Wave 6 row 6b0 (Red). Engine 6 is frozen into `src/engine/versions/v6/` as a dormant retained bundle: nothing imports it until the engine 7 flip (6b9). No live engine file, `src/scouting`, `scripts/data` or `src/data` changed; `goldens.test.ts` is byte-identical to `origin/main`.

- Nothing changes for a player. Engine 6 stays live and every run, link and board row replays exactly as before.
- When engine 7 goes live, every engine 6 link can replay through this exact copy of the engine.
- One `GOLDEN_CUP8_V6` literal now exists, in `src/engine/versions/__tests__/fixtures.ts`, next to the new `GOLDEN_KANTO151_V6`. The leaderboard fixtures re-export it and `check-retained-replays.mts` imports it.

Parity guard: RED commit `35bf588` (1 of 1 file failed to load on the missing `../v6` import, 0 tests ran), GREEN `ae838a2`. The v6 block replays both goldens through the bundle to the live engine's `2b26ee82...` and `eb366464...` and pins the bundle digest `b0b922bc1eef6e7ec4af9bf64e4af10206e894fdfc5d5f317eaf75b85d604397`. `check-bundle-provenance.sh v6 969ca1c` exited 0 (34 files, only `@/` import lines differ), and a re-freeze from a `git archive` of `969ca1c` was `diff -r` identical.

Gates at `e54e63c`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files.
- Unit tests: 2,030 passed in 231 files. `pnpm vitest run src/engine`: 286 passed in 24 files.
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs`: 4 payloads, 2,891,853 bytes.
- `retained-engine-bundle:v6` appears in 0 files under `.next/static` and 0 under `.next/server` (the v5 marker, as a control, in 4 server files).
- NOT RUN: review and hosted CI, Playwright (no UI changed), the calibration probes (engine output cannot move), the phone check and screen reader pass.

Decision log: `docs/decisions/freeze-engine-6.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #144 (freeze engine 6, Red) merged as squash `8059458`, reviewed head `243963a`. GLM 5.3 Flash APPROVE in round 1 with canary `6b0-dcfa6180736f240403def6c19db393f8` echoed, and the independent executing Red reviewer (fresh pokedraft-mode subagent, Opus) returned PASS on the same head: lint, typecheck, build, both retained-bundle checks (10 golden replays, `totalCopies` 4) and all nine `check:*` scripts exited 0, 2,030 unit tests passed in 231 files, `pnpm vitest run src/engine` 286 passed in 24 files, `goldens.test.ts` byte-identical to `origin/main`, a re-freeze from `969ca1c` was `diff -r` identical to the committed bundle, `check-bundle-provenance.sh v6 969ca1c` exited 0, bundle digest `b0b922bc...`, and the `retained-engine-bundle:v6` marker appeared in no `.next/static` or `.next/server` file. Hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `8059458` with engine `pokedraft-engine-6` and `db.status` ok; live `health`, `old-links` and `share` 19/19 on chromium. Engine output unchanged; the v6 bundle is dormant.

## matchStory core

Branch `feat/match-story` off `origin/main` at `9e4802b`. Wave 6 row 6a1 (Red). Engine change with no output change: engine 6 stays live and every run, token and board row replays exactly as before. Nothing under `src/scouting`, `scripts/data` or `src/data` changed, and `goldens.test.ts` is byte-identical.

- Nothing changes for a player yet. `matchStory(seed, matchIndex, run)` in `src/engine/story.ts` returns every chance the engine rolled in a match (its probability, goal, saved or off, the shooter and a derived zone) and each five-minute window's xG and territory, next to the unchanged match result. Row 6a2 draws the xG river and the territory lean from it.
- `simulateMatch` and `matchStory` share one core, `playMatchCore` in `match.ts`. The story reads the core through a read-only observer that cannot draw or change state. `runCup` and `matchStory` build each match's input with the same `cupMatchInput`.
- `matchStory` plays the whole run through `runCup` first (fix round 1). A run `runCup` rejects throws the same error, and a match the run never reaches throws instead of returning a result that never happened.

Parity guard (the RED equivalent for an engine row that must not move): RED commit `420228a` (7 of 7 failed against a stub `matchStory` that throws), GREEN `7bf01e8`. Fix round 1: RED `8685f39` (3 of 10 failed: an unreached knockout and two tokens `runCup` rejects), GREEN `fa446f0`. The guard replays every played match of `goldens.test.ts`'s 20-run panel and 30 more seeds (50 runs in `pnpm test`; 200 in `story.slow.test.ts`) and requires the story's result to be byte-identical to `runCup`'s match, its goal chances to be the goals and its saved chances to be the saves. That test compares HEAD with HEAD. The cross-version guarantee is `goldens.test.ts` plus the coordinator's skeptic check against `9e4802b` (byte-identical over 1,676 and 2,238 outputs); 6b1 adds the frozen v6 against live parity test.

Gates at `5a7f6a3` (after fix round 1 and the merge of `origin/main` at `38b1bb4`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files.
- Unit tests: 2,023 passed in 231 files. `pnpm vitest run src/engine`: 283 passed in 24 files.
- `SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/story.slow.test.ts --silent=false`: 1 of 1 passed over 942 played matches (81 with extra time, 415 coached).
- `check-retained-replays.mts`: 10 golden replays passed, live v6 replay `2b26ee82...`. `measure-retained-json.mjs`: 4 payloads.
- The probe numbers are unchanged by construction against the 6p baseline; no probe was re-run.
- NOT RUN: review and hosted CI, Playwright (no UI changed), the calibration probes, the phone check and screen reader pass.

Decision log: `docs/decisions/match-story.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #142 (matchStory core, Red) merged as squash `969ca1c`, reviewed head `2c5fddf`. GLM 5.3 Flash APPROVE in round 1 with canary `6a1-886049602d8287d19173a0948f75f9fb` echoed, and the independent executing Red reviewer (fresh pokedraft-mode subagent, Opus) returned PASS on the same head: at `2c5fddf` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, 2,027 unit tests passed in 231 files, `pnpm vitest run src/engine` 283 passed in 24 files, the slow parity file passed over 200 runs (942 played matches), `goldens.test.ts` was byte-identical to `origin/main`, and a cross-version check against `9e4802b` over 120 seeds gave byte-identical `runCup` output. Before review, three adversarial skeptics compared `9e4802b` with the head (1,676 and 2,238 outputs, byte-identical) and found one contract gap, fixed in round 1 (RED `8685f39`, 3 of 10 failed). Hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `969ca1c` with engine `pokedraft-engine-6` and `db.status` ok; live `health`, `old-links` and `share` 19/19 on chromium. Engine output unchanged.

## Wave 5 carryovers and queue hygiene

Branch `chore/wave5-carryovers` off `origin/main` at `9e4802b`. Wave 6 row 6-0 (Yellow). No file under `src/engine`, `src/scouting`, `scripts/data` or `src/data` changed; `goldens.test.ts` is byte-identical to `origin/main`. The first commit records the PR #140 merge below.

- A friend opening a link to their own run, spelled differently from the stored token, sees "This run" on their seed table row instead of a link.
- A run submitted from live results shows in "Friends on this seed" without a reload.
- The coach chips keep their labels inside their borders on every phone width. They sit on one row at 390 px and wrap at 360 px and below, and a late font load moves nothing.
- "Open the Builder" on the empty exhibition page goes to `/#builder`, the builder section.
- A fast double tap on "Play rematch" plays two rematches on.
- The touchline sheet has 12 px sides, so its content keeps 12 px of headroom at 320 px.
- An empty current-engine all-time board with older runs says "No runs on this engine yet." with a "Show all engines" button.
- Queue hygiene: SF-20 and SF-29 closed (fixed in #61), engine follow-up 5 closed as won't fix, `api-timing.mjs` reads `ENGINE_VERSION`, the Wave 7 CI item drops Dependabot (it runs on a schedule), and the seed-board rank test comment says what it asserts.

RED commit: `010414e` (unit 4 of 25 failed in the three touched files; Playwright chromium 5 of 18 failed in the three touched specs). GREEN `ff4d44a`, `fc05305`, then `52dc6be` and `72a46ca` re-decided the chips after the full suite caught a font-swap shift (`leaderboard-font-cls.spec.ts`, 2 of 4 at 412 px).

Gates at `72a46ca` (later commits add docs and screenshots only):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. `check-retained-replays.mts`, `measure-retained-json.mjs` and all nine `check:*` scripts exited 0. Prettier passed on 22 touched files.
- Unit tests: 2,002 passed in 229 files.
- Playwright (`CI=1`, headless, `--retries=0`), the full suite, all projects: 1,081 passed, 67 skipped, 0 failed (18.3m).
- At 320 and 308 px: the touchline sheet content right edge 308 and 296 (was 310 and 298); every coach chip keeps at least 11 px between its label and its border; the empty-engine note's right edge is 287 and 275.
- NOT RUN: the new specs on WebKit and the phone projects, review and hosted CI, the phone check and screen reader pass.

Decision log: `docs/decisions/wave5-carryovers.md`. Browser proof: `docs/reports/wave5-carryovers/` (`coach-chips-{390,360,320}.png`, `empty-engine-board-{390,360,320}.png`, `open-the-builder-390.png`, `touchline-halftime-{390,360,320}.png`, `touchline-expanded-{390,360,320}.png`). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #143 (Wave 5 carryovers and queue hygiene, Yellow) merged as squash `eceb581`, reviewed head `ef7b4c1`, GLM 5.3 Flash APPROVE in round 1 with canary `6-0-6632ecd6e93d242ba2bc899b610f4567` echoed. At `ef7b4c1` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, 2,017 unit tests passed in 230 files and Prettier passed on 23 touched files; hosted check and all eight e2e shards green on the first run. The implementer's full local Playwright suite at code head `72a46ca` was 1,081 passed, 67 skipped, 0 failed. Production `/api/health?db=1` served `eceb581` with `db.status` ok; live check on chromium `wave5-carryovers`, `seed-board`, `exhibition-broadcast`, `board-ux`, `leaderboard` and `health` 30/30.

## Calibration probe and engine 6 baselines

Branch `chore/calibration-probe` off `origin/main` at `9e4802b`. Wave 6 row 6p (Green). Scripts and docs only: `git diff origin/main -- src` is empty, so no player sees a change.

- `scripts/calibration/probe.mts` is audit A's gameplay probe, committed with `@/` imports, `--coeffs`, `--out` and the same `probe-<formation>-<bot>-<i>` seeds. New modes: `informed`, `noop`, `oracle`, `shootouts`, `kinds`. Every proportion carries a 95% Wilson interval. `pnpm calibrate` and the probe share one `--coeffs` loader (byte-identical calibrate output before and after).
- Audit A reproduces exactly: good-bot squad share of variance 0.113, manager auto .848, styleRule .846, oracle .886, the upset curve and the formation table.
- Engine 6 baselines in `docs/reports/engine-7/baseline-v6.json`. Informed minus auto: good -1.1 points [-3.0, +0.8], random -4.7 [-7.7, -1.7]. No-op cost: good -0.75 [-2.7, +1.2], random -5.3 [-8.3, -2.3]. Oracle: good +3.8 [+2.0, +5.6], random +5.9 [+3.0, +8.7]. Shootouts (5,245): top edge quartile 56.2% [53.5, 58.9] against bottom 45.9% [43.3, 48.6]. Calibrate `--n 5000`: buckets 4.1%, 12.8%, 30.1%, attacking goal share 68.5%, wall time 678.4 s.
- Decision 10 prototype failed: the good-bot squad share went from 11.3% to 11.1% [9.3, 13.1] against an 18% pin. 6b7 is dropped. The patch is kept as `docs/reports/engine-7/type-matchup-prototype.patch`.
- Regression guard, no RED: new tooling, behaviour already correct.

Gates at `2a92ad3` (the docs commit after it changes only `STATE.md` and the decision log):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. `check-retained-replays.mts` and `measure-retained-json.mjs` exited 0. Prettier passed on the touched files.
- Unit tests: 2,013 passed in 230 files. `scripts/calibration`: 20 passed in 2 files.
- NOT RUN: review, hosted CI, the coordinator's `luck` re-run at the head, Playwright (no UI change).

Decision log: `docs/decisions/calibration-probe.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #141 (calibration probe and engine 6 baselines, Green) merged as squash `38b1bb4`, reviewed head `b2c6eaf`, GLM 5.3 Flash APPROVE in round 1 with canary `6p-bcca13fc972112ea9529edaf8cb70f9c` echoed. At `b2c6eaf` lint, typecheck, build, both retained-bundle checks and all nine `check:*` scripts exited 0, `goldens.test.ts` was byte-identical to `origin/main`, 2,013 unit tests passed in 230 files and Prettier passed on 10 touched files; hosted check and all eight e2e shards green on the first run. The coordinator re-ran `probe.mts --probe luck --bot good --n 150 --seeds 40` at the head: squad share of variance 0.113 [0.095, 0.133], mean wins 5.885, matching audit A. Production `/api/health?db=1` served `38b1bb4` with engine `pokedraft-engine-6` and `db.status` ok; live `health.spec.ts` 1/1 on chromium. No runtime change.

## Wave 5 summary

Branch `docs/wave5-summary` off `origin/main` at `e1f2c38`. Green: docs only, no runtime change.

- `docs/reports/audits-2026-10-17/program-log.md` gains the Wave 5 entry: the PR table for the eleven rows and three side PRs, the landed order and why, the hosted CI failures treated as real, the database receipts, measurements that moved, brief vs code, open carryovers and the Wave 7 additions.
- `docs/decisions/wave5-summary.md` holds the owner phone checklist, the screen reader pass and the owner items still open (the passcode gate is off in production; credential rotation and the WAF rule are decided for Wave 7).
- Production at the start of this PR serves `e1f2c38` (PR #139), engine 6, token versions 1 to 6, `db.status` ok, 6 migrations and 3 leaderboard entries.
- The PR #137 and PR #138 merged paragraphs are added here, under their own sections. Neither 5c1 nor 5c2 needed a merge of `origin/main`, and the coordinator's paragraph step had been tied to that merge, so both were missed until this PR.
- NOT RUN: the phone check, the screen reader pass and the owner items; unit and e2e suites on this branch (nothing under `src/` or `e2e/` changed; CI runs them).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #140 (Wave 5 summary, Green) merged as squash `9e4802b`, reviewed head `fcd1745`, GLM 5.3 Flash APPROVE in round 1 with canary `wave5-summary-135d85a8ca4f8795c14e032fabd8c0cb` echoed. At `fcd1745` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,998 unit tests passed in 229 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `9e4802b` with `db.status` ok. No runtime change.

## Exhibitions on the Broadcast

Branch `feat/exhibition-broadcast` off `origin/main` at `aeb66b6`. Wave 5 row 5c2 (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- "Kick off" plays an exhibition on the 2D Broadcast, the same pitch, ticker and scoreboard as a cup match. The text replay is gone.
- One match with manager mode on opens the touchline: it stops at half time, at an injury and at 65 minutes, and a sub or tactic made there changes the result. With manager mode off it plays like a sim.
- Two legs play both legs on the Broadcast with no stop. The picker says "Manager controls in one match only." When leg 2 needed extra time, the card under the pitch says so and lists the extra time goals.
- Squads field their bench now (injury and fatigue subs), so an old exhibition link can show a different score than before.
- "Play rematch" sits under the full-time line and moves focus back to "Kick off". Exhibitions stay unranked and never reach History.

RED commits: `05ca319` (8 of 17 unit tests failed in the 2 files that loaded; `exhibition-decide.test.ts`, 4 tests, and `ExhibitionMatch.test.tsx`, 4 tests, failed to load), `f8bc6ea` (1 of 5 failed: focus after a rematch), `a3c87ac` (2 of 4 run failed: the landscape page-reach probe counted ticker lines inside their own scroll box). GREEN `39990b9`, `521d5aa`, `6e29059`.

Gates at `849d2ad` (later commits change only e2e files, docs and screenshots):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files. Lint and typecheck exited 0 again at `6e29059`.
- Unit tests: 1,998 passed in 229 files.
- Playwright (`CI=1`, headless, `--retries=0`): the full suite at `6e29059`, all projects, 1,077 passed, 67 skipped, 0 failed (18.0m). An earlier full run at `849d2ad` had 1 failure, fixed by `6e29059`. At `cee7a76`: `exhibition-broadcast`, `touchline-sheet`, `exhibition-route` and `exhibition-two-legs` 21 of 21 (chromium).
- At 320 px and 308 px the page never scrolls sideways. Widest right edges before kick off, at the half-time stop and at full time: 304 and 292. The touchline sheet's content: 310 and 298, inside the viewport.
- NOT RUN: the e2e specs against the RED builds, `exhibition-broadcast.spec.ts` on WebKit and the phone projects, review and hosted CI, the phone check and screen reader pass.

Decision log: `docs/decisions/exhibition-broadcast.md`. Browser proof: `docs/reports/exhibition-broadcast/` (`{390,360,320}-halftime-stop.png`, `{390,360,320}-sub-made.png`, `{390,360,320}-fulltime.png`, `390-two-legs.png`, `fulltime-{390,360,320}-{light,dark}.png`). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #139 (row 5c2, exhibitions on the Broadcast with manager controls, Yellow) merged as squash `e1f2c38`, reviewed head `997d93a`, GLM 5.3 Flash APPROVE in round 1 with canary `exhibition-broadcast-5892f40d33c203275f927989df4f2691` echoed. At `997d93a` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,998 unit tests passed in 229 files and Prettier passed on 23 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `e1f2c38` with `db.status` ok; `exhibition-broadcast`, `exhibition-route`, `exhibition-two-legs` and `touchline-sheet` against production (chromium) passed 21 of 21. Exhibition pins moved because subs and injuries are now on (one match 4-1 to 4-0; no stored or ranked data depends on them). Carryover: the touchline sheet's content reaches 310 px at 320 (10 px of headroom; existing Wave 3 UI). NOT RUN: `exhibition-broadcast` on WebKit and the phone projects, a real phone check and a screen reader pass (owner actions).

## Exhibition route

Branch `feat/exhibition-route` off `origin/main` at `54c6a58`. Wave 5 row 5c1 (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Exhibitions have their own page, `/exhibition`, instead of a modal on shared runs. "Exhibition vs this squad" sits on every History row, every leaderboard row and the shared run page.
- Your side defaults to your newest saved run that kept its 16 species, else your Builder squad. A "Your squad" picker lists those runs (date, formation, record) and "Builder lineup". With neither, the page links to Play and the Builder.
- The other side reads "Misty's squad" when you came from Misty's board row, else "Their squad". "Shared squad" is gone. A squad against itself says "Same squad on both sides" and still plays.
- One match or two legs, and every rematch, are in the link (`?home=&away=&n=&legs=&name=`), so a link replays the same match. Exhibitions stay unranked and never reach History.
- Links from retained engines (pd1 to pd5) play too: the page reads each squad from the token's picks and swaps without replaying the draft.

RED commit: `c441240` (2 of 18 unit tests failed in the 2 files that loaded; `exhibition-route.test.ts`, 25 tests, and `ExhibitionScreen.test.tsx`, 8 tests, failed to load). GREEN `8839ff7`.

Gates at `8839ff7`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 26 touched code and test files.
- Unit tests: 1,996 passed in 228 files.
- Playwright (`CI=1`, headless, `--retries=0`): `exhibition-route` 5 of 5, and with `exhibition-two-legs`, `platform-experience`, `board-ux`, `history-controls`, `lifetime-history`, `achievements`, `leaderboard`, `seed-board`, `share`, `challenge`, `a11y` and `server-html` 103 of 103 (chromium). The full suite once, all projects: 1,071 passed, 67 skipped, 0 failed (17.8m).
- At 320 px and at 308 px the page never scrolls sideways. Widest right edges: the exhibition page with a 20-W nickname 304 and 292, History rows 287 and 275, the widest own board row 275 and 275. `exhibition-route.spec.ts` asserts all of them at 308 or less.
- NOT RUN: the e2e specs against the RED build, `exhibition-route.spec.ts` on WebKit and the phone projects, review and hosted CI, the phone check and screen reader pass.

Decision log: `docs/decisions/exhibition-route.md`. Browser proof: `docs/reports/exhibition-route/` (`history-row-{390,360,320}.png`, `exhibition-{390,360,320}.png`, `route-{390,360,320}-{light,dark}.png`, `board-row-320.png`). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #138 (row 5c1, exhibition route, picker and entry points, Yellow) merged as squash `aeb66b6`, reviewed head `1b2c8dd`, GLM 5.3 Flash APPROVE in round 1 with canary `exhibition-route-3b64165b036d9028ad29126c8c571868` echoed. At `1b2c8dd` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,996 unit tests passed in 228 files and Prettier passed on 26 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `aeb66b6` with `db.status` ok; `exhibition-route`, `exhibition-two-legs`, `platform-experience` and `board-ux` against production (chromium) passed 24 of 24. Carryovers: a fast double tap on "Play rematch" can count once; the empty state's Play and Builder links both go to `/`. NOT RUN: `exhibition-route` on WebKit and the phone projects, a real phone check and a screen reader pass (owner actions).

## Board UX

Branch `feat/board-ux` off `origin/main` at `783ddbf`. Wave 5 row 5d (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Your own rows on the leaderboard stand out: an accent bar on the left and a "You" chip, matched to the nickname this browser last submitted (cleaned like the server cleans it). A screen reader hears "Misty, you". With no stored nickname nothing is marked, and the first paint never is.
- After a ranked submit, "Share my rank" sits next to "View leaderboard" and shares the run link with "I'm #3 on the October 9 daily. Beat it?" or "I'm #12 on the all-time board. Beat it?". No button when the rank could not be loaded.
- Daily rows show the formation ("4-3-3") instead of the same ruleset on every row; all-time rows keep their settings label.
- Each "Challenge this Seed" link is named for its row ("Challenge this Seed: Misty, 3-0-2"; in History, the row's date and record). The visible text is unchanged.
- Daily and All-time, and the mode chips, are pressed buttons in a group, like the coach chips. The app has no tab or radio roles left.
- The Hall of Fame opens on "Drafted species", or on "All species" for a player with no stored squad.
- Under the widest nickname the row chips now wrap whole instead of breaking "Coached" mid-word at 320 px.

RED commit: `3d8ff07` (12 of 41 unit tests failed in 4 of 4 files). GREEN `9584c1e`, chip wrap `6c73d50`, font swap spec literal `9ad9c46`.

Gates at `6c73d50` (`9ad9c46` changes only `e2e/leaderboard-font-cls.spec.ts`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the touched files.
- Unit tests: 1,931 passed in 225 files.
- Playwright (`CI=1`, headless, `--retries=0`): the full suite once passed 1,047 with 67 skipped and 4 failed (17.8m), all four `leaderboard-font-cls` cases on a stale row literal; after `9ad9c46`, `leaderboard-font-cls` and `leaderboard-cls` passed 13 of 13. `board-ux.spec.ts` 3 of 3; `leaderboard` and `platform-experience` 22 of 22 (chromium).
- The widest own row fits with 33 px to spare at 320 and at 308, and the submitted panel with "Share my rank" fits down to 300; `board-ux.spec.ts` asserts both at 308 px.
- NOT RUN: the e2e specs against a build of the RED commit, `board-ux.spec.ts` on WebKit and the phone projects, review and hosted CI, the phone check and screen reader pass.

Decision log: `docs/decisions/board-ux.md`. Browser proof: `docs/reports/board-ux/` (`own-row-{390,360,320}-{light,dark}.png`, `share-my-rank-{390,320}.png`). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #137 (row 5d, board UX, Yellow) merged as squash `54c6a58`, reviewed head `d4ff01a` (`4dbd58e` plus a merge of main bringing in PR #136 and a STATE note), GLM 5.3 Flash APPROVE in round 1 with canary `board-ux-a3c6062c1bea73a77645b64da0ed0129` echoed. At `d4ff01a` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,969 unit tests passed in 226 files and Prettier passed on 20 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `54c6a58` with `db.status` ok; `board-ux`, `leaderboard`, `platform-experience`, `leaderboard-font-cls` and `leaderboard-cls` against production (chromium) passed 38 of 38. Carryover: at 320 px the coach chips' labels touch their borders (not measured on main). NOT RUN: `board-ux` on WebKit and the phone projects, a real phone check and a screen reader pass (owner actions).

## Achievements

Branch `feat/achievements` off `origin/main` at `afaa695`. Wave 5 row 5h (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- The history page has an Achievements grid with six tiles: First Flawless, Hat-trick hero, Champion with every formation (with "n of 8"), 151 champion, Comeback and Giant killer. An earned tile is gold and shows the date of the first earn; the others say "Not yet".
- Only ranked runs count. A builder friendly never earns one.
- Older saved runs still earn First Flawless, 151 champion and their formation titles. The grid says once that Hat-trick hero, Comeback and Giant killer count runs played from 20 October 2026, because older runs did not store per-match results.
- Earns are kept with the lifetime totals, so trimming the 50-run history never loses one, and a backup carries them. Restoring keeps the earliest date. Old backups still restore.
- A run's results and its share card show its most notable earn as a gold chip: Giant killer, then Comeback, then Hat-trick hero, then 151 champion. Cards already shared keep their old picture.
- Giant killer means beating a Boss Club at least 100 above the rating you fielded. At 150 only 1.0% of 200 good-bot cups earned it, under the 2% floor, so the gap moved to 100 (2.5%).

RED commit: `2a74138` (9 of 65 unit tests failed in 4 files, and `achievements.test.ts`, 28 tests, failed to load). GREEN `73d5767`. `0e2bfde` adds `e2e/achievements.spec.ts` and the browser proof.

Gates at `0e2bfde` (code identical to `73d5767` plus the e2e spec):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 16 touched code and test files.
- Unit tests at `73d5767`: 1,911 passed in 222 files.
- Playwright (`CI=1`, headless chromium, `--retries=0`, build of the `73d5767` code): `achievements` passed 15 of 15, and with `results-reveal`, `theme-results`, `layout-shift`, `lifetime-history`, `history-controls`, `watch-live`, `highlights-honesty`, `results-interactions`, `head-to-head`, `share`, `share-sheet`, `challenge`, `run-persist`, `a11y`, `contrast`, `old-links`, `server-html`, `platform-experience`, `exhibition-two-legs` and `draft-modes` 167 passed and 1 skipped by its own project gate.
- NOT RUN: review and hosted CI; the full Playwright suite; WebKit and the phone projects; a real phone check and a screen reader pass over the grid and the chip (owner actions).

Decision log: `docs/decisions/achievements.md`. Browser proof: `docs/reports/achievements/` (`grid-{390,360,320}-{light,dark}.png`, `chip-{390,360,320}-{light,dark}.png`, `card-giant-killer.png`, `card-coached-giant-killer.png`).

Merge `0aae4bc` (#133 seed boards; only `STATE.md` conflicted, `ResultsView.tsx` merged cleanly with the chip, the trophy and the seed board together). With the seed board on every results page, `achievements.spec.ts`'s console check saw the seed board's 503 from the database-less local server (7 failed). The spec now answers `/api/leaderboard` with an empty seed board in a `beforeEach`, as `results-reveal.spec.ts` does. After that `achievements`, `results-reveal`, `seed-board`, `layout-shift`, `theme-results`, `lifetime-history` and `server-html` passed 53 of 53 (`CI=1`, `--retries=0`, build of `0aae4bc`).

Merge `cc34701` (#136 achievements; only `STATE.md` conflicted). Full Playwright suite on a build of `cc34701` (`CI=1`, headless, `--retries=0`, 4 workers, all projects): 1,066 passed, 67 skipped by their own project gates, 0 failed (17.7m).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #136 (row 5h, achievements, Yellow) merged as squash `fc657f4`, reviewed head `2306816` (`1228750` plus a merge of main bringing in PR #133 and a seed board stub in `achievements.spec.ts`), GLM 5.3 Flash APPROVE in round 1 with canary `achievements-fece2fd90d77f93b58fbd5ff24535cd1` echoed. At `2306816` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,953 unit tests passed in 225 files and Prettier passed on 18 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `fc657f4` with `db.status` ok; `achievements` (including a real `/card` render through satori), `results-reveal`, `lifetime-history` and `layout-shift` against production (chromium) passed 38 of 38. The Giant killer threshold is 100, not 150, by the hand-off's 2% to 20% rule (150 earned 1.0% of 200 good-bot cups, 100 earned 2.5%). Hat-trick hero is common (68.0% of those runs) under its literal definition. NOT RUN: WebKit and phone projects for the grid and chip, a real phone check and a screen reader pass (owner actions).

## Seed boards and engine filter

Branch `feat/seed-boards` off `origin/main` at `07beda9`. Wave 5 row 5g (Red). No file under `src/engine`, `src/data` or `src/scouting` changed, and there is no migration.

- The all-time board shows only runs played on the current engine (v6) by default, and the caption says "all-time, engine v6." An "All engines" button adds older runs, each labelled "Engine v3" (or its own version), and the link gains `engine=all`. Daily boards are unchanged.
- After a cup, live results and every shared `/r/` page show "Friends on this seed": every submitted run on the same seed and mode, best first, up to 20, across engines and dates. The current run is marked "This run". The table loads after the page, hides when nobody submitted the seed, and says "Board unavailable" when it cannot load. Builder friendlies have none.
- A player who submits to the all-time board is told their rank on the current-engine board, the one "View leaderboard" opens.
- Board rows now carry `engineVersion`, `seed` and `formation` (null when the token does not decode). `GET /api/leaderboard?mode=..&seed=..` answers the seed board; an empty, blank or too long seed is 400 `INVALID_QUERY`, a seed nobody played is 200 with no entries.

RED commit: `b10dad5` (26 of 37 unit tests failed in 4 of 4 files; `seed-board.test.tsx` failed to load). GREEN `6a8fee2`, Prettier `7a9e7d2`.

Gates at `7a9e7d2`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0 (`check:client-bundle`: no retained engine bundle). Prettier passed on the touched files.
- Unit tests: 1,858 passed in 218 files.
- Playwright (`CI=1`, headless): the full suite across all six projects passed 1,020 with 67 skipped and 0 failed (17.9m); `seed-board.spec.ts` passed 8 of 8 on chromium, and `layout-shift` plus `server-html` passed 10 of 10.
- NOT RUN: every Neon query and the production real-API check (the coordinator runs them), `seed-board.spec.ts` against the RED build, review and hosted CI, `seed-board.spec.ts` on the WebKit and phone projects (it runs on chromium only), the phone check and screen reader pass.

Merges of `origin/main` into the branch (no rebase): `e54e9e2` (#131 share sheet; only `STATE.md` conflicted) and `026c596` (#132 head-to-head; `STATE.md` and `src/ui/challenge-href.ts` conflicted; main's `challenge-href.ts` taken, and `readTokenRun` in `src/ui/versus.ts` now reads through `readAnyToken`, same result). Gates at `026c596`: `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0, all nine `check:*` scripts exited 0, unit tests 1,905 passed in 224 files, and the full Playwright suite passed 1,034 with 67 skipped and 0 failed (19.2m; `seed-board` 8, `head-to-head` 5, `share-sheet` 9, `layout-shift` 7 and `server-html` 3 among them). The seed board screenshots came out byte-identical.

Merge `da86f41` (#135 badge loop budget and #134 results reveal; `STATE.md` and the `ResultsView.tsx` imports conflicted, both the `SeedBoard` and `Trophy` imports kept). With the seed board now on 5e's live results, `results-reveal.spec.ts`'s no-console-error check saw two 503s from `/api/leaderboard` (the local server has no database), deterministically, 3 of 3. That spec now stubs an empty seed board, like `seed-board.spec.ts`; it passed 14 of 14. Full Playwright suite after that (`CI=1`, `--retries=0`, 4 workers): 1,047 passed, 67 skipped, 1 failed, an `iphone-14` `mobile-draft` test with the harness error "Cannot find parent object browser", which passed 3 of 3 on a rerun.

Hosted CI at `3eac05a` (both receipts) failed shard e2e (3): `seed-board.spec.ts` at 320 px measured the seed table 3 px wider than its wrapper, on the attempt and its retry (run 39364653413). Locally it fit, with 3 px to spare on macOS fonts; measured at narrower widths the same table overflowed by 7 px at 310 and 17 px at 300. The floor came from fixed columns: the nowrap "Engine v3" tag (player column 74 px) and the "Formation" header (65 px). Cell side padding goes from 3 to 2 px and tag side padding from 6 to 4 px, with no copy or column change: the table's minimum drops from 254 to about 239 px, so it fits down to 306 px locally (overflow 5 px at 300). The 320, 360 and 390 seed table screenshots were regenerated. The PR was not merged at `3eac05a`; both receipts were rerun at the fix head.

Decision log: `docs/decisions/seed-boards.md`. Browser proof: `docs/reports/seed-boards/` (seed table at 390, 360 and 320, the unavailable state, All engines at 390, 360 and 320). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #133 (row 5g, seed boards and engine filter, Red) merged as squash `783ddbf`, reviewed head `5cf4f47`. Round 1 at `3eac05a` (GLM 5.3 Flash APPROVE, canary `seed-boards-a9d72814eeca653b17b9896a23ff8872`, and the independent Red reviewer PASS) was voided when hosted e2e (3) measured the seed table 3 px wider than its wrapper at 320 px on Linux fonts (attempt and retry, run 39364653413); the fix lowered cell and tag padding. Round 2 at `5cf4f47`: GLM 5.3 Flash APPROVE with canary `seed-boards-r2-2c6347b44475602b7f3bbbc22b217216` echoed, and a fresh independent `pokedraft-mode` Red reviewer PASS that re-executed lint, typecheck, build and all nine `check:*` scripts (exit 0), 1,915 unit tests in 224 files, the PGlite leaderboard tests (124 in 11 files) and read-only GETs against the Neon preview branch. No migration. Hosted check and all eight e2e shards green. Production `/api/health?db=1` served `783ddbf` with `db.status` ok. Production read-only API: the all-time default returned 1 engine 6 row, `engine=all` returned 3 rows (adding two engine 3 rows), the 16 October daily seed returned its engine 6 row, and an empty seed returned 400 `INVALID_QUERY`. `seed-board`, `leaderboard`, `layout-shift` and `server-html` against production (chromium) passed 26 of 26. Carryovers: a misleading comment on the rank test in `seed-board.test.ts`; "This run" compares token strings; no `(mode, seed)` index (threshold recorded in `store.ts`).

## Results reveal and sync

Branch `feat/results-reveal` off `origin/main` at `9f01b8c`. Wave 5 row 5e (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- The first time you see a run's results after playing it, the Team Score counts up from 0, the W-D-L record flips in, a gold trophy appears beside Champions and the gold flawless mark pops in, then a "Player of the tournament" card rises in with the player's picture, name and points breakdown. It takes under 2 seconds.
- A friend opening your link, a reload or a second look in the same tab shows the final numbers at once, and so does a phone set to reduce motion.
- An 8-0 flawless run's mark is gold instead of green, in both themes.
- The player of the tournament is shown once, on the new card at the top; the Awards box keeps Golden Boot and Top assister. A run from an older engine shows the name only.
- Tapping a match's star player scrolls the highlights into view and moves focus to the star's name. Closing Watch live puts focus and the page back where you were, and after a goal link it lands on that match's Watch live button.
- The highlights have a visible "Highlights" heading and the star's name is a sub-heading, so screen reader heading lists read in order.

RED commit: `e2ce665` (7 of 36 unit tests failed in `ResultsView.test.tsx`; `e2e/results-reveal.spec.ts` failed 5 of 7 against a build of `e2ce665`). GREEN `dbab0bf`. `f13d897` watches the console on the live reveal, and `94fc71b` adds a zero layout shift guard (regression guard, no RED).

Gates at `dbab0bf` (the later commits change only `e2e/results-reveal.spec.ts`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 11 touched code and test files.
- Unit tests: 1,873 passed in 221 files.
- Playwright (`CI=1`, headless, `--retries=0`, build of the `dbab0bf` code): `results-reveal` passed 14 of 14 at `94fc71b`; with `watch-live`, `theme-results`, `layout-shift`, `highlights-honesty`, `results-interactions`, `head-to-head` and 18 more related specs, 187 passed and 5 skipped by their own project gates. Full suite once with the specs of `f13d897`: 1,039 passed, 67 skipped by their own project gates, 0 failed, 0 flaky.
- NOT RUN: review and hosted CI; WebKit and a real phone for the reveal and the focus return, and a screen reader pass over the MVP card and highlights headings (owner actions).

Decision log: `docs/decisions/results-reveal.md`. Browser proof: `docs/reports/results-reveal/` (`reveal-{0ms,600ms,2000ms}-390.png`, `hero-{390,360,320}-{light,dark}.png`, `highlights-{390,360,320}-{light,dark}.png`).

PR #134 (row 5e, results reveal and sync, Yellow) merged as squash `afaa695`, reviewed head `32b082c` (`cbd0ba3` plus a merge of main bringing in PR #135), GLM 5.3 Flash APPROVE at `cbd0ba3` (canary `results-reveal-72c25fd5263faef1c355d672c87ff28c`) and again at `32b082c` (canary `results-reveal-r2-63637163fa52ca8be0db7d712147b2f3`), both echoed. At `cbd0ba3` hosted shard e2e (4) failed twice (first attempt and a rerun of the failed job) on the play badge test's 240 s timeout; per hand-off 3.5 that went to its own fix, PR #135, before this row landed. At `32b082c` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,873 unit tests passed in 221 files and Prettier passed on 13 touched files; hosted check and all eight e2e shards green on the first run (play badge test 2.8 minutes per width). Production `/api/health?db=1` served `afaa695` with `db.status` ok; `results-reveal`, `watch-live`, `theme-results` and `layout-shift` against production (chromium) passed 28 of 28. NOT RUN: the reveal on a real phone and a screen reader pass over the staged reveal (owner actions).

## Badge loop budget

Branch `test/badge-loop-budget` off `origin/main` at `9f01b8c`. Out-of-band side fix (Green) that unblocks Wave 5 row 5e (PR #134). Only `e2e/team-readability.spec.ts` changed. No product code changed.

- PR #134 failed shard e2e (4) on hosted run 39357079608 twice (first attempt and a rerun of the failed job): all three widths of the play badge test hit their 240 s timeout. Per hand-off 3.5 that is not a flake, so it gets its own PR first.
- The test steps a fake clock through a whole match, up to 3,000 steps, and made three browser round trips per step. One `evaluate` now reads the minute and the badge together, the test asserts the loop reached minute 90, and the timeout is 480 s.
- Local, same build, chromium, `CI=1`, `--retries=0`: main's spec ran the three widths in 54.6 s and this branch in 35.0 s (11.7, 11.3 and 11.3 s). Both found 13 badges with a closest margin of 0 px and none clipped.

Gates at the head: recorded in the PR review receipt. NOT RUN: the full Playwright suite locally (hosted CI runs it).

Decision log: `docs/decisions/badge-loop-budget.md`.

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #135 (out-of-band side fix for 5e, badge loop budget, Green) merged as squash `36ac415`, reviewed head `c896ac8`, GLM 5.3 Flash APPROVE in round 1 with canary `badge-loop-budget-df969b100b9d1780af8e0191df73502e` echoed. At `c896ac8` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,863 unit tests passed in 221 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green on the first run, with the play badge test at 2.7 minutes per width on shard 4 (3.1 to 3.3 minutes before). Production `/api/health?db=1` served `36ac415` with `db.status` ok; `team-readability` against production (chromium) passed 7 of 7.

## Head-to-head challenges

Branch `feat/head-to-head` off `origin/main` at `71a86ec`. Wave 5 row 5b (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Live results of a ranked run have a "Challenge a friend" button. It shares a link to the same seed and settings that carries your run, with "I went 1-1-2. Can you beat it on the same seed?". A builder friendly has no such button.
- A friend who plays that link sees a "Head to head" card right under the results hero: who won the seed ("You win the seed", "They win the seed" or "Level on the seed", decided like the board by wins, then draws, then Team Score), both records and Team Scores, and each round's score side by side. "Send it back" shares their own run the same way.
- A link whose run is from another seed or other settings plays normally with no comparison. New run drops the run to beat from the address.
- A run from an older engine still sets the challenge, and the card says "Their run used engine v5, so there is no side by side." instead of inventing a result.
- A shared run's "Challenge this Seed" now uses the same link builder; it goes to the same place as before.

RED commit: `0a7df7b` (5 of 31 unit tests failed in 3 of 5 files, and `versus.test.ts` and `HeadToHead.test.tsx` failed to load). GREEN `d46b88a`. `37b4091` adds `e2e/head-to-head.spec.ts` and the generated `HEAD_TO_HEAD` pins. `67039e2` keeps round names on one line at 320 px.

Gates at `67039e2`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 17 touched files.
- Unit tests: 1,863 passed in 221 files.
- Playwright (`CI=1`, headless, `--retries=0`, build of `67039e2`): `head-to-head` passed 5 of 5, and with `challenge`, `share`, `share-sheet`, `draft-modes`, `platform-experience`, `run-persist`, `leaderboard`, `history-controls`, `lifetime-history`, `results-interactions`, `theme-results`, `layout-shift`, `old-links`, `server-html`, `one-tap-play` and `a11y` 128 passed and 5 skipped by their own project gates.
- NOT RUN: review and hosted CI; the full Playwright suite; the real share sheet on a phone and a screen reader pass over the head-to-head card (owner actions).

Decision log: `docs/decisions/head-to-head.md`. Browser proof: `docs/reports/head-to-head/` (`they-win-{390,360,320}.png`, `you-win-390.png`, `level-send-it-back-390.png`, `retained-390.png`).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #132 (row 5b, head-to-head challenges, Yellow) merged as squash `9f01b8c`, reviewed head `960539b` (`84969bb` plus the PR #131 STATE paragraph), GLM 5.3 Flash APPROVE in round 1 with canary `head-to-head-853bc57b4f1a89df1104672e88324070` echoed. Landed ahead of 5g, which was still building: its files are disjoint apart from one mount line each in the results views, and the Red row still needed two receipts and its database steps. At `960539b` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,863 unit tests passed in 221 files and Prettier passed on 19 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `9f01b8c` with `db.status` ok; `head-to-head`, `challenge` and `share-sheet` against production (chromium) passed 16 of 16. NOT RUN: the challenge loop on two real phones and a screen reader pass over the head-to-head table (owner actions).

## Share sheet and run metadata

Branch `feat/share-sheet` off `origin/main` at `5932775`. Wave 5 row 5a (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- On a phone, Share on results opens the phone's share sheet with "7-1-0, Team Score 812. Beat it?" style text and the link. A friendly says "Friendly: 7-0-1, Team Score 845." with no dare. Share this goal says "Watch this goal." and the Builder's button, now "Share link", says "My pokedraft XI.". On a computer each one copies the link, as before.
- When the link cannot be copied, a "Link" box shows the full link, selected, so it can be copied by hand.
- On a phone, Download image hands the card to the share sheet with the link and the same words, straight from the tap: results fetch the card in the background once they settle, unless Data Saver is on. A computer still fetches the card only when Download is pressed.
- A run link's preview now has a line under the title, "Champions with 4-3-3. Draft your own XI on pokedraft.", and the card's alt text carries the record and Team Score. Gated links show the same preview.
- A coached run's card shows a "Coached" chip after the formation.
- Not built: the nickname on the card (anyone could print any name on any run through the public card URL), and `/?b=` link previews (moved to Wave 7).

RED commit: `c003ef9` (12 of 87 unit tests failed in 6 of 9 files, and `shareLink.test.ts` failed to load; `e2e/share-sheet.spec.ts` failed 6 of 8 against a build of `5932775`, the other 2 being a labelled regression guard and a proof capture). GREEN `6cff46f`. `25b5665` adds the goal and Builder fallback proof and the screenshots. `0ddcaa6` matches the repo's doc comment layout (comments only).

Gates at `0ddcaa6`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 24 touched text files.
- Unit tests: 1,828 passed in 217 files.
- Playwright (`CI=1`, headless, build of `0ddcaa6`): `share-sheet` passed 9 of 9, and with `share`, `challenge`, `draft-modes`, `manager-mode` (chromium and pixel-7), `run-persist`, `swap-a11y`, `images`, `builder`, `server-html`, `old-links` and `replay-deep-links` 73 passed and 1 skipped by its own touch gate.
- Full Playwright suite once, on a build of `6cff46f` with the specs of `25b5665` (code identical to `0ddcaa6` except comments): 1,013 passed, 67 skipped by their own project gates, 0 failed, 0 flaky.
- NOT RUN: review and hosted CI; the real share sheet on a phone and a screen reader pass over the Link field (owner actions).

Decision log: `docs/decisions/share-sheet.md`. Browser proof: `docs/reports/share-sheet/` (`share-sheet-stubbed-390.png`, `manual-link-{390,360,320}.png`, `manual-goal-link-390.png`, `manual-builder-link-390.png`, `coached-card.png`).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #131 (row 5a, share sheet, card prefetch and run metadata, Yellow) merged as squash `71a86ec`, reviewed head `53bd08c` (the coordinator's merge of `origin/main` at `07beda9`, a STATE-only conflict, on top of `3f6a3b7`), GLM 5.3 Flash APPROVE in round 1 with canary `share-sheet-d2b2ddc842d2b015340ab24d042b90d4` echoed. At `53bd08c` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,839 unit tests passed in 218 files and Prettier passed on 25 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `71a86ec` with `db.status` ok; `share-sheet`, `share`, `server-html` and `challenge` against production (chromium) passed 30, with one retry of the phone prefetch-and-share case on a cold `/card` render, then `share-sheet` passed 27 of 27 with `--retries=0 --repeat-each=3`. A production `/r/<token>` page served `og:description` "Out in the Round of 32 with 4-3-3. Draft your own XI on pokedraft." and `og:image:alt` "pokedraft run card: 2-1-1, Team Score 333". NOT RUN: the real share sheet on a phone and a screen reader pass over the Link field (owner actions), WebKit share-sheet e2e.

## Leaderboard integrity contract and copy guard

Branch `feat/leaderboard-integrity` off `origin/main` at `3b821d1`. Wave 5 row 5f2 (Red). No file under `src/engine`, `src/data` or `src/scouting` changed.

- A copy of a run that is already on the board is refused, even when the copy adds touchline decisions that change nothing. The player sees "This exact run is already on the board, listed under Misty." with the nickname of the listed run.
- Two friends who play the same Daily with the same XI in the same slots and get the same result count as one run: the second is refused and sees the first's nickname. This is the decided tradeoff.
- The Coached filter and the Coached chip read the same stored value, so they always agree.
- Migration `0005_leaderboard_integrity` makes `coached` and `run_fingerprint` NOT NULL and adds the unique `(mode, run_fingerprint)` index and the coached board index, with a paired down file. `db:smoke` now also proves the fingerprint index refuses a copy. The one-shot `db:backfill-runs` is deleted. Production met the precondition on 2026-10-19 (0 NULLs, 0 duplicate groups, 3 rows).

RED commit: `186a5cd` (8 of 85 unit tests failed in 6 of 6 files; the new `leaderboard.spec.ts` case failed 1 of 1 against a build of `186a5cd`). GREEN `2b799a4`.

Gates at `2b799a4`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0. Prettier passed on the 22 touched non-SQL files.
- Unit tests: 1,813 passed in 215 files.
- Playwright (`CI=1`, headless, chromium): `leaderboard`, `leaderboard-cls`, `leaderboard-date`, `leaderboard-font-cls` and `theme-board` passed 31 of 31; `a11y`, `contrast`, `platform-experience` and `manager-mode` passed 73 of 73.
- PGlite: the `db:smoke` statements printed both 23505 lines and `[db:smoke] OK`; the 0005 down file restores nullable columns and drops both indexes; the coached all-time query plans an index scan on `leaderboard_entries_coached_board_idx`. The 5f1 code with 0005 applied answers a copy with 409 `DUPLICATE_TOKEN`.
- NOT RUN: every Neon step (preview migrate, smoke, rollback, migrate; production restore point, migration and real-API smoke; the coordinator runs them), review and hosted CI, the full Playwright suite, the CI data rebuild, the phone check and screen reader pass.

Decision log: `docs/decisions/leaderboard-integrity.md`. Browser proof: `docs/reports/leaderboard-integrity/duplicate-run-390x844.png`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #129 (row 5f2, leaderboard integrity contract and copy guard, Red) merged as squash `07beda9`, reviewed head `1039845` (the coordinator's merge of `origin/main` at `f27f17c`, a STATE-only conflict, on top of `b094210`). Receipts on the same head: GLM 5.3 Flash APPROVE in round 2 with canary `leaderboard-integrity-r2-34bf5f0f7ff3cdbfb61351962c093c19` echoed (round 1 at the same head returned REQUEST_CHANGES only because `coach-mark.test.tsx`, a file this PR does not touch, failed once while the Red reviewer's gates ran concurrently at load average 12; it passed 5 of 5 alone and the full gates were re-run quietly), and the independent executing Red reviewer (a fresh pokedraft-mode subagent, interrogate rubric) PASS. At `1039845` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,816 unit tests passed in 215 files and Prettier passed on 24 touched files; hosted check and all eight e2e shards green on the first run. Database receipt: preview ran migrate, smoke (both 23505 cases), rollback and migrate (6 migrations) twice, once by the coordinator and once by the Red reviewer; no backfill (the script is deleted). Before the production migration the precondition held (0 NULLs, 0 duplicate `(mode, run_fingerprint)` groups, 3 entries); restore point `pre-0005_leaderboard_integrity` (`br-noisy-bread-b7gzc2s4`) created; production `db:migrate` before merge recorded 6 migrations with both columns NOT NULL, `leaderboard_entries_fingerprint_uq` and `leaderboard_entries_coached_board_idx` present and 3 entries unchanged. Real-API smoke on the 2026-10-19 Daily as `w5proof1019`: 201 (rank 1, 3-0-1, Team Score 429) then 200 on retry, and the same run as `w5proof1019b` got 409 `DUPLICATE_TOKEN` with `nickname` `w5proof1019`; `db:delete-entry` removed exactly the smoke row (`ee1af1e3`), leaving 3 entries and 0 NULLs. Production `/api/health?db=1` served `07beda9` with `db.status` ok; `leaderboard`, `leaderboard-date` and `theme-board` against production (chromium) passed 18 of 18. NOT RUN: physical phone check and screen reader pass of the duplicate message (owner actions).

## Health cron removed

Branch `ci/remove-health-cron` off `ef542fb`. Green: deletes `.github/workflows/health.yml` and updates docs. No change under `src/`, `e2e/` or `scripts/`.

- The owner asked for the 30-minute health check to go: "please remove the health check that runs every 30 minutes, i don't need any health check". The workflow was disabled on GitHub the same day (`disabled_manually`) and this PR deletes it. It ran once, the manual dispatch after #128, and opened no issue.
- The `/api/health` route stays: the merge procedure reads it once per landing to confirm production serves the merged sha. Nothing calls it on a schedule.
- Players see no change.

Gates: Prettier passed on the touched Markdown. The coordinator re-runs every gate at the head for review. NOT RUN: nothing specific to this change beyond CI.

Decision log: `docs/decisions/health-cron.md` ("Removed").

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #130 (health cron removed, Green) merged as squash `f27f17c`, reviewed head `8e6a39c`, GLM 5.3 Flash APPROVE in round 1 with canary `remove-health-cron-73a686964b58b634d8d8c03d1b701fa8` echoed. At `8e6a39c` lint, typecheck, build and all nine `check:*` scripts exited 0 and Prettier passed on 2 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `f27f17c` with `db.status` ok, and `gh workflow list` no longer lists the health workflow. No runtime change.

## Wave 4 carryovers and queue triage

Branch `fix/wave4-carryovers` off `origin/main` at `5932775`. Wave 5 row 5-0 (Yellow; the queue triage is Green). No file under `src/engine`, `src/data` or `src/scouting` changed.

- On a friend's shared replay the goal line reads "Goal for this squad!" instead of "Goal for This squad!". Cards and penalties name "(this squad)" the same way.
- Screen readers hear the wheel's landed Pokémon and each Boss XI player once, by the written name, instead of the picture repeating it.
- On the home page of a phone with a home bar, the gap between the last card and the footer is 32px again instead of 66px; the footer keeps its own clearance, so its text ends 65px above the bottom edge.
- On a notched phone turned to landscape, the header and page content sit 47px from each side (the notch) instead of 63px; 820px-wide pages sit at 59px. Phones without a notch look the same as before.
- Docs only: the deferred audit queue loses 11 fixed SA rows (each with its PR), and the 13 left get one disposition each.
- Closed by measurement, no code change: the 4h2 4-pixel matchday diffs also appear between two shots of one build (frame noise), and both swipes (draft drawer and Builder Picker) kept every frame at 4x CPU throttle (p95 16.7 ms).

RED commits: `456d436` (3 of 60 unit tests failed in 3 files; `e2e/safe-area-insets.spec.ts` failed 6 of 7 against a build of `5932775`, the no-notch case passing as a labelled regression guard) and `051b0dc` (the re-decided footer guard and the 820px edges; 6 of 7 failed against a build of `051b0dc`, whose code equals `5932775`). GREEN `90442aa`. `b2f000c` adds the Builder Picker scene to `scripts/perf/draft-drag.mts` and the measurement files; `34b26b6` updates `engine-v4` and `pwa-viewport` to the new literals.

Gates at `b2f000c` (code-identical to `34b26b6` outside `e2e/`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0 (lint and typecheck again at `34b26b6`). All nine `check:*` scripts exited 0.
- Unit tests: 1,808 passed in 214 files.
- Full Playwright suite (`CI=1`, headless, build of `b2f000c`): 1,008 passed, 67 skipped, 3 failed, no flaky. The 3 were spec churn (two `engine-v4` cases counting Boss XI pictures by role, and `pwa-viewport` expecting the home page's 66px). After `34b26b6`, `engine-v4`, `pwa-viewport`, `safe-area-insets`, `a11y`, `wheel-results`, `mobile-acceptance` and `theme-breakpoints` passed 356 with 54 skipped, 0 failed.
- Safe areas measured with Chromium's `Emulation.setSafeAreaInsetsOverride`: portrait top 47 and bottom 34 at 390x844; landscape left 47, right 47 and bottom 21 at 844x390.
- NOT RUN: review and hosted CI; WebKit and Firefox safe-area checks; a physical phone check and a real screen reader pass (owner actions).

Decision log: `docs/decisions/wave4-carryovers.md`. Browser proof: `docs/reports/wave4-carryovers/{home-footer-notch-390,home-landscape-notch-844}.png`; measurements in `docs/reports/wave4-carryovers/{swipe.json,frame-noise.jsonl}`.

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #127 (row 5-0, Wave 4 carryovers and queue triage, Yellow) merged as squash `ef542fb`, reviewed head `246ade2` (the coordinator's merge of `origin/main` at `32d0b69`, a STATE-only conflict, on top of `170fda6`), GLM 5.3 Flash APPROVE in round 1 with canary `wave4-carryovers-05f3b97dc9b0d977a8d15d7b4f43377b` echoed. At `246ade2` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,827 unit tests passed in 217 files and Prettier passed on 16 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `ef542fb` with `db.status` ok; `safe-area-insets`, `pwa-viewport`, `engine-v4` and `wheel-results` against production (chromium) passed 24 of 24. NOT RUN: physical phone check including real notch insets in landscape (owner action), a real screen reader, WebKit and Firefox safe-area checks.

## Health cron

Branch `ci/health-cron` off `5932775`, merged with `origin/main` at `3b821d1`. Green: one new workflow, `.github/workflows/health.yml`, and docs. No change under `src/`, `e2e/` or `scripts/`. A Wave 7 item landed early in Wave 5, right after 5f1, as the hand-off orders.

- Every 30 minutes (minutes 7 and 37, UTC) GitHub checks that production `/api/health?db=1` answers 200 with `db.status` ok and serves the sha at the head of `main`. A mismatch counts only once `main` is 20 minutes old, so a deploy in progress does not alarm.
- On failure it comments on the open "Production health check failing" issue, or opens one, and the run turns red. Players see no change.

Proof (no RED: a new workflow has no prior behaviour to fail): `actionlint` exit 0 with shellcheck; Prettier passed. The check step's script, run locally with `gh` and GNU `date` shimmed, returned no problem when the served sha equals main, a mismatch problem for a main merged 11,570 s earlier, no problem inside the grace window, and `HTTP 404` for a missing URL.

NOT RUN: the scheduled run and the issue step on GitHub before merge (`workflow_dispatch` runs only from the default branch; the first run is a manual dispatch after merge, recorded in the next STATE update); a real failure path on GitHub.

Decision log: `docs/decisions/health-cron.md`.

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #128 (health cron, Green) merged as squash `32d0b69`, reviewed head `c6f3f68`, GLM 5.3 Flash APPROVE in round 1 with canary `health-cron-90dd1579d5b60a67192da16d502be7fb` echoed. At `c6f3f68` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,824 unit tests passed in 217 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `32d0b69` with `db.status` ok. The first run of the workflow, dispatched by hand on `main` (run 39345587862), concluded success: `main=32d0b69... served=32d0b69... http=200 db=ok`. NOT RUN: a failing run on GitHub (it would open a real issue).

## Run fingerprint and coached column, expand

Branch `feat/leaderboard-fingerprint` off `origin/main` at `5932775`. Wave 5 row 5f1 (Red). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Players see no change: the board, its ranking, the Coached chip and the counts stay as they were.
- Every new board entry now records whether it was coached and a fingerprint of the run (squad, results and goals), which 5f2 will use to refuse a copied run. A command, `pnpm db:backfill-runs`, fills both for entries that already exist and refuses rather than guesses when an entry does not replay.
- Submitting a run takes 2 database queries instead of 3, and a board row reads its stored run once instead of twice.
- Migration `0004_run_fingerprint_coached` adds the two nullable columns and drops the unused `leaderboard_entries_ip_recent_idx`, with a paired down file.

RED commits: `8b879af` migration (2 of 5 failed), `179186a` fingerprint (file failed to load), `4d5f87b` submit writes (2 of 2 selected failed), `3e52136` insert plus rank (1 of 1 selected failed), `873b148` daily probe (1 of 2 selected failed), `021feba` one decode per row (2 of 3 failed), `688a5b9` backfill (file failed to load). Each GREEN follows its RED.

Gates at `1cf9c77`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0, `check-retained-replays` with "10 emitted golden replays passed". Prettier passed on the 22 touched non-SQL files.
- Unit tests: 1,824 passed in 217 files.
- Playwright (`CI=1`, headless, chromium): the five leaderboard and board-theme specs passed 30 of 30.
- `backfillRuns` under `node --conditions=react-server --import tsx` on a migrated PGlite: dry run 2 rows, real run "updated 2 row(s)", second run "updated 0 row(s)", 0 NULLs, 0 duplicate fingerprints. The `db:smoke` SQL passed on PGlite.
- NOT RUN: every Neon step (preview and production migrate, smoke, rollback, backfill, NULL check and duplicate query; the coordinator runs them), review and hosted CI, the full Playwright suite, the CI data rebuild, the phone check and screen reader pass. No UI change; browser proof not applicable.

Decision log: `docs/decisions/leaderboard-fingerprint.md`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #126 (row 5f1, run fingerprint and coached column, expand, Red) merged as squash `3b821d1`, reviewed head `ce1ad25` (`ba48f46` plus the PR #125 STATE paragraph, landed ahead of 5-0 because the Red lane is the critical path and the files are disjoint). Receipts on the same head: GLM 5.3 Flash APPROVE with canary `leaderboard-fingerprint-r2-b92aeca53940a9b396d7219df1b5f53a` echoed (round 1 at `ba48f46` also APPROVE), and the independent executing Red reviewer (a fresh pokedraft-mode subagent, interrogate rubric) PASS after re-running every gate and the preview cycle. At `ce1ad25` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,824 unit tests passed in 217 files and Prettier passed on 24 touched files; hosted check and all eight e2e shards green on the first run. Database receipt: the preview branch ran migrate, smoke, rollback and migrate (5 migrations) and the backfill dry run (2 rows), real run (2 updated, fingerprints equal the pd3 and pd6 literals) and a second run (0); restore point `pre-0004_run_fingerprint_coached` (`br-snowy-surf-b7yk5m7w`) created from production before the migration; production `db:migrate` before merge recorded 5 migrations with both columns nullable, `leaderboard_entries_ip_recent_idx` gone and row counts unchanged (3 entries, 9 rate-limit events). After merge the production backfill updated 3 rows (2 `pd3`, 1 `pd6`, all `coached` false) and a second run updated 0; 0 NULLs and 0 duplicate `(mode, run_fingerprint)` groups. Real-API smoke on the 2026-10-19 Daily as `w5proof1019`: 201 (rank 1, 3-0-1, Team Score 429, as replayed locally) then 200 on retry, the stored row had `coached` false and a fingerprint, the board listed it, and `db:delete-entry` removed exactly that row (`0402517c`). Production `/api/health?db=1` served `3b821d1` with `db.status` ok; `leaderboard`, `leaderboard-date` and `theme-board` against production (chromium) passed 17 of 17. NOT RUN: physical phone check and screen reader (no UI change).

## Wave 4 summary

Branch `docs/wave4-summary` off `b4f8ca7`. Green: docs only, no change under `src/` or `e2e/`.

- Wave 4 is closed: all twelve rows merged and live-checked, one PR each (#113 to #124). The entry with the PR table, order, measurements, brief vs code and open carryovers is in `docs/reports/audits-2026-10-17/program-log.md`.
- A read-only leaderboard query on 2026-10-19 found 3 rows and 0 identical squads under different nicknames, so 5f stays the first row of Wave 5.
- The owner phone check, screen reader pass and three account items (Vercel MCP access, credential rotation, WAF rate limit) are in `docs/decisions/wave4-summary.md`.

Gates: Prettier passed on the touched Markdown. CI runs the rest. NOT RUN: unit tests and e2e locally (no code changed), the physical phone check and screen reader pass (owner actions).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #125 (Wave 4 summary, Green) merged as squash `5932775`, reviewed head `4605872`, GLM 5.3 Flash APPROVE in round 1 with canary `wave4-summary-c9a240051fa41dd01a1bfa8e31bba22f` echoed. At `4605872` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,805 unit tests passed in 214 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `5932775` with `db.status` ok. No runtime change.

## PWA and viewport

Branch `feat/pwa-viewport` off `origin/main` at `5c7d4fb`. Wave 4 row 4i (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Players can add pokedraft to their home screen: it opens standalone with no browser bar, under the name "pokedraft", with a new soccer ball on pitch green icon (no Pokémon art). There is no offline mode.
- On phones with a notch and a home bar, the header, the draft's "Wait for the wheel to stop." toast and the last control on each page clear them. On an iPhone 14 the header grows from 57px to 104px and the page bottom gap from 32px to 66px; phones without a notch look the same as before.
- Pulling down during the draft no longer bounces the page or triggers pull-to-refresh. Every other screen scrolls as before.
- The install files (manifest and icons) stay reachable when the friends passcode is on, because browsers fetch them without cookies.

RED commit: `cd43845` (1 of 16 unit tests failed and `manifest.test.ts` failed to load; `e2e/pwa-viewport.spec.ts` failed 5 of 6 against a build of `5c7d4fb`, the sixth passing as a labelled regression guard). GREEN `171688a`. `2434ddb` adds the `/how-to-play` bottom check and the screenshots.

Gates at `2434ddb` (code-identical to `171688a` outside `e2e/` and `docs/`):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0 (the build at `171688a`). All eight `check:*` scripts exited 0. Prettier passed on the 12 touched text files (it has no parser for the SVG).
- Unit tests: 1,790 passed in 212 files.
- Playwright (`CI=1`, headless, build of `171688a`), full suite: 972 passed, 67 skipped by their own project gates, 0 failed, no retries. `pwa-viewport` passed 6 of 6.
- Safe areas measured with Chromium's `Emulation.setSafeAreaInsetsOverride` (top 47, bottom 34) at 390x844.
- NOT RUN: review and hosted CI; WebKit and Firefox safe-area checks (no inset override outside Chromium); landscape side insets (carryover); Add to Home Screen and real notch insets on a phone, and a screen reader pass (owner actions).

Decision log: `docs/decisions/pwa-viewport.md`. Browser proof: `docs/reports/pwa-viewport/{home-notch,draft-toast-notch,how-to-play-bottom-notch}-390.png`.

PR #123 (row 4i, PWA and viewport) merged as squash `b4f8ca7`, reviewed head `e9cbbdc` (the coordinator's merge of #124, a STATE-only conflict, on top of `1732326`), GLM 5.3 Flash APPROVE in round 1 with canary `pwa-viewport-67902a18eb8dea802e6a53349094fe83` echoed. At `e9cbbdc` lint, typecheck, build and all nine `check:*` scripts exited 0, 1,805 unit tests passed in 214 files and Prettier passed on 12 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `b4f8ca7` with `db.status` ok; `pwa-viewport`, `theme-breakpoints` and `mobile-acceptance` against production (chromium) passed 38 of 38, and a cookieless fetch of `/manifest.webmanifest`, `/icons/icon-192.png` and `/apple-icon.png` returned 200 each. NOT RUN: physical phone check including Add to Home Screen and real notch insets (owner action), a real screen reader, WebKit and Firefox safe-area checks, landscape side insets.

## Dark palette and breakpoints

Branch `refactor/theme-breakpoints` off `origin/main` at `5c7d4fb`. Wave 4 row 4h2 (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- In Day mode the dark floodlight glow behind the page is gone, panel edges use the light theme's edge colour, and the open player picker is a cream sheet with dark text instead of a navy one. The pitch, the player cards on it, the logo plate, the match highlights and the broadcast keep their night stadium look in both themes.
- On a computer window from 960 to 1023px wide, the home page shows the two-column layout (challenges on the left, the builder on the right) with settings open, as it already did from 1024px.
- On a tablet or window from 720 to 767px wide, the wider layouts that started at 768px now start at 720px. From 600 to 719px the match touchline is the bottom sheet and the camera starts on Follow, as on a phone; both switched at 600px before.
- A few rules that applied only to the narrowest phones now apply to every phone under 480px: 11px tactic names in the match sheet (under 360 before), the leaderboard caption's reserved height (under 360) and the momentum bar on its own row (under 420).
- A broken share link now follows a Night or Day choice. Before, that page followed only the phone's own light or dark setting.
- Every screen width rule uses one scale, 480, 720, 960 and 1200px, and `pnpm check:breakpoints` fails CI on any other width.

RED commits: `58cc2ae` (5 of 57 unit tests failed in 2 of 3 files; `check:breakpoints` found 47 off-scale widths in 43 queries; `e2e/theme-breakpoints.spec.ts` failed 3 of 30 against a build of `5c7d4fb`, the first paint cases passing as labelled regression guards) and `8cce85c` (2 of 5 `ThemeToggle` unit tests failed; 2 of 2 new 404 theme e2e cases failed against a build of `00ab013`). GREEN `00ab013`, fix `769b134`, `7e39085` (card grid without a query, CTA spec waits for the resized layout).

Gates at `7e39085`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All nine `check:*` scripts exited 0, `check:breakpoints` included. Prettier passed on the changed files (`src/design/tokens.css` is in `.prettierignore`).
- Unit tests: 1,802 passed in 213 files.
- Full Playwright suite at `7e39085` (`CI=1`, headless): 998 passed, 67 skipped, 0 failed. The first run at `00ab013` failed 4 (the 404 page lost the dark theme, fixed by booting the theme on mount) with 1 flaky (the CTA column test, now polled).
- NOT RUN: review and hosted CI; a physical phone check and a real screen reader pass (owner actions); WebKit and Firefox screenshots (the suite's WebKit projects ran); a results page pixel diff against the base.

Decision log: `docs/decisions/theme-breakpoints.md`. Browser proof: `docs/reports/theme-breakpoints/` (home, draft, results and matchday at 320, 360, 390, 720, 960 and 1280, light and dark).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #124 (row 4h2, dark palette, vignette and breakpoints) merged as squash `6e0a34a`, reviewed head `4f01365`, GLM 5.3 Flash APPROVE in round 1 with canary `theme-breakpoints-fc4d3da4626c5ce313b9a26a2d90f13f` echoed. At `4f01365` lint, typecheck, build and all nine `check:*` scripts (now including `check:breakpoints`) exited 0, 1,802 unit tests passed in 213 files and Prettier passed on 47 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `6e0a34a` with `db.status` ok, and `theme-breakpoints`, `theme-choice`, `home-hierarchy` and `contrast` against production (chromium) passed 70 of 70. NOT RUN: physical phone check (owner action), a real screen reader, WebKit and Firefox proof screenshots.

## Resilience, onboarding and a11y

Branch `feat/resilience-a11y` off `origin/main` at `da44d4b`, with `origin/main` merged at `3d59cee` (PR #120) in `69cc0b7`. Wave 4 row 4g (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- If a page crashes, players see "Something went wrong." and "Your run is saved; reload to continue." with Reload and Home, instead of a blank screen. A crash of the whole layout gets the same page.
- Keyboard players get a "Skip to content" link first, and the menu marks the page they are on.
- The phone status bar colour now follows a Day or Night choice, and Auto follows the phone switching between light and dark while the page is open.
- A first-time player sees a one-line tip in their first draft, worded for that draft ("Watch the spin, pick one that matches, place it on the pitch. Fill all 16 to play the cup."). It goes away at the first pick or on Got it and does not come back.
- Skipping the wheel with the keyboard no longer drops focus to the top of the page: it lands on the first player, at Normal and Fast speed.
- Screen readers hear a pitch token as "LCB Bulbasaur" or "Empty LCB slot", then the fit, rating and types. Pictures next to a written name are no longer read twice; leaderboard and History squad pictures are read by species name.
- How to play now explains Daily, Live match, Manager mode and the leaderboard, and says the Team Score runs from 0 to 1000. The "Trainer Dugout" label on the desktop draft is gone.

RED commit: `a8d94cf` (30 of 122 unit tests failed in 11 files, and the error page test file failed to load; `e2e` failed 10 of 25 against a build of the pre-fix sources, the `/r` server HTML case passing as a labelled regression guard). GREEN `e0503e4`. Fix `43647ef` (44px skip link, spec churn from the full run).

Gates at `43647ef`:

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0. Prettier passed on the 63 text files changed against `origin/main` and the decision log.
- Unit tests: 1,779 passed in 210 files.
- Playwright (`CI=1`, headless, fresh build at `43647ef`), full suite: 965 passed, 67 skipped by their own project gates, 0 failed, 1 flaky (`mobile-acceptance` "7 landscape: draft 151 round 1" on iphone-14, a Playwright "Cannot find parent object browser" harness error, passed on retry). `resilience-a11y`, `wheel-results` and `server-html` passed 25 of 25 alone.
- NOT RUN: review and hosted CI; the error page screenshot (by design, no production route throws; the unit test renders both pages); a physical phone check and a real screen reader pass (owner actions).

Decision log: `docs/decisions/resilience-a11y.md`. Browser proof: `docs/reports/resilience-a11y/{how-to-play,coach-mark,skip-link-focused}-390.png`.

PR #122 (row 4g, resilience, onboarding and a11y) merged as squash `5c7d4fb`, reviewed head `c0bcd07` (the coordinator's merge of #121, a STATE-only conflict, on top of `41e481c`), GLM 5.3 Flash APPROVE in round 1 with canary `resilience-a11y-2d90986c9aa3504732bf7d0faf816f6f` echoed. At `c0bcd07` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,787 unit tests passed in 211 files and Prettier passed on 64 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `5c7d4fb` with `db.status` ok, and `resilience-a11y`, `wheel-results`, `server-html`, `a11y` and `theme-choice` against production (chromium) passed 41 of 41. NOT RUN: physical phone check (owner action), a real screen reader, the error page screenshot (by design: no throwing production route).

## Colour tokens and CVD

Branch `refactor/colour-tokens` off `origin/main` at `3d59cee`. Wave 4 row 4h1 (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Five type colours shift slightly so red-green colour blind players can tell every pair apart on the pitch bars, type icons and matchday kits: fire `#EE8130` to `#DD730F`, flying `#A98FF3` to `#AA96F6`, grass `#7AC74C` to `#89BC5F`, poison `#A33EA1` to `#A63EAA`, psychic `#F95587` to `#F65589`. The closest pair was fire against rock at 1.54 for deuteranopia; every pair now sits at 4.01 or more.
- In dark mode the fire and grass type chips move one step of blue (`#D9D791`, `#5BC354`), lifting two pairs that sat at 4.0005 and 4.0014 over 4.01.
- Nothing else changes on screen. The 129 colour literals outside `src/design` (75 of them in the live Match highlights panel) now read named tokens set to the same values. Screenshots of 7 scenes in both themes at 390x844 match the base build pixel for pixel after the token move; after the palette move only the pixels of moved type colours change.
- `pnpm check:theme-colors` now also catches `rgb()`, `rgba()`, `hsl()` and `hsla()`, and `pnpm check:theme-cvd` now audits `TYPE_PALETTE` and fails any pair under 4.01.

RED commit: `77e1b82`, 3 of 11 unit tests failed in 2 files; `check:theme-colors` found 129 lines and `check:theme-cvd` exited 1. Tools `15a5d70` and `1a8b357`. GREEN `b4ffd13` (tokens) and `958219b` (palette). `c53609c` adds mask output to the pixel diff tool.

Gates at `958219b` (the commits after it change only `scripts/audit/pixel-diff.mts`, docs and proof):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0. Prettier passed on the changed files.
- Unit tests: 1,767 passed in 207 files.
- Playwright (`CI=1`, headless, build of `958219b`), full suite: 955 passed, 67 skipped, 0 failed, no retries.
- NOT RUN: review and hosted CI; WebKit and Firefox pixel checks; screenshots of hover, drag and the goal overlay (covered by literal-equal token values); a physical phone check and a screen reader pass (owner actions).

Decision log: `docs/decisions/colour-tokens.md`. Proof: `docs/reports/colour-tokens/` (pitch and matchday before, after and change masks in both themes, the results pitch mask, three pixel diff files, the palette search output).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #121 (row 4h1, colour lint, tokens and CVD) merged as squash `ff7c893`, reviewed head `00a2d81`, GLM 5.3 Flash APPROVE in round 1 with canary `colour-tokens-bd6eeebd56e36ff0b38ade4ed20ec3e1` echoed. At `00a2d81` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,767 unit tests passed in 207 files and Prettier passed on 26 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `ff7c893` with `db.status` ok, and `team-readability`, `contrast`, `theme-draft` and `theme-builder` against production (chromium) passed 47 of 47. NOT RUN: physical phone check (owner action), a real screen reader.

## Pitch density and drag

Branch `perf/pitch-density-drag` off `origin/main` at `168a8f3`. Wave 4 row 4j (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- On phones (pitch below 540px) a filled token draws a 48px sprite, up from 30px. The type shows as a 3px top bar in the type colour instead of a 2px frame, the type icon column is gone, and the types stay in the token's accessible name.
- A token name takes one line and ends in an ellipsis when it does not fit ("Crabominable" is still the full accessible name).
- Dragging an offer card: the preview stays under the finger (the 4c carryover, a preview left drawn near the drag start). It moves by transform once per frame.
- Dragging a pitch token or an offer card re-renders once per new target slot and once on drop, not on every pointer move. The offer drag attaches its window listeners once per drag.
- The picker drawer swipe is unchanged: measured at the same cost before and after.
- At 4x CPU throttle, 390x844, headless (no GPU raster), medians of 5 runs: candidate drag script time 132 to 36 ms and DOM mutations 67 to 40 per second; token drag script time 50 to 31 ms; frame interval p50 16.7 ms and p95 16.7 to 16.8 ms in every scene before and after, 0 long tasks.

RED commit: `883980e`, 3 of 3 unit tests failed in 2 files, and `e2e/pitch-density-drag.spec.ts` failed 9 of 11 against a build of `168a8f3` (the preview paint guard is timing dependent there: it failed 3 of 3 run alone and passed in the parallel file run; the unit transform test is the deterministic guard). Harness `854bf7c` (`scripts/perf/draft-drag.mts`). GREEN `94260af`. `4b62f25` moves the Crabominable phone spec to the one-line ellipsis.

Gates at `94260af` (the commits after it change only `e2e/pitch-request-acceptance.spec.ts`, docs and proof):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0. Prettier passed on the changed files.
- Unit tests: 1,752 passed in 205 files.
- Playwright (`CI=1`, headless, build at `94260af`), full suite: 950 passed, 63 skipped by their own project gates, 2 failed (the Crabominable phone name test on chromium and webkit, retries included, which asserted the old wrapped name). After `4b62f25`, `pitch-request-acceptance` and `team-readability` passed 11 of 11 against the same build. `pitch-density-drag` 11 of 11, its preview guard 5 of 5 alone. `team-readability` (matchday sprite floor) unaffected: narrowest matchday sprite 70.4px at 390, 360 and 320.
- NOT RUN: review and hosted CI; a full Playwright rerun at `4b62f25`; a physical phone check of drag feel and the denser tokens, and a screen reader pass (owner actions); GPU raster timing.

Decision log: `docs/decisions/pitch-density-drag.md`. Proof: `docs/reports/pitch-density-drag/` (full pitch at 390, 360 and 320, before and after; `drag.json` with every perf run).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #120 (row 4j, pitch density and drag perf) merged as squash `3d59cee`, reviewed head `f3d112e` (the coordinator's merge of #119, a STATE-only conflict, on top of `801e995`), GLM 5.3 Flash APPROVE in round 1 with canary `pitch-density-drag-ddd575d5a96b88923d1b2713aae1556b` echoed. At `f3d112e` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,759 unit tests passed in 206 files and Prettier passed on 13 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `3d59cee` with `db.status` ok, and `pitch-density-drag`, `pitch-request-acceptance` and `mobile-draft` against production (chromium and pixel-7) passed 39, 2 skipped by their project gates. NOT RUN: physical phone check (owner action), a real screen reader, GPU raster timing.

## Fast spins

Branch `feat/fast-spins` off `origin/main` at `337f9df`, with `origin/main` merged at `168a8f3` (PR #118) in `8c177bf`. Wave 4 row 4d, draft (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Home settings, Setup group, has a new "Spin speed" choice: Normal or Fast. Normal is the default, and players' saved settings keep working.
- Fast runs the draft reels and the pauses between them at 0.4x: 680, 840 and 920 ms spins with 128 and 104 ms pauses, instead of 1700, 2100, 2300, 320 and 260 ms.
- Reduced motion still shows the result at once, and Tap to skip works at both speeds. Matchday pacing is unchanged.
- Measured in Chromium at 390x844, one run each: a full 8-0 draft took 77.7 s at Normal and 29.8 s at Fast (47.9 s saved), and a 151 draft 45.8 s and 21.8 s (24.0 s saved). The first 8-0 reveal settled in 4,172 ms at Normal and 1,672 ms at Fast.

RED commit: `a2d3d05` (4 of 22 unit tests failed in 2 files; `e2e/fast-spins.spec.ts` failed 3 of 3 against a build of the pre-fix sources). GREEN `930fe0b`. `aa9022c` changes only the spec's Setup locator.

Gates at `8c177bf` (fix round 1, the merge of `168a8f3`; the docs commit that follows changes only `STATE.md` and the decision log):

- Lint, typecheck and build exited 0. All eight `check:*` scripts exited 0. Prettier passed on the 14 text files changed against `origin/main`.
- Unit tests: 1,756 passed in 204 files.
- Playwright (`CI=1`, headless, fresh build at `8c177bf`), full suite: 944 passed, 67 skipped (63 by their own project gates, 4 in the opt-in measurement spec), 0 failed, 0 retries. `fast-spins` passed 3 of 3.
- Round 0, at `aa9022c`: 1,733 unit tests in 203 files, Playwright 938 passed, 67 skipped, 0 failed.
- NOT RUN: review, hosted CI, a physical phone check and a real screen reader pass (owner actions).

Decision log: `docs/decisions/fast-spins.md`. Browser proof: `docs/reports/fast-spins/setting-390.png`.

PR #119 (row 4d, fast spins) merged as squash `da44d4b`, reviewed head `96acb86` after one fix round (merge of #118, no code change), GLM 5.3 Flash APPROVE in round 1 with canary `fast-spins-fc0f1b460206d3f0d3ba1eb6137545c4` echoed. At `96acb86` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,756 unit tests passed in 204 files and Prettier passed on 14 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `da44d4b` with `db.status` ok, and `fast-spins`, `wheel-results` and `home-hierarchy` against production (chromium) passed 15 of 15. NOT RUN: physical phone check (owner action), a real screen reader.

## Dossier and picker

Branch `feat/dossier-picker` off `origin/main` at `63462b3`, with `origin/main` merged at `337f9df` (PR #117) before the PR opened. Wave 4 row 4f (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- In Position First each offer card has a Scout button. The dossier opens with the slot in view ("In slot: GK. Goalkeeper, Poor fit."), and a tap on the card still signs the player.
- The dossier steps through the round's offers with Prev, Next and the arrow keys ("1 of 3"). With ratings on, Compare draws every offer's radar on the same axes, each with its own dash pattern and a named legend.
- A goalkeeper's radar shows DIV, REF, HAN, GKP, KIC and AER, by the slot in view, else the slot the player is drafted in, else the best role.
- With ratings on, the Scout Report shows what the review changed, for example "TAK 35, review +3" for Bulbasaur. Ability and move contributions are not in the shipped data, so they are deferred to program data work.
- Back closes the dossier over the Picker and leaves the Picker open; a second Back closes it.
- Builder: tap a player to select it, tap another to swap, tap it again to open the Picker. An empty slot opens the Picker at once and Escape clears the selection.
- Picker search ignores accents and punctuation: "flabebe", "mr mime" and "farfetchd" find Flabébé, Mr. Mime and Farfetch'd.

RED commit: `7aa7519`, 19 of 23 failed in 4 files (the 4 passes are labelled regression guards), and `e2e/dossier-picker.spec.ts` failed 6 of 6 against a build of the pre-fix sources. GREEN `362539c`.

Gates at `4114a63` (the merge of `337f9df`; the commits after it change only `e2e/theme-type.spec.ts` and docs):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0. Prettier passed on the 23 changed files.
- Unit tests: 1,749 passed in 203 files.
- Playwright (`CI=1`, headless, fresh build at `4114a63`), full suite: 940 passed, 63 skipped by their own project gates, 0 failed, 1 flaky (`theme-type` 1440 dark, a race in this PR's two-tap edit, fixed in `6b4530c`; `theme-type` then passed 20 of 20 with `--repeat-each 5`). `dossier-picker` 6 of 6.
- NOT RUN: review and hosted CI; a full Playwright rerun at `6b4530c`; a physical phone check and a screen reader pass (owner actions).

Decision log: `docs/decisions/dossier-picker.md`. Proof: `docs/reports/dossier-picker/` (390x844, 360x800 and 320x568: offer Scout buttons, GK dossier, Compare, builder selection).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #118 (row 4f, dossier and picker) merged as squash `168a8f3`, reviewed head `93dfb66` (a STATE-only commit recording #117 on top of `3b72ded`), GLM 5.3 Flash APPROVE in round 1 with canary `dossier-picker-e17332efd0158b2654d6d186775c207e` echoed. At `93dfb66` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,749 unit tests passed in 203 files and Prettier passed on 22 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `168a8f3` with `db.status` ok, and `dossier-picker`, `draft-safety`, `builder` and `swap-a11y` against production (chromium) passed 25 of 25. NOT RUN: physical phone check (owner action), a real screen reader. Deferred: ability and move contributions in the dossier need a Red data change (program data work).

## Home hierarchy

Branch `feat/home-hierarchy` off `origin/main` at `fb03b7a`, with `origin/main` merged at `63462b3` (PR #116) in `b9e8225`. Wave 4 row 4b, home page (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Home opens on the heading "Draft a Pokémon XI and win the cup." with "Spin for players, fill a formation, then play the cup." under it.
- Three cards follow: 8-0 Challenge, 151 Challenge and Daily. Each has one rule line and its Play button. The 8-0 card shows the draft style. The Daily card shows the date the daily plays (New York date, as on `/daily`) and Play Daily opens `/daily`.
- On phones and tablets (below 1024px) Settings and records start closed behind one button. On a desktop they show beside the builder. The Edit link from a start card still opens them. The Challenge Hub button is gone.
- The builder is now "Friendly builder" with "Build your XI, then play a Friendly cup." under it, and its header shows chemistry (for example "4% chemistry") beside the fill count.
- The cards sit two across from 380px and stack in one column on narrower phones.

RED commit: `a6f9b9a` (8 of 8 unit tests failed in 1 file; `e2e/home-hierarchy.spec.ts` failed 6 of 6 against a build of that commit). GREEN `f3b9b40`.

Gates at `b9e8225` (the merge of `63462b3`; the docs commit that follows changes only docs and proof PNGs):

- Lint, typecheck and build exited 0. All eight `check:*` scripts exited 0. Prettier passed on the 26 code files changed since `fb03b7a` (this row's and #116's).
- Unit tests: 1,726 passed in 202 files.
- Playwright (`CI=1`, headless, fresh build at `b9e8225`), full suite: 935 passed, 63 skipped by their own project gates, 0 failed, 0 retries. `home-hierarchy` passed 6 of 6.
- NOT RUN: review, hosted CI, a physical phone check and a real screen reader pass (owner actions), home first-load JS and CLS.

Decision log: `docs/decisions/home-hierarchy.md`. Browser proof: `docs/reports/home-hierarchy/` (home at 390, 360, 320 and 1280).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #117 (row 4b, home hierarchy) merged as squash `337f9df`, reviewed head `40779df` (a STATE-only commit recording #116 on top of code head `b9e8225`), GLM 5.3 Flash APPROVE in round 1 with canary `home-hierarchy-26bebf429ef785764f6bb7a3203ccb74` echoed. At `40779df` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,726 unit tests passed in 202 files and Prettier passed on 22 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `337f9df` with `db.status` ok, and `home-hierarchy`, `one-tap-play` and `ui-foundation` against production (chromium) passed 20 of 20. NOT RUN: physical phone check (owner action), a real screen reader.

## Live Team Score in the draft

Branch `feat/live-team-score` off `origin/main` at `d48aa0f`, with `origin/main` merged at `fb03b7a` (PR #115) in fix round 1. Wave 4 row 4c (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- With ratings on, the draft hub shows a Team Score scorebug from the first starter on. It reads "Team Score (so far)" during the draft and "Team Score" with the exact engine value once all 16 are signed. Chemistry stays beside it.
- The selected candidate shows its signed change, "Team Score +281", for its best empty slot. While dragging, the preview shows the change for the slot under the finger ("+24" over GK).
- With two legendaries or mythicals signed, picking a third warns "Last legendary or mythical slot. A third fills the cap." In Position First the warning sits above the offers. It shows with ratings on or off.
- With ratings off, the scorebug and the change are hidden. Fit glyphs and glow stay.
- The live score is `provisionalTeamScore` in `src/ui/partial-rating.ts`: `rateTeam`'s formula over the filled slots. For a full squad it equals `rateTeam` on both engine goldens (593, 480) and 20 seeded random squads.

RED commit: `32316d1`, 12 of 13 failed in 2 files. The one pass is a regression guard with no RED (ratings off shows no scorebug). GREEN `09f3e46`. `3fb839c` moves the drag proof to a three-offer roll and keeps the delta line on one line at 320 px.

Gates at `c617d85` (fix round 1, the merge of `fb03b7a`; the docs commit that follows changes only `STATE.md` and the decision log):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0, `check:client-bundle` and `check:dashes` among them. Prettier passed on the 8 changed text files.
- Unit tests: 1,720 passed in 201 files.
- Playwright (`CI=1`, headless, fresh build at `c617d85`), full suite: 929 passed, 63 skipped by their own project gates, 0 failed, 0 flaky. `live-team-score` 11 of 11.
- Round 0, at `3fb839c`: 1,705 unit tests in 200 files, chromium 143 passed in 14 specs, `mobile-draft` 74 passed and 4 skipped on three phone projects.
- NOT RUN: review and hosted CI; a physical phone check and a screen reader pass (owner actions).

Decision log: `docs/decisions/live-team-score.md`. Proof: `docs/reports/live-team-score/` (390x844, 360x800 and 320x568, ratings on and off, cap warning, drag delta, full draft).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #116 (row 4c, live Team Score in the draft) merged as squash `63462b3`, reviewed head `ef1244a` after one fix round (merge of #115, no code change), GLM 5.3 Flash APPROVE in round 1 with canary `live-team-score-77cfb24e6188d06252c9a5342d5c9e51` echoed. At `ef1244a` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,720 unit tests passed in 201 files and Prettier passed on 8 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `63462b3` with `db.status` ok, and `live-team-score`, `challenge-ratings` and `draft-flow` against production (chromium) passed 31 of 31. NOT RUN: physical phone check (owner action), a real screen reader.

## One-tap play

Branch `feat/one-tap-play` off `origin/main` at `34af10e`, with `origin/main` merged at `d48aa0f` (PRs #113 and #114) in fix round 1. Wave 4 row 4a, home and start card (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Play 8-0 Challenge and Play 151 Challenge go straight to the challenge. The "Settings confirmed?" dialog is gone. Play still starts a fresh run.
- The Matchday choice (Manager mode and Match view) is in the home Play card, so every player sees it before a cup. It left Settings and records. The builder keeps its own copy beside "Play a friendly cup", bound to the same setting.
- The challenge start card lists Matchday ("Sim, Quick", "Sim, Live" or "Manager, Live") with the other settings, and it follows the start card's own switches. An Edit link opens the home settings, scrolled into view with focus on their heading. The Daily has no Edit link.
- A finished draft says Kick off when the cup plays a matchday, and See results for a quick sim.
- Coming back to home at `/#settings` keeps the hash after the builder loads.

RED commits: `616ee23` (23 of 27 failed in 3 files) and `8dd0a64` (1 of 13 failed). The first RED's e2e spec failed 9 of 11 against a build of the pre-fix sources.

Gates at `1b0e673` (fix round 1, the merge of `d48aa0f`; the docs commit that follows changes only docs and the three Play card proof PNGs):

- Lint, typecheck and build exited 0. All eight `check:*` scripts exited 0, with the new `check:dashes`. Prettier passed on the 31 files changed against `origin/main`.
- Unit tests: 1,707 passed in 199 files.
- Playwright (`CI=1`, headless, fresh build at `1b0e673`), full suite: 918 passed, 63 skipped by their own project gates, 0 failed, 0 flaky. `one-tap-play` passed 18 of 18 across `chromium` and `iphone-14`.
- Round 0, at `565e78e`: 1,674 unit tests in 195 files, seven `check:*` scripts, full Playwright 901 passed, 63 skipped, 0 failed.
- NOT RUN: review, hosted CI, a physical phone check and a real screen reader pass (owner actions).

Measurements and decisions are in `docs/decisions/one-tap-play.md`. Browser proof: `docs/reports/one-tap-play/` (Play card and start card at 390, 360 and 320).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #115 (row 4a, one-tap play) merged as squash `fb03b7a`, reviewed head `e2bf503` after one fix round (merge of #114, no code change), GLM 5.3 Flash APPROVE in round 1 with canary `one-tap-play-35f51cc513e6f76406638549d461fc1b` echoed. At `e2bf503` lint, typecheck, build and all eight `check:*` scripts exited 0, 1,707 unit tests passed in 199 files and Prettier passed on 25 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `fb03b7a` with `db.status` ok, and `one-tap-play`, `challenge-ratings` and `draft-modes` against production (chromium) passed 21 of 21. NOT RUN: physical phone check (owner action), a real screen reader.

## Copy pass and dash lint

Branch `fix/copy-pass` off `origin/main` at `34af10e`, with `origin/main` merged at `124afab` (PR #113) in fix round 1. Wave 4 row 4e, copy and labels (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- Position fit reads "★ Best", "OK" and "Poor" everywhere (pitch cards, slot names, the picker swap line and the touchline bench), from one `SUITABILITY_LABEL` table. The star is hidden from screen readers, so a slot reads "Empty LW slot (Best fit)".
- The draft drawer says "Hide players", "Show players" and "Show roll" (it said "Minimize draft picker" and "View spinner"). Empty slots say "Tap to draft".
- Every score uses a hyphen with no spaces: "1-0" on the scoreboard, "Pens 4-3", "Full time. Win, 3-1." and the exhibition result.
- A shared run (`/r/[token]`) names the side "This squad" in the record, standings, match list, highlights, saves and match events ("Kick off: this squad plays Attack", "manager's call"). Its match replay says "This squad" too: the scoreboard, the full screen score bug, the momentum meter, the ticker and the tactic banner ("This squad switches to Defend"). The live run still says "You", "Your XI" and "Your side". The share payload carries no nickname, so none is shown.
- The match list meter labels sit in a grid, so "THIS SQUAD" no longer wraps. For a "You" label the geometry is unchanged (label 51.0 px left and 33.8 px wide, track 92.8 px left and 215.5 px wide, before and after).
- Settings and Play card hints say "ratings" for the hidden numbers, the road tooltip says "Rating", the history page reads its 50 from `HISTORY_LIMIT`.
- New `pnpm check:dashes` (`scripts/audit/dash-lint.mjs`) fails on an em or en dash, or its escape or HTML entity, in any string, template or JSX text under `src` and in CSS `content`. It skips tests and `src/engine/versions`. CI runs it after `check:theme-colors`.

RED commits: `84aec88` (31 of 166 failed in 19 files, plus `dash-lint.test.ts` failed to load), `1449ed8` (2 of 41 failed in 2 files, shared match events) and `8d5558d` (2 of 7 failed in 2 files, the shared match player). GREEN `18cf3e2`, `028b6f3` and `3af2e35`.

Gates at `3af2e35` (fix round 1, after the merge of `124afab`; the commits after it change only e2e specs, docs and one proof PNG): `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. `pnpm test` passed 1,692 in 198 files. All eight `check:*` scripts exited 0, and Prettier passed on all 79 files changed against `origin/main`. Playwright full suite (`CI=1`, headless, fresh build at `3af2e35`): 932 passed, 64 skipped, 1 failed, `fullscreen-score-bug.spec.ts:101` (chromium) expecting the old "Your XI" in a shared run's score bug. `fcc6eb9` updates that literal in the spec only, and `copy-pass.spec.ts` with `fullscreen-score-bug.spec.ts` then passed 11 of 11 on the same build. The full suite was not re-run after `fcc6eb9`.

Round 0 gates follow.

Gates at `287150e`: `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. `pnpm test` passed 1,678 in 195 files. All eight `check:*` scripts exited 0, as did `check-retained-replays.mts` (10 golden replays) and `measure-retained-json.mjs`. Playwright full suite (`CI=1`, headless, fresh build): 921 passed, 64 skipped, 2 failed, both `manager-mode.spec.ts:54` (chromium and pixel-7) expecting the old shared line "Kick off: you play Attack". `429b448` updates that literal in the spec only, and `manager-mode.spec.ts` then passed 14 of 14 on the same build. `e2e/copy-pass.spec.ts` passed 7 of 7. At `429b448`: lint and typecheck exited 0, `pnpm test` passed 1,678 in 195 files, `check:dashes` exited 0, Prettier passed.

NOT RUN: review, hosted CI and the live check (coordinator); the full Playwright suite after `fcc6eb9`; `check-retained-replays.mts` and `measure-retained-json.mjs` in fix round 1; `pnpm data:pokedex` and `pnpm data:scouting` (no data change); the physical phone check and a screen reader pass (owner actions).

Decision log: `docs/decisions/copy-pass.md`. Proof: `docs/reports/copy-pass/`.

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #114 (row 4e, copy pass and dash lint) merged as squash `d48aa0f`, reviewed head `1d05a87` after one fix round (merge of #113 and the shared replay's "This squad" copy), GLM 5.3 Flash APPROVE in round 1 with canary `copy-pass-e9ce9264afe43902f5afee88da784f34` echoed. At `1d05a87` lint, typecheck, build and all eight `check:*` scripts (with the new `check:dashes`) exited 0, 1,692 unit tests passed in 198 files and Prettier passed on 71 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `d48aa0f` with `db.status` ok, and `copy-pass`, `manager-mode` and `fullscreen-score-bug` against production (chromium) passed 18 of 18. NOT RUN: physical phone check (owner action), a real screen reader. Carryover: a shared ticker goal line reads "Goal for This squad!" with a capital T.

## Matchday carryovers

Branch `fix/matchday-carryovers` off `origin/main` at `34af10e`. Wave 4 row 4-0, the Wave 3 matchday carryovers (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed.

- A goal on the minute of a half-time or injury stop now plays live, and so does its instant replay when replays are on. The stop opens after that. Before, the stop froze the clock first, so the goal was never seen live. With replays on it showed only as a replay after the answer.
- The key duel cut-in shows its sprite again. Remoraid fills its 36px circle on phones and its 56px circle at 1280, where before an 80px picture box showed its empty middle.
- The ball carrier's nameplate stays inside the visible pitch at the left edge. At 360 and 320 it was cut off by 23.4 and 24.8 px.
- In full screen the exit button is a 44px icon in the screen's corner, named "Exit full screen". It no longer covers the field at 1280x720 or 844x390.
- After Kick off the keyboard lands on Pause, so Space pauses straight away.
- The touchline energy rows are real buttons with a pressed state, and its headings follow the page outline. The axe scan now covers the touchline too.

RED commit: `d83bc1a`. Unit: 2 of 2 failed. E2E: 8 of 8 failed (6 carryover instances, plus the managed a11y scan in dark and light). The follow camera guard (`ee397e0`, `4% x zoom`) is a regression guard with no RED. It passes at the base: worst 3.36% at 1x, 6.77% at 2x. GREEN `5399d1e`.

Gates at `5399d1e` (the docs commit that follows changes only docs and proof PNGs):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 16 changed files.
- Unit tests: 1,669 passed in 196 files.
- Playwright (`CI=1`, headless, build at `5399d1e`):
  - chromium ran 16 related specs, 88 passed: `matchday-carryovers` 10, `a11y` 22, `keyboard` 6, `touchline-sheet` 8 and `fullscreen-score-bug` 4, among others.
  - The `iphone-se`, `iphone-14` and `pixel-7` projects ran `mobile-targets`, `mobile-acceptance` and `manager-mode`: 377 passed, 56 skipped by their own project gates.
- NOT RUN:
  - the full Playwright suite and hosted CI;
  - the widened guard instances against a pre-fix build;
  - review;
  - a real screen reader and a physical phone check (owner actions).

The 70svh cap and the 20 callouts in one 120' match are closed with evidence, with no change. Measurements and decisions are in `docs/decisions/matchday-carryovers.md`. Browser proof: `docs/reports/matchday-carryovers/`.

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #113 (row 4-0, matchday carryovers) merged as squash `124afab`, reviewed head `54619a0`, GLM 5.3 Flash APPROVE in round 1 with canary `matchday-carryovers-ae496dc5b9f327576ee8e1457cb76944` echoed. At `54619a0` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,669 unit tests passed in 196 files and Prettier passed on 18 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `124afab` with `db.status` ok, and `matchday-carryovers`, `keyboard`, `touchline-sheet` and `fullscreen-score-bug` against production (chromium) passed 28 of 28, and `a11y` 22 of 22. NOT RUN: physical phone check (owner action), a real screen reader.

## Wave 3 summary

Branch `docs/wave3-summary` off `88f6f72`. Green: docs and evidence only, no change under `src/` or `e2e/`.

- Wave 3 is closed: all twelve rows and the test chore merged and live-checked, one PR each (#98 to #111; #105 closed without merging). The entry with the PR table, measurements, brief vs code and open carryovers is in `docs/reports/audits-2026-10-17/program-log.md`.
- The 360 px manager-mode screenshots and the GIF in `docs/reports/manager-mode/` are re-shot from production at `88f6f72`, and the #70 section's claim that they were updated is corrected in place.
- The owner phone-check checklist for the whole wave is in `docs/decisions/wave3-summary.md`.

Gates: Prettier passed on the touched Markdown. CI runs the rest. NOT RUN: unit tests and e2e locally (no code changed), the physical phone check (owner action).

Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #112 (Wave 3 summary, Green) merged as squash `34af10e`, reviewed head `bdd5e26`, GLM 5.3 Flash APPROVE in round 1 with canary `wave3-summary-98dc69f012d979759aff800c602c1770` echoed. At `bdd5e26` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,659 unit tests passed in 194 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `34af10e` with `db.status` ok. No runtime change.

## Accessible stops and controls

Branch `feat/accessible-controls` off `origin/main` at `eef865e`, with origin/main merged after PR #103 at `d6476b5`. Wave 3 row 3j, matchday controls (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- When the clock stops for an injury, half time, extra time or the 65' fatigue check, the focus moves to the question: the assistant's pick for an injury, else the stop's button. Once answered, the focus goes back where it was, or to Pause.
- On the match player, Space pauses and resumes and `2` turns 2x speed on and off. A focused button keeps Space as its own click, and an input, a modifier or a held key does nothing.
- The momentum bar is a meter a screen reader reads as "Match momentum, Your side 58%".
- In manager mode, Skip to full time first says "Skip to full time? Your assistant answers every stop left in this match, injuries included." with Skip anyway and Keep watching. It never says whether an injury is coming. Replays still skip at once.
- Turning 2x on or off mid-goal no longer jumps the goal, the hold or a penalty (the 1e carryover). Switched on 301 ms into a goal's callout, the callout stays 1,133 ms, where the old build cut it to 665 ms.

RED commit: `4301fca` (10 of 13 failed in 2 files). GREEN `074dc39`. A build of the pre-fix sources failed the new speed-toggle e2e (665 ms against a bound above 1,000).

Gates at `119c971` (after the merge; the docs commit that adds this section changes only docs and one comment in `e2e/a11y.spec.ts`):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 15 touched code and test files.
- Unit tests: 1,659 passed in 194 files.
- Playwright (`CI=1`, fresh build at `119c971`), full suite: 916 passed, 64 skipped by their own project gates, 0 failed. `keyboard` passed 6 of 6, the `a11y` matchday scan 2 of 2 (dark and light) and `speed-aware-staging` 2 of 2.
- Review, hosted CI, a real screen reader and a physical phone check: NOT RUN at the time of writing.

The axe scan of the matchday excludes the touchline panel, whose energy list fails `list`, `aria-allowed-role` and `heading-order`. Those predate this row and are left to Wave 4 (4g). Measurements and decisions are in `docs/decisions/accessible-controls.md`. Browser proof: `docs/reports/accessible-controls/`.

PR #111 (row 3j, accessible stops and controls) merged as squash `88f6f72`, reviewed head `98f81a2`, GLM 5.3 Flash APPROVE in round 1 with canary `accessible-controls-ae5cc530d20413a78d50d43cf62e3a84` echoed. At `98f81a2` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,659 unit tests passed in 194 files and Prettier passed on 17 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `88f6f72` with `db.status` ok, and `keyboard`, `speed-aware-staging` and `a11y` against production (chromium) passed 30 of 30. NOT RUN: physical phone check (owner action), a real screen reader.

## Touchline intelligence

Branch `feat/touchline-intel` off `bee9acf` (row 3a's branch, PR #102). Wave 3 row 3g, matchday UI (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In manager mode the pre-match card has a scout line ("Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend.") and each tactic pill carries an Edge, Even or Avoid badge against the opponent's style, worked out from the engine's own style multipliers. A balanced opponent gets no badges.
- Half time repeats the scout line and names the two most tired outfield players.
- The touchline says what the assistant does: "Assistant: subs on, tactics on" until you decide anything in the match, then "Assistant: subs off, tactics off" (engine 6 behaviour).
- Subs are picked by tapping: an energy row for who goes off, a bench card for who comes on. Bench cards show the Best, OK or Poor fit glyph for that position, plus "Fit n, STA n" when ratings are on. The Take off and Bring on selects are gone.
- A booked player's energy row shows a yellow card. The injury prompt names the position.
- During an unanswered injury stop the ticker no longer shows the assistant's replacement (the 1d carryover).
- A managed match stops at 65' when an outfield player is below 65 energy. Engine 6 cannot get anyone that low by 65' (the measured minimum is 67), so this stop never shows in a real match yet. The owner chose on 2026-10-18 to ship it as written; see the decision log.
- The closed phone sheet is 143 px high, up from 115 px, to fit the assistant line.

RED commit: `1005614` (24 of 60 failed).

Gates at `1efeb35` (code identical at the docs commit that adds this section):

- Lint, typecheck, test and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the touched files.
- Unit tests: 1,554 passed in 177 files.
- Playwright (`CI=1`, fresh build at `1efeb35`): `touchline-intel` 6 passed; with `touchline-sheet`, `manager-mode`, `prematch-merge`, `injury-staging`, `builder-matchday`, `mobile-targets` and `mobile-acceptance` the run was 405 passed, 56 skipped by their own project gates, exit 0.
- The 65' stop in a browser (unreachable in engine 6), review, hosted CI, the full e2e suite, `env(safe-area-inset-bottom)` on a device and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/touchline-intel.md`. Browser proof: `docs/reports/touchline-intel/`.

Merged origin/main twice. At `57b772c` (PRs #104, #106, #107): the branch was cut from row 3a's branch, so 3a's squash conflicted with its own commits in seven files; the six code files were re-merged against `bee9acf`, where they equal the squash, leaving one real hunk in `MatchPlayer.tsx` (the fatigue line and 3c's full-screen toggle, both kept). `74f2e55` then plays the intel tests' matches at the frame loop's 100 ms step and 1 s per `act()` (a loaded run had timed one out at 15,000 ms; back to back the two slow tests fell from 2,384 and 2,221 ms to 368 and 308 ms). At `ba878a2` (PRs #108, #110, #109) only an import line and STATE.md conflicted; 3i's seek already refuses the new 65' stop while unanswered. After the second merge lint, typecheck, build and all seven `check:*` scripts exited 0, 1,645 unit tests passed in 192 files, `touchline-intel`, `manager-mode`, `touchline-sheet`, `fullscreen-score-bug`, `replay-deep-links`, `injury-staging`, `prematch-merge`, `fatigue`, `your-calls` and `haptics` passed 41 of 41 and `mobile-targets` 93 of 93 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #103 (row 3g, touchline intelligence) merged as squash `6fb14b7`, reviewed head `834cfea`, GLM 5.3 Flash APPROVE in round 1 with canary `touchline-intel-294e0338bd178e92de5f038a287e818e` echoed. At `834cfea` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,645 unit tests passed in 192 files and Prettier passed on 26 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `6fb14b7` with `db.status` ok, and `touchline-intel.spec.ts` plus `manager-mode.spec.ts` against production (chromium) passed 13 of 13. The 65' managed stop cannot appear in engine 6 (lowest energy at 65' is 67); the owner chose on 2026-10-18 to ship it as written and revisit at W6b. NOT RUN: physical phone check (owner action), the 65' stop in a browser.

## Replay and deep links

Branch `feat/replay-deep-links` off `origin/main` at `1e417e3`. Wave 3 row 3i, results and the matchday replay (Yellow, bundle). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The MatchdayLive text studio is gone. Watch live on a group match now has a "Group table" that counts this match live and adds the other fixture at full time.
- In a replay, or after full time in a managed match, each goal has a 44 px pip on the progress bar. Tapping it plays from a minute before that goal. Earlier goals do not sound or buzz again.
- In Live with motion, each of your goals gets an instant replay at half speed, about 5.2 s, with a REPLAY bug and Skip replay. Quick, reduced motion and the opponent's goals have none.
- Your goals on the result line and in the ticker have "Share this goal". It copies `/r/pd6?t=<payload>&watch=<n>&at=<minute>`, which opens the shared run in that match a minute before the goal. A bad `watch` or `at` opens the normal shared run. With sound on, the link shows "Tap for sound".

RED commits: `74ce17b` (2 of 25 failed), `aaafd4d` (7 of 7 failed), `6382ea2` (5 of 6 failed) and `c2bd956` (17 of 36 failed).

Gates at `d90ef2f` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on 33 touched files.
- Unit tests: 1,595 passed in 186 files.
- Playwright (`CI=1`, fresh build at `d90ef2f`), full suite: 896 passed, 64 skipped by their own project gates, 0 failed.
- Review, hosted CI and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/replay-deep-links.md`. Browser proof: `docs/reports/replay-deep-links/`.

Merged origin/main after PRs #107 and #108 at `6bc2d89`. `MatchPlayer.tsx`, its CSS and STATE.md conflicted. MatchPlayer keeps 3c's pitch frame, score bug and full-screen toggle, 3e's haptics and hint, and this row's staged pitch, REPLAY bug and pips. The REPLAY bug moved to the pitch's foot so it clears the score bug and the full-screen toggle. The replay's Tap for sound now reads 3e's `useAudioLocked`, and the seek and instant replay tests now also check that nothing buzzes again (`f712dca`). At `f712dca` lint, typecheck, build and all seven `check:*` scripts exited 0, and Prettier passed on the 6 touched files. The first `pnpm test` had 2 of 1,614 tests fail: both were `MatchPlayer.haptics.test.tsx` timing out at 15,000 ms, which row 3k owns. That file then passed 8 of 8 twice on its own, and a full rerun passed 1,614 in 189 files. Playwright (`CI=1`, fresh build): `replay-deep-links`, `haptics`, `fullscreen-score-bug`, `touchline-sheet`, `follow-camera`, `mobile-pitch-fixes`, `continuous-ball`, `audio-polish`, `manager-mode`, `your-calls` and `mobile-targets` passed 140, 0 failed.

Merged origin/main after PR #110 (row 3k) at `ec886ff`; only STATE.md conflicted, and `Broadcast.tsx` merged cleanly with 3k's still key-duel cut-in. Round 1 at `03a5f6b` was approved, but the hosted check timed out four `MatchPlayer.haptics.test.tsx` tests on two runs (run 39181516463); 3k's fix brings that file's slowest test to 414 ms here. After the merge lint, typecheck, build and all seven `check:*` scripts exited 0, 1,617 unit tests passed in 189 files, and `replay-deep-links`, `broadcast-follow-ups`, `score-lands-with-ball`, `haptics`, `fullscreen-score-bug`, `continuous-ball`, `callouts-type-effects`, `follow-camera` and `manager-mode` passed 31 of 31 locally (`CI=1`, chromium, fresh build). The full gates at the reviewed head are in the review receipt.

PR #109 (row 3i, replay and deep links) merged as squash `eef865e`, reviewed head `46d7641`, GLM 5.3 Flash APPROVE in round 2 with canary `replay-deep-links-r2-5b08a51e0f35b7e5129414783acfdc44` echoed (round 1 at `03a5f6b` approved, but the hosted check timed out four `MatchPlayer.haptics.test.tsx` tests on two runs; PR #110 landed that fix first, and the merge of it voided the round 1 receipt). At `46d7641` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,617 unit tests passed in 189 files and Prettier passed on 35 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `eef865e` with `db.status` ok, and `replay-deep-links.spec.ts` plus `haptics.spec.ts` against production (chromium) passed 8 of 8. NOT RUN: physical phone check (owner action).

## Broadcast follow-ups

Branch `feat/broadcast-follow-ups` off `8247f20`. Wave 3 row 3k, matchday broadcast only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, and `MatchPlayer.tsx` is untouched. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Extra-time matches no longer call a third more moves. The build-up share and the gap between callouts scale with match length, so 44 measured 120' matches average 13.34 callouts (17.32 before) against 13.54 for 90' matches, which are unchanged.
- With reduced motion a key duel now shows its lower-third card, still, the way goals and saves already did. The pitch badge stays off.
- A missed penalty's short trail (Wave 1 carryover) no longer reproduces: every miss draws 9.43 units from the spot to the keeper, against 11.18 for a goal, in 87 staged misses. Closed in the decision log.
- `score-lands-with-ball.spec.ts` now waits on its own mutation log, as `speed-aware-staging.spec.ts` does, instead of polling the goal flash. Under a 6x CPU throttle the old and new spec both passed 4 of 4, so the old flake did not reproduce here.
- `MatchPlayer.haptics.test.tsx` runs its matches in 100 ms frames, a second per step, instead of one 16 ms frame per step. Two of its tests timed out at 15 s on a hosted runner (run 39178857787). Locally the file dropped from 15.5 s to 2.7 to 3.0 s; the assertions are unchanged.

RED commit: `cb990d0` (2 of 33 unit tests failed in 2 files; `broadcast-follow-ups.spec.ts` failed 1 of 1 on a `cb990d0` build). The haptics item's RED is the hosted run 39178857787 (2 of 8 timed out).

Gates at `5e4b90d` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 8 touched code and test files.
- Unit tests: 1,585 passed in 184 files.
- Playwright (`CI=1`, fresh build at `099ddc7`, app code identical to `5e4b90d`): chromium `broadcast-follow-ups`, `score-lands-with-ball`, `speed-aware-staging`, `callouts-type-effects`, `one-shared-timeline`, `shootout-suspense`, `haptics`, `follow-camera`, `broadcast-frame-loop`, `set-pieces`, `pitch-card-containment`, `team-readability`, `quick-not-broadcast` and `watch-live` 46 passed; `mobile-targets` and `mobile-acceptance` 370 passed, 56 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, the hosted haptics test duration and a physical phone check: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/broadcast-follow-ups.md`. Browser proof: `docs/reports/broadcast-follow-ups/`.

Merged origin/main after PRs #107 and #108 at `816917d`; only STATE.md conflicted. Row 3k lands before 3i (PR #109) because 3i's hosted check timed out four haptics tests twice and this row carries that fix. After the merge lint, typecheck and build exited 0, 405 matchday and UI unit tests passed in 59 files (the haptics file's slowest test 373 ms), and `broadcast-follow-ups`, `score-lands-with-ball`, `haptics`, `fullscreen-score-bug`, `callouts-type-effects` and `follow-camera` passed 17 of 17 locally (`CI=1`, chromium, fresh build). The full gates at the reviewed head are in the review receipt.

PR #110 (row 3k, broadcast follow-ups) merged as squash `cf4efeb`, reviewed head `2952e09`, GLM 5.3 Flash APPROVE in round 1 with canary `broadcast-follow-ups-4938fc7285e297f4ae580dffc75ab05f` echoed. At `2952e09` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,593 unit tests passed in 185 files and Prettier passed on 10 touched files; hosted check and all eight e2e shards green on the first run. Production `/api/health?db=1` served `cf4efeb` with `db.status` ok, and `broadcast-follow-ups`, `score-lands-with-ball` and `callouts-type-effects` against production (chromium) passed 6 of 6. 3k landed before 3i because PR #109's hosted check timed out four `MatchPlayer.haptics.test.tsx` tests on two runs (run 39181516463) and 3k carries that fix. NOT RUN: physical phone check (owner action).

## Landscape, full screen and score bug

Branch `feat/fullscreen-score-bug` off `feat/follow-camera` at `be5a86f`. Wave 3 row 3c, matchday player, scoreboard and control row (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The pitch is never taller than 70% of the screen. On a phone turned to landscape (844x390) it is 427 by 273 px, wholly on screen and letterboxed, where it was 778 by 498 and ran off the screen. Portrait phones are unchanged. On a 1280x720 desktop the pitch is 788 px wide instead of 1214.
- In Watch live a "Full screen" button (44 px target) ends the control row on browsers with the Fullscreen API. In full screen the same button reads "Exit full screen" in the corner; Esc also leaves. The broadcast is centred and padded by the safe-area insets.
- iPhone Safari has no Fullscreen API for a page element, so the button is hidden there instead of doing nothing. The phone check confirms it.
- In full screen only, a TV-style score bug sits in the top left corner over the pitch, outside the follow camera's zoom: "Your XI", the score as 1-0, the club's town ("Goldenrod"), the clock, and "Pens 3-2" in a shootout.
- A half-time, injury or extra-time question leaves full screen, so it can be answered.
- In landscape the touchline sits in the page under the pitch, every control at least 44 px, and a substitution goes through.
- The 320 px scoreboard no longer breaks "Goldenrod United" mid-word (the Wave 1 carryover); a name wraps between words only.

RED commits: `139417f` (6 of 8 failed in the unit file; `fullscreen-score-bug.spec.ts` failed 4 of 4 on a `be5a86f` build) and `cd472f4` (the stop step; it failed 1 of 4 on a build of the fix with the stop effect disabled).

Gates at `3d76f09` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 7 touched code and test files.
- Unit tests: 1,580 passed in 183 files.
- Playwright (`CI=1`, fresh build of the `3d76f09` code): `fullscreen-score-bug`, `follow-camera`, `touchline-sheet`, `team-readability`, `broadcast-frame-loop`, `manager-mode`, `mobile-targets`, `mobile-acceptance` and `mobile-pitch-fixes` 411 passed, 56 skipped by their own project gates, 3 failed. The 3 are `mobile-pitch-fixes` at 390, 360 and 320 (carrier nameplate scale 1.6, not 1), and a `be5a86f` build fails the same 3: they come from row 3b's Follow default, not this row.
- Review, hosted CI, the full e2e suite, real safe-area insets and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/fullscreen-score-bug.md`. Browser proof: `docs/reports/fullscreen-score-bug/`.

Merged origin/main after PRs #106 and #107 at `d29858d`. `MatchPlayer.tsx` and its CSS conflicted in the control row and the pitch wrapper; all three rows' controls stay (camera group, full-screen button, then the haptics hint on its own line). Two specs failed after the merge: at 320x640 the match opened with the pitch top 41 px above the screen (`touchline-sheet`, the prematch screen's scroll carried into the match), and `fullscreen-score-bug` read `document.fullscreenElement` before the async exit settled. `1bc8259` brings the pitch into view a frame after the match mounts and makes the spec poll. At `1bc8259` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,590 unit tests passed in 185 files (a first run failed 2 tests that three reruns passed; recorded as a flake), `touchline-sheet` passed 8 of 8, `fullscreen-score-bug`, `mobile-pitch-fixes`, `follow-camera`, `haptics`, `audio-polish`, `injury-staging`, `manager-mode`, `prematch-merge`, `your-calls` and `shootout-suspense` 32 of 32, and `mobile-targets` 93 of 93 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #108 (row 3c, landscape, full screen and score bug) merged as squash `b9c9113`, reviewed head `4bc15fd`, GLM 5.3 Flash APPROVE in round 1 with canary `fullscreen-score-bug-56dd14693a0c5177c59f07c565ead175` echoed. At `4bc15fd` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,590 unit tests passed in 185 files and Prettier passed on 9 touched files; all eight e2e shards green, and the hosted check passed on a rerun of the failed job after `MatchPlayer.haptics.test.tsx` timed out twice at 15,000 ms (run 39178857787; it stepped every frame, fixed in this row). Production `/api/health?db=1` served `b9c9113` with `db.status` ok, and `fullscreen-score-bug.spec.ts` plus `touchline-sheet.spec.ts` against production (chromium) passed 12 of 12. NOT RUN: physical phone check (owner action), real safe-area insets.

## Haptics and tap for sound

Branch `feat/haptics` off `40221a8`. Wave 3 row 3e, matchday UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, and `Broadcast.tsx` is untouched. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- On a phone with vibration (Android), your goal buzzes once (120 ms), a red card for your team buzzes twice, and the final whistle buzzes once long. The opponent's goals and red cards do not buzz.
- Haptics follow the beat sounds: only in Live, only with sound on, once per event. A pause and resume buzzes nothing again, and a skip to full time buzzes nothing, as it plays no sound.
- The matchday toggle now reads "Sound and haptics on" or "off", with the hint "Haptics work on Android phones only." It is still the one sound setting the draft wheel uses.
- After a reload the browser can keep audio waiting for a tap. The matchday now shows a "Tap for sound" button (44 px) while that is so, and the first tap anywhere on the matchday starts the sound and removes it (the 2h carryover).
- Reduced motion still leaves the crowd at its normal level: reduced motion governs motion, the Sound toggle governs sound (2h carryover closed as by design).

RED commit: `3115615` (6 of 10 unit tests failed in 2 files; `haptics.spec.ts` failed 3 of 3 on a `40221a8` build).

Gates at `49c1ef2` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 10 touched code, test and doc files.
- Unit tests: 1,555 passed in 181 files.
- Playwright (`CI=1`, fresh build at `49c1ef2`): chromium `haptics`, `audio-polish`, `watch-live`, `quick-not-broadcast`, `manager-mode`, `prematch-merge`, `touchline-sheet` and `builder-matchday` 30 passed; `mobile-targets` and `mobile-acceptance` 370 passed, 56 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, vibration on a real Android phone and audio after a reload on a real iPhone: NOT RUN at the time of writing. The spec stubs `navigator.vibrate` and emulates iOS Safari's autoplay rule.

Measurements and decisions are in `docs/decisions/haptics.md`. Browser proof: `docs/reports/haptics/`.

Merged origin/main after PR #106 (row 3b) at `1d337d5`. `MatchPlayer.tsx` and its CSS conflicted where both rows added a control after the sound toggle; both stay, the camera group on the controls row and the haptics hint on its own line below. After the merge lint, typecheck and build exited 0, 394 matchday and UI unit tests passed in 58 files, `haptics`, `follow-camera`, `audio-polish` and `mobile-pitch-fixes` passed 13 of 13 and `mobile-targets` 93 of 93 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #107 (row 3e, haptics and tap for sound) merged as squash `8247f20`, reviewed head `f729d11`, GLM 5.3 Flash APPROVE in round 1 with canary `haptics-1568e86cb64bdbbb152c99156adf2c7d` echoed. At `f729d11` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,582 unit tests passed in 184 files and Prettier passed on 11 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `8247f20` with `db.status` ok, and `haptics.spec.ts` plus `audio-polish.spec.ts` against production (chromium) passed 5 of 5. NOT RUN: physical phone check (owner action), including a real Android vibration.

## Follow camera

Branch `feat/follow-camera` off `feat/team-readability` at `d656db7`. Wave 3 row 3b, matchday pitch and control row (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In Watch live the pitch can follow the ball. Follow zooms to 1.6 and chases the ball on a critically damped spring that settles in about 0.5 s. Goals of every kind (penalties and free kicks included), saves, a settling shot and the shootout ease out to the full pitch over 400 ms. The view never shows past the touchlines or goal lines.
- "Full pitch" and "Follow" buttons (44 px targets) sit after the sound toggle. Follow is the default below 600 px and Full from 600 px. Reduced motion opens on Full and can still choose Follow. The choice is kept in `localStorage`. Quick has no camera and no toggle.
- The play badge stays at its own size outside the zoomed pitch and is placed through the camera, so it stays in view at 390, 360 and 320 (13 badges, none clipped).
- The camera writes one transform on the pitch, 23 times a second. The trail now draws its glow and line from one shared path, which saves 34 writes a second, so mutations per second are below main's.
- 2a perf rerun against origin/main at `02e45cd`: frame pacing, long tasks, mutations and style recalc not worse. Main-thread task time rose 3 to 12%, in compositing (Layerize). Headless numbers exclude GPU raster.

RED commits: `3251033` (15 of 19 failed in 4 of 4 unit files; `follow-camera.spec.ts` failed 4 of 4 on a `d656db7` build) and `59c844e` (2 of 15 failed).

Gates at `99ec77b` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 13 touched code and test files.
- Unit tests: 1,572 passed in 182 files.
- Playwright (`CI=1`, fresh build at `99ec77b`): `follow-camera`, `broadcast-frame-loop`, `continuous-ball`, `team-readability`, `callouts-type-effects`, `set-pieces`, `shootout-suspense`, `touchline-sheet`, `pitch-card-containment`, `mobile-targets` and `mobile-acceptance` 415 passed, 56 skipped by their own project gates, 0 failed.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/follow-camera.md`. Browser proof and perf JSON: `docs/reports/follow-camera/`.

Review round 1 at `be5a86f`: GLM 5.3 Flash APPROVE (canary `follow-camera-9b2e38e8dd010e1cef2629ff5a51a022`), but hosted e2e shard 2 failed `mobile-pitch-fixes.spec.ts` at 390, 360 and 320 (carrier badge scale expected 1, received 1.6; run 39171973319), because Follow is now the phone default and zooms the pitch. The spec now switches to Full pitch before pinning the unzoomed sizes; locally (`CI=1`, chromium, fresh build) `mobile-pitch-fixes` and `follow-camera` passed 8 of 8, carrier 11px at scale 1 and the pip 9x13 at all three widths. The receipt from `be5a86f` is void; the reviewed head is the next one.

PR #106 (row 3b, follow camera) merged as squash `1e417e3`, reviewed head `7e8b503`, GLM 5.3 Flash APPROVE in round 2 with canary `follow-camera-r2-789a6edce25ae0d736d1e2507fe1bbfc` echoed (round 1 at `be5a86f` approved, but hosted shard 2 failed `mobile-pitch-fixes` under the new phone zoom; the spec now pins its sizes in Full pitch). At `7e8b503` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,572 unit tests passed in 182 files and Prettier passed on 18 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `1e417e3` with `db.status` ok, and `follow-camera`, `mobile-pitch-fixes` and `broadcast-frame-loop` against production (chromium) passed 11 of 11. NOT RUN: physical phone check (owner action), including stutter from the 10 Hz pose floor under zoom.

## Team readability

Branch `feat/team-readability` off `c33fa17`. Wave 3 row 3d, matchday pitch only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, and `MatchPlayer.tsx` and `Touchline.tsx` are untouched. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Each side's players stand on a ring in their kit. Your kit is the type most of your starting eleven carry; a dual type counts toward both its types, and a tie goes to the type seen first in slot order. The opponent wears its theme's type.
- When the two kits look too alike (closer than 10 in the CVD audit's own metric, in normal, protanopia or deuteranopia vision), the opponent wears white. A club with no theme keeps the old blue unless it clashes too.
- Sprites draw at 44px on phones instead of 38.4px. Wider pitches keep 56 and 72px.
- A move's badge over a player now stays inside the pitch. In the golden group match, 5 to 7 of 13 badges were cut off by up to 65px at 390, 360 and 320; none are now.
- The rings show in Quick and with reduced motion. They add no element and no per-frame write.
- The 2f carryover (sweat pip and stamina arc not sized in px) did not reproduce: both already sit in the unscaled player box at 6 by 8 and 24 by 8 px at 390 and 320. Closed in the decision log.

RED commit: `33a3e60` (3 of 3 unit files failed: the 2 collected tests, and `kit.test.ts` with 7 tests and `badge.test.ts` with 4 tests could not import the missing modules; `team-readability.spec.ts` failed 7 of 7 on a `c33fa17` build).

Gates at `1303a58` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 12 touched code and test files.
- Unit tests: 1,530 passed in 178 files.
- Playwright (`CI=1`, fresh build at `1303a58`): chromium `team-readability`, `pitch-card-containment`, `mobile-pitch-fixes`, `broadcast-frame-loop`, `fatigue`, `callouts-type-effects`, `continuous-ball` and `one-shared-timeline` 34 passed; `mobile-targets` and `mobile-acceptance` 360 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, a frame-loop perf trace and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/team-readability.md`. Browser proof: `docs/reports/team-readability/`.

Merged origin/main after PR #102 (row 3a) at `ce9e48a`; only STATE.md conflicted. After the merge typecheck and build exited 0, 358 matchday, UI and design unit tests passed in 54 files, and `team-readability`, `touchline-sheet`, `pitch-card-containment` and `callouts-type-effects` passed 31 of 31 locally (`CI=1`, chromium, fresh build). The full gates at the reviewed head are in the review receipt.

PR #104 (row 3d, team readability) merged as squash `40221a8`, reviewed head `d656db7`, GLM 5.3 Flash APPROVE in round 1 with canary `team-readability-c4febf2ba9dcf8c27c441e9403fc4047` echoed. At `d656db7` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,545 unit tests passed in 179 files and Prettier passed on 14 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `40221a8` with `db.status` ok, and `team-readability.spec.ts` plus `pitch-card-containment.spec.ts` against production (chromium) passed 19 of 19. NOT RUN: physical phone check (owner action). PR #105 (mute e2e browser audio, Green) was closed without merging: GLM 5.3 Flash approved it (canary `mute-e2e-audio-cd1c52994b884f093ca3e1029dfcb679`), but hosted e2e shards 1 and 2 failed because specs that call `webkit.launch()` inside the chromium project inherit its launch args and WebKit rejects `--mute-audio` ("Cannot parse arguments: Unknown option --mute-audio", run 39170166703). Playwright 1.64.0 already mutes every headless Chromium launch, so nothing ran on production and nothing changed.

## Touchline bottom sheet

Branch `feat/touchline-sheet` off `b08c68c`. Wave 3 row 3a, matchday UI and the pure play reducer (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- On a phone (below 600px) the touchline is a sheet fixed to the bottom of the screen. Closed, it shows the five tactics, "Subs n of 5", the half-time or injury question when there is one, and a "Bench and energy" button. It is 115 px high at 390, 360 and 320 px wide.
- Opening it shows the bench, the sub form and the energy rows, and stops the match. Confirming a sub, answering the stop or tapping "Back to the match" closes it and the match runs on. The pitch stays above the open sheet at 390x844, 360x780 and 320x640.
- A player who paused the match stays paused when the sheet closes.
- Pausing now stops the whole broadcast where it is, so a penalty or a goal no longer plays out while paused and resumes from the same point (the 2e carryover).
- At 600px and up the touchline is unchanged: the 1280 px crop matches the old one pixel for pixel.

RED commits: `7579d8b` (12 of 27 failed) and `ca4a99f` (1 of 7 failed).

Gates at `e094fc8` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 15 touched files.
- Unit tests: 1,526 passed in 174 files.
- Playwright (`CI=1`, fresh build at `e094fc8`): `touchline-sheet`, `prematch-merge`, `manager-mode`, `injury-staging`, `shootout-suspense`, `builder-matchday`, `watch-live`, `quick-not-broadcast`, `mobile-pitch-fixes` and `audio-polish` 40 passed; `mobile-targets` and `mobile-acceptance` 370 passed, 56 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, `env(safe-area-inset-bottom)` on a device and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/touchline-sheet.md`. Browser proof: `docs/reports/touchline-sheet/`.

Merged origin/main after PRs #100 and #101 at `14a9e70`; only STATE.md conflicted, and `MatchdayFlow.tsx` merged cleanly with 3h's full-time card. After the merge typecheck and build exited 0, 344 matchday and UI unit tests passed in 50 files, and `your-calls`, `touchline-sheet`, `manager-mode` and `prematch-merge` passed 28 of 28 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #102 (row 3a, touchline bottom sheet) merged as squash `02e45cd`, reviewed head `72063d0`, GLM 5.3 Flash APPROVE in round 1 with canary `touchline-sheet-b261a397b3341849f45c9c6d003fec37` echoed. At `72063d0` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,532 unit tests passed in 176 files and Prettier passed on 17 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `02e45cd` with `db.status` ok, and `touchline-sheet.spec.ts` plus `shootout-suspense.spec.ts` against production (chromium) passed 9 of 9. NOT RUN: physical phone check (owner action); `env(safe-area-inset-bottom)` on a real device.

## Your calls card

Branch `feat/your-calls` off `20e34f6`. Wave 3 row 3h, matchday UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed; the card only calls `runCup`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- At full time of a match where the player made at least one call, a "Your calls" card shows the assistant's score next to theirs, for example "Assistant 6-1, You 8-2". A shootout reads "0-0 (5-4 pens)".
- The card then names the call whose removal moves the score most ("Biggest swing: your Attack switch at 45'."), or says "No single call changed the score." It checks at most 8 calls and never names one it did not replay.
- It says whether later results changed without this match's calls, and "Later calls depended on this match." when they cannot be replayed without it. If the scores match, it says so.
- The card lives in the full-time footer, which shows only once the match is over. Matches with no call of the player's have no card. It shows scores only, so nothing new appears with ratings off.
- Each replay runs in its own task. In headless chromium at 4x CPU throttle, 8 replays took 254 to 300 ms with no long task; the score line showed after 45 to 59 ms.

RED commit: `cbd24ad` (2 of 2 files failed: the 1 collected test, and `your-calls.test.ts` with 5 tests could not import the missing module).

Gates at `3ac4b9b` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 9 touched files.
- Unit tests: 1,517 passed in 175 files.
- Playwright (`CI=1`, fresh build at `3ac4b9b`): `your-calls`, `manager-mode`, `prematch-merge`, `injury-staging`, `builder-matchday`, `mobile-targets` and `mobile-acceptance`: 382 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, 360 and 320 proof (no new fixed width) and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/your-calls.md`. Browser proof: `docs/reports/your-calls/`.

PR #101 (row 3h, "Your calls" card) merged as squash `c33fa17`, reviewed head `2df3889`, GLM 5.3 Flash APPROVE in round 1 with canary `your-calls-29b3f5ee29e3e8fe73d47f7ded60c35f` echoed. At `2df3889` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,517 unit tests passed in 175 files and Prettier passed on 11 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `c33fa17` with `db.status` ok, and `your-calls.spec.ts` plus `manager-mode.spec.ts` against production (chromium) passed 8 of 8. 3h landed before 3a because it was ready first and touches none of 3a's files (owner's leave to choose the order). NOT RUN: physical phone check (owner action).

## Test flakes and retained replays in CI

Branch `chore/test-flakes-retained-replays` off `bcf5493`. Tests, one build check and the CI workflow only (Green). No product code, and no file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The Quick cut-in unit test no longer steps 16 ms frames from kickoff. It jumps to 28' in 100 ms frames and steps only through the 30' goal. It took 7.7 to 14.1 s on hosted runners against a 15 s limit and timed out once; locally it fell from about 1.3 s to 0.3 s.
- The Builder test that flaked on `main` (run 39080199806) waits for the shared squad before it reads the pitch tokens, the fix #80 used for the same lazy-import race. A probe that delays the lazy import reproduced the CI failure exactly before the fix and passed after.
- `check-retained-replays.mts` now replays the v1 to v5 bundles and the engine-6 golden through the emitted `replayAnyVersion`, requires the emitted bundles to match `RETAINED_TOKEN_VERSIONS`, and requires a golden case for every retained and live version. It runs in the `check` job after `pnpm build` in about 0.7 s.
- `fatigue.spec.ts` encodes its squad for the live engine instead of a literal `pd6.` token. On engine 6 the token is byte-identical.

RED: no RED commit; the changes are tests and a check. The old replay check passed on a build with a tampered or missing v5 bundle, and the new one failed on both, on a tampered live engine and on a wrong expected hash. Output verbatim in the decision log.

Gates at `b941966` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 5 touched files.
- Unit tests: 1,481 passed in 171 files.
- `check-retained-replays.mts` after the build: 10 emitted golden replays passed; 0.64 to 0.65 s over three runs. `measure-retained-json.mjs` exited 0.
- Playwright (`CI=1`, fresh build): `fatigue.spec.ts` 1 of 1 passed.
- Review, hosted CI, the full e2e suite and a loaded full unit suite: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/test-chores.md`. No browser proof: no UI changed.

Merged origin/main after PR #98 (row 3f) at `c28cfd2`; only STATE.md conflicted. Then `callouts-type-effects.spec.ts` waits for a typed badge in one filtered locator (the badge lives only for its phase; PR #98's hosted shard 1 found it, lost it and failed twice with "element(s) not found", run 39157333456). RED for that race is the hosted run; it did not reproduce locally. After the merge and the spec fix, build exited 0, `callouts-type-effects` and `fatigue` passed 5 of 5 locally (`CI=1`, chromium) and `check-retained-replays.mts` passed 10 emitted golden replays. The full gates at the reviewed head are in the review receipt.

PR #100 (test flakes and retained replays, Green) merged as squash `20e34f6`, reviewed head `3432861`, GLM 5.3 Flash APPROVE in round 1 with canary `test-chores-4f9dc4674c3afab8be87f9fcad51dc26` echoed. At `3432861` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,511 unit tests passed in 173 files and Prettier passed on 8 touched files; hosted check and all eight e2e shards green, and the hosted `check` job ran `check-retained-replays.mts` after the build (10 emitted golden replays passed, v1 to v5 bundles and the live engine 6). Production `/api/health?db=1` served `20e34f6` with `db.status` ok, and `fatigue.spec.ts` plus `callouts-type-effects.spec.ts` against production (chromium) passed 5 of 5. No product code changed.

## Pre-match merge

Branch `feat/prematch-merge` off `bcf5493`. Matchday UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In manager mode the pre-match card shows the five tactic pills, labelled "Starting tactic", next to the opponent, style and shape. Sim mode shows no pills.
- The button reads "Kick off" and starts running play at once. The clock no longer stops at 0'. Half time, extra time and injury stops are unchanged.
- Picking a tactic other than the one the side starts in records it at minute 0 through `decide`, the path the old kickoff stop used, so tokens and old replays are unchanged. Keeping Balanced records nothing, so the assistant stays on.
- The touchline and the pre-match card share one `TacticPills` component. Every pill is at least 58 px tall at 390, 360 and 320 px.
- The brief's "weakest line and key player" on the pre-match card and a Team Score in the match header do not exist in the code; both are recorded as Wave 4 carryovers, not invented.

RED commit: `995c229` (8 of 23 failed).

Gates at `eb2af7b` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 20 touched files.
- Unit tests: 1,486 passed in 172 files.
- Playwright (`CI=1`, fresh build at `eb2af7b`): `prematch-merge` and `manager-mode` 19 passed; `builder-matchday`, `quick-not-broadcast`, `mobile-pitch-fixes`, `injury-staging` and `watch-live` 10 passed; `mobile-targets` and `mobile-acceptance` 360 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/prematch-merge.md`. Browser proof: `docs/reports/prematch-merge/`.

Merged origin/main after PR #99 (row 3-0, motion bounds) at `3ed16b8`; only STATE.md conflicted. After the merge typecheck and build exited 0, and `prematch-merge`, `manager-mode`, `continuous-ball` and `injury-staging` passed 22 of 22 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #98 (row 3f, prematch merge) merged as squash `b08c68c`, reviewed head `8789a50`, GLM 5.3 Flash APPROVE in round 1 with canary `prematch-merge-2a6e531b18d95c9875727ef78ceb72f7` echoed. At `8789a50` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,511 unit tests passed in 173 files and Prettier passed on 22 touched files. Hosted check and e2e shards 2 to 8 green; shard 1 failed `callouts-type-effects.spec.ts` at 320px twice (the typed badge was visible, then gone before its text was read: "element(s) not found"). It passed 3 of 3 locally at the same head, and `gh run rerun 39157333456 --failed` passed with no commit, so the receipt stood. The spec race is fixed in the test chore. Production `/api/health?db=1` served `b08c68c` with `db.status` ok, and `prematch-merge.spec.ts` plus `manager-mode.spec.ts` against production (chromium) passed 12 of 12. NOT RUN: physical phone check (owner action).

## Motion bounds

Branch `fix/motion-bounds` off `bcf5493`. Wave 3 row 3-0, pure staging in `src/ui/matchday/timeline.ts` (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- After a save, players the shot pulled upfield ease back into play over 600 ms instead of 300 ms, the same as after a goal. The keeper's parry now carries the ball half way back toward play and the settle carries the rest, so the ball no longer crosses the whole pitch in a third of a second.
- When a player wins the ball in a duel and passes, the pass leaves from where they won it. Before, the ball rode along with the winner as they sprinted away.
- At 2x everything still moves twice as far per frame (the bound is 4% of the pitch per frame at 1x and 8% at 2x), but no single frame goes past it any more.
- Golden cup, largest one-frame move at 1x: ball 3.61% (was 3.88%), player 3.53% (was 4.94%). At 2x: ball 6.77% (was 8.84%), player 6.26% (was 9.85%). Over the 20 sweep seeds the ball's worst 1x frame is 3.97% (was 4.41%), with no view at 4% (was 6 of 120).
- Measured first: both golden 2x maxima come from the one 59' save in match 0 (the player from the settle, the ball from the parry), not from duel turnovers. The sweep's 4.41% comes from the duel's pass after the tackle (0.33 to 0.44 of the phase), not from the 0.24 tackle window.

RED commit: `e847c38` (8 of 22 failed). Contract pin, not a RED guard: `364b537` (painter and `stageFrame` parity). It passed before the fix and fails 3 of 3 when the painter paints the rendered props instead of the feed's frame.

Gates at `d758f67` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 4 touched code files.
- Unit tests: 1,506 passed in 172 files.
- Playwright at `2e7d125` (`d758f67` changes only the unit guard; port 3611, `CI=1`, fresh build): `callouts-type-effects`, `set-pieces`, `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `fatigue`, `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `injury-staging`, `speed-aware-staging`, `score-lands-with-ball`, `watch-live`, `quick-not-broadcast`: 384 passed, 54 skipped by their own project gates. The new 2x case read 5.67% per frame (bound 8); a build with `bcf5493`'s staging read 7.91%.
- Review, hosted CI, the full e2e suite, 360 and 320 proof (no layout change) and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/motion-bounds.md`. Browser proof: `docs/reports/motion-bounds/`.

PR #99 (row 3-0, motion bounds) merged as squash `39a3a6a`, reviewed head `d86e58b`, GLM 5.3 Flash APPROVE in round 1 with canary `motion-bounds-73120b16774a27fbf0825311cbd44022` echoed. At `d86e58b` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,506 unit tests passed in 172 files and Prettier passed on 6 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `39a3a6a` with `db.status` ok, and `continuous-ball.spec.ts` plus `smooth-movement.spec.ts` against production (chromium) passed 4 of 4, the 2x case reading 5.67% per frame (bound 8%) and the 1x case 2.23%. NOT RUN: physical phone check (owner action).

## Wave 2 summary

Branch `docs/wave2-summary` off `87e7d51`. Docs only (Green). Appends the Wave 2 entry to `docs/reports/audits-2026-10-17/program-log.md`: every PR with its squash and reviewed head, the production checks, the measurements that moved, brief-vs-code notes and open carryovers. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #96 (row 2f, fatigue on the pitch) merged as squash `87e7d51`, reviewed head `2d67b2e`, GLM 5.3 Flash APPROVE in round 1 with canary `fatigue-b84b3eb34bb7cb7683a5940fd3f3ecb2` echoed. At `2d67b2e` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,481 unit tests passed in 171 files and Prettier passed on 11 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `87e7d51` with `db.status` ok, and `fatigue.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: physical phone check (owner action); a per-frame guard at 2x.

PR #97 (Wave 2 summary, Green) merged as squash `bcf5493`, reviewed head `4b55aef`, GLM 5.3 Flash APPROVE in round 1 with canary `wave2-summary-5326c9df154f05e6123128adc28d221e` echoed. At `4b55aef` lint, typecheck and build exited 0 and 1,481 unit tests passed in 171 files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `bcf5493` with `db.status` ok. No runtime change.

## Fatigue on the pitch

Branch `feat/fatigue` off `origin/feat/smooth-movement` at `0588297` (row 2c, PR #94), with `origin/feat/smooth-movement` merged in again at `5744f20` (carrying `origin/main` with PR #93). Pure staging plus `Broadcast.tsx` and CSS (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The pitch reads each user player's energy from the latest window snapshot at or before the clock, and only when that window recorded the same player in the slot. The opponent, a substitute before their first window, and runs with no windows show no energy.
- Below 65 a player covers 0.85 of each phase's move (on row 2c's spline, through shortened waypoints), strides 1.18 times slower and shows a sweat pip. Below 55 a stamina arc shows under the sprite.
- The pip and the arc render at about 10 Hz as children of the player element the frame loop moves. Quick and reduced motion keep players on their spots.
- With every slot at 50 energy, the ball's largest one-frame move over the golden cup is 3.73% (bound 4%); the largest player move is row 2c's save settle, 5.19% (4.94% fresh).

RED commit: `1c38ae4` (7 of 9 failed).

Gates at `ef2b4a9` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. Prettier passed on the touched files. `check:theme-colors`, `check:theme-contrast`, `check:theme-cvd`, `check:image-seam` and `check:client-bundle` exited 0.
- Unit tests: 1,481 passed in 171 files.
- Playwright (port 3528, `CI=1`, fresh build): `fatigue`, `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `set-pieces`, `mobile-targets`, `mobile-acceptance`, `quick-not-broadcast`, `injury-staging`, `shootout-suspense`, `watch-live`: 377 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/fatigue.md`. Browser proof: `docs/reports/fatigue/`.

PR #94 (row 2c, smooth movement) merged as squash `ebb04f0`, reviewed head `daeb1c3`, GLM 5.3 Flash APPROVE in round 1 with canary `smooth-movement-2308817edaf550b7f5821536ab84261a` echoed. At `daeb1c3` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,472 unit tests passed in 169 files and Prettier passed on touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `ebb04f0` with `db.status` ok, and `smooth-movement`, `continuous-ball` and `set-pieces` against production (chromium) passed 7 of 7, the ball's fastest 100 ms speed reading 2.69% per frame. NOT RUN: physical phone check (owner action); a per-frame guard at 2x. Carryovers: at 2x a player can still move 9.85% in one frame; over 20 extra seeds the ball's worst frame is 4.41% (duel turnovers, as row 2b recorded); #91's frame-loop pins were re-pinned from this row's staging.

Merged origin/main after PR #94 (the squash of the branch this row started from) and PR #95. Conflicts were only this row's own additions against the squashed copy (`windows` on `StageInput` and `FrameView`, the tired waypoints, `energy` on staged players) and STATE; the code equals `ef2b4a9`'s plus #95's tooling. After the merge: lint, typecheck and build exited 0, 168 matchday unit tests passed in 27 files, and `fatigue`, `smooth-movement`, `continuous-ball`, `set-pieces` and `broadcast-frame-loop` passed 11 of 11 locally, the ball's fastest 100 ms speed reading 2.69% per frame.

## Smooth movement

Branch `feat/smooth-movement` off `458c56e`, with `origin/main` merged in, last at `e3d0e95` (PRs #92 and #91). Pure staging plus a thin `Broadcast.tsx` change (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Players glide through each phase on a Catmull-Rom spline instead of stopping dead at every waypoint.
- Facing and pose follow how a player moves now, not where they started the phase.
- Teammates no longer stack on one spot: one push-apart pass keeps same-side players about 4% apart, and the kickoff shape no longer puts two central players on one spot.
- A red-carded or substituted player walks to the near touchline over 1.8 s (0.9 s at 2x) instead of vanishing; the substitute walks on from the bench. An injured player stays down where the injury found them.
- Quick and reduced motion stay still (decision 1).
- After the frame loop (#91), a walker going off reads their spot from the leaving list, not their old slot, and a walk starting or ending asks for a render. The #91 unit pins moved to this row's staged spots.
- The largest one-frame move of any player at 1x over the golden cup fell from 35.08% to 4.94% of the pitch length; the ball stays under 4%.

RED commits: `9b8a0ca` (6 of 7 failed), `8fa9c1f` (2 of 9 failed), `a846a3f` (1 of 10 failed), `eb746df` (browser, 1 of 2 failed).

Gates at `491e0ee` (code identical at the docs commit that updates this section):

- Lint, typecheck and build exited 0.
- Unit tests: 1,463 passed in 167 files.
- Playwright (port 3526, `CI=1`, fresh build): `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `injury-staging`, `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `quick-not-broadcast`: 374 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/smooth-movement.md`.

Merged origin/main after PR #93 (set pieces). Row 2d moved goal staging into `stageGoal`, so this row's eased keeper (dive from the strike over REACT) and eased open-play assist moved into it. Poses combine both rows: speed-based run and sprint, the walk-on run, the wall's run then idle, and the beaten defender's press. A wall keeps its side's facing; everyone else faces by velocity. After the merge: lint, typecheck and build exited 0, 159 matchday unit tests passed in 25 files (the set-pieces and smooth-movement guards included), and `smooth-movement`, `set-pieces`, `continuous-ball`, `broadcast-frame-loop`, `score-lands-with-ball`, `shootout-suspense` and `injury-staging` passed 13 of 13 locally, the ball's fastest 100 ms speed reading 2.70% per frame.

PR #95 (review verdict line, Green) merged as squash `2b2bb0f`, reviewed head `18f25af`, GLM 5.3 Flash APPROVE in round 1 with canary `verdict-line-1d059dc9254aafe1e1ecbe42fbf77377` echoed; that reply was the first built with the new preamble and its verdict line parsed. At `18f25af` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,462 unit tests passed in 168 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `2b2bb0f` with `db.status` ok. No runtime change, so no live spec.

## Review verdict line

Branch `chore/review-verdict-line` off `20fe868`. Review tooling only (Green). No runtime change.

The review packet's preamble (`tools/review/review-packet.py`) now asks GLM to put the verdict alone on its own line. `strip-verdict.py` counts a reply only when a line holds nothing but the verdict, and three GLM replies that read APPROVE did not count because the verdict shared its line with other text: PR #89 (`60dc61d`), PR #92 (`5b2229a`) and PR #93 (`fc9bae8`). Each needed a rerun at the same head. The parser is unchanged, so a reply that still breaks the rule still does not count. `tools/review/README.md` records why.

Gates: Prettier on the touched files, and `python3 -I tools/review/review-packet.py --help` exited 0. Lint, typecheck, unit tests and build run in hosted CI. Effect on GLM replies is measured on the next reviews, not here.

PR #93 (row 2d, set pieces from `goalKind`) merged as squash `20fe868`, reviewed head `fc9bae8`. At `fc9bae8` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,462 unit tests passed in 168 files and Prettier passed on 7 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash: the first reply (canary `set-pieces-fdd94a834a80b70d1e8168971ba9fcc1`) read APPROVE with no blockers but put the verdict on a heading line with other text, so it was not counted; the rerun at the same head with canary `set-pieces-b-900e7ce5e2601c4636cc2a19708608ac` approved. Production `/api/health?db=1` served `20fe868` with `db.status` ok, and `set-pieces.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 5 of 5. NOT RUN: physical phone check (owner action); a continuity guard at 2x.

## Set pieces

Branch `feat/set-pieces` off `458c56e`, with `origin/main` merged in at `85b292e` (PR #92). Matchday staging only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, so goal kinds and outcomes are untouched and the goldens pass. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, a goal now plays out by the kind the engine recorded (`Beat.goalKind`). A penalty freezes the shape: the ball rolls to the spot, the taker steps up, pauses and kicks. A free kick lines three defenders up in a wall and curls the shot around it. A header comes off a cross from the wing and is met at loft 0.85. A solo goal dribbles a chain of touches past the defender who steps in. Every kind starts from the live ball and still puts the ball over the line, and the score on the board, at `GOAL_LANDS` (0.6). Quick and reduced motion stay still. Open play is unchanged.

RED commit: `77a9454` (4 of 7 guards failed; the landing, still-motion and free-kick continuity guards pin kept behaviour and passed), after the no-behaviour prefactor `4540e14`. GREEN: `39c3c07`.

Gates at `2cbb5f1` (the merge of `origin/main` at `85b292e`):

- Lint, typecheck, build and `check:mirrors` exited 0. Unit tests: 1,452 passed in 166 files. Prettier passed on every touched file.
- Playwright on a fresh build, port 3527: `set-pieces`, `continuous-ball`, `shootout-suspense`, `score-lands-with-ball`, `speed-aware-staging`, `watch-live`, `callouts-type-effects`, `quick-not-broadcast`, `one-shared-timeline`, `mobile-targets` and `mobile-acceptance`: 377 passed, 54 skipped by their own project gates. The continuous-ball scene sampled 2,249 frames with a fastest ball speed of 2.68% of the pitch length per frame.
- Every goal kind is reached by a pinned replay at 390x844 with touch: cup8 G1 49' solo, cup8 R32 9' header and 84' penalty, kanto151 R32 17' free kick.
- NOT RUN: the full local Playwright suite, a continuity guard at 2x, browser proof at 360 and 320 (no layout change), the review and the physical phone check.

Measurements and decisions are in `docs/decisions/set-pieces.md`. Screenshots are in `docs/reports/set-pieces/`.

PR #91 (row 2a, broadcast frame loop) merged as squash `e3d0e95`, reviewed head `b420c85`, GLM 5.3 Flash APPROVE in round 1 with canary `frame-loop-4779394b5c662377c3cb98465e2d752e` echoed. At `b420c85` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,453 unit tests passed in 166 files and Prettier passed on 13 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `e3d0e95` with `db.status` ok, and `broadcast-frame-loop`, `continuous-ball`, `shootout-suspense` and `callouts-type-effects` against production (chromium) passed 9 of 9, the ball's fastest 100 ms speed reading 2.68% per frame. NOT RUN: physical phone check (owner action); the perf harness after the #92 merge. Carryover: style recalc rose (257 to 484 ms per 10 s at 4x throttle) while total main-thread time fell; pose and facing update at the 10 Hz render floor.

Merged origin/main after PR #91. Row 2a moved the trail drawing into `trailPath` in `Broadcast.tsx`, so the free kick's curl (`trail.via`) now bends that helper's control point; `trailPath` is exported and `Broadcast.trailPath.test.ts` pins both the curled and the plain path (it fails with `via` ignored: `Q 87.50 29.76` instead of `Q 80.75 27.52`). After the merge: lint, typecheck and build exited 0, 149 matchday unit tests passed in 24 files, and `set-pieces`, `continuous-ball`, `broadcast-frame-loop`, `score-lands-with-ball`, `shootout-suspense` and `callouts-type-effects` passed 14 of 14 locally.

## Broadcast frame loop

Branch `perf/broadcast-frame-loop` off `fe6d183`, with `origin/main` merged in, last at `85b292e`
(PRs #89, #90 and #92). UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting`
changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, a live match looks the same and does less work per frame. Before, React re-rendered
the whole match screen on every animation frame (62 commits in 62 frames). Now the clock,
scoreboard, ticker and touchline render about every 100 ms (12 commits in the same 62 frames). They
also render at once on a new minute, a fired beat, a landed goal, or a frame whose pitch shows a new
cut-in, trail, play badge or carrier. A frame loop moves the 22 players and the ball with
`translate3d` transforms from row 2b's `stageFrame`. Quick and reduced motion stay still. The score
lands at goal progress 0.6, and 1x/2x staging, manager stops, injury staging and row 2g's cut-ins
keep their timings. Row 2e's penalty moves per frame at that frame's `kickProgress`. The
sudden-death banner, the kick dots, the shootout score and the kick sounds render on the frame that
reaches them.

RED commits: `3129582`, `6c06799` (5 of 5 guard tests fail on `origin/main` code). The cut-in timing
guard fails when the painter is forced never to ask for a render (mutation proof on the merged
code). `continuous-ball` now reads the transform and still fails on an `ae8ee22` build (9.00).

Measured at 390x844 with a 4x CPU throttle in headless Chromium, 2 batches of 5 alternated runs per
side, before `458c56e` and after `6e9d509` (medians, batch 1 then batch 2):

- p50 frame interval was 16.7 ms on both sides in both batches.
- p95 was 16.7/16.7 ms before and 16.8/16.7 ms after. Across the 10 runs per side, 3 before and
  4 after read 16.8. That is one tick of the 0.1 ms timer.
- Every run on both sides had 0 dropped frames, 0 long tasks and a 16.8 ms largest gap.
- DOM mutations fell from about 2207 to 1164 per second.
- Main-thread task time fell from 3022/4167 to 2824/3764 ms per 10 s.
- Style recalc rose from 257/397 to 484/676 ms.

Headless numbers do not include GPU raster. Details are in `docs/decisions/broadcast-frame-loop.md`.

Gates at `f0f73b9` (after the #92 merge):

- Lint, typecheck and build exited 0.
- Unit tests: 1453 passed in 166 files.
- `check:mirrors`, `image-seam`, `image-packs`, `theme-contrast`, `theme-colors`, `theme-cvd` and
  `client-bundle` exited 0.
- Playwright (`broadcast-frame-loop`, `continuous-ball`, `callouts-type-effects`, `audio-polish`,
  `score-lands-with-ball`, `speed-aware-staging`, `mobile-pitch-fixes`, `injury-staging`,
  `one-shared-timeline`, `quick-not-broadcast`, `shootout-suspense`) gave 20 passed and 0 failed.
- NOT RUN: physical phone check, full local Playwright suite, review, hosted CI, and a perf rerun
  at `f0f73b9`. The numbers above are from `6e9d509`, before #92.

PR #92 (row 2e, shootout with suspense) merged as squash `85b292e`, reviewed head `5b2229a`. At `5b2229a` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,445 unit tests passed in 165 files and Prettier passed on 12 touched files. GLM 5.3 Flash: the first reply (canary `shootout-2449282c14c0d19c6b0cf507e6718bb0`) read APPROVE but put the verdict on a line with other text, so it was not counted; the full rerun at the same head with canary `shootout-b-186b4fc0bd2aa36934fd3fe7f08420d2` approved. Hosted `check` first failed on a timeout in `MatchPlayer.quick.test.tsx` ("Quick shows no cut-in through the 30' goal", over 15 s), a row 2g test that takes about 1.9 s locally both on `main` at `458c56e` and on `5b2229a` (3 runs each); the failed job was rerun with no commit and passed, and all eight e2e shards were green. Production `/api/health?db=1` served `85b292e` with `db.status` ok, and `shootout-suspense.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: physical phone check and on-device sound (owner action). Carryover: that Quick test is the heaviest matchday unit test and has hit the 15 s limit once on a hosted runner.

## Shootout with suspense

Branch `feat/shootout-suspense` off `e7f2012`, with `origin/main` merged in at `ae8ee22` (PR #89). UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Each live shootout kick now plays out: the taker runs up (0 to 0.35 of the kick), the ball flies with a trail (0.35 to 0.60), then the keeper reacts. A save dives the ball's way; a goal beats a keeper who went the wrong way or too late.
- Waiting players stand on a two-row arc either side of halfway instead of a stacked column.
- Each live kick sounds a whistle, the strike and a crowd roar or the glove. Quick and reduced motion stay still and hear only the outcome (goal horn or glove).
- A "Sudden death" banner shows from kick 11 (the engine takes five regulation kicks a side).
- The kick dot and pens score land when the keeper reacts, not after.

RED commit: `b6005f1` (11 tests failed in 3 files; `shootout.test.ts` failed to import `../shootout`).

Gates at `0d17adc` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. Prettier passed on every touched file.
- Unit tests: 1,441 passed in 164 files.
- Playwright (port 3525, `CI=1`): `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `audio-polish`, `one-shared-timeline`, `speed-aware-staging`, `quick-not-broadcast`, `mobile-pitch-fixes`, `engine-v4`, `manager-mode`, `callouts-type-effects`: 394 passed, 54 skipped by their own project gates.
- Review, hosted CI and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/shootout-suspense.md`.

PR #90 (row 2b, continuous ball) merged as squash `458c56e`, reviewed head `18c0fb0`. The first reviewed head `d70c71a` (GLM APPROVE, canary `continuous-ball-1eb739e91836294d83ee5654d3381587`) failed hosted e2e shard 1 on the one-frame ball bound under runner load; the browser spec moved to a 100 ms windowed speed with a bound of 6 (fails on `main` at 9.00, 2 of 2), and the 4% choreography bound stays in the unit test. At `18c0fb0` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,425 unit tests passed in 162 files and Prettier passed on 10 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash APPROVE in round 2 with canary `continuous-ball-r2-c9805a76e9cd4934cc9e15b35b1dc030` echoed. Production `/api/health?db=1` served `458c56e` with `db.status` ok, and `continuous-ball.spec.ts` plus `callouts-type-effects.spec.ts` against production (chromium) passed 5 of 5, the ball's fastest 100 ms speed reading 2.68% per frame. NOT RUN: physical phone check (owner action).

Merged origin/main after PR #90 with no textual conflict. Row 2b routes the broadcast through `stageFrame` in `player.ts`, so `FrameView` gained the optional `kickProgress` and passes it to `stagePitch`; without it typecheck failed on `Broadcast.tsx`. After the merge: typecheck and build exited 0, 132 matchday unit tests passed in 21 files, and the shootout, continuous-ball, callouts and audio specs passed 8 of 8 locally.

## Continuous ball

Branch `feat/continuous-ball` off `fe6d183`. Matchday staging only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, the broadcast ball no longer teleports. A tackle carries the ball to the defender who won it. Goals and saves start from where the ball is. Penalties are taken from the spot. After a goal both teams walk back to kickoff shape and the side that conceded kicks off from the centre. On the golden cup, the largest one-frame ball move at 1x falls from 78.0% to 3.87% of the pitch length. Each save now holds the live clock for 1,100 ms instead of 900.

RED commit: `e7b7ece` (4 of 4 guards failed), after the prefactor `a4e7e66` that adds the `stageFrame` seam with no behaviour change. GREEN: `0ea0c23`.

Gates at `c52a10a` (the merge of `origin/main` at `e7f2012`, PR #88):

- Lint, typecheck and build exited 0. Unit tests: 1,414 passed in 160 files (1,391 in 156 at `0ea0c23` before the merge).
- Prettier passed on every touched file.
- Playwright on a fresh build, port 3532 (3522 was held by another dispatch's server). `continuous-ball`, `audio-polish`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `one-shared-timeline`, `recorded-saves`, `score-lands-with-ball`, `injury-staging`, `speed-aware-staging`, `quick-not-broadcast` and `manager-mode`: 388 passed, 54 skipped by their own project gates. The continuous-ball scene sampled 2,251 frames with a largest rendered ball move of 2.68% of the pitch length.
- NOT RUN: the full local Playwright suite, the review, and browser proof at 360 and 320 (no layout change).

Measurements and decisions are in `docs/decisions/continuous-ball.md`. Screenshots are in `docs/reports/continuous-ball/`.

PR #89 (row 2g, callouts and type effects) merged as squash `ae8ee22`, reviewed head `60dc61d`. Hosted round 1 at the first head failed `check:theme-colors` (literal `#fff` in the new effect rules); fixed with the `--fx-core-tint` token. At `60dc61d` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,421 unit tests passed in 161 files and Prettier passed on 17 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash: the first reply at `60dc61d` (canary `callouts-r2-378b2d07768df3439caca08ceb327f9d`) read APPROVE but lacked the verdict line, so it was not counted; the rerun at the same head with canary `callouts-r2b-697879c7024d00953bc76e53ceb5f15c` approved. Production `/api/health?db=1` served `ae8ee22` with `db.status` ok, and `e2e/callouts-type-effects.spec.ts` against production (chromium) passed 4 of 4. NOT RUN: physical phone check (owner action).

Merged origin/main after PR #89. Conflicts in `timeline.ts` (kept both `kickoff` and `moment` on `PlayPhase`, one `OPP_SHAPE`, the callout gap on this branch's `slots`), `Broadcast.tsx` (`stageFrame` plus the cut-ins) and STATE. The turnover rule changes which player acts in the phase at minute 5.5 of the cut-in fixture, so `Broadcast.cutin.test.tsx` now expects Kabutops used Absorb! for the ordinary callout that shows no cut-in. After the merge: typecheck and lint exited 0, 127 matchday unit tests passed in 22 files, and the continuous-ball, callouts, audio, score-lands, speed-aware and mobile-pitch specs passed 13 of 13 locally.

Hosted CI at `d70c71a` failed e2e shard 1: `continuous-ball.spec.ts` measured 9.82% and then 7.90% (retry) against its one-frame bound of 4, where local runs read 2.70 to 3.87. Reproduced under CDP CPU throttle: 5.36% at 4x, 5.91% at 6x. The samples around the 4x peak show a render that missed a frame (2.04 over 34 ms) and then caught up (3.92 over 16 ms), which together match the carried ball's steady 2% a frame, so the step is render lateness, not a teleport. The spec now takes the fastest speed over any window of at least 100 ms, scaled to one 60 Hz frame, with a bound of 6. Measured with it: 2.68 at 1x, 2.68 at 6x, 3.44 to 4.23 at 8x and 10x. Against a build of `main` at `ae8ee22` the same spec reads 9.00 (from a 53% single-frame jump) and fails, 2 of 2. The 4% bound on the choreography itself stays in `continuous-ball.test.ts`, sampled at an exact 60 Hz clock.

## Callouts and type effects

Branch `feat/callouts-type-effects` off `fe6d183`, with `origin/main` merged in at `e7f2012` (PR #88). UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A live match calls a move only on big moments: final-third through balls, crosses into the box, key duels that win the ball for a goal or a save, and 15% of build-up, at least 5 minutes apart (key duels exempt). Real cups average 13.81 open-play callouts a match, down from 54.83 (84 matches of 90 minutes).
- Every one of the 18 types draws its own effect colour (the twelve without a tuned effect take `TYPE_PALETTE`) and sounds in one of ten synthesized families.
- Goals, saves and key duels get a lower-third card with the sprite, the move and a type badge. Quick shows no card and no per-phase sound. Reduced motion shows the card without animation.

RED commit: `e6401fe` (9 of 62 failed in the five touched test files; the pinned seed gave 60 callouts).

Gates at `f755466`:

- Lint, typecheck and build exited 0. Prettier passed on every touched file.
- Unit tests: 1,421 passed in 161 files.
- Playwright (`PLAYWRIGHT_PORT=3523 CI=1`): `callouts-type-effects`, `one-shared-timeline`, `score-lands-with-ball`, `speed-aware-staging`, `manager-mode`, `audio-polish`, `mobile-targets` and `mobile-acceptance`: 383 passed, 54 skipped, 0 failed.
- Pinned seed (`a1`, 4-2-3-1, match 1): 12 open-play callouts (was 60).
- Full local Playwright suite, physical phone check and review: NOT RUN.

Browser proof: `docs/reports/callouts-type-effects/` (goal cut-in and callout badge at 390, 360 and 320, and the reduced-motion goal card at 390). Measurements and decisions are in `docs/decisions/callouts-type-effects.md`.

PR #88 (row 2h, audio polish) merged as squash `e7f2012`, reviewed head `f46ef6c`, GLM 5.3 Flash APPROVE in round 1 with canary `audio-polish-dcd1218ec61c1a8e038774952dbb605e` echoed. At `f46ef6c` lint, typecheck and build exited 0, 1,410 unit tests passed in 159 files and Prettier passed on 14 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `e7f2012` with `db.status` ok, and `e2e/audio-polish.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: iOS Safari audio on a real device (owner action).

Hosted CI round 1 on `4b79214` (GLM APPROVE, canary `callouts-344a4b0b787bd0aea50929c2fa8d5bb1`) failed `pnpm check:theme-colors`: the twelve palette-type rules mixed toward a literal `#fff`. The colour now comes from a new `--fx-core-tint` token in `src/design/stadium.css` (same `#ffffff`, no visual change). `check:theme-colors`, `check:theme-contrast`, `check:theme-cvd`, `check:mirrors` and `check:image-seam` exit 0.

## Audio polish

Branch `feat/audio-polish` off `fe6d183`. UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- With sound on, tapping Watch live or Go to the match unlocks audio, so the autostarted broadcast is no longer silent until Pause and Resume.
- A live broadcast has a synthesized crowd (band-passed seeded noise, no assets) that swells as the ball nears either box and roars when a goal lands: 2250 ms for a normal goal, 4950 ms for an equaliser at 80' or later, halved at 2x.
- The crowd stops on pause, manager stops, full time, Sound off, closing Watch live and leaving the matchday. Quick has no crowd, no roar and no kick thud.
- The kick thud never sounds twice in any three phases.

RED commit: `da0bcc8` (11 tests failed in 4 files and `crowd.test.ts` failed to import `../crowd`).

Gates at `b8b8d14` (code identical at `41a7fe1`, which adds the spec and docs):

- Lint, typecheck and build exited 0 (lint, typecheck and Prettier on touched files re-run at `41a7fe1`, exit 0).
- Unit tests: 1,410 passed in 159 files.
- Playwright (port 3524, `CI=1`): `audio-polish`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `one-shared-timeline`, `manager-mode`, `builder-matchday`, `mobile-pitch-fixes`, `honest-momentum`, `injury-staging`: 387 passed, 54 skipped by their own project gates.
- iOS Safari audio on a device, review and hosted CI: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/audio-polish.md`.

PR #87 (Wave 1 summary) merged as squash `fe6d183`, reviewed head `b7823f4`, GLM 5.3 Flash APPROVE in round 2 with canary `wave1-summary-r2-e85818455aaf26363677ab2a4eaef30d` echoed. Round 1 (`10cf2f7`) was REQUEST_CHANGES: the section misstated its gates and called 2,891,853 bytes a saving (the saving is 2,892,556). At `b7823f4` lint, typecheck and build exited 0, 1,387 unit tests passed in 155 files and Prettier passed on the three changed files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `fe6d183` with `db.status` ok (docs only, no route to check). Wave 1's live checks are recorded in `docs/reports/audits-2026-10-17/program-log.md`.

## Wave 1 summary

Branch `docs/wave1-summary` off `4173b94`. Docs only (Green). Appends the Wave 1 entry to `docs/reports/audits-2026-10-17/program-log.md`: every PR with its squash and reviewed head, the production checks, the measurements that moved, brief-vs-code notes and open carryovers. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #86 (row 1l, retained JSON dedupe) merged as squash `4173b94`, reviewed head `0054190`, GLM 5.3 Flash APPROVE in round 1 with canary `retained-json-5b9cb3e1965e74be6b4dd2ed18269158` echoed. Hosted check (its new measure step read 4 copies, 2,891,853 bytes) and all eight e2e shards green on that head. Production `/api/health?db=1` served `4173b94` with `db.status` ok, and `e2e/old-links.spec.ts` plus `e2e/engine-v4.spec.ts` against production (chromium) passed 4 of 4.

Gates at `10cf2f7` (the coordinator's review run): lint, typecheck and build exited 0, 1,387 unit tests passed in 155 files, and Prettier passed on all three changed files (`STATE.md`, the decision log and `program-log.md`); hosted check and all eight e2e shards green. Review round 1 asked for this gate record and a corrected 1l saving (2,892,556 bytes). No runtime change.

## Retained JSON dedupe

Branch `fix/retained-json-dedupe` off `f4489cb`, with `origin/main` merged in, last at `badda9f` (PR #85). Build and CI only (Red, deploy/build). No file under `src/engine` or `src/data` changed. Players see no change. Old share links replay as before, and the server build carries one copy of each retained data file instead of eight.

- The Turbopack retained-JSON rule in `next.config.ts` matches every `v<n>` bundle, v5 included.
- `scripts/build/retained-json-loader.cjs` re-exports the live file or the earliest byte-identical retained copy. Before, v2 to v5 each inlined the same 803 KB `scouting.json` once the live file changed.
- CI runs `node scripts/build/measure-retained-json.mjs .next/server/chunks`, which asserts 4 payloads, after `pnpm build`.

RED commit: `098a694` (measure script fails `8 !== 4` on a fresh build of `f4489cb`; 2 of 7 loader tests fail).

Gates at `a980db9`:

- Lint, typecheck, build, client bundle check and format check on touched files exited 0.
- Unit tests: 1,316 passed in 144 files.
- Measure script: 4 payloads, 2,891,853 bytes (was 8 and 5,784,409).
- Emitted retained replays: 7 of 7 passed; an uncommitted v5 extension passed 9 of 9.
- Playwright `e2e/old-links.spec.ts` and `e2e/engine-v4.spec.ts`: 4 passed.
- On a fresh build of the `origin/main` merge (`badda9f`): measure script 4 copies, 2,891,853 bytes, exit 0.
- Full local Playwright suite, review and hosted CI: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/retained-json-dedupe.md`.

PR #85 (row 1j, builder matchday) merged as squash `badda9f`, reviewed head `d66ba81`, GLM 5.3 Flash APPROVE in round 2 with canary `builder-matchday-r2-4e7070784c306535f9bf51e33317ed79` echoed. Round 1 (`4577309`) was APPROVE but hosted e2e shard 7 failed `settings-confirm.spec.ts` twice: the home page's new `MatchdaySettings` dropped a formation picked during hydration on a slow phone. Fix `d66ba81` after RED `1136ad8`. Hosted check and all eight e2e shards green on `d66ba81`. Production `/api/health?db=1` served `badda9f` with `db.status` ok, and `builder-matchday`, `settings-confirm` and `quick-not-broadcast` against production (chromium) passed 15 of 15.

## Builder matchday

Branch `feat/builder-matchday` off `f4489cb`, with `origin/main` merged in, last at `63c9d36` (PR #84). UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A friendly cup from the home builder now follows Manager mode and Live match. With either on it opens the matchday, and Manager mode reaches the touchline. With both off it goes straight to the results, as before.
- The Matchday toggles sit above Play a friendly cup and stay in step with the side panel's Matchday switches.
- A reload during a friendly matchday comes back to the same match from the builder run slot. Friendly results still do not survive a reload.
- Friendlies stay unranked. The results show no submit panel, and the server rejects a coached builder token as `BUILDER_NOT_RANKED`.
- The `PlayScreen` and `LiveRun` builder gates are gone, but `/play` never runs a builder cup, so the player path was the home friendly in `HomeScreen`.
- With PR #78's rule merged in, Manager mode plays a friendly live too: `MatchdayFlow` applies `matchdayView`, and the builder's toggles disable Quick with the same hint. The merge made `SidePanel.test.tsx` find two Quick sim buttons (the desk's and the builder's). Its two manager-mode guards now read the Control desk's copy and also assert the builder copy is disabled under Manager mode and pressed after it goes off. Forcing Quick enabled in `MatchdaySettings` fails the new assertion (`expected false to be true`). `e2e/quick-not-broadcast.spec.ts` hit the same two copies (strict mode, 2 elements) and now reads the desk's copy and checks the builder's Quick is disabled; on a fresh build of the merge it passed 1 of 1, and `builder-matchday` plus `manager-mode` passed 8 of 8 (chromium).

RED commit: `aff6f7a` (5 failing tests in `builder-matchday.test.tsx`).

Gates at `06d3755` (later commits change only STATE.md):

- Lint, typecheck, format check, build, client bundle and image seam exited 0.
- Unit tests: 1,321 passed in 146 files.
- Playwright on a fresh build, 13 specs (`builder-matchday`, `builder`, `manager-mode`, `mobile-targets`, `mobile-acceptance`, `data-split`, `layout-shift`, `theme-builder`, `builder-ratings-layout`, `a11y`, `run-persist`, `settings-confirm`, `contrast`): 478 passed, 0 failed, 57 skipped.
- NOT RUN: the full Playwright suite locally, hosted CI, the GLM review, a physical phone check.

Hosted CI round 1 on `4577309` (GLM APPROVE, canary `builder-matchday-1beacf9854e8996ac05950ad9b355a14`) failed e2e shard 7: `settings-confirm.spec.ts` lost a 4-4-2 pick on iphone-14. Cause: the home page's new `MatchdaySettings` read the stored panel through `useSyncExternalStore` (server `null`, client stored), so React redid the render after hydration and reset the select before the queued pick replayed. Under an 8x CPU throttle the pick was lost 6 of 6 on this branch and 0 of 6 on `main`. A controlled `MatchdaySettings` no longer reads the store. RED `1136ad8` (new slow-phone guard, 3 of 3 failed); with the fix the guard passed 5 of 5 and `settings-confirm` 23 passed, 3 skipped (chromium, iphone-14).

Decisions and the RED output are in `docs/decisions/builder-matchday.md`. Screenshots at 390x844 are in `docs/reports/builder-matchday/`.

PR #84 (row 1i, draft safety) merged as squash `63c9d36`, reviewed head `7d9c485`, GLM 5.3 Flash APPROVE in round 2 with canary `draft-safety-r2-e0e51731aa6c1ac38eca1adff08d9674` echoed. Round 1 (`904951a`, canary `draft-safety-76b0e65314925f378432c265b5d26dcf`) was REQUEST_CHANGES: it could not see the inert-while-dragging backdrop rule, which predates the PR (`DraftBoard.module.css` line 399). `7d9c485` makes the candidate drag test assert the picker is open (3 of 3 phone projects passed, 3 of 3 failed with the rule removed) and corrects the overflow wording (body only). Hosted check and all eight e2e shards green on `7d9c485`. Production `/api/health?db=1` served `63c9d36` with `db.status` ok, and `e2e/draft-safety.spec.ts` against production (chromium) passed 9 of 9.

## Draft safety (Wave 1, 1i)

Branch `fix/draft-safety` off `f4489cb` (PR #69), with `origin/main` merged in, last at `b7f28d6` (PR #83). Only STATE.md conflicted. UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- New run with any player signed asks "Start over? The N players you signed will be lost." with Start over and Keep drafting, focus on Keep drafting. With nothing signed, one tap still starts over.
- Keys 1 to 3 and the draft's Escape do nothing while the scouting dossier, any open dialog or the New run question is open.
- body clips sideways overflow (`overflow-x: clip`) instead of hiding it, so `position: sticky` sticks. Home Control desk measured at `top: 16` after a 1000px scroll once its main column is taller than it.
- Pitch cards default to `touch-action: pan-y` (`none` only while dragging), so a vertical swipe on a card scrolls the page. A touch drag that starts vertically now scrolls instead of swapping; the two-tap swap stays.
- The open picker is modal: a tap on its dimmed backdrop closes it, and a swipe down on its top bar closes it. Taps no longer pass through to the pitch or hub around it.
- A dragged starter's vertical move is stretched by 1/cos(26deg) so it stays under the pointer on the tilted field.

RED commits: `8660698`, `e8ef69d` and `b3faa46` (harness fix for the sticky and backdrop guards; all six Playwright guards and the drift unit guard fail on `f4489cb` code).

Gates at `681cd5e` (later commits change only docs):

- Lint, typecheck, build and Prettier on changed files exited 0.
- Unit tests: 1,314 passed in 144 files.
- Playwright on a fresh build, full suite: 823 passed, 0 failed, 61 skipped.
- Browser proof at 390x844, 360 and 320: `docs/reports/draft-safety/`.
- Review round 1 (GLM, `904951a`) asked for proof that a drag from the open picker still lands, since the backdrop now takes taps. The inert-while-dragging rule predates this PR (`DraftBoard.module.css` line 399). `e2e/mobile-draft.spec.ts` now asserts the picker is open before its candidate drag: 3 of 3 passed on the phone projects, and 3 of 3 failed with that rule's `pointer-events: none` removed.
- After the `origin/main` merge the coordinator reruns lint, typecheck, unit tests, build and the format check on the reviewed head; the counts are in the PR's review comment and the next STATE update. Hosted CI runs the full Playwright suite.
- Physical phone check, real touch on WebKit and the GLM review: NOT RUN.

Decisions and RED output are in `docs/decisions/draft-safety.md`.

PR #83 (row 1k, security and integrity quick fixes) merged as squash `b7f28d6`, reviewed head `8307dbe`, GLM 5.3 Flash APPROVE with canary `security-fixes-r2-7b878c9c50de4aa8db1f8d37ffdff8f3` echoed. The first reply on the same head also approved but mistyped its canary, so the checker did not count it and the review ran again. At `8307dbe` lint, typecheck, build and the format check exited 0 and 1,375 unit tests passed in 153 files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `b7f28d6` with `db.status` ok. On production a JSON and a text POST to `/gate/unlock` each answered 303 to `/gate?next=%2F&error=1`, `/gate?next=/..//evil.com` rendered `next` as `/`, `/api/leaderboard?mode=cup8&scope=all&coach=uncoached` answered 200, and `e2e/leaderboard.spec.ts` tests at lines 103 and 134 (stubbed board) passed 2 of 2 (chromium). NOT RUN: a real IPv6 client and a real hung Neon query.

## Security and integrity quick fixes (W1k)

Branch `fix/security-integrity-quick-fixes`, off `f4489cb`, with `origin/main` (`754d838`, PR #82) merged in. Tier Red (gate, rate limits, database client, leaderboard). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A gate link such as `/gate?next=/..//evil.com` now unlocks to `/`, not to another site.
- One IPv6 client shares one rate-limit bucket across its /64, for gate attempts and leaderboard submissions. IPv4 is unchanged.
- A Neon query that hangs fails after 4 seconds into the existing "leaderboard is offline" reply, instead of holding the function to its limit.
- A JSON or text POST to `/gate/unlock` goes back to the gate with an error, not a 500.
- A submitted run's rank is counted among runs like it (uncoached or coached). The uncoached leader reads #1, the success line names the view, and View leaderboard opens it.
- The board's coach view lives in the URL (`/leaderboard?mode=cup8&scope=all&coach=uncoached`), so friends can link a filtered board.

RED commit: `209c429` (15 failing guard tests).

Gates at `5b7ca8d` (later commits change only docs):

- Lint, typecheck, build and format check exited 0.
- Unit tests: 1,331 passed in 147 files.
- Playwright on a fresh build (leaderboard, leaderboard-cls, leaderboard-date, mobile-targets, mobile-acceptance): 375 passed, 54 skipped, 0 failed.
- At the merge of `origin/main` (`0145412`) the coordinator reruns lint, typecheck, unit tests, build and the format check on the reviewed head; the counts are in the PR's review comment and the next STATE update.
- Full Playwright suite, independent review, a physical phone check and the post-merge production check: NOT RUN.

Scope, RED output and decisions are in `docs/decisions/security-integrity-quick-fixes.md`. Screenshot: `docs/reports/security-integrity-quick-fixes/leaderboard-coach-url-390x844.png`.

PR #82 (side fix, CI e2e shards) merged as squash `754d838`, reviewed head `ac0c6d3`, GLM 5.3 Flash APPROVE with canary `ci-shard-r3-1c82513b2110db5a53eb92acc7b4bc89` echoed (the earlier four-shard head `a380010` was approved; the review of `c4e6113` was stopped when the PR moved to eight shards). On `ac0c6d3` the eight shards took 4.5, 5.7, 3.0, 5.6, 5.5, 8.4, 6.5 and 3.1 min, all green. Shard 6 ran 110 tests in 6.5 min with no retry: Playwright splits by test count, not time, so the slowest shard is 8.4 min against 9.1 min with four. Production `/api/health?db=1` served `754d838` with `db.status` ok (CI-only change, no route to check). PR #81 (row 1h) is recorded in the CI e2e shards section below.

## CI e2e shards

Branch `ci/shard-e2e`, off `9d37864`, with `origin/main` (`68f37c9`, PR #81) merged in. CI only (Green), an out-of-band side fix outside Wave 1. Only `.github/workflows/ci.yml` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Nothing changes for the player. The hosted `e2e` job now runs as eight parallel shards (`--shard=N/8`), each uploading its own report on failure.
- Before: PR #80's `pnpm test:e2e` step took 28.6 min for 824 passed and 61 skipped, the whole critical path of every merge. On this PR's first run (head `a380010`) the four shards took 6.7, 6.9, 7.4 and 9.1 min end to end, all green, so the job finishes in about 9 min instead of about 31. This head moves to eight shards; its time is read from this PR's run.
- Observed, not fixed here: `main` push run 39080199806 on `90aba39` failed `Builder.test.tsx` once (`expected 'DF  LCB + Tap to Draft!' to be 'DF  LCB  Bulbasaur Grass Poison '`, line 275), a lazy-import race like the one PR #80 fixed in `announce-builder.test.tsx`. Carried over.

Gates: no test or source change. Hosted CI on this PR is the proof. Local Playwright: NOT RUN.

Measurements and the rejected options are in `docs/decisions/ci-shard-e2e.md`.

PR #81 (row 1h, highlights honesty) merged as squash `68f37c9`, reviewed head `b1f6f8e`, GLM 5.3 Flash APPROVE in round 1 with canary `highlights-honesty-ea975c4a469b2015a2e21c90fcf7b4d3` echoed (the first gate run on `464ec6e` failed prettier on the new spec, fixed in `b1f6f8e` before review); hosted check and e2e green on that head. Production `/api/health?db=1` served `68f37c9` with `db.status` ok, and `e2e/highlights-honesty.spec.ts` against production (chromium) passed 1 of 1.

## Highlights honesty

Branch `fix/highlights-honesty`, off `f4489cb`, with `origin/main` (`9d37864`, PR #80) merged in. Wave 1 row 1h. Display only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The highlights type icon and stage tint show the star's own primary type. Arcanine reads Fire, not the Dark of its ability Intimidate.
- The ability box says "Ability", not "Activated Ability", and the strike announcement no longer claims the ability fired.
- Clean Sheet Hero and Squad Anchor go to the first player, keeper first, who held a starting slot for the whole match. An absent, subbed, injured or sent-off keeper is skipped. A 0-0 lost on penalties is not a clean sheet.
- The MVP pill reads L for a losing record (0W-0D-3L) and D for a level one (1W-1D-1L).
- Highlight, motion, strike, goal and broadcast glyphs sit in `aria-hidden` spans, so screen readers read "Clean Sheet Hero", not "gloves Clean Sheet Hero".
- A zero weak-spot drag reads 0, not -0.

RED commit: `fc9efaf` (12 failing guards in `starCalculation`, `MatchHighlights` and `ResultsView` tests).

Gates at `dfe9f5f` (later commits change only docs):

- Lint, typecheck, format check on touched files and build exited 0.
- Unit tests: 1,327 passed in 144 files.
- Playwright on a fresh build: 429 passed, 0 failed, 54 skipped across the highlights scene, results interactions, Silph Stadium, recorded saves, a11y, contrast, mobile targets and mobile acceptance. Hosted CI runs the full suite.
- At the merge of `origin/main` (`b01ecf9`): lint, typecheck and build exited 0, and `pnpm test --maxWorkers=4` passed 1,357 tests in 150 files.
- Browser proof at 390x844: `docs/reports/highlights-honesty/`.
- NOT RUN: the new scene against a `main` build, 360 and 320 screenshots, a physical phone check, GLM review.

Decisions are in `docs/decisions/highlights-honesty.md`.

PR #80 (side fix, unit flakes) merged as squash `9d37864`, reviewed head `ba6fe52`, GLM 5.3 Flash APPROVE in round 1 with canary `unit-flakes-b94884707ea8ce649921d79f318b1156` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `9d37864` with `db.status` ok (test-only change, no route to check).

## Unit flakes

Branch `test/unit-flakes`, off `e449555`, with `origin/main` (`c87509f`, PR #78) merged in. Test only (Green), an out-of-band side fix outside Wave 1. Only `announce-builder.test.tsx` and `run.test.tsx` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Nothing changes for the player. Two unit tests that flaked on loaded four-worker runs now wait for what they depend on.
- `announce-builder.test.tsx` waited 1 s for a `?b=` link to load the builder engine with `import()`. Under load that wait measured up to 2.7 s (hosted run 39073776203 failed it). The open helper now waits once with the 10 s budget `Builder.test.tsx` already uses. With the two files alone under 36 CPU burners, it failed 20 of 20 runs before the fix and passed 20 of 20 after.
- `run.test.tsx` "saves a new unseeded run before its first pick" read storage before `LiveRun`'s save effect could run. Under load the save was missing in 1 of 200 starts. The test now waits for the save. React flushes the effect before any pick, so this is not a product bug.
- Mutating each product path (`Builder.tsx` Randomize score, `HomeScreen.tsx` ignoring `?b=`, `LiveRun.tsx` dropping the new-run save) still fails the matching test.

RED commit: none, because no new guard was added. The loaded repro counts are the RED evidence.

Gates at `598f824` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on both touched tests passed.
- Unit tests, `pnpm test --maxWorkers=4`: 1,332 passed in 8 of 8 unloaded runs and 2 of 2 runs under 24 CPU burners.
- At the merge of `origin/main` (`545b598`): lint, typecheck and build exited 0, and `pnpm test --maxWorkers=4` passed 1,341 tests in 150 files in 3 of 3 runs.
- Hosted CI, Playwright (no UI change) and the GLM review: NOT RUN at the time of writing.

Scope, repro counts, measurements and the mutation output are in `docs/decisions/unit-flakes.md`.

PR #79 (row 1g, mobile pitch fixes) merged as squash `90aba39`, reviewed head `5cac7ce`, GLM 5.3 Flash APPROVE in round 2 with canary `mobile-pitch-r2-3d50fc7ebb70a24bfcd9025660bea576` echoed. Round 1 (`3398f4b`) was APPROVE but hosted e2e failed `speed-aware-staging.spec.ts` twice on a 2x goal flash the visibility poll missed (also failing 3 of 4 on `main` under a 6x CPU throttle); `5cac7ce` reads the flash from the page mutation log. Hosted check and e2e green on `5cac7ce`. Production `/api/health?db=1` served `90aba39` with `db.status` ok, and `e2e/mobile-pitch-fixes.spec.ts` against production (chromium) passed 4 of 4.

## Mobile pitch fixes

Branch `fix/mobile-pitch-fixes`, built on row 1f (`fix/quick-not-broadcast`). UI only (Yellow), Wave 1 row 1g (bundle). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- On phones (below 420px) the match HUD now uses two rows, so the momentum figures no longer run into the shot counts.
- The ball carrier's nameplate and the yellow card pip keep their full size (11px text, a 9 by 13px pip) instead of shrinking with the sprites. Names over 10 characters are cut to 9 and an ellipsis.
- Every sprite on the pitch is drawn at kickoff: the pre-match card now loads both elevens.
- Pass and shot trails keep their shape on the pitch, so the trail's start ring is round, and a penalty taker stands on the drawn penalty spot.
- Measured in a 390, 360 and 320px replay of the golden cup8 run's G1, and at a managed kickoff stop with 400 ms of added latency: 22 of 22 sprites drawn (17 before).

RED commit: `925bdb5` (3 failing unit tests in `Broadcast.test.tsx` and `timeline.test.ts`, and 4 failing scenes in `e2e/mobile-pitch-fixes.spec.ts`).

Gates at `554c42d` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed. `pnpm check:image-seam` clean.
- Unit tests: 1,343 passed in 150 files.
- Playwright on a fresh build of the fix code (`677f01a`; `554c42d` adds only the spec's rounding and the screenshots): `mobile-pitch-fixes`, `mobile-targets`, `mobile-acceptance`, `manager-mode`, `quick-not-broadcast`, `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `injury-staging` and `results-interactions` gave 393 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/mobile-pitch-fixes/390-live-pitch.png`, `360-live-pitch.png`, `320-live-pitch.png`, `390-kickoff-stop.png` and `390-live-pitch-before.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/mobile-pitch-fixes.md`.

PR #78 (row 1f, manager mode plays live, Quick is not a broadcast) merged as squash `c87509f`, reviewed head `27659c6`, GLM 5.3 Flash APPROVE in round 2 with canary `quick-live-r2-c379bd30b4dedd41803af83f7e1b89d4` echoed. Round 1 (`17d5290`) was also APPROVE but hosted CI failed its unit job on a flaky PR #72 guard, fixed in `27659c6`. On `27659c6` the unit job failed once on `announce-builder.test.tsx` (an unrelated known flake) and passed on a rerun of the failed job with no new commit; e2e green. Production `/api/health?db=1` served `c87509f` with `db.status` ok, and `e2e/quick-not-broadcast.spec.ts` against production (chromium) passed 1 of 1.

Hosted e2e on `3398f4b` (run 39075805190) failed `e2e/speed-aware-staging.spec.ts` (PR #77) on both attempts: `toBeVisible` on `goal-flash` timed out at 60 s while the replay reached full time at 1 - 0 with the 49' goal in the ticker. At 2x the flash lives about half a second, and a busy runner's visibility poll can miss it. Under a 6x CDP CPU throttle the unchanged spec failed 2 of 4 on this branch's build and 3 of 4 on a `main` build (`c87509f`), so this row did not cause it. The spec now waits on its own MutationObserver log for a frame that drew the flash, then for the callout to go. Under the same throttle it passed 6 of 6, with the callout on screen 977 to 985 ms. `e2e/score-lands-with-ball.spec.ts` polls the flash the same way at 1x (about twice as long on screen) and is left as a watch item.

## Quick is not a broadcast

Branch `fix/quick-not-broadcast`, built on row 1e (`fix/speed-aware-staging`). UI only (Yellow), Wave 1 row 1f. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- With manager mode on, every match now plays at the live pace, even when Quick sim is the saved choice. Before, a managed match with the default Quick view was over in about 5 s.
- While manager mode is on, the Match view selector on the home panel and on the challenge and daily start screens shows Live match, disables Quick sim and says "Manager mode plays live". Turning manager mode off brings the saved Quick choice back.
- A Quick match draws a still pitch with no move badges and plays only the beat sounds (whistles, goals, saves, cards, subs), not a sound for every phase.

RED commit: `d31e4d1` (7 failing tests in `MatchPlayer.quick.test.tsx`, `MatchdayFlow.pace.test.tsx`, `MatchdaySettings.test.tsx` and `SidePanel.test.tsx`).

Gates at `8fe6174` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed. `pnpm check:image-seam` clean.
- Unit tests: 1,341 passed in 150 files.
- Playwright on a fresh build of `8fe6174`: `quick-not-broadcast`, `manager-mode`, `mobile-targets` and `mobile-acceptance` gave 375 passed, 0 failed, 54 skipped. `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum` and `injury-staging` gave 8 passed.
- Browser proof: `docs/reports/quick-not-broadcast/390-home-manager-plays-live.png`, `390-start-manager-plays-live.png` and `390-managed-match-live-pace.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/quick-not-broadcast.md`.

PR #77 (row 1e, speed-aware staging) merged as squash `e449555`, reviewed head `0a91bd9`, GLM 5.3 Flash APPROVE in round 1 with canary `speed-aware-fd842687f017bab0a83f941ce9ec86f7` echoed (a first reply put APPROVE on a line with other text, which the checker does not count, so the review ran again on the same packet); hosted check and e2e green on that head. Production `/api/health?db=1` served `e449555` with `db.status` ok, and `e2e/speed-aware-staging.spec.ts` against production (chromium) passed 1 of 1.

Hosted CI on `17d5290` (run 39071048139) failed the unit job on `MatchPlayer.movesets.test.tsx` "holds the clock at kickoff until the movesets resolve" (`expected 0 to be greater than 0`), a guard from PR #72 that waited a fixed 300 ms of fake time after the movesets gate opened. The real movesets module can still be loading under a four-worker run. Locally the unchanged test failed 1 of 8 full `pnpm test --maxWorkers=4` runs. The guard now keeps flushing the import while the fake clock runs (up to 100 steps of 48 ms) and still asserts minute 0 and "KO" for the first 1000 ms. With the hold removed from `MatchPlayer` it fails (`expected 20 to be +0`); with the fix it passed 10 of 10 full runs.

## Speed-aware staging

Branch `fix/speed-aware-staging`, built on row 1d (`fix/injury-staging`). UI only (Yellow), Wave 1 row 1e. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- At 2x speed every beat on the pitch now stages in half the time, so a goal's staging ends when the clock's hold ends instead of running on into play.
- The score, the ticker and the goal horn still land with the ball at 2x, at 0.6 of the shorter staging.
- Measured in a live 390px replay of the golden cup8 run's G1 at 2x. The goal's move callout stayed on screen for 1967 ms before and 983 ms after (975 ms expected).

RED commit: `a8795fd` (2 failing tests in `MatchPlayer.speed.test.tsx`).

Gates at `24ed4eb` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,332 passed in 148 files.
- Playwright on a fresh build of the fix code (`4ad326e`; `24ed4eb` adds only the spec and its screenshot): `speed-aware-staging`, `injury-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `manager-mode`, `watch-live`, `mobile-targets` and `mobile-acceptance` gave 382 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/speed-aware-staging/390-2x-goal-landed.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/speed-aware-staging.md`.

PR #76 (side fix, wheel skip flake) merged as squash `cd6c50e`, reviewed head `8e60bb2`, GLM 5.3 Flash APPROVE in round 1 with canary `wheel-flake-a047a6eeec8c4612f84233b893511419` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `cd6c50e` with `db.status` ok (test-only change, no route to check).

## Wheel skip flake

Branch `test/wheel-skip-flake`, off `b8e5c2c`. Test only (Green), an out-of-band side fix outside Wave 1. Only `e2e/wheel-results.spec.ts` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Hosted CI failed `[webkit-wheel]` "wheel results at 1440px › skip results stay in the windows until the next pick and spin" in runs 39052173584 and 39062736785, both attempts, at 120 s on the `Tap to skip` click.
- Cause, measured per frame in local WebKit: the skip button is not remounted per frame and does not move. It lives only while each reel spins (1.7 s, then 2.1 s). On a slow runner the click's actionability checks outlasted both spins, and then no skip button ever existed again.
- Fix: the skip variant installs Playwright's clock, pauses it, advances it inside the poll until the reel has moved, clicks, then resumes. Players see no change.

RED commit: none. Plain local WebKit never reproduced it (60 of 60 passed with `--repeat-each 10`). A throwaway harness that busy-waits each animation frame reproduced the CI call log: the old spec failed 10 of 10 at 250 ms and 500 ms per frame; the new one passed 10 of 10 at both.

Gates at `b56ff55`: lint and typecheck exited 0, unit tests 1,327 passed in 146 files, Prettier check passed on the touched files. `e2e/wheel-results.spec.ts` passed 60 of 60 on webkit-wheel (`--repeat-each 10`) and 30 of 30 on chromium (`--repeat-each 5`) against a build of `b8e5c2c`. Hosted CI and the full local e2e suite: NOT RUN at the time of writing.

Scope, the per-frame probe, the harness table and NOT RUN are in `docs/decisions/wheel-skip-flake.md`.

PR #75 (row 1d, injury staging) merged as squash `09fcdae`, reviewed head `aa007c4`, GLM 5.3 Flash APPROVE in round 1 with canary `injury-staging-204fa02bad0d89b0341621bfe6cf0236` echoed. Hosted e2e failed once on this flake (run 39062736785, 817 passed, 1 failed) and passed on a rerun of the failed job with no new commit. Production `/api/health?db=1` served `09fcdae` with `db.status` ok, and `e2e/injury-staging.spec.ts` against production (chromium) passed 1 of 1.

## Injury staging

Branch `fix/injury-staging`, built on row 1c (`fix/score-lands-with-ball`). UI only (Yellow), Wave 1 row 1d. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- When one of your players is injured, that player now lies down in their slot with the medic banner. The replacement walks on from the touchline after that, with the sub board.
- In manager mode the replacement stays off the pitch until you answer the injury prompt, so the pitch no longer shows the assistant's pick while you choose.
- Measured on the golden cup8 quarter-final at 42'. Before, Kommo-o walked straight on and Roselia never lay down. After, Roselia lies down, then Kommo-o walks on.

RED commit: `519cd93` (3 failing tests in `Broadcast.injury.test.tsx`).

Gates at `ace149f` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,330 passed in 147 files.
- Playwright on a fresh build of the fix code (`3130f82`; `ace149f` adds only the spec and its screenshots): `injury-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `manager-mode`, `mobile-targets` and `mobile-acceptance` gave 378 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/injury-staging/390-roselia-down.png` and `docs/reports/injury-staging/390-kommo-o-walks-on.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/injury-staging.md`.

PR #74 (row 1c, score lands with the ball) merged as squash `b8e5c2c`, reviewed head `8395f24`, GLM 5.3 Flash APPROVE in round 1 with canary `score-lands-58be11cd6bfb1ffa49b4a5043d2470ff` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b8e5c2c` with `db.status` ok, and `e2e/score-lands-with-ball.spec.ts` against production (chromium) passed 1 of 1.

## Score lands with the ball

Branch `fix/score-lands-with-ball`, built on row 1b (`fix/honest-momentum`, itself on row 1a). UI only (Yellow), Wave 1 row 1c. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In a live match the score, the shots-on-target counts, the ticker line, the screen reader line and the goal horn now wait until the ball crosses the line, at 0.6 of the goal staging. Before, they called the goal about 1.56 s early.
- Under reduced motion and in Quick view nothing is staged, so the goal counts at once.
- The score is a status region. The live region announces whole event lines, at most 3 at a time and at most once every 1.5 s.
- Measured in a live 390px replay of the golden cup8 run's G1 (first goal 49'). Before, the score read `1 - 0` before the move callout appeared. After, it read `0 - 0` in flight and `1 - 0` at the GOAL flash.

RED commit: `60f05e7` (3 failing tests in `MatchPlayer.score.test.tsx`; `e2e/score-lands-with-ball.spec.ts` also failed on the RED build).

Gates at `362d187` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,327 passed in 146 files on the last full run. Two earlier full runs at this head each failed 1 test in `src/components/builder/__tests__/announce-builder.test.tsx` ("Randomize says the Team Score the screen shows"), which this PR does not touch and which imports no matchday code. Isolated, it failed 2 of 3 runs, then passed 12 runs in a row. Flaky, recorded here.
- Playwright on a fresh build of the fix code (`ed2dec8`; `362d187` adds only the spec and its screenshots): `score-lands-with-ball`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `manager-mode`, `one-shared-timeline`, `honest-momentum` and `recorded-saves` gave 383 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/score-lands-with-ball/390-goal-in-flight.png` and `docs/reports/score-lands-with-ball/390-goal-landed.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/score-lands-with-ball.md`.

PR #73 (row 1b, honest momentum) merged as squash `b72ac5a`, reviewed head `ac3f545`, GLM 5.3 Flash APPROVE in round 1 with canary `honest-momentum-bcf935028d6e9b0a6aff5e9fb3a084b1` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b72ac5a` with `db.status` ok, and `e2e/honest-momentum.spec.ts` against production (chromium) passed 1 of 1.

## Honest momentum

Branch `fix/honest-momentum`, built on row 1a (`fix/one-shared-timeline`). UI only (Yellow), Wave 1 row 1b. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The momentum bar no longer leans toward a goal or a save before it happens. It reads 50% / 50% until the first five minutes are played, then follows the window that just finished.
- The ambient ball and the open-play possession bias read the same lean, so neither drifts toward a chance that has not happened yet.
- Measured in a live 390px replay of the golden cup8 run's G1, where the user's keeper saves at 3'. Before, 0' to 4' read 36% / 64%. After, 0' to 4' read 50% / 50% and 5' to 9' read 36% / 64%.
- Not changed by this row: the bar still reads a flat 50/50 in most windows, and each frame's line height still reads the tactic snapshot at the window's end.

RED commit: `018fd21` (3 failing tests in `timeline.test.ts`, plus `e2e/honest-momentum.spec.ts` failing on 36%64% at 0').

Gates at `43c5a5d` (later commits change only docs and screenshots):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,322 passed in 145 files.
- Playwright on a fresh build of `43c5a5d`: `honest-momentum`, `one-shared-timeline`, `watch-live`, `mobile-targets` and `mobile-acceptance` gave 365 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/honest-momentum/390-kickoff.png` and `docs/reports/honest-momentum/390-after-first-window.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/honest-momentum.md`.

PR #72 (row 1a, one shared timeline) merged as squash `b2f2d49`, reviewed head `667ad76`, GLM 5.3 Flash APPROVE in round 1 with canary `one-timeline-051829b31b7efd9c2408e72508363bb4` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b2f2d49` with `db.status` ok, and `e2e/one-shared-timeline.spec.ts` against production (`PLAYWRIGHT_BASE_URL`, chromium) passed 1 of 1 with 13 typed tones heard.

## One shared timeline

Branch `fix/one-shared-timeline` off `f4489cb`. UI only (Yellow), Wave 1 row 1a. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The pitch, the HUD, the ticker and the match sounds now read one timeline. `MatchPlayer` loads the canon movesets and hands its timeline to `Broadcast`, which no longer builds its own.
- Players no longer jump when the movesets finish loading. Open-play callouts draw from their own substream `broadcast:<seed>:<i>:callouts`, and every callout draws exactly one number. Before, 69 of 72 phases differed between the two timelines on the test fixture.
- The clock holds at kickoff until the movesets settle. A failed load falls back to generic callouts.
- Typed ability sounds (fire, water, electric, grass, ice, psychic) now play. In a live 390px replay at the `origin/main` build, 0 typed tones played. At the fix build, 13 did.

RED commit: `de664f4` (5 failing tests in `moves.test.ts`, `timeline.test.ts` and `MatchPlayer.movesets.test.tsx`).

Gates at `dd4f3e7`, before the rebase onto `65cc88b` that made it `2afec93`. The rebase added only the #71 docs, and `git diff dd4f3e7 2afec93 -- src e2e` is empty. Later commits change only docs:

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,319 passed in 145 files. A first full run failed 1 test in `src/components/run/__tests__/run.test.tsx` (a run survives a reload), which this PR does not touch. That file passed 30 of 30 on five isolated reruns, and the full chain then passed. Flaky under load, recorded here.
- Playwright on a fresh build of the fix code (`7832262`, now `d692806`; `dd4f3e7` adds only the spec and its screenshot): `one-shared-timeline`, `watch-live`, `manager-mode`, `recorded-saves`, `engine-v4`, `club-region-identity`, `mobile-targets` and `mobile-acceptance` gave 386 passed, 0 failed, 54 skipped. The new spec, pinned to the chromium project at `dd4f3e7`, passed 1 of 1.
- Browser proof: `docs/reports/one-shared-timeline/390-typed-callout.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

PR #71 (audits archive) merged as squash `65cc88b`, reviewed head `a3f04cf`, GLM 5.3 Flash APPROVE in round 2 with canary `audits-r2-8c7a787f937ec25ab33178b69b261f54` echoed. Hosted e2e failed once on `webkit-wheel` `wheel-results.spec.ts` "skip results stay in the windows" (the Tap to skip button detached while spinning, 813 passed, 1 failed) and passed on a rerun of the failed job with no new commit. Production `/api/health?db=1` then served `65cc88b` with `db.status` ok.

Scope, RED output and measurements are in `docs/decisions/one-shared-timeline.md`.

## Audits archive and program start (2026-10-17)

Branch `docs/audits-2026-10-17` off `f4489cb`. Docs only (Green). Audit A, Audit G, the program
brief and Audit A's 13 production screenshots now live in `docs/reports/audits-2026-10-17/`, with
SHA-256 hashes in its README and a `program-log.md` that gets one entry per wave. Decision log:
`docs/decisions/audits-2026-10-17.md`.

Previous PRs, now merged and live:

- PR #70 (matchday simulation overhaul): squash `40f3c92`, reviewed head `f20ab71`, GLM 5.3 Flash
  APPROVE with canary `matchday-sim-6823f5df8ab5673193a42648d59a1273` echoed (PR comment).
  `main` CI run 39011425527 green.
- PR #69 (draft picker over the pitch): squash `f4489cb`, head `ab62a1c`. The PR comments hold no
  reviewer receipt for that head, so its reviewer is unknown here. `main` CI run 39042707390
  green.
- Production `/api/health?db=1` serves `f4489cb63fedc131274248b14c00758378898ca3` on
  `pokedraft-engine-6`, token versions 1 to 6, `db.status` ok.

Gates at `6e08aaa`: `prettier --check STATE.md` passed, `pnpm check:mirrors` reported mirrors
identical, and the three Markdown copies hash equal to their sources. Unit tests, build and
Playwright: NOT RUN, because nothing under `src/`, `e2e/` or config changed. Hosted CI runs on the
PR.

## Draft picker over the pitch

Branch `fix/draft-picker-over-pitch` off `47ca844`, with `origin/main` at `40f3c92` (PR #70, matchday overhaul) merged in to clear a STATE.md conflict. UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The draft picker opens as a pop-up centered over the dimmed pitch at every width, desktop included, and closes after a pick. Choose a player reopens it.
- Each Squad First roll scrolls the pitch into view when its top is hidden. Before, each roll scrolled to the wheel in a fixed sheet, which left the page wherever the last slot tap put it. At 390x667 the pitch top sat at -263px from round 2.
- Position First rolls do not scroll.
- Below 480px the selection bar drops its Best, OK and Poor legend so it stays one row. Each slot already shows its fit. Hosted CI caught the wrapped bar pushing the pitch top to 355px of 667px.
- Dropped guarantees, because the pop-up covers the middle of the pitch: the slot being filled in Position First is hidden while the picker is open; drag to place only reaches slots outside the pop-up; tapping a placed player or the hub Sound button on a small phone needs the picker minimized first.

RED commits: `3c5e178` (pitch hidden after a pick, picker in flow in landscape) and `1c682de` (picker not centered, desktop not an overlay).

Gates at `77284ba` (later commits change only docs):

- Lint, typecheck, format check and build exited 0.
- Unit tests: 1,305 passed in 143 files.
- Playwright on a fresh build: 814 passed, 0 failed, 61 skipped.
- Round 1 at `eac1a26`: GLM 5.3 Flash APPROVE with the canary echoed, then hosted e2e failed 1 of 875 on the wrapped selection bar. `77284ba` fixes it, so that receipt is void.
- A physical phone check: NOT RUN.

Root cause, measurements and decisions are in `docs/decisions/draft-picker-over-pitch.md`.

## Matchday simulation, SVG soccer ball and broadcast UX overhaul

Branch `feat/matchday-sim-overhaul` off `47ca844` (PR #68 squash of the post-#67 live check). No file under `src/engine` changed.

- `buildTimeline` in `src/ui/matchday/timeline.ts` now builds deterministic 1.25-minute open-play phases (`plays`, seeded from `broadcast:<seed>:<matchIndex>:plays`) with possession chains, dribbles, passes, through-balls, crosses, supporting runners, pressing defenders, and open-play canon move callouts (`playCallout` in `src/ui/matchday/moves.ts`).
- `stagePitch` interpolates all 22 players smoothly across phase waypoints, stages goalkeeper tracking and dives, drives parabolic ball flight (`loft`, `spin`, `trail`), parries saved shots clear with `saveBall`, lines teams up for penalty shootouts, and freezes positions under reduced motion.
- `Broadcast.tsx` replaces the 10px white circle with a Telstar-style paneled SVG soccer ball (`soccer-ball-svg`) and ground shadow, adds full pitch markings (6-yard boxes, penalty spots and arcs, corner arcs, center spot), draws curved pass/shot/save trajectory trails (`pitch-trails`), shows active ball-carrier nameplates (`ball-carrier`), yellow-card pips (`pitch-card-<side>-<slot>`), directional sprite facing and running/casting/diving poses, and open-play ability bursts (`pitch-ability`).
- `MatchPlayer.tsx` mounts `Broadcast` in both `quick` and `live` views, adds a live tactical and momentum HUD (`match-hud`), adds a `Sound on` / `Sound off` toggle (`sound-toggle`) in the control bar, and triggers Web Audio SFX (`playWhistle`, `playKickPass`, `playAbilitySound`, `playSaveSound`, `playCardSound`, `playSubSound`, `playOppGoal`, `playGoalHorn`).
- `Touchline.tsx` adds `PlayerImage` sprites to the on-pitch energy list (`energy-slot-<slot>`), highlights tired players below 65 energy, and selects a player for substitution when their row is clicked.

RED commits: `0a675ac` (4 failing tests in `moves.test.ts` and `timeline.test.ts`) and `d3e94ae` (4 failing tests in `Broadcast.test.tsx`).

Local gates on the implementation commits:

- Lint, typecheck, build, format check, image seam, theme colors, theme contrast, theme CVD, and client bundle all exited 0.
- Unit tests: 1,313 passed of 1,313 in 144 files.
- Playwright (`e2e/manager-mode.spec.ts` and `e2e/watch-live.spec.ts`): 17 passed of 17 across chromium and pixel-7; `e2e/mobile-targets.spec.ts` and `e2e/mobile-acceptance.spec.ts` (`-g "matchday live touchline"`): 10 passed, 2 skipped across iphone-se, iphone-14 and pixel-7.
- Hosted CI, physical phone check, and the Sol review lane: NOT RUN at the time of writing.

Details and verbatim RED outputs are in `docs/decisions/matchday-sim-overhaul.md`, and updated screenshots are in `docs/reports/manager-mode/`. (Correction, Wave 3 summary: only the 1280 shots and `live-move-callout.png` were refreshed here. The three 360 px shots and `live-match-move-callout.gif` stayed from #62 until the Wave 3 summary re-shot them from production; audit finding B13.)

## Hand-off follow-up: production check after PRs #64 to #67

Production health after the #67 deploy serves `482299988485191e38f2768d6a37c00104f67c85` on `pokedraft-engine-6` with token versions 1 to 6. `/api/leaderboard` with `scope=all` answers 200 for `coach` all, uncoached and coached in both `cup8` and `kanto151`.

The live suite (`LIVE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test -c playwright.live.config.ts`) passed 3 of 4 before this PR. The daily verify-bot case submitted and found its row, then failed with `strict mode violation: getByTestId('board-row').filter({ hasText: 'verify-bot' }).getByRole('link') resolved to 2 elements`: board rows have carried a "Challenge this Seed" link since #50/#52, and hosted CI does not run `e2e-live`. The spec now reads the row's `/r/` share link. The three live runs (before, a single-test rerun, after) each submitted a verify-bot daily run to production, as the live check intends; the board shows one verify-bot row.

Section E product calls and the worktree cleanup are recorded in `docs/decisions/tooling-and-process.md`. Still NOT RUN: a physical phone check of manager mode and Live match (owner action), and the Sol review lane (no access).

## Matchday robustness (dispatch B)

Merged as PR #67 (squash `4822999`, reviewed head `3dcb28e`, GLM 5.3 Flash APPROVE in round 1 with the canary echoed; hosted check and e2e green on that head). Branch `feat/matchday-robustness` off `648cf2f`. No file under `src/engine` changed.

- A reload during the matchday now comes back at the same match with every touchline decision kept. The run snapshot gains a `matchday` screen whose token carries the decisions so far. This replaces the earlier "returns to the finished draft" behaviour.
- Each played match on the results page has Watch live. It lazy-loads the Live match broadcast for that match, and a pd5 link reaches the goals-only fallback.
- The start screen's manager mode and match view follow a change made in another tab.
- One formatter, `incidentText` in `src/ui/matchday/copy.ts`, serves both the ticker and the results. An opponent tactic at minute 0 reads "Kick off: Opp play Counter".
- A touchline decision costs a median 27.7 ms at a 4x CPU throttle in Chromium (15 samples, range 24.3 to 33.6 ms, worst cold decision 42.4 ms). That is under the 100 ms bar, so the synchronous replay stays.

RED commits: `223d3f6` (savedRun matchday restore), `b17be61` (opponent kickoff copy), `f8383bb` (cross-tab settings) and `08897fb` (Watch live browser test).

Local gates at `6866dc4` (the commits after it change only docs):

- Lint, typecheck, build, format check, image seam and client bundle all exited 0.
- Unit tests: 1,289 passed in 140 files.
- Playwright with `PLAYWRIGHT_PORT=3482 CI=1`: 811 passed, 0 failed, 61 skipped. By project: chromium 348 and 1, iphone-se 135 and 29, webkit-wheel 6 and 0, webkit-progress 6 and 0, iphone-14 173 and 3, pixel-7 143 and 28.
- Hosted CI, the independent review and a physical phone: NOT RUN.

Measurements, decisions and failing output for each RED are in `docs/decisions/matchday-robustness.md`.

## Tooling and process dispatch

Merged as PR #66 (squash `e5e71d0`, reviewed head `2f28559`, GLM 5.3 Flash APPROVE in round 2 after a coordinator fix to `strip-verdict.py`, with the canary echoed; hosted check and e2e green on that head). Branch `chore/tooling-and-process`. No file under `src/`
changed. `tools/review/review-packet.py` builds the GLM packet (`--out-dir`, repeatable
`--exclude`, clean-tree check) and `tools/review/strip-verdict.py` checks the reply for the
canary, the full head SHA and one verdict word. The overrides record Sol as an optional lane, GLM
5.3 Flash as the gate, and no silent model swaps. Playwright now picks a port from the checkout
path when `PLAYWRIGHT_PORT` is unset, the server it starts reports `git rev-parse HEAD` as its
health sha, and global setup fails when a reused server reports another commit (skipped in CI and
for deployments, warned when the server has no sha). Live-engine e2e pins (seeded records, the
mirror exhibition, the live token prefix, share-link regex and engine version) are generated into
`e2e/pins.ts` by `pnpm e2e:pins`, and a vitest guard fails when that file is stale. The hosted
timing audit of statistical suites found no test above 40% of its budget without a 60 s timeout,
so no timeout changed. Decisions, the timing table and the proof runs are in
`docs/decisions/tooling-and-process.md`.

Gates at `180bfe0` (later commits change only docs): lint, typecheck, build and mirrors exit
0; unit tests 1,287 of 1,287 in 141 files. Playwright on a fresh build with
`PLAYWRIGHT_PORT=3484 CI=1`, before and after the pin migration: 804 passed, 0 failed, 61 skipped
both times (chromium 343 and 1, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28,
webkit-wheel 6, webkit-progress 6). Hosted CI and the independent review: NOT RUN at the time of
writing.

## Coached SQL hardening

Merged as PR #65 (squash `e251199`, reviewed head `ad90c82`, GLM 5.3 Flash APPROVE in round 1 with the canary echoed; hosted check and e2e green on that head). Branch `fix/coached-sql-hardening` off `648cf2f`, dispatch C items 11 and 12; item 13 (a stored `coached` column) is deferred until a filtered view is measurably slow. `coachedSqlFor(versions)` builds the board's coached rule and throws at module load on any version that is not a positive integer, and `MANAGER_TOKEN_VERSIONS` is typed so such a value does not compile. `coachedSql` is now total: a hand-edited `pd6.` row reads uncoached instead of turning the Uncoached and Coached views into 503s. It screens the base64url alphabet and length, reads the bytes as LATIN1, and checks the JSON with `pg_input_is_valid` (PostgreSQL 16+; Neon reports 17) and `jsonb_typeof` before counting. `isCoached` now keeps a leading byte order mark so both rules reject it. Three tamper-only payloads (`\u0000` escape, lone surrogate, numeric overflow) still differ, without throwing, and a test pins them. Canonical tokens keep their verdict. RED commits: `04b6312` (version guard, 6 failing), `d51dab7` (malformed rows, 2 failing: a base64 error and two 503 views), `ce96eef` (BOM, 1 failing). Decisions and verbatim RED output are in `docs/decisions/coached-sql-hardening.md`.

Local gates at `ef6436d` (the commit after it changes only docs):

- `pnpm vitest run src/leaderboard`: 81 passed in 8 files. Lint, typecheck, build and format check exited 0. Unit tests: 1,294 passed of 1,294, in 140 files.
- The compiled `coachedSql` on a scratch PostgreSQL 16.14 cluster gave the same verdicts as the PGlite tests on 11 tokens, including 4,096-character nesting, without an error.
- Playwright on a fresh build with `PLAYWRIGHT_PORT=3483 CI=1`: 804 passed, 0 failed, 61 skipped. By project: chromium 343 passed and 1 skipped, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28, webkit-wheel 6 and 0, webkit-progress 6 and 0.
- Hosted CI and the independent review: NOT RUN at the time of writing.

## Engine comments and invariants

Merged as PR #64 (squash `56c41d4`, reviewed head `deee557`, GLM 5.3 Flash APPROVE in round 1
with the canary echoed; hosted check and e2e green on that head). Branch
`chore/engine-invariants-comments`, off `origin/main` at `648cf2f`. Section A of the 2026-10-16 hand-off. No runtime behaviour changes.
Comments in `src/engine/cup.ts`, `src/engine/match.ts`, `src/ui/manager/touchline.ts` and
`src/components/matchday/MatchdayFlow.tsx` record three rules. A clean sheet needs half of
regulation even in extra time. The vacancy multipliers also correct the original starter that
`refreshUserLines` re-inserts into a slot a red card emptied. Any manager decision switches the
auto coach off for the user side. A new case in `src/engine/__tests__/cup.test.ts` pins at most
one pre-match absence per match over 400 cups and fails on a local `[absence, absence]` mutation.
No golden moved and `src/engine/versions/v5` is untouched (provenance check exit 0). Local gates
are engine suite 273 of 273, goldens 7 of 7, and lint, typecheck, test (1284 of 1284 on the rerun
after one unrelated `announce-builder` flake), build and format check all exit 0. Playwright NOT
RUN because nothing at runtime changed. Details in `docs/decisions/engine-invariants-comments.md`.

## Manager mode UI and the Live match broadcast

Merged as PR #62 (squash `35b99cf`, reviewed head `c75187e`, GLM APPROVE in round 2 after the Coached filter moved server-side; hosted check and e2e green on that head). Production after the deploy: health serves `35b99cf` on engine 6; `/api/leaderboard` returns `coach` all, uncoached and coached views and 400 for an unknown value; `e2e/manager-mode.spec.ts` against the production URL passed 10 of 10 on chromium and pixel-7. Branch `feat/manager-mode-broadcast`, which merged `origin/main` at `6915a84` (engine 6). No file under `src/engine` changed. Two panel settings, `managerMode` (default off) and `matchView` (`quick` or `live`, default `quick`), sit on the home panel and on the `/play` and `/daily` start screens. With both at their defaults, See results goes straight to the results as before. Otherwise the cup plays match by match after the draft. In manager mode the touchline stops at kickoff, half time, the break before extra time and each user injury. Every decision is checked and then replayed through `runCup` (about 174 ms per call in node), and the finished token carries the manager list and replays from the share link. Live match is a lazy-loaded top-down broadcast with `PlayerImage` sprites and canon move callouts. Movesets load by dynamic import, and the choreography is seeded from `src/lib/rng.ts`. Results list match incidents. Leaderboard rows carry `coached`, derived at read time from the token with no column. Board rows show a Coached chip and an All / Uncoached / Coached filter that runs in SQL (`coach=` on `GET /api/leaderboard`, `coachedSql` mirrors `isCoached` over `MANAGER_TOKEN_VERSIONS`), so each view is its own top 50 ranked 1..n; the submit rank stays the overall board rank. A reload during the matchday returns to the finished draft. Decisions and limits are in `docs/decisions/manager-mode-broadcast.md`, and browser screenshots and a GIF are in `docs/reports/manager-mode/`. RED commit: `385bc84` (savedRun coached restore).

The engine 6 submit guard that refused coached tokens is removed with the marker. RED commit for that: the handler test that ranks a coached token (422 before the removal).

The board coach filter runs in SQL. RED commit: `c22bc59` (an Uncoached view cut short by 51 coached rows above it, `coachedSql` vs `isCoached` equivalence, and the manager token version list).

Local gates at `4c63850` (the commit after it changes only this file):

- Lint, typecheck, build, format check, mirrors, image seam, image packs, theme contrast, theme colors, theme CVD and client bundle all exited 0.
- Unit tests: 1,283 passed of 1,283, in 139 files.
- Playwright on a fresh build with `PLAYWRIGHT_PORT=3471 CI=1`: 792 passed, 0 failed, 61 skipped. By project: chromium 343 passed and 1 skipped, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28. The manager-mode spec passed 5 of 5 on chromium and 5 of 5 on pixel-7.
- Hosted CI, the independent review and the webkit projects: NOT RUN.

## Engine 6: manager mode engine candidate

Live engine `pokedraft-engine-6`, run token v6 (`pd6`). Engine 5 is frozen in `src/engine/versions/v5` (digest `cd69715e…4ede`), so every pd1 to pd5 link replays on its own engine; retained token versions are 1 to 5. Matches play in 5-minute windows (18 in regulation, 6 in extra time) with five tactics (balanced, attack, defend, press, counter) and style edges, fatigue from STA, user-side injuries with substitutions (up to 5), yellow, second-yellow and straight red cards, and an auto coach for anything the player does not decide. The Boss Club picks its own tactics and rotates tired legs. Coach decisions are optional in the token (`manager`, omitted when empty). A decision at minute m never changes anything at or before m (`src/engine/__tests__/manager.test.ts`). Played matches carry `incidents` and `windows` for the touchline and broadcast. Coached and uncoached runs share boards. The submit handler rejected coached tokens with `ILLEGAL_ACTION` until the manager UI shipped the Coached marker and filter; that guard was removed with the marker (rationale and the measured replay advantage in `docs/decisions/engine-6-manager.md`). Calibration against frozen engine 5 on the same bot squads: strong squads unchanged (cup8 good-bot win rate 0.850 vs 0.852), weak squads up about 3 points from bench role fit; about 3.3 yellows, 0.17 reds and 0.25 injuries a match. Scouting queue items 6, 10, 11 and the KIC positive control are closed: Jigglypuff and Wigglytuff no longer list GK as a best role, and `scouting.json` changed only on rows 39, 40, 95 and 497. Two link bugs found on the way are fixed with RED guards: pd5 share links would have 404ed under pd6 in `src/proxy.ts`, and pd5 runs had lost their Challenge button and board squad preview since #52. Merged as PR #61 (squash `6915a84`, reviewed head `1791257`, GLM APPROVE in round 3 after a hosted timeout fix on the scorer-role suite; hosted check and e2e green). Production health after the deploy: sha `6915a84`, engine `pokedraft-engine-6`, token versions 1 to 6, and a pd5 share link returns 200 and renders its record. The Sol cross-vendor review was NOT RUN: the Codex login does not support that model.

## Cleanup and debt dispatch

Rate-limit tables are now bounded. Each admission statement also deletes up to 50 `rate_limit_events` rows older than 7 days and up to 50 `rate_limit_buckets` rows idle for more than 1 day, never the key it admits. It stays one statement and one round trip. The candidate selects use `FOR UPDATE SKIP LOCKED`. On a scratch PostgreSQL 16 cluster, 240 concurrent statements had 0 deadlocks, against 130 for the unlocked shape. Rule windows longer than the 1-day idle cutoff throw. The announce-board focus flake was a stale error effect consuming the retry flag; it is fixed with a deterministic guard. Inter is self-hosted through `next/font/local` with Google's exact 7 subset files, unicode ranges and fallback metrics, so the build no longer fetches fonts. The WebKit cold-start flakes were all `waitForHydration` hitting `expect.poll`'s default 5 s; that wait now has a 30 s deadline. `pnpm format:check` passes. `drizzle/meta` and `src/design/tokens.css` are ignored, not reformatted. Local gates at `8ad5b24`: lint, typecheck, 1,122 unit tests in 124 files, build, format check, mirrors, and the Chromium e2e project (333 passed, 1 skipped). Merged through PR #60 after GLM APPROVE on head `61a3ad1` (hosted check and e2e green there) and a round-2 review of the merge-from-main head. See `docs/decisions/cleanup-debt.md`.

## Canon movesets artifact

`src/data/movesets.json` holds up to 4 canon signature moves and a `keeperMove` for each of the 1,025 species, built by `pnpm data:movesets` from the pinned PokéAPI CSVs (three new inputs pinned in `src/data/movesets.sources.json`). It is presentation-only for the future match broadcast: nothing in `src/engine` or `src/scouting` reads it, and `pokedex.json` and `scouting.json` rebuild unchanged. Moves come first from each species' debut level-up set (Charizard gets Flamethrower, Blastoise gets Water Gun and Hydro Pump). `keeperMove` prefers the debut group too, and Protect is still 889 of 1,025 species. `movesetFor(speciesId)` in `src/data/movesets.ts` is the accessor. The file is 139,510 bytes (19,043 gzip) and no client component imports it yet. The selection rule, hashes and spot checks are in `docs/decisions/canon-movesets.md`. Merged as PR #58 (squash `1306dc9`, reviewed head `1547c9a`, GLM APPROVE in round 2; hosted check and e2e green).

## Two-leg exhibitions and lifetime history

Merged as PR #59 (squash `5e5920f`, reviewed head `9aa8f6e`, GLM APPROVE in round 2 after the gates were re-run on the exact head; hosted check and e2e green). Branch `feat/two-leg-and-lifetime-history` off `6053928`. Decisions and evidence are in `docs/decisions/two-leg-and-lifetime-history.md`. The exhibition modal offers One match (default, byte-identical to before) or Two legs, decided on aggregate with no away goals rule. A level aggregate goes to extra time and penalties in leg 2. Lifetime totals live under `pokedraft:lifetime:v1`, count each run once by hashed token, backfill once from the retained history (labelled in the UI), and feed the formation win rate. The history page can download a versioned backup and restore one with Zod validation and a non double-counting merge. No engine file changed. RED commits: `087368c` (exhibition, 3 failing tests plus 1 file that failed to import) and `dd8ec36` (lifetime, 4 files that failed to import). Local gates on `18fab55`: lint, typecheck, test (1,151 tests in 127 files), build and `check:mirrors` exited 0. `format:check` exited 1 on 24 files that main already fails, and no file this branch touches is among them except STATE.md, which was reformatted in this commit. Playwright chromium: 336 passed, 1 skipped, 1 failed (`theme-type.spec.ts` 1440 light, a Builder font-size probe outside this change, which passed 4 of 4 when rerun alone). Playwright iphone-se: 129 passed, 27 skipped, including the new two-leg exhibition scene. Other phone projects and hosted CI: NOT RUN at the time of writing.

## Submission attempts correction

Rejected leaderboard submissions no longer spend one of the 10 hourly attempts per IP. Only a submission admitted to the server replay counts, including one whose replay fails. This deliberately reverses the Dispatch 5 rule that every attempt counts; the reasoning and the full table are in `docs/decisions/submission-attempts.md`. Players with a page open across an engine release now get the reload prompt without losing an attempt. Before this change, 4 empty-body production probes during the engine 5 release each recorded a `submit` event.

Submission attempts correction receipt. PR [#57](https://github.com/pnascimento9596/pokedraft/pull/57) merged at 2026-10-16T15:08:33Z. The reviewed head is `30c3db03ce35401a1ba6e15e04d547d1684ad5f0` and the squash is `6053928df8e5b1b4f6b39bbb861cb9684175dbe7`. GLM 5.3 Flash approved with canary `attempts-6e626796dbf07cfa4b944f7a6d40f55c`. Hosted run 38918007179 was green. Production health showed `6053928` at 15:09:12Z. In the production probe, `submit` events stayed at 8 before and after an empty body (400), a malformed token (422) and a stale engine version (409).

## October 16 engine 5 release receipt

PR [#55](https://github.com/pnascimento9596/pokedraft/pull/55) merged on October 16 at 05:38:11 UTC. The reviewed head is `d8c84035d0a80472aa193d31a6067f1c8786ff55`; the squash is `90613cac1509c4f4cb53059f16674ffa0cb7eba3`. GLM 5.3 Flash approved the first head `2331ae7` (canary `engine5-saves-6a4ef051678d95a1df5039e0db4763f0`). Hosted e2e on that head (run 38852708452) failed 18 phone tap-target cases because the new "Recorded saves" summary was 22px tall. `d8c8403` gives it a 44px target, and GLM approved that exact head (canary `engine5-saves-r2-2de5319c6b9b467688cdf24f7ca94394`). Locally on `d8c8403`, the serialized gates exited 0 (format warnings identical to main), 1,107 unit tests in 123 files passed, 7 emitted retained replays passed, emitted retained JSON stayed 3 copies and 2,088,694 bytes, and all Playwright projects passed 759 with 55 skips. Hosted run 38854566812 passed e2e. Its first `check` attempt failed while Turbopack resolved the Google font (`next/font/google queries have exactly one entry`), and the rerun of that job passed with no code change. Cache-busted production health returned HTTP 200, `Cache-Control: no-store`, this squash, engine 5 and token versions 1 through 5 at 05:39:01 UTC. Five Chromium checks passed against production: recorded saves in results and matchday at 320 and 1280px, no save list on a retained engine-4 link, and club regions at both widths. A pd5 submission for nickname `e5proof1016` on 2026-10-16 returned 201 (Team Score 538, 4-0-1, engine 5), its retry returned 200 for the same row, the board listed it, and `db:delete-entry` removed exactly that row.

## Opponent completion dispatch

Engine 5 records named goalkeeper saves, and every opponent club shows a verified city region. Engine 4 is frozen in `src/engine/versions/v4` (bundle digest `dc448ff8…abbfb`), and `pd4.` links replay it with no save list. Raw v4 replays of the engine-4 golden tokens hash to the shipped engine-4 digests. A recorded save classifies a chance trial that did not score: it is drawn from a per-side `save_events` substream, never prevents a goal, and never changes a score. Keeper strength already lowers the goal rate through the GK line. A failed penalty is not a save. `ON_TARGET_SHARE = 0.15` is a design parameter for save volume, not a real-world calibration; a 400-match probe measured 2.71 saves per keeper per match. With saves and the version string removed, 40 paired CI runs and a 1,000-run local campaign match the frozen v4 bundle exactly. The results UI states beside each save list that saves never change the result. Club regions are presentation only, with sources in `docs/dispatches/club-region-identity.md`. Release evidence is in the engine 5 release receipt above. See `docs/decisions/opponent-completion.md`.

## October 16 platform infrastructure release and production cutover receipt

PR [#53](https://github.com/pnascimento9596/pokedraft/pull/53) merged on October 16 at 04:27:01 UTC. The reviewed head is `8d0d146fdd9d1aebaa5738b848e548716e3a7b8d`; the squash is `f592272f3a222e8b4cf96565d9ddbae703ad21d5`, and its tree is identical to the reviewed head. GLM 5.3 Flash approved that exact head with canary `infra-merge2-28d13f3001cc39d5f2c0d573f3969096`, and hosted check, e2e and Vercel passed on it. On the Neon `preview` branch, rollback dropped migration 0003 and its bucket table, and migrate restored both. A Preview HTTP proof then returned 201 for a fresh submission and 200 for its retry with one event, and deleted only its own row.

The production cutover ran under the documented protocol. At 04:16:02 UTC two production firewall rules were published: `pd-admission-host-fence` denied admission POSTs (`/api/leaderboard`, `/gate/unlock`, with or without a trailing slash) on every host except the three stable aliases, and `pd-cutover-pause` denied them everywhere without the coordinator header. Edge 403 was verified on all three aliases, all four paths, the current and previous immutable deployments, and through authenticated `vercel curl`; health stayed 200. After a drain past 300 seconds, aggregate `pg_stat_activity` showed one idle client backend and no active admission queries. The Neon main branch `br-morning-snow-b7dn8iy8` held 3 migrations (latest `1791990000000`), no bucket table, 2 entries and 2 events. `pnpm db:migrate` recorded 4 migrations (latest `1792066817368`) with the bucket table present and counts unchanged. Health served the squash at 04:27:38 UTC on deployment `dpl_7MkzZ5XTi8JeL4hkUqhyjpV7NkoB`. The project skew boundary moved from null to that deployment's creation time `1792124823738`, and old pins by query, header and cookie all served the new SHA. A coordinator smoke on the stable alias returned 403 without the header, then 201 and a 200 retry for nickname `prodproof1016` on 2026-10-16 (Team Score 299, 0-2-1, engine 4). One row and one submit event were added, the board listed it, and `db:delete-entry` removed exactly that row. The pause rule was removed at 04:32:37 UTC. At 04:46:19 UTC the host fence was loosened from an allowlist of the three aliases to a deny pattern for immutable deployment URLs only, so submissions work from any alias and any future custom domain. Alias POSTs reach the application, and current and old immutable deployment POSTs stay denied. See the host fence section of `docs/decisions/platform-infrastructure-completion.md`. The local coordinator secret was deleted. Production credential rotation was not performed.

## Leaderboard row alignment correction

Hosted e2e failed `leaderboard-font-cls` at 412px in both themes on PR #53 (run 38830215286, twice) and earlier on `50af55a`. Main `88dcbae` fails the same 2 of 4 cases in the `mcr.microsoft.com/playwright:v1.64.0-noble` image. There, "Squad preview unavailable." fits one line in the Liberation Sans fallback and needs two in Inter, so the vertically centred rank, record and Team Score dropped 9px (layout shift 0.000208) when Inter arrived. macOS fallback metrics wrap like Inter, so local runs passed. Hosted passes depended on whether Inter loaded before the row painted. The board row now top-aligns its columns. A RED guard that grows the middle column failed at 360, 412 and 1280px before the fix. After it, the Linux image passed `leaderboard-font-cls` plus `leaderboard-cls` 13 of 13 in three consecutive runs, and local Chromium passed 328 browser tests with 1 skip, 1,039 unit tests, lint, typecheck, build, theme colors and mirrors. WebKit locally: NOT RUN; hosted CI covers it.

## October 15 engine release receipt

PR [#51](https://github.com/pnascimento9596/pokedraft/pull/51) merged on October 15 at 18:07:36 UTC. The reviewed head is `4b7439ca2cff41aa6211df9cd7a7a2fb565673d3`; the squash is `6218750ea2c9896e469b1496d5d20691b4b78d6f`. Hosted checks passed with 1,003 unit tests and 732 browser tests plus 55 skips. Cache-busted production health verified this exact squash at 18:08:36 UTC with HTTP 200, `Cache-Control: no-store`, engine 4, and token versions 1 through 4. Vercel deployment `dpl_GHSGZTdQ73mA2u7UiXDVGg1218yU` is READY in production. The landing owner completed 21 production browser checks against this exact squash, including retained/current replay and malformed-link contracts. The platform experience candidate is rebased onto this squash and preserves the final engine browser fixture repairs.

## October 15 platform experience release receipt

PR [#52](https://github.com/pnascimento9596/pokedraft/pull/52) merged on October 16 at 00:13:40 UTC. The reviewed head is `40723142cd9bdea99b16bbc4ece93de407a2f2c0`; the squash is `88dcbaef39b0aebc0f917f5127b666d711b657ce`. GLM 5.3 Flash approved that exact head with canary `experience-ci-repair-3f0f21419367f37b57cbaf729e7cc914`. Hosted run 38825262768 passed 1,039 unit tests in 117 files and 747 browser tests with 55 skips and 4 flaky retries. The four flaky cases are the `draft-flow.spec.ts` WebKit 375 and 390 px cold-start cases; the same four retried on main run 38783031946 before this PR, and this PR does not touch that file. Cache-busted production health returned HTTP 200, `Cache-Control: no-store`, this exact squash, engine 4, token versions 1 through 4, and `db.status=ok`. Thirty-seven read-only Chromium checks passed against production in 18.0 seconds, covering Boss XI and shootout identities, retained v1 to v3 replays, query and gate share previews, platform experience flows, history controls, and 15 malformed version 1 to 4 links answering 404.

### Platform experience candidate history

The second dispatch completes draft/scouting feedback, filled tactical slot labels, chemistry reason filters, actual swap comparisons, all-squad scouting, local formation win rates and the 1,025-species Hall of Fame, known-squad social previews, and recorded exhibition highlights. Historical records without squad metadata remain explicitly unknown. The first PR #52 hosted browser run failed with 716 passes, 30 failures, and 55 skips. The repaired candidate passes 1,039 unit tests in 117 files, lint, typecheck, production build, seam/mirror/theme checks, 85 focused browser cases, and a subsequent 83-case phone target/history selection. The browser selections overlap. Earlier 249-pass mobile results precede these repairs. Root causes, RED guards, exact logs, and limits are recorded in `docs/decisions/platform-experience-completion.md`. The release receipt above supersedes the pending review, CI, and deployment status recorded here.

| Field                                                                                     | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel linked                                                                             | **yes.** Merge = ship. Project `pokedraft` (`prj_GfNWnE8gbjY2YXOPOWszq7vxGOnL`, team `pnascimento9596s-projects`, Hobby, Git-linked to `main`). Production URL `https://pokedraft-woad.vercel.app`, first deploy `dpl_ARD2HPXQ1GY73ZEzeY3bkuFAEtxK` at `fb3c18e6d77f4b3495864275f27e4e7da73d23b2`. Env var names: `DATABASE_URL` (Production: Neon pooled main branch; Preview: pooled `preview` branch), `IP_HASH_SECRET` (Production, Preview; separate values)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | dispatch 4 GATE 5; `docs/decisions/dispatch-4.md`                                                                                                                                  |
| Database                                                                                  | Neon project `summer-lab-87419384`, production main `br-morning-snow-b7dn8iy8`. PR #50 recorded migration `0002_alltime_board_idx` and DB smoke PASS. No production schema change in this engine dispatch; fresh production migration smoke is NOT RUN here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October15 completion gates                                                                                                                                                         |
| Species in `pokedex.json`                                                                 | 1025                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `jq length src/data/pokedex.json`; PokéAPI CSVs pinned at c80757193bd0889054e36f4209762360bdaa4b95                                                                                 |
| `scouting.json` sha256                                                                    | 5f4b34e37a1fa78c1c4dafe65cc3dafce5e0532f8f982474898a7187ebe4d74d (dispatch 6 PR 6B: keeper frame term on DIV and HAN, serpent height read as body length unless the body levitates, Layer 2 reconciled; was 5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775, now frozen in the v1 bundle)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `shasum -a 256 src/data/scouting.json`                                                                                                                                             |
| Sanity panel                                                                              | 42 of 42 pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `pnpm vitest run src/scouting/__tests__/panel.test.ts`                                                                                                                             |
| `type-chart.json` sha256                                                                  | acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `shasum -a 256 src/data/type-chart.json`; PokéAPI `type_efficacy.csv` at the pinned commit                                                                                         |
| Engine version                                                                            | Production `pokedraft-engine-4`, current token `pd4.`, verified at PR #51 squash `6218750ea2c9896e469b1496d5d20691b4b78d6f`. See the exact deployment receipt above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | October 15 completion evidence and executable guards                                                                                                                               |
| Retained engine bundles                                                                   | Frozen v1/v2/v3 remain byte-pinned. Version-aware adapters preserve v3 contribution and coin metadata and retain v1/v2 decree semantics. Only the requested retained bundle loads. See `src/engine/versions/__tests__/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | October 15 completion evidence and executable guards                                                                                                                               |
| Engine goldens                                                                            | Engine 4 cup8 593 / 3-0-2 / R16; Kanto 480 / 0-3-0 / group. Current replay hashes are literal in `src/engine/__tests__/goldens.test.ts`. Frozen v3 replay remains unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October 15 completion evidence and executable guards                                                                                                                               |
| Calibration (N 5,000 per row and bot, 0 errors)                                           | Engine 4, 90,000 cups, F=985. 840 bucket 288/8667 flawless, 6.09 mean wins; 900 982/8070; 950 6076/20194. All established probability targets fall within Wilson intervals. See `docs/reports/engine-v4-calibration.md` for fresh final evidence and preserved baseline candidates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | October 15 completion evidence and executable guards                                                                                                                               |
| Golden Boot by role (report only)                                                         | Fresh engine4 160000 cups,5000 per formation/bot/mode. Largest combined defensive-role share9.60% cup8 and9.64% kanto151; measured cells below10%, Wilson intervals cross10%. See `docs/reports/engine-v4-boot.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | October15 completion gates                                                                                                                                                         |
| UI routes                                                                                 | `/` (home and builder), `/play` (challenge run), `/daily` (today's New York seed, cup8 Open), `/leaderboard` (daily and all-time, per mode), `/r/[token]` (shared run plus OG image, one replay per request), `/card` (1200x630 PNG, same satori renderer as OG), `/history`, `/how-to-play`, `/gate` (friends passcode, off unless `FRIENDS_PASSCODE` is set)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `src/app/`                                                                                                                                                                         |
| API                                                                                       | `POST /api/leaderboard` (server replay, typed 4xx codes, 10 per IP per hour, counting only submissions admitted to the replay (pre-database rejections, stale engine versions, duplicate tokens and taken daily nicknames spend nothing; see `docs/decisions/submission-attempts.md`); submit stores the canonical token re-encoding; retrying an accepted (token, nickname) returns the saved row without spending an attempt; rank may be `null` after a saved insert), `POST /gate/unlock` (10 attempts per IP per 15 minutes), `GET /api/leaderboard?mode=&scope=daily\|all&date=` (top 50, read-only). Server errors log one JSON line (request id, no personal data); 503s carry `x-request-id`. Baseline security headers plus report-only CSP with `/api/csp-report` sink; valid-token `/card` and share images cache a day in browsers, a year on the CDN                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/leaderboard/contract.ts`, `src/leaderboard/server/handlers.ts`, `src/observability/log.ts`, `next.config.ts`                                                                  |
| Indexing                                                                                  | noindex, nofollow metadata, `X-Robots-Tag` on every response, robots.txt disallows `*` and allows link-preview bots, no sitemap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/app/robots.ts`, `next.config.ts`                                                                                                                                              |
| Unit and component tests                                                                  | Latest complete engine dispatch run: 1003 passed in 111 files. Additional focused data-free schedule extraction: 21 passed in 3 files. Exact final gates are recorded in the dispatch completion report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | October 15 completion evidence and executable guards                                                                                                                               |
| Playwright                                                                                | Engine completion selection56passed,1project-scoped skip, including malformed versions1through4,320/1280rosters and shootout names,retainedv3contribution,data-split,results,a11y,persistence. Physicaldevice proof NOT RUN.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October15 completion gates                                                                                                                                                         |
| Image seam guard                                                                          | `PlayerImage.tsx` and its pure half `PlayerPicture.tsx` are the only files under `src/` allowed `<img`, `next/image`, `background-image` or `url(`; runs in CI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `pnpm check:image-seam`                                                                                                                                                            |
| Image packs                                                                               | `pokeapi-pixel` (default, 96x96 PNG, 4.0 MB) and `pokeapi-art` (256 px WebP, 13 MB), each 1025 of 1025 Dex ids, from `PokeAPI/sprites` @ `35fdbe9bdec8f519f882c3edc3c0185f08af4d86`. Credit and license are in each `pack.json`; `src/data/image-packs.json` is generated. The card re-encodes WebP to PNG with `sharp` (now a runtime dependency)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `pnpm check:image-packs`; `docs/reports/image-pack-*.md`                                                                                                                           |
| Lighthouse (local production build, mobile preset, simulated throttling, dispatch 5 PR B) | `/` Performance 88, LCP 3.8 s (over 2.5 s; the 1.33 MB `pokedex.json` plus `scouting.json` chunk, deferred); `/play` 96, LCP 2.6 s; `/leaderboard` 96, LCP 2.6 s (one run 4.4 s, 83); CLS 0 to 0.028; TBT 70 to 150 ms; Accessibility 100; Best Practices 100 (96 on `/leaderboard` locally, expected 503 with no database); SEO 63 (`is-crawlable`, intentional noindex). Production numbers for this PR are measured after deploy and recorded in the PR, not here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `docs/reports/finish-qa.md`                                                                                                                                                        |
| Ratings notes                                                                             | 20 seeded drafts, 7 oddities logged; re-run on engine-1, engine-2 and engine-3 with a before/after table (oddities 1, 4, 5 and 7 addressed in dispatch 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `docs/reports/finish-ratings-notes.md`; `scripts/calibration/play-seeded.mts`                                                                                                      |
| Road to the Final                                                                         | shows this run's exact opponents. `RoadStrip` takes the run's seed and mode, calls `buildLadder(seed, mode)` and prints each round's rating; a screen reader hears the round, the opponent's name and the rating. The draft screen always has the run's seed. On the start screen the seed is known for the Daily (today's seed) and for a shared `seed=` link; a fresh run draws its seed at Start, so until then the bars follow the shape of the coefficient table's ladder, no rating is printed, and the caption reads "Your opponents are set the moment you start the run." No nominal or approximate number is shown anywhere. Unit tests pin the eight names and ratings for seed `golden-1`, the start and draft screens for a shared link, a fresh run and the Daily, and the strip against the cup the same run plays. Checked in WebKit and Chromium at 390, 360 and 320 px in both themes: no overflow, start-screen layout shift 0.000 in 3 runs each (fresh, Daily, shared link), strip height 160 px with and without ratings; proof in `docs/reports/dispatch-7-pr-7a-proof/`. On a builder pitch under 800 px the token pill shows the number alone (a two-line pill overlapped tokens) and one line under the pitch reads "Ratings are 0 to 100, vs other players in the same role." | `src/components/run/RoadStrip.tsx`, `PlayScreen.tsx`, `DraftBoard.tsx`; `src/components/run/__tests__/RoadStrip.test.tsx`, `run.test.tsx`; `docs/queue/engine-followups.md` item 1 |
| Platform audit (dispatch 7)                                                               | Baseline on `928e4b1`: production Lighthouse mobile on a GitHub-hosted runner, LCP median 1.7 to 3.8 s (over 2.5 s on `/play`, `/daily`, `/leaderboard`, `/r/<token>`), CLS 0.211 on `/r/<token>` and 0.046 on `/daily`, Accessibility 100. Findings: 0 S1, 56 S2 (each assigned to a fix PR), 137 S3 (135 deferred, 2 frozen)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `docs/reports/audit-baseline.md`, `docs/reports/platform-audit.md`, `docs/queue/dispatch-7-deferred.md`, `docs/decisions/dispatch-7.md`                                            |
| Data split (dispatch 7 PR 7I)                                                             | The 1.32 MB species chunk (`pokedex.json` + `scouting.json` in one hashed JS file) loads on demand, never with cold `/`, `/play` or `/daily`: proven by `e2e/data-split.spec.ts` (chunk absence before load, fetch on first use). `src/ui/lineup.ts`, `src/engine/formations.ts` (via `src/engine/roles.ts`), `RoadStrip`, `Pitch` (via `speciesOf`), `Builder`/`HomeScreen`/`PlayScreen` shells are data-free; the builder engine (`src/components/builder/live.ts`), `LiveRun`, `ResultsView`, `swapMessage` (`src/ui/swap-message.ts`) and token helpers (`src/ui/builder-token.ts`) load with `import()` at first use or idle. Engine output unchanged (goldens green). Lighthouse + start-to-wheel timing measured on the PR's Preview deployment vs production; numbers in the PR body.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `e2e/data-split.spec.ts`, `pnpm build`                                                                                                                                             |
| Last reviewer                                                                             | GLM 5.3 Flash (`glm-5.3-flash:cloud --think high`), dispatch 8 PR #25 APPROVE on `2eda683327f9ff7cd08cdf05b7f7e1211497b2b0`, squash `56b9f754d88388223725ad2f3512f239b18fd229`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PR #25 review receipt and Linux CI `38129942178`                                                                                                                                   |
| Health and theme measurements (dispatch 8 PR 8.0)                                         | `GET /api/health`: build SHA, env, region, engine and supported token versions; dynamic and no-store, public through the passcode gate. No database access unless `?db=1`, then read-only connectivity with neutral 503 on failure. `theme-measurement.yml` manually runs three Lighthouse mobile production audits per route on GitHub-hosted Ubuntu and records medians plus raw reports. Production health proved merge `56b9f754d88388223725ad2f3512f239b18fd229`; live 4 passed and mobile 242 passed/46 skipped. Baseline Lighthouse run `38130597740` completed with three runs per route, Accessibility 100 and CLS 0 medians.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `src/app/api/health/route.ts`, `.github/workflows/theme-measurement.yml`, `docs/decisions/dispatch-8.md`                                                                           |
| Warm theme foundation (dispatch 8 PR 8A)                                                  | Inter, exact source tokens plus documented game roles, nine primitives, shared nav icon registry, contrast/color/CVD CI gates and 44 visual/axe cases with platform-specific references. Local unit suite 734/80 and foundation browser suite 102/102 passed. PR #26 reviewed head89b390f and mergee8ce2d3: Linux CI38148882020 passed734 unit tests and488 browser cases/51 skips; production live4 and unchanged mobile242/46 passed; HTML/network proves Inter alone. Font-change Lighthouse38150015655 passed: three runs per route, Accessibility100 and CLS0 in every sample; medians archived. Page structure restyles remain scheduled for PRs 8B through 8F.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `docs/design/tokens.md`, `docs/decisions/dispatch-8.md`                                                                                                                            |
| Challenge ratings setting                                                                 | Home Settings has a second switch, "Show ratings (challenges)", default off, stored as `showChallengeRatings` in `pokedraft:panel`. On, the 8-0, 151 and Daily draft screens show each offered player's rating (rated at the committed slot's role, else "Best: ROLE"), each placed player's pitch pill and one legend line; off renders nothing extra. Display only and client-local: engine, token, scoring, leaderboard and DB unchanged. One `ratingFor` (`src/ui/rating.ts`) now feeds the builder picker, the builder token pill and the draft board. The ranked board cannot tell sighted from blind runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `src/ui/rating.ts`, `src/components/run/DraftBoard.tsx`, `docs/decisions/challenge-ratings.md`, `e2e/challenge-ratings.spec.ts`                                                    |
| Silph Stadium UI                                                                          | UI-only 3D pitch, authentic type/card presentation, dugout, scrollable mobile hub/drawers and bare `/play` lobby. Parent verification passed lint, typecheck, 864 units in 93 files, build, palette/contrast/CVD, image/bundle/mirror guards, and full Playwright 671 passed / 55 conditional skips / zero failures. Default-open mobile settings precede the pitch and Formation is visible on the first screen; existing confirmation and customization contracts are retained. All 163 protected paths match base hashes. Nine immutable before captures and 34 final captures under `output/silph-stadium/`. Partial chemistry remains unavailable through the frozen engine API. Exact-head independent review, remote CI and shipping pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `docs/decisions/silph-stadium.md`, `decisions.tsv`                                                                                                                                 |
| Mobile draft flow                                                                         | Narrow UI follow-up. Phone wheel scrolls into view once per active roll; draft-only pitch is 620px; empty/armed positions have one solid frame; committed slot has distinct 3px outline ring; compact picker and rerolls use normal page flow without nested scrolling or bench overlap. Full validation and review 2 in progress.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `docs/decisions/mobile-draft-flow.md`, `e2e/draft-flow.spec.ts`                                                                                                                    |
| Platform overhaul (waves 1 to 4)                                                          | PR #50 merged and production health verified at `c87e5a8a6c4fd3e160786edd79e37776b626e0d2`. Engine/replay completion is this dispatch; draft/scouting/career and platform admission/dedup follow as separate reviewed dispatches under the user-approved full roadmap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | October 15 completion evidence and executable guards                                                                                                                               |

## NOT RUN

What the repo's own records say was not run or not measured, copied from those records, and what dispatch 7 PR 7A could not run. A line here is not a pass. When a check is run, its result replaces the line.

### Recorded by dispatch 5

From `docs/reports/finish-qa.md`, run on 2026-10-10 against a local production build and the production baseline at the PR A deploy (`32e966b`), before that PR merged. The file says: "The post-deploy production run is part of the live verification after merge and is not recorded in this file."

| Not run                                                                                                                                   | As recorded                                                                                                                                                                                                                                                                   | Source                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Browser drag-and-drop of tokens, including touch-emulated drag swap on a phone-sized viewport (F2), and manual reroll in the browser (F7) | "Roll identity is therefore guarded by a unit test only." F2: "no manual drag in a real browser this dispatch"                                                                                                                                                                | `docs/reports/finish-qa.md` lines 84, 88, 178 |
| A whole draft operated by keyboard alone (A1)                                                                                             | "Operating a whole draft by keyboard alone was not done"                                                                                                                                                                                                                      | `docs/reports/finish-qa.md` lines 105, 179    |
| Daily submit and a real leaderboard row (F10)                                                                                             | "needs the database; e2e stubs the API. The live suite after deploy covers submit and the board row"                                                                                                                                                                          | `docs/reports/finish-qa.md` lines 91, 180     |
| Gate unlock and throttle (F14)                                                                                                            | "Unlock and throttle were not exercised in this dispatch (dispatch 4 tests cover them)"                                                                                                                                                                                       | `docs/reports/finish-qa.md` lines 95, 181     |
| `role="alert"` errors on submit and gate (A7)                                                                                             | "`role="alert"` on submit and gate errors was not exercised in a browser"                                                                                                                                                                                                     | `docs/reports/finish-qa.md` lines 111, 181    |
| 44 px tap-target measurement                                                                                                              | "Tap-target size (44 px): NOT RUN, so the viewport row is not a full pass."                                                                                                                                                                                                   | `docs/reports/finish-qa.md` lines 99, 182     |
| Lighthouse on production for this PR                                                                                                      | "(after deploy)"                                                                                                                                                                                                                                                              | `docs/reports/finish-qa.md` line 183          |
| A missing-id end-to-end test (W1)                                                                                                         | "NOT DONE as an end-to-end test. Both packs cover 1025 of 1025 Dex ids, so no real route can render a missing id. The blank fallback for a missing id is covered by `PlayerImage.test.tsx`; the e2e image-error test covers the same blank footprint through a failing image" | `docs/reports/finish-qa.md` lines 165, 184    |
| The production baseline column for F2, F3, F4, F5 and F6, F7, F8, F10, F13 and F14                                                        | "NOT RUN"                                                                                                                                                                                                                                                                     | `docs/reports/finish-qa.md` lines 84 to 95    |
| Text over gradients or images (the pitch, the hero) under axe (A4)                                                                        | "axe cannot evaluate text over gradients or images (the pitch, the hero), so those spots are unverified"                                                                                                                                                                      | `docs/reports/finish-qa.md` line 108          |

From `docs/decisions/dispatch-5.md`:

| Not measured                                                                             | As recorded                                                                                                                                                                                           | Source                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Whether a cold connection shows an unloaded face in the first frames of the wheel's spin | "NOT MEASURED: whether a cold connection shows an unloaded face in the first frames of the spin"                                                                                                      | `docs/decisions/dispatch-5.md` line 58 |
| The fallback font's metrics (`Big Shoulders Fallback`)                                   | "The numbers are computed in the CSS comment from Next's bundled capsize metrics for Big Shoulders Display at weight 800 against Arial Bold; they are NOT measured from the font file the site loads" | `docs/decisions/dispatch-5.md` line 77 |
| The pack credit with scripting disabled                                                  | "A no-JS visitor with a saved other-pack choice would see the default credit. Not measured with scripting disabled."                                                                                  | `docs/decisions/dispatch-5.md` line 91 |

### Recorded by dispatch 6

`docs/decisions/dispatch-6.md` has no NOT RUN or NOT MEASURED entry. Its playbook checklist records these skipped steps: "`how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode." (line 40), "`architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design." (line 41) and "The multi-phase plan playbook is `skip: the dispatch is the plan and the autonomy grant`." (line 53).

### Dispatch 7 PR 7A

| Not run                                                    | Why                                                                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real iPhone Safari and a real Android phone                | the browser proof used Playwright WebKit (iPhone 14 profile) and Chromium (Pixel 7 profile) only                                                                             |
| "Scouting notes" on a result row with no rationale         | unreachable: 1025 of 1025 species have a rationale                                                                                                                           |
| `knip` (unused exports after `NOMINAL_LADDER` was removed) | knip is not a repo dependency; `rg NOMINAL_LADDER` finds no use in `src/` instead                                                                                            |
| Share card redesign                                        | Card sprites trimmed and 2x+ larger, framed pitch, W/D/L and finish panel; PNG 97,283 to 292,593 B, warm render 49 to 147 ms (FLAWLESS)                                      | `docs/decisions/share-card-redesign.md` |
| Home settings (settings-confirm)                           | Settings open by default; home Play buttons open a "Settings confirmed?" dialog (Yes goes to `/play`, No focuses Formation); shared links, daily and friendly are not gated. | `docs/decisions/settings-confirm.md`    |

### Dispatch 8 PR 8B checkpoint

PR #27 is shipped: reviewed 249a6dd, squash 6e7d34e, GLM APPROVE, Linux CI 38150679435 734 unit/496 browser/51 skips. Production health/live4/mobile242/46 pass; verify-bot cleanup count0. Clean-runner Lighthouse 38151791031 complete, all samples Accessibility100 and exact CLS0. Screenshot and figure receipts are in docs/reports/dispatch-8/.

### Dispatch 8 PR 8C checkpoint

PR #27 shipped with GLM exact-head APPROVE, Linux734 unit/496 browser/51skip and productionlive4/mobile242/46. Draft/wheel restyle in progress: strengthened actual-picture guards exposed an own-picture hover-scale collision, corrected in the current candidate. Full local run519/51 exposed one chart bounds failure; four chart guards committed RED before correction. Current99 focused checks pass; all24 actual-picture formation/device guards passed. Linux final browser, independent review and production8C remain pending. Strictzero360/390 restoreCLS remains enforced.

### Dispatch 8 PR 8D checkpoint

PR28 shipped: reviewed6568b06, squashbac8bea, GLMAPPROVE, Linux734/524/51, productionlive4 andcombinedmobile+draft286/50, verifybotcount0. Lighthouse38170883438 complete(all100A11y/exactCLS0). Results/sharecandidate:734unit/80files and61focusedbrowserpass; allgatesgreen. Corrected6darkcontrastfailuresfromthefull522/51/6run. Before/aftercapturesandnumericreadbackretained. Exact-headLinux579-casefullsuite,independentreviewandproduction8Dpending.

## Dispatch 8E candidate

Daily/leaderboard presentation restyle; local unit734/80 and browser536/51skip, 587total. Figures unchanged, zero axe/CLS in focused checks. Exact-head review/CI and production pending. 8F support area remains pending.

8D shippedPR29 mergeb3ab2c7; reviewed e0c7903 GLM APPROVE, CI734unit and528/51browser, productionlive4/mobile242/46, card+OG1200x630, exactverifybotcleanup0. 8E candidate nowrebased onto8Dmain; exactreview/CIpending.

## Dispatch 8E production correction

PR30 shippedf5e2256, reviewedb47a8e3 GLMAPPROVE, CI38173336275 unit734/browser536+51skip. Productionlive4/mobile242+46skipgreen, exactbotcleanup0. Lighthouse38174354317 exposedboardfooterCLS0.011626827583050482 all3samples; gateRED. SixnewcoldloadguardscommittedRED, candidate viewportreservation yields21focusedpass. ExactLinuxCI/review/productionpending. Support8F workcontinuesisolated.

## Dispatch 8F candidate

Support pages and final type/table/static-figure presentation implemented. Currentbase8D; 8E will be integrated before finalgates/review. Correctedfocused73pass; priorfull540/51skip/4testselectorfail preserved. Finalexact-headLinuxCI andproductionpending.

## Dispatch 8F final candidate

History/help/404/gate plusreadabilityandhumanroundlabels: unit735/80, fullbrowser560/51skip(611cases), primitives44 unchangedvisualrefs, figures186/10both themesunchanged. Targetedtype4passaftertestselectorfixes; historicalfailedruns preserved. Beforeafter52viewport+52full eachzerooverflow/card1200x630. Rebaseonto8ECLSfix, exact617-caseLinuxCI/independentreview/productionremainpending. PR31correctionhasGLMAPPROVE; firstLinuxcheckfailed733/1duetotheunchangedbuilderlazyrestore1swait, fullgateunaccepteduntilgreen.

## Current Dispatch 8 checkpoint

PR25–31 are merged. PR31 exactreviewc8c4d58, squash5199e56, CI38175095402 green734unit/542browser/51skip aftersame-head checkrerun. Productionlive4/mobile242+46skip/cleanup0, UbuntuLH38176506885 all24samples100/exact0. Tiny late-font fixture shifts are resolved in8F.

8F finalcandidate:735unit/80files; full623-case browser suite572pass51skip; allstatic/contrast/color/CVD/image/bundle/mirror gates green. Beforeafter68viewport+68full each, zerooverflow, card1200x630, figures186/10both themes unchanged. Exact-headLinuxCI, independentGLMreview, merge andproduction8F verification pending. Wholelanecloseout remainspending.

### Dispatch 8F Linux correction checkpoint

PR #32 remains unmerged. First exact-head Linux browser CI 38193051091 found four delayed-font failures (568 passed, 51 existing skips); its static/unit job passed 735 tests. The prior fc070324 review is superseded. The native date field now reserves geometry and shows Loading date until fonts are ready; caption line space is reserved. No second font or original mobile assertion changed. Linux focused 12 and macOS focused 62 pass, native date editing is preserved, and 186/10 figure snapshots remain identical. New full CI and independent review are required. A local concurrent unit run timed out four unchanged tests; isolated validation is pending.

## Dispatch 8 source acceptance complete

PR25–32 are merged. Final theme merge b6c9bb71f0f12ad56b37e5945c302712dc6388a7, reviewed792c841146a3fcec7aa0304afb61810f57e24315, GLM high APPROVE/canary verified. CI38195371430:735unit/80files; browser573pass,1pass-on-retry,51existing skips,625total. Productionhealth/live4/mobile+formations286/50/UI71 pass, exact verify-bot cleanup0. Forty-four production viewport+full-page pairs are bound to the health SHA; all zero overflow/oneh1. Inter-only HTML/network proof and1200x630 card/OG pass; figures186/10 unchanged per theme.

Final clean Ubuntu Lighthouse38246671783: all24 samples Accessibility100/exactCLS0,3run medians per8routes, matching baseline environment. Source before/after screenshots, contrast minima, type-color simulations and full metrics are in docs/reports/dispatch-8/readback.md and screenshots.md. The documentation closeout PR carries these receipts and still requires its own exact-head review/CI/merge/production sequence. The final response records that PR’s identity and post-merge result. Earlier pending checkpoints are historical and superseded by this section.

## Settled wheel result correction

The region/type wheel windows no longer inherit the animation strip's transform or blur after settlement. Spinning and settled reels have distinct DOM keys. Draft state, timing, engine rolls, and generated data are unchanged. The failing component guards were committed before the fix.

Local validation passed lint, typecheck, production build, and 739 unit tests across 80 files. Twelve browser cases passed in Chromium and WebKit at 390 and 1440 px, covering natural completion, mid-spin skip, reduced motion, candidate selection, and the next round. Exact-head review and CI receipts belong to the correction PR. Merge and post-deploy verification are NOT RUN until deployment is authorized. See `docs/decisions/wheel-results.md`.

## Share link transport correction

Share copies `/r/pdN?t=<payload>` so Apple's native link detector preserves the complete run payload. The proxy reconstructs the existing canonical token and rewrites to the result route after passcode checks. Complete legacy path links, current and retained engine replay, previews, image downloads, and scoring retain their contracts. Production requests to a truncated `/r/pd3` returned HTTP 404, matching the player's reported link.

The regression commit preceded the fix and failed six checks. Local validation passed lint, typecheck, production build, and 762 unit tests across 81 files. Fifteen focused browser cases passed for Share/replay, draft orders, retained links, gate preview metadata, and invalid-link status. Chromium and iPhone-profile WebKit both restored the observed `1-1-1`, Team Score `283` run. Apple's native detector recognized all 434 characters of the corrected copied link, versus 39 of 432 for the original. A test selector was scoped to the results status after the separate capture harness exposed the global announcer.

Independent review and CI receipts belong to the correction PR. Merge and production verification are NOT RUN until deployment is authorized. Physical iPhone messaging applications are NOT RUN. The shortened `/r/pd3` alone has no seed or action payload to recover. See `docs/decisions/share-links.md`.

### Share correction browser gate

Two full Linux attempts on `1892394` passed all Share cases but failed the existing natural wheel candidate deadline. First results were 589 pass, 51 skip, two pass on retry, one fail. The unchanged rerun was 586 pass, 51 skip, five pass on retry, one fail. A focused unchanged wheel run passed all 12 Chromium/WebKit cases. Traces show candidates appearing just after the five-second assertion, while the nominal spin/pause sequence alone is 4,380 ms. The browser test now awaits both settled wheel results before its unchanged candidate assertion at both rounds. This changes only the test protocol. The prior review receipt is superseded; fresh exact-head review and CI remain required.

The corrected wheel wait and Share cases passed all 19 focused browser checks across Chromium and WebKit. Only two settlement waits were added to the existing browser test; the original candidate, result text, geometry, selection, and next-round assertions remain. No application source changed in this correction.

## Browser progress and simultaneous players

Separate browser profiles retain independent history, stats, preferences, and active runs. Run snapshots now preserve the original random seed and persist to both per-tab storage and a durable browser checkpoint. The tab owns its active run; reopening the site can recover the latest checkpoint per mode or Daily. New run clears only matching owned bytes and leaves a cleared tab marker. Existing tab-only saves migrate when no durable checkpoint exists. Settings, seed, date, and reconstructed token are validated behind the existing lazy run import.

Builder now persists exact player edits synchronously before render and restores the lineup on plain home reopen. Explicit shared lineup links retain priority, and viewing or clearing another squad protects the unrelated owned checkpoint. Browser storage remains best effort; accounts and cross-device synchronization are outside this change. Engine/scoring/leaderboard contracts are unchanged.

Failing unit guards preceded the fixes. Local lint, typecheck, production build, and 793 unit tests across 82 files pass. Twenty-five focused browser cases pass with one existing desktop touch-share skip; all six new progress guards pass in Chromium and iPhone-profile WebKit. They cover independent players, tab ownership, random refresh, browser restart, replay isolation, and Builder recovery. Exact-head review, full CI, merge, and production receipts belong to the correction PR. See `docs/decisions/browser-progress.md`.

### Browser progress CI focus correction

The initial final-head Linux unit job passed 792 tests and failed the existing async Start-focus assertion. That test now awaits its unchanged expected heading focus after the lazy screen loads; application focus behavior is unchanged. The corrected file passes all ten tests with scoped lint/typecheck green. Prior review is superseded; fresh exact-head review and CI are required.

### Browser progress route focus correction

Full Linux browser CI found a real New run focus regression after explicit-seed removal remounted Challenge. The cleared-tab mount now focuses the replacement Start heading. The strengthened unit guard preceded the runtime fix and the 47-test run group passes. The browser guard awaits the final seed-free URL before asserting focus. WebKit's restored Round 1 appeared 5,046 ms after its five-second deadline; only that assertion now uses the existing ten-second lazy-load budget. The previous review is superseded; fresh exact-head review/CI remain required.

## CI UI regression correction

Narrow display-only repair resumes the interrupted lane at `94ec380`. Pitch/card geometry keeps targets separate, visible slot instructions fit compact empty cards, and accessible names retain the visible label sequence. Cup-round controls meet the existing size/type guards. Results/chart colors follow their actual theme surface. The fixed phone drawer retains its original maximum height and reserves matching page scroll space during choosing, including before wheel reveal. Its toggle and instruction use stadium colors only inside that dark responsive panel.

Engine, data, scoring, storage, draft actions, leaderboard, database, API, and runner configuration are unchanged. The two-tab test waits for a hydrated, idle second Start instead of spending its click during an automatic wrong-seed restore. Its original isolation and checkpoint assertions remain. New name and drawer-contrast guards were committed RED before their fixes. Final local lint, typecheck, build, client-bundle guard, and 881 unit tests in 97 files passed. The first complete browser suite passed 697 cases with 55 existing conditional skips, zero failures, and zero retries. Independent review then rejected `b886aed` for filled-card content overflow. New containment and filled-target guards were committed RED. Base and builder heights retain 94px and 90px; fitted filled cards use a measured 88px, while empty cards remain compact. That head's review/browser receipt is superseded. Fresh complete browser validation, exact-head review, CI, merge, and production proof remain pending at this checkpoint. The original screenshot acceptance audit also found ambiguous clipped names. Type icons now sit beside the unchanged artwork, leaving a two-line name area; corner position/rating badges and primary-type outlines are preserved. The full-name guard preceded the fix, and focused verification passed 119 browser cases with four existing conditional skips. Home-only disclaimer and unclipped phone-round labels are directly guarded. See `docs/decisions/ci-ui-regressions.md`.

## Results interaction repair candidate

The ball now receives the existing striking state through its CSS attribute. Pause Motion covers every descendant animation while logical timers continue. Selection, reset, and unmount cancel pending strike callbacks. Single-goal headlines use neutral scorer copy rather than inferring equalizers from final scores. RED guards preceded the fixes. Local focused units passed 13 tests and fresh-build Chromium/WebKit proof passed 6 browser checks on port 3481. Lint, typecheck, and build exited 0. Full units passed 882 and failed 4 untouched Builder/run card-text assertions; an exact-base archive reproduced those four failures. Independent review, full browser sweep, CI, PR, merge, and production verification remain NOT RUN. See `docs/decisions/results-interactions.md`.

## Platform infrastructure acceptance candidate

Fresh leaderboard submissions use three database queries on daily and all-time boards. Saved retries use two and consume no slot. Atomic bucket upserts serialize admission per scope and hashed IP. Migration 0003 backfills existing events; new admissions retain append-only event evidence. Event and inactive-key retention remain explicit operational carryovers. Saved responses still survive rank lookup failure.

A server-only Turbopack loader aliases byte-identical retained JSON modules and tracks live artifact dependency changes. Actual emitted server payloads measure three copies and 2,088,694 JSON bytes, compared with the earlier measured eight copies and 5,144,396 bytes. All five actual emitted retained replay hashes match. Frozen source data is unchanged.

Local focused tests passed 67 in eight files. Full units passed 1,044 in 119 files. Lint, typecheck, build, mirrors, image seams and packs, client bundle, theme contrast, colors, CVD, and migration generation passed. A new isolated PostgreSQL 16 cluster passed four races of 24 independent backend processes, admitting 10, zero, 10, and one attempts. It stopped cleanly. Browser Share and engine checks passed 23 cases, while three unchanged data-split guards exposed an eager species import through the UI chemistry label registry. The UI dispatch owns that correction. Final rebase and complete exact-head gates remain pending.

Independent review, CI, merge, production migration, and production verification are NOT RUN by this acceptance lane. Migration and deployment require paused gate and leaderboard admission so old and new writers cannot overlap. See `docs/decisions/platform-infrastructure-completion.md`.

### Infrastructure final exact-head gates

Branch `feat/platform-infrastructure-completion` was rebased onto release squash `88dcbaef39b0aebc0f917f5127b666d711b657ce` from the UI boundary `40723142cd9bdea99b16bbc4ece93de407a2f2c0`. The rebased diff is byte-identical to the pre-rebase stack diff. On source head `6b9e9e4118d0f20c93692b76fc55b69c60e56de8`, the serialized gates passed: mirrors, image seam and packs, theme contrast, colors and CVD, lint, typecheck, 1,048 unit tests in 119 files with four workers, production build, client bundle, and migration generation with no schema changes. Regenerated `src/data` has no diff and review move citations report 0 not learnable. Forty-two fresh Chromium cases passed in 57.6 seconds across data split, engine 4, share, health, images, pitch regressions, history controls, leaderboard, and old links. The emitted server retains three JSON payloads totaling 2,088,694 bytes and all five retained replay hashes pass. Frozen versions and current data have no diff against the UI release. Independent review, hosted CI, Preview application HTTP proof, and the production cutover are recorded in the PR and below once run.

### Platform preview database receipt

On source head `aa6715b`, the existing Neon `preview` branch `br-rough-bird-b79ahwsx` passed migration and admission SQL verification. The unchanged migration runner completed twice, with four journal rows and latest migration timestamp `1792066817368`. Six transactional admissions matched first/second allowed, third refused, inclusive cutoff refused, expired allowed, and independent gate allowed. Four evidence events and two task buckets existed before rollback; separate readback then confirmed zero entries, zero events, zero buckets, and four migration rows. The direct endpoint and commands are recorded in the dispatch decision. Production migration and application HTTP verification remain NOT RUN.

### Platform cutover routing controls

The cutover protocol now accounts for Fluid execution and stale deployment pins. Coordinator recon found Fluid enabled, a43,200-second skew window, null fixed threshold, and no rolling release. The planned cutover retains a production-only host rule denying admission POSTs outside current stable aliases, temporarily denies both admission paths on all production hosts, drains for at least300seconds and the effectiveoldfunctionmax, migrates and promotes under pause, then sets the threshold to the new deployment creation timestamp. Canonical health with old deployment query/header/cookie pins must return the newSHA or reject; old immutable POST hosts must remain denied, including authenticated access. Restore the previous threshold under a verified pause during rollback. These production controls and checks are NOT RUN by this documentation lane. See the dispatch decision for official sources, ordering, and rollback details.

### Infrastructure local integration acceptance

The third dispatch was locally rebased onto UI candidate `0c7ff856dc6dcb8fa3988cacb5009de363b2c981`. Integration source `190f690eb864f0a0a56d4bbf53a7ccefe1185fa9` passed 67 focused tests in eight files and 1,046 full units in 119 files. Lint, typecheck, build, all image, theme, mirror, and client guards passed. Migration generation reported no changes. The actual emitted server retains three payloads totaling 2,088,694 bytes, with all five retained replay hashes matching. Fresh port 3416 Chromium data-split, engine 4, and Share browser selection passed 26 cases, superseding the earlier import failure checkpoint. Frozen versions and current data have no diff against the UI candidate. The final rebase onto the UI main merge and independent review remain pending. The cutover protocol also requires zero active admission table queries through aggregate-only `pg_stat_activity` after the function drain and before migration. This production check is NOT RUN.

### Infrastructure integration onto the release stack

Local integration source `0eeaccf4fec41f642978b997222b8a342c6cfdc8` includes PR #52 candidate `50af55aa40272ec37e2783be4e2f8b7375093f29` on first-release squash `6218750ea2c9896e469b1496d5d20691b4b78d6f`. The first release's inherited receipt records exact live health and 21 production browser checks, with no production database schema change. This integration passed 67 focused tests, 1,046 unit tests in 119 files with four workers, and 31 fresh Chromium checks including lazy data, engine, Share, health, and images. The first concurrent unit attempt had one failure and 1,045 passes; that unchanged file passed six tests in isolation before the full serialized run passed. Static gates, build, migration generation, three emitted data payloads, and all five compiled retained replay hashes passed. Logs preserve each attempt. The rollback protocol now restores a prior null skew threshold as documented integer zero, preserving the unbounded eligibility floor and verifying readback under pause. Production infrastructure actions remain NOT RUN. The final rebase onto the second dispatch's main squash, exact-head review, and hosted CI remain pending.
