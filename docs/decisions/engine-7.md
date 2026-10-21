# Engine 7 flip (6b9)

Wave 6 row 6b9, Red. Branch `feat/engine-7` off `origin/main` at `d457e72` (the 6b8 squash, PR
#154). The first commit (`25165cf7`) records the PR #154 merge in `STATE.md`.

## Who notices

Every player starting a new run or viewing a board:

- New runs play on Engine 7 (`pokedraft-engine-7`) and encode `pd7.` tokens.
- Substitutions and tactics are now independent on the touchline (decision 4): making a substitution
  hands substitutions to the player while the assistant continues to manage tactics, and making a
  tactic call at 45' or later hands tactics to the player while the assistant continues to make
  fatigue substitutions at 60' and 75'. The 65' interim fatigue stop is gone; the half-time fatigue
  line stays.
- Nominated penalty and free-kick takers step up in play and in shootouts, with responsive two-up or
  stacked picker layout down to 308px.
- Penalties in play can be saved or missed (about 1 in 5), and missed penalties no longer count as
  shots on target on the live scoreboard.
- Goal kinds (headers and solo goals) scale with the attacking line's aerial and dribbling stats.
- Opponents suffer injuries and bring on position-matched reserves, and the Final Boss plays at Team
  Score 992.
- Style edges are 15% wider, rewarding reading the opponent's style from the scout line.
- Shared `pd6` links (`/r/pd6?t=...` and legacy `/r/pd6.<payload>`) continue to replay identically
  through the frozen `v6` engine bundle, and leaderboard rows from Engine 6 show the `Engine v6`
  chip alongside the `All engines` toggle.
- An in-flight Engine 6 run can still submit during the grace window (`flipDate: "2026-10-21"`,
  `until: "2026-10-23T04:00:00Z"`) with the note `Ranked under Engine v6 (in-flight run)`.

## Scope and files

- **Engine constants, coefficients, and branch cleanup:**
  - `src/engine/coefficients.ts`: `ENGINE_VERSION = "pokedraft-engine-7"`, takes the calibrated 6b8
    values (`styleEdges` scaled by 1.15, `counterLead` and `pressFade` active, `penalty.missable =
true`, `penalty.awardShare = 0.0745`, `shootout.band = 0.18`, `goalKind` weights `1`,
    `takers.enabled = true`, `opponent.injuriesPerMatch = 0.3`, `ladder.score.F = 992`), and removes
    the Engine 6 boolean toggle fields (`splitManagement`, `missable`, `weighted`, `takers.enabled`)
    from `EngineCoefficients`.
  - `src/engine/coefficients-v7.ts`: reduced to a 5-line `structuredClone(ENGINE_COEFFICIENTS)`
    export so calibration scripts (`probe.mts`, `win-curve.mts`, `calibrate.mts`,
    `achievements-rate.mts`, which are outside this row's edit scope) keep working when passed
    `--coeffs v7`.
  - `src/engine/match.ts`: deletes the Engine 6 fallback branches (`splitManagement`,
    `penalty.missable`, `goalKind.weighted`, `takers.enabled`), removes unused `managed` state on
    `Side`, and guards an empty attacking pool in `goalKindOf`'s `kindScale` (`if (pool.length ===
0) return 1`).
  - `src/engine/token.ts` and `src/engine/types.ts`: `RUN_TOKEN_VERSION = 7`, `RETAINED_TOKEN_VERSIONS
= [1, 2, 3, 4, 5, 6]`, `managerSchemaFor(version)` keeps version 6 strict (tactic and sub tuples
    only) while version 7 accepts penalty (`"p"`) and free-kick (`"f"`) taker tuples.
- **Retained Engine 6 wiring and proxy:**
  - `src/engine/versions/index.ts`, `src/engine/versions/label.ts`: registers `RETAINED[6]` with an
    identity `adapt` (`CupResult` in Engine 7 only adds optional fields and incident subtypes) and
    bumps `CURRENT_ENGINE_NUMBER` to `7`.
  - `src/proxy.ts`: `FLIP_RETAINS = 6`, routing `pd6.<payload>` dot share links through the frozen
    `v6` token codec to `/r/pd6?t=<payload>`.
  - `scripts/build/check-retained-replays.mts` and `scripts/build/measure-retained-json.mjs`: routes
    the `v6` golden tokens (`2b26ee82...` and `eb366464...`) through the retained `v6` bundle, adds
    the live `v7` golden replay check (`c91cb42c...` and `2b7223f3...`), and includes `"v6"` in
    retained JSON chunk measurement.
  - `scripts/audit/tokens.mts`: adds `6` to `RETAINED` and moves `7` to live.
- **Grace window and leaderboard validation:**
  - `src/leaderboard/server/grace.ts`: enables `GRACE` for version `6` (`pokedraft-engine-6`,
    `flipDate: "2026-10-21"`, `until: "2026-10-23T04:00:00Z"`) and rejects a live-version (`pd7`)
    Daily submission when `dailyDate < g.flipDate` (6g Red reviewer carryover).
  - `src/leaderboard/server/handlers.ts` and `src/ui/read-token.ts`: passes the token's own version
    `v` into `decodeToken(token, v)` so retired `pd6` tokens are validated against
    `managerSchemaFor(6)` rather than the live version 7 schema (6b3 skeptics carryover).
- **Touchline split, 65' stop removal, set-piece layout, and SoT fix:**
  - `src/ui/manager/intel.ts`: `assistantStatus(tacticManaged, subsManaged)` returns the four-state
    copy (`"Assistant: subs on, tactics on"`, `"Assistant: subs on, tactics off"`, `"Assistant: subs
off, tactics on"`, `"Assistant: subs off, tactics off"`).
  - `src/ui/manager/touchline.ts`: tracks `tacticManaged` (tactic at 45' or later) and `subsManaged`
    (any sub) separately in `TouchlineState`, and updates `countCalls` / `firstCall` so a
    taker-only match reports `"With your set-piece call"` (or `"With your calls"`).
  - `src/components/matchday/Touchline.tsx` and `src/components/matchday/MatchdayFlow.tsx`: renders
    the four-state `assistantStatus`, shows per-part takeover notes (`TAKEOVER_COPY.subs`,
    `TAKEOVER_COPY.tactics`, `TAKEOVER_COPY.both`), and mounts `SetPieceTakers` in pre-match and at
    every touchline stop in Engine 7.
  - `src/ui/matchday/clock.ts` and `src/components/matchday/MatchPlayer.tsx`: removes the `"fatigue"`
    stop kind and the 65' auto-pause while keeping the half-time fatigue line, and excludes missed
    penalties (`b.penalty === "missed"`) from `shotsOnTarget`.
  - `src/components/matchday/SetPieceTakers.module.css`: changes `.row` to `grid-template-columns:
repeat(auto-fit, minmax(210px, 1fr))` so the two pickers stack cleanly on 320px and 308px
    touchline drawers without truncating `"Auto (best shooter)"` and sit side by side on wider
    containers.
- **Tests, pins, and browser proof:**
  - Re-pins `src/engine/__tests__/goldens.test.ts`, unit tests across `src/`, `e2e/pins.ts` (via
    `scripts/e2e/render-pins.ts`), Playwright specs, and browser proof PNGs under
    `docs/reports/engine-7/`.
  - Deletes the pre-flip parity scaffolding (`src/engine/__tests__/v6-parity.ts`,
    `src/engine/__tests__/v6-parity.test.ts`, `src/engine/__tests__/v6-parity.slow.test.ts`,
    `src/engine/__tests__/rate-parity.test.ts`) now that `check-retained-replays.mts` and
    `versions.test.ts` pin frozen `v6` against the `pd6` golden hashes.

## RED commits and verbatim outputs

### 1. Goldens switch and branch-deletion parity (`fe830cb7` -> `0256f355` -> `9f3cd902`)

Switching `ENGINE_VERSION`, `RUN_TOKEN_VERSION`, and `ENGINE_COEFFICIENTS` to the calibrated Engine 7
values in `fe830cb7` failed `src/engine/__tests__/goldens.test.ts` (4 of 7 failed):

```text
 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens > cup8 golden run is deterministic and hits the pinned outcome
AssertionError: expected 'semi-finalist' to be 'quarter-finalist' // Object.is equality
- Expected
+ Received
- quarter-finalist
+ semi-finalist
 ❯ src/engine/__tests__/goldens.test.ts:127:27

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens > kanto151 golden run is deterministic and hits the pinned outcome
AssertionError: expected 'quarter-finalist' to be 'group-stage' // Object.is equality
- Expected
+ Received
- group-stage
+ quarter-finalist
 ❯ src/engine/__tests__/goldens.test.ts:151:27

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens > golden CupResult replays are byte-identical to pinned hashes
AssertionError: expected 'c91cb42cac62bec6e43a649c4e914a1208108…' to be '2b26ee82fb0d2549b1d707f8255a30816aa18…' // Object.is equality
- Expected
+ Received
- 2b26ee82fb0d2549b1d707f8255a30816aa18b7e8623d5054f342ff1a453bc61
+ c91cb42cac62bec6e43a649c4e914a1208108ef94a92534acfd900d13df1fe30
 ❯ src/engine/__tests__/goldens.test.ts:171:34

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens > 20-run panel matches every pinned outcome
AssertionError: expected [ { seed: 'panel-0', …(7) }, …(19) ] to deeply equal [ { seed: 'panel-0', …(7) }, …(19) ]
 ❯ src/engine/__tests__/goldens.test.ts:294:21

 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
```

Commit `0256f355` re-pinned `src/engine/__tests__/goldens.test.ts` (7 of 7 passed). Commit
`9f3cd902` then deleted the Engine 6 branches and rule flags from `src/engine/match.ts` and
`src/engine/coefficients.ts` with zero diff to `src/engine/__tests__/goldens.test.ts` (7 of 7
passed, byte-identical replay hashes `c91cb42c...` and `2b7223f3...`).

### 2. Empty attacking pool in `goalKindOf` (`9b02b64e` -> `69567762`)

Commit `9b02b64e` added a guard test in `src/engine/__tests__/goal-kind.test.ts` for an attacking
side whose ATT-line slots were all sent off (`pool.length === 0`, 1 of 5 failed):

```text
 FAIL  src/engine/__tests__/goal-kind.test.ts > goalKindOf > falls back to unscaled header and solo shares when the attack pool is empty
AssertionError: expected { header: 0, …(3) } to deeply equal { header: 1266, …(3) }
- Expected
+ Received
  {
    "free-kick": 783,
-   "header": 1266,
-   "open-play": 6134,
-   "solo": 1817,
+   "header": 0,
+   "open-play": 9217,
+   "solo": 0,
  }
 ❯ src/engine/__tests__/goal-kind.test.ts:108:20

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

Commit `69567762` guarded `if (pool.length === 0) return 1;` in `kindScale` (5 of 5 passed).

### 3. Retained `pd6.` dot share links in proxy (`f7548b0f` -> `0b3a6df2`)

Commit `f7548b0f` updated `src/__tests__/proxy.test.ts` to assert that `/r/pd6.<payload>` redirects
to `/r/pd6?t=<payload>` and rejects tampered `pd6.` tokens (2 of 17 failed):

```text
 FAIL  src/__tests__/proxy.test.ts > proxy > redirects a valid pd6 dot share link to the query-param route
AssertionError: expected 200 to be 308 // Object.is equality
- Expected
+ Received
- 308
+ 200
 ❯ src/__tests__/proxy.test.ts:100:24

 FAIL  src/__tests__/proxy.test.ts > proxy > passes a tampered pd6 dot share link through for the page to reject
AssertionError: expected 'http://localhost:3000/r/pd7?t=W1siYyI…' to be null // Object.is equality
 ❯ src/__tests__/proxy.test.ts:110:39

 Test Files  1 failed (1)
      Tests  2 failed | 15 passed (17)
```

Commit `0b3a6df2` wired `RETAINED[6]`, `RETAINED_TOKEN_VERSIONS = [1, 2, 3, 4, 5, 6]`, and
`FLIP_RETAINS = 6` in `src/proxy.ts` (59 of 59 passed across 4 test files).

### 4. Engine 6 grace window, pre-flip Daily rejection, and retired token schema (`2b53091d` -> `d399963c`)

Commit `2b53091d` added failing guards in `src/leaderboard/server/__tests__/grace.test.ts` for:

1. accepting an in-flight `pd6` token during the grace window,
2. rejecting a live `pd7` token on a pre-flip Daily date (`2026-10-20 < 2026-10-21`), and
3. rejecting a forged `pd6` token carrying an Engine 7 `"p"` taker tuple in `canonicalToken`
   (3 of 14 failed):

```text
 FAIL  src/leaderboard/server/__tests__/grace.test.ts > engine flip grace window > live GRACE constant > accepts an in-flight pd6 run before GRACE.until and tags grace: true
AssertionError: expected 'stale' to deeply equal { engine: 'pokedraft-engine-6', …(2) }
 ❯ src/leaderboard/server/__tests__/grace.test.ts:207:59

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > engine flip grace window > live GRACE constant > refuses a live pd7 Daily submission for a date before GRACE.flipDate
AssertionError: expected { engine: 'pokedraft-engine-7', …(2) } to be 'stale' // Object.is equality
 ❯ src/leaderboard/server/__tests__/grace.test.ts:227:71

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > engine flip grace window > submitRun through the grace window > rejects a forged pd6 token that carries an engine-7 taker tuple with 400 TOKEN_MALFORMED
AssertionError: expected 201 to be 400 // Object.is equality
- Expected
+ Received
- 400
+ 201
 ❯ src/leaderboard/server/__tests__/grace.test.ts:323:24

 Test Files  1 failed (1)
      Tests  3 failed | 11 passed (14)
```

Commit `d399963c` enabled `GRACE`, added the `dailyDate < g.flipDate` guard in `submissionEngine`,
and passed the token version `v` to `decodeToken(token, v)` in `canonicalToken` and `readVersioned`
(66 of 66 passed across `grace.test.ts` and `handlers.test.ts`).

### 5. Split assistant status, 65' stop removal, and missed-penalty SoT (`5d431a45` -> `e2cacbd5`)

Commit `5d431a45` added failing guards across `intel.test.ts`, `clock.test.ts`,
`Touchline.test.tsx`, `MatchdayFlow.intel.test.tsx`, and `Broadcast.test.tsx` (8 of 61 failed):

```text
 FAIL  src/ui/manager/__tests__/intel.test.ts > assistantStatus > reports each combination of tacticManaged and subsManaged
AssertionError: expected 'Assistant: handling subs and late tac…' to be 'Assistant: subs on, tactics on' // Object.is equality

 FAIL  src/ui/matchday/__tests__/clock.test.ts > stopsFor > does not stop at 65' when a starter sits at or below the tired threshold
AssertionError: expected [ { minute: 45, kind: 'halftime' }, …(1) ] to deeply equal [ { minute: 45, kind: 'halftime' } ]

 FAIL  src/components/matchday/__tests__/Touchline.test.tsx > Touchline takeover note > shows the subs-only takeover note after a first-half substitution
TestingLibraryElementError: Unable to find an element with the text: /You're making the subs now\. Your assistant still manages tactics\./.

 FAIL  src/components/matchday/__tests__/Touchline.test.tsx > Touchline takeover note > shows the tactics-only takeover note after a half-time tactic change
TestingLibraryElementError: Unable to find an element with the text: /You have the tactics now\. Your assistant still makes fatigue subs\./.

 FAIL  src/components/matchday/__tests__/Touchline.test.tsx > Touchline takeover note > shows the combined takeover note once both subs and late tactics are player-managed
AssertionError: expected "Assistant: off (you're managing)" to be 'Assistant: subs off, tactics off'

 FAIL  src/components/matchday/__tests__/MatchdayFlow.intel.test.tsx > MatchdayFlow touchline intel > shows assistant status and updates it per part when the player takes over subs
TestingLibraryElementError: Unable to find an element with the text: "Assistant: subs on, tactics on"

 FAIL  src/components/matchday/__tests__/MatchdayFlow.intel.test.tsx > MatchdayFlow touchline intel > reads the scout line from the opponent style on pre-match and touchline
TestingLibraryElementError: Unable to find an element with the text: /Pressing side\. Counter gets \+12% chances and gives -17%\./

 FAIL  src/components/matchday/__tests__/Broadcast.test.tsx > Broadcast > does not count a missed in-play penalty as a shot on target
AssertionError: expected '1 (1)' to be '1 (0)' // Object.is equality

 Test Files  5 failed (5)
      Tests  8 failed | 53 passed (61)
```

Commit `e2cacbd5` implemented the four-state `assistantStatus`, per-part `TAKEOVER_COPY`, 65'
fatigue stop removal, and missed-penalty SoT exclusion (61 of 61 passed across all 5 files).

## Calibration pins (from 6b8 at `c1f4f838`)

Copied from `docs/reports/engine-7/calibration.json` (run at `c1f4f838` and sha256-matched by the
6b8 independent Red reviewer; `ENGINE_COEFFICIENTS` at `97f355d2` carries the exact same values):

| Pin             | N                                         | Measured                                                                                     | Pass line                           | Verdict                     |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------- |
| P1 good         | 400 squads, 2,801 matches                 | +1.07 points [-0.77, +2.91]                                                                  | +3 to +6                            | FAIL, fallback 2 (holds P2) |
| P1 random       | 400 squads, 1,908 matches                 | +3.41 [+0.51, +6.30]                                                                         | at least +3                         | pass                        |
| P2 good         | 2,801 matches                             | +4.21 [+2.47, +5.96]                                                                         | at most +10                         | pass                        |
| P2 random       | 1,908 matches                             | +9.59 [+6.80, +12.36]                                                                        | at most +10                         | pass                        |
| P3 good         | 2,801 matches                             | 0.00 [-1.87, +1.87]                                                                          | cost at most 0.5                    | pass                        |
| P3 random       | 1,908 matches                             | 0.00 [-2.94, +2.94]                                                                          | cost at most 0.5                    | pass                        |
| P4              | 17,000 cups, 5,448 shootouts              | top minus bottom +18.31 [+14.59, +21.96]                                                     | at least 10 points, intervals apart | pass                        |
| P5 840          | 90,000 cups pooled (`--n 5000`)           | 3.65% [3.28, 4.07]                                                                           | inside [2.97, 3.72]                 | pass                        |
| P5 900          | same                                      | 11.81% [11.12, 12.53]                                                                        | inside [11.47, 12.90]               | pass                        |
| P5 950          | same                                      | 29.55% [28.92, 30.18]                                                                        | inside [29.46, 30.72]               | pass                        |
| P6 good         | cup8-full good, 5,000 cups                | 5.912 wins [5.884, 5.939]                                                                    | 5.8 to 6.2                          | pass                        |
| P6 careless 151 | kanto151 random, 5,000 cups               | 3.331 wins [3.299, 3.363]                                                                    | 3 to 4                              | pass                        |
| P7              | 5,000 matches per gap and phase           | worst row +0.046 (KO W at gap 0, 0.571 vs 0.525)                                             | within 0.03                         | FAIL, fallback 4            |
| P8              | 1,743,160 user goals                      | 68.78% [68.71, 68.84]                                                                        | 70% to 80%                          | FAIL, fallback 4            |
| P9              | not applicable                            | 6b7 does not exist (good-bot squad share 12.0% [10.0, 14.1])                                 |                                     | n/a                         |
| Achievements    | 200 good-bot cups (`achievements-0..199`) | Giant killer at 100: 2.5% (5/200) [1.07, 5.72]; Hat-trick hero: 71.5% (143/200) [64.9, 77.3] | Giant killer inside 2% to 20%       | threshold stays 100         |

## Goldens and `e2e/pins.ts` diff (line by line)

### `src/engine/__tests__/goldens.test.ts`

Every golden draft payload is unchanged (`golden-cup8`, `golden-kanto151`, and `panel-0..19`), now
prefixed with `pd7.` and replayed through Engine 7:

- `golden-cup8`: token SHA `308c5439f5ba8923f8a363c86182c7d7c580f68ce60b932127671f3bf37c947c`
  (only the prefix changed from `pd6.` to `pd7.`). Team Score stays `799`. Under Engine 7's wider
  style edges, weighted goal kinds, missable penalties (`awardShare = 0.0745`, `band = 0.18`), and
  opponent injuries, the run advances one round further: `finish` moves from `"quarter-finalist"`
  (`5-0-1`, 17 GF / 7 GA) to `"semi-finalist"` (`5-1-1`, 24 GF / 10 GA), and the canonical replay
  SHA moves from `2b26ee82...` to `c91cb42cac62bec6e43a649c4e914a1208108ef94a92534acfd900d13df1fe30`.
- `golden-kanto151`: token SHA `c6f275c7fd4396cc72b4d905d67ab82e9f2f7443d634bd2a93ccdf6ff26d828d`.
  Team Score stays `667`. The run advances from `"group-stage"` (`1-0-2`, 6 GF / 7 GA) to
  `"quarter-finalist"` (`3-1-2`, 9 GF / 7 GA), and the canonical replay SHA moves from `eb366464...`
  to `2b7223f3888259596fd24740506564cdca93ff13e9c035ecb417d681c2858a4d`.
- `20-run panel` (`panel-0` to `panel-19`): draft picks and Team Scores are unchanged; match results
  reflect the Engine 7 rules (opponent injury draws on `inj:<match>:<slot>:<n>`, weighted goal kinds,
  missable penalties, wider shootout band, style edges scaled by 1.15, and Final Boss score 992).

### `e2e/pins.ts` line-by-line review

Regenerated with `pnpm e2e:pins` (`scripts/e2e/render-pins.ts`):

- `ENGINE_VERSION`: `"pokedraft-engine-6"` -> `"pokedraft-engine-7"`.
- `TOKEN_VERSIONS`: `[1, 2, 3, 4, 5, 6]` -> `[1, 2, 3, 4, 5, 6, 7]`.
- `LIVE_TOKEN`, `SHARE_LINK`, `LIVE_PREFIX`, `LIVE_GOLDEN_CUP8`, `LIVE_GOLDEN_KANTO151`: `pd6` ->
  `pd7`.
- `RUN_POSITION_FIRST.record`: `"0-3-0"` -> `"1-2-1"` (same `e2e-pf` draft; draws two group matches
  and wins one under Engine 7).
- `MIRROR_EXHIBITION`: `firstSingle` `"1-3"` -> `"2-4"`, `extraTimeRematch` `7` -> `1` (`leg1:
"0-1"`, `leg2: "4-4"`, `aggregate: "4-5"`, `goal: "102' Talonflame (header), assist Togepi"`),
  `singleAtExtraTimeRematch` `"5-5"` -> `"3-1"`, `aggregateRematch` `8` -> `2` (`aggregate:
"5-10"`). Same golden squad mirror match under Engine 7.
- `EXHIBITION_ROUTE`: `friendly` prefix `pd6.` -> `pd7.`, `friendlyVsGolden` `"0-6"` -> `"0-7"`,
  `goldenMirror` `"1-3"` -> `"2-4"`.
- `EXHIBITION_BROADCAST`: `assistant` `"0-6"` -> `"0-7"`, `withSub` `"0-5"` -> `"0-7"`, `sub`
  unchanged (`"45' Butterfree on for Metapod (tactical, your call)"`).
- `YOUR_CALLS`: `assistant` `"6-1"` -> `"7-1"`, `you` `"8-2"` -> `"9-1"` (seed `e2e-coach` match 0
  with Attack at 45').
- `DEEP_LINK`: `token` prefix `pd6.` -> `pd7.`, `href` `/r/pd7?t=...&watch=0&at=59`, `minute` `49`
  -> `59`, `before` `"0-0"` -> `"2-0"`, `after` `"1-0"` -> `"3-0"`. In G1 under Engine 7, user goals
  fall at `49'`, `55'`, and `59'`; the `49'` and `55'` timeline pips sit within 6 minutes (under 44px
  apart on the scrubber), so `render-pins.ts` picks the first user goal without an overlapping
  neighbour (`59'`).
- `HEAD_TO_HEAD`: `cup8.theirs` and `kanto151.theirs` prefix `pd6.` -> `pd7.`; `cup8.you.record`
  `"1-1-2"` -> `"2-1-2"` (Team Score `406` unchanged).
- `HAPTICS`: unchanged (`round: "G3"`, `scoreAtConceded: "2-1"`, `goalsBefore: 2`, `goals: 6`).
- `INJURY_STAGING`: stays `round: "QF"`, `minute: 42`, `slot: 1`, `injured: "Roselia"`, `sub:
"Kommo-o"` after filtering `injury.side === "user"` in `render-pins.ts` (G1 now has an opponent
  injury at 25', which has no bench substitute).
- `RED_CARD`: unchanged (`round: "QF"`, `minute: 6`, `slot: 2`).
- `CONTINUOUS_BALL`: unchanged (`round: "G1"`, `save: 59`).
- `SET_PIECES`: `solo` unchanged (`G1`, `49'`, `Talonflame`); `header` moves from `R32 9'` to `G1
6'` (weighted goal kinds produce a header in G1); `penalty` moves from `R32 84'` to `G1 55'`
  (`Zeraora`); `freeKick` unchanged (`R32 17'`).
- `MATCHDAY_CARRYOVERS`: unchanged (`round: "G1"`, `duel: "Remoraid used Hyper Beam!"`).
- `HONEST_MOMENTUM`: unchanged (`round: "G1"`, `kickoff: "50%50%"`, `second: "77%23%"`).
- `XG_RIVER`: `fullTime` `"Chances so far: this squad 5.0, them 0.1"` -> `"Chances so far: this
squad 5.9, them 0.1"` (G1 penalty and style-edge xG under Engine 7).
- `GIANT_KILLER`: seed `achievements-19` still earns all three (`hat-trick-hero`, `comeback`,
  `giant-killer`); only the token prefix changes to `pd7.`.
- `CHAMPION`: seed moves from `e2e-reveal-59` (`868`, `Dragapult`) to `e2e-reveal-29` (`825`,
  `8-0-0`, `Feraligatr`), the first seed in `e2e-reveal-1..250` that wins the cup under Engine 7.
- `SHOOTOUT`: seed `shootout-1` still reaches sudden death in `F` after opening with a user goal and
  an opponent miss; only the token prefix changes to `pd7.`.
- `INJURY_STOP`: seed `e2e-a11y-47` is unchanged (still has 1 first-half user injury and 0 red cards
  in G1).
- `FATIGUE`: seed `fatigue-1` still reaches `R16` extra time with `minute: 116`, `spent: 2`, `tired:
10`. Because Engine 7 splits tactic and sub management, the pin's manager actions include a
  keeper-for-keeper sub (`["u", m, 1, 0, 4]`) alongside `["t", m, 0, "p"]` so the assistant does not
  sub out tired outfield starters at 60' and 75'.

## Measurements and browser proof

- `pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`:
  - `13 emitted golden replays passed, 1 dispatcher(s)`: `v1` (2), `v2` (2), `v3` (1), `v4` (2),
    `v5` (2), `v6` (2: `2b26ee82...` and `eb366464...`), and live `v7` (2: `c91cb42c...` and
    `2b7223f3...`).
- `node scripts/build/measure-retained-json.mjs .next/server/chunks`:
  - `totalCopies: 4`, `totalPayloadBytes: 2891853` (`src/data` is unchanged in 6b9, so `v6` shares
    the same data chunks as live `v7`).
- `pnpm check:client-bundle`:
  - `client bundle holds no retained engine bundle; server build holds 24 files with it`.
- Set-piece picker bounding boxes (`e2e/penalty-takers.spec.ts`):
  - Pre-match card (`SetPieceTakers` inside `.prematch`):
    - `390x844`: `300x44 at x 45` (both selects stacked, full card width, no overflow)
    - `360x800`: `270x44 at x 45`
    - `320x568`: `230x44 at x 45`
    - `308x568`: `218x44 at x 45`
  - Touchline sheet (`SetPieceTakers` inside `.sheet`):
    - `390x844`: `366x44 at x 12`
    - `360x800`: `336x44 at x 12`
    - `320x568`: `296x44 at x 12`
    - `308x568`: `284x44 at x 12`
- Browser proof committed under `docs/reports/engine-7/`:
  - `docs/reports/engine-7/390-prematch-set-pieces.png`
  - `docs/reports/engine-7/390-touchline-set-pieces.png`
  - `docs/reports/engine-7/360-touchline-set-pieces.png`
  - `docs/reports/engine-7/320-touchline-set-pieces.png`
  - `docs/reports/engine-7/308-touchline-set-pieces.png`
  - `docs/reports/engine-7/submit-grace-390.png`
  - `docs/reports/engine-7/all-engines-390x844.png`

## Product and owner decisions applied

- **Owner override on landing window (recorded verbatim):**
  The owner waived the 00:00 to 01:59 New York landing window for 6b9: `"ignore the hand-off
instructions here, just go ahead with the merge/cleanup when you get to it, the time does not
matter"`. Consequence: `GRACE` refuses an Engine 6 run for the flip-day Daily (`2026-10-21`), so a
  player who started that day's Daily before a daytime flip and submits after it gets a 409.
  `GRACE.flipDate` stays `"2026-10-21"` and `GRACE.until` is `"2026-10-23T04:00:00Z"`.
- **Owner substitution on Sol review:**
  The owner has no Sol usage and replaced the 6b9 Sol review with a Gemini review: `agy -p <prompt>
--model gemini-4-argon-high --effort high --mode plan` (Antigravity CLI at `~/.local/bin/agy`,
  read-only plan mode).
- **Split assistant management (decision 4):**
  Tactic and sub management flip independently at 45'+ and on any sub, with four-state
  `assistantStatus` copy and per-part takeover notes (`TAKEOVER_COPY.subs`, `TAKEOVER_COPY.tactics`,
  `TAKEOVER_COPY.both`). The 65' interim fatigue stop is removed.
- **Scout edge badge margin (`EDGE_MARGIN`):**
  With `styleEdges` scaled by 1.15, each opponent style still puts at most two tactics over
  `EDGE_MARGIN = 0.08` (pressing: Counter `+0.175`, Attack `-0.085`; possession: Press `+0.215`,
  Counter `+0.130`; direct: Defend `+0.092`, Press `-0.215`; balanced: `0`). `EDGE_MARGIN` stays
  `0.08`.
- **Achievements (Giant killer):**
  6b8 measured Giant killer at 2.5% (5/200), inside the 2% to 20% target band, so the threshold
  stays at `100`.

## Carryovers closed

- **(6g Red reviewer, note 3) `submissionEngine` allows a live-version Daily submission for a
  pre-flip date:** Fixed in `src/leaderboard/server/grace.ts` with a RED-then-GREEN guard in
  `grace.test.ts` (`2b53091d` -> `d399963c`). When `GRACE` is active and `tokenVersion ===
RUN_TOKEN_VERSION`, `submissionEngine` returns `"stale"` (HTTP 409) if `dailyDate !== null &&
dailyDate < g.flipDate`.
- **(6b3 skeptics, REQUIRED) `canonicalToken` and `readAnyToken` validated retired `pd6` tokens
  against the live schema:** Fixed in `src/leaderboard/server/handlers.ts` and `src/ui/read-token.ts`
  with a RED-then-GREEN guard in `grace.test.ts` (`2b53091d` -> `d399963c`). Both now pass the
  token's version `v` to `decodeToken(token, v)`, so a `pd6` token carrying `"p"` or `"f"` taker
  tuples is rejected by `managerSchemaFor(6)` (`400 TOKEN_MALFORMED` on submit, `null` in
  `readAnyToken`).
- **(6b3 skeptics, optional) Live core at Engine 6 coefficients accepted a taker action:** Closed as
  moot in 6b9 because `takers.enabled` and the Engine 6 branches are deleted from the live engine and
  Engine 7 makes taker nominations live.
- **(6b3) "Your calls" and nominations:** `yourCalls` in `FullTimeCard.tsx` compares the player's
  cup against `[]` (assistant-managed tactics, subs, and takers). In `src/ui/manager/touchline.ts`,
  `firstCall` now checks `actions.length > 0` when `tactics === 0 && subs === 0` and returns `"With
your set-piece call"` (single nomination) or `"With your calls"` (multiple nominations) instead of
  falling through to `"With your sub"`. Guarded in `src/ui/manager/__tests__/touchline.test.ts`.
- **(6b3 Red) Missed penalty counted as a shot on target:** Fixed in
  `src/components/matchday/MatchPlayer.tsx` (`shotsOnTarget` excludes `b.penalty === "missed"`) with
  a RED-then-GREEN guard in `Broadcast.test.tsx` (`5d431a45` -> `e2cacbd5`).
- **(6b3 Red) 320px touchline `SetPieceTakers` truncation:** Fixed in
  `src/components/matchday/SetPieceTakers.module.css` using `grid-template-columns:
repeat(auto-fit, minmax(210px, 1fr))` so the selects stack into a single full-width column (296px
  at 320px, 284px at 308px) on narrow touchline sheets and sit side by side on wider containers,
  preserving the full `"Auto (best shooter)"` copy. Proven at 390px, 360px, 320px, and 308px in
  `e2e/penalty-takers.spec.ts` and `docs/reports/engine-7/`.
- **(6b4) `e2e/data-split.spec.ts` chunk glob and `switchToV7` removal:** `e2e/data-split.spec.ts`
  now imports `CLIENT_CHUNKS` (`**/_next/static/**/chunks/**`) from `e2e/v7-switch.ts`, and
  `switchToV7` was deleted after migrating `e2e/penalty-takers.spec.ts` and
  `e2e/opponent-injuries.spec.ts` to run directly against live Engine 7.
- **(6b5 skeptics) Empty attacking pool in `goalKindOf`:** Fixed in `src/engine/match.ts` (`if
(pool.length === 0) return 1` in `kindScale`) with a RED-then-GREEN guard in `goal-kind.test.ts`
  (`9b02b64e` -> `69567762`).
- **(6a2) Retained `pd6` runs and `matchStory` river:** Recorded as an intentional boundary. The
  frozen `v6` bundle (`src/engine/versions/v6/index.ts`) exports `playCup`, `scoreSquad`, and
  `decodeToken` (not `story.ts`), and `storySource` in `src/ui/matchday/river.ts` gates the xG river
  on `cup.engineVersion === ENGINE_VERSION`. Shared `pd6` replays therefore omit the xG river just
  like `v1` to `v5`. Exporting `story.ts` in future engine freeze bundles is noted under Carryovers
  for Engine 8.

## Brief vs code

- **Calibration scripts importing `@/engine/coefficients-v7`:** `scripts/calibration/probe.mts`,
  `scripts/calibration/win-curve.mts`, `scripts/calibrate.mts`, and
  `scripts/audit/achievements-rate.mts` import `ENGINE_COEFFICIENTS_V7` from
  `@/engine/coefficients-v7`, and the Engine Scope table does not grant 6b9 edit access to
  `scripts/calibration/` or `scripts/audit/achievements-rate.mts`. Keeping
  `src/engine/coefficients-v7.ts` as a 5-line `structuredClone(ENGINE_COEFFICIENTS)` preserves
  `--coeffs v7` on every calibration script without touching out-of-scope files.
- **Legacy shootout property names in `src/engine/__tests__/depth.test.ts`:** Line 154 spread
  `{ ...ENGINE_COEFFICIENTS.shootout, baseConvertProb: 1, edgeMaxBonus: 0 }` (Engine 4 property
  names), which TypeScript allowed only while `EngineCoefficients` had extra optional fields.
  Updating to `base: 1, band: 0` fixed the type error and made all 36 penalties convert (`36` vs the
  accidental `27` at `base: 0.75`).
- **Latent Engine 6 assumptions in `scripts/e2e/render-pins.ts`:**
  - `injuryStaging()` did not filter `injury.side === "user"`, which matched an opponent injury in
    G1 under Engine 7 (opponent injuries have no `sub` incident). Adding `b.injury.side === "user"`
    restored the user injury pin (`QF 42' Roselia -> Kommo-o`).
  - `deepLink()` picked the very first user goal in G1 (`49'`), which in Engine 7 sits 6 minutes
    before the `55'` penalty goal (`< 44px` apart on the timeline scrubber, tripping Playwright's
    pointer-intercept check). Filtering for the first user goal with no other goal within 7 minutes
    selected `59'`.
  - `fatigue()` only passed `["t", m, 0, "p"]`; under Engine 7's split management, that left
    `subsManaged` false so the assistant subbed off tired starters at 60' and 75'. Adding a
    keeper-for-keeper sub `["u", m, 1, 0, 4]` keeps both `tacticManaged` and `subsManaged` true and
    preserves `R16`, `116'`, `spent: 2`, `tired: 10`.

## Gates at `97f355d2`

All commands run at `97f355d2` (code-identical to this docs commit):

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm test`: 249 test files passed, 2,174 tests passed.
- `pnpm vitest run src/engine`: 32 test files passed, 354 tests passed.
- `pnpm build`: exit 0 (1,025 Pokedex and 1,025 scouting records validated; production build clean).
- `pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: exit 0 (13 emitted
  golden replays passed, 1 dispatcher: `v1` 2, `v2` 2, `v3` 1, `v4` 2, `v5` 2, `v6` 2
  `2b26ee82...` / `eb366464...`, live `v7` 2 `c91cb42c...` / `2b7223f3...`).
- `node scripts/build/measure-retained-json.mjs .next/server/chunks`: exit 0 (`totalCopies: 4`,
  `totalPayloadBytes: 2891853`).
- `pnpm e2e:pins --check`: exit 0 (`e2e/pins.ts is current`).
- All nine `check:*` scripts exited 0: `check:mirrors`, `check:image-seam`, `check:image-packs`,
  `check:client-bundle` (`0` client files, `24` server files), `check:theme-contrast`,
  `check:theme-colors`, `check:dashes`, `check:breakpoints`, `check:theme-cvd`.
- `pnpm exec prettier --check`: exited 0 on all touched files.
- Playwright (`CI=1`, headless, port 3950 against fresh `pnpm build`):
  - Row and related specs (`e2e/v7-switch.spec.ts`, `e2e/data-split.spec.ts`,
    `e2e/grace-submit.spec.ts`, `e2e/seed-board.spec.ts`, `e2e/penalty-takers.spec.ts`,
    `e2e/opponent-injuries.spec.ts`, `e2e/set-pieces.spec.ts`, `e2e/touchline-intel.spec.ts`,
    `e2e/manager-mode.spec.ts`, `e2e/share.spec.ts`, `e2e/old-links.spec.ts`): 77 passed.
  - Full Playwright suite (`pnpm exec playwright test` across all projects): 1,102 passed, 67
    skipped, 0 failed (1,096 passed on the initial full run; the 6 failures across
    `head-to-head.spec.ts`, `injury-staging.spec.ts`, `prematch-merge.spec.ts`, and
    `replay-deep-links.spec.ts` were fixed at `97f355d2` and re-verified 16/16 green).

## NOT RUN

- Independent Red reviewer and Gemini review (`agy -p ... --model gemini-4-argon-high --effort high
--mode plan`), run by the coordinator.
- Calibration re-runs at reduced N on the head, preview deployment smoke checks, merge, and
  post-merge production verification, run by the coordinator.
- Hosted GitHub Actions CI (runs on push / PR).
- Owner phone check and screen reader pass: NOT RUN.

## Carryovers

- For Engine 8 freeze tooling (`scripts/engine/freeze-version.mts`): include `story.ts` in the
  frozen bundle roots and `RetainedEngineModule` interface if retained replays of future retired
  engines should render the xG river (`src/ui/matchday/river.ts`).
- From 6b8 for the owner: P1 good (+1.07 vs +3 to +6 under the P1/P2 conflict rule), P7 (+0.046 on
  KO W at gap 0 from Engine 7's penalty rules), P8 (68.78%, needs `match.roleFactor`), and the
  open-play goal-kind share (49.54% vs 58.8% in Engine 6).
