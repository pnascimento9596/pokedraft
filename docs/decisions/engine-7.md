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
  `until: "2026-10-23T04:00:00Z"`) with the note `Ranked on the engine 6 board.`.

## Scope and files

- **Engine constants, coefficients, and branch cleanup:**
  - `src/engine/types.ts`: `ENGINE_VERSION = "pokedraft-engine-7"`, `RUN_TOKEN_VERSION = 7`.
  - `src/engine/coefficients.ts`: `ENGINE_COEFFICIENTS` takes the calibrated 6b8 values
    (`manager.styleEdges` scaled by 1.15, `manager.counterLead = 1.1`, `manager.pressFade = { below:
70, perPoint: 0.004 }`, `shootout.band = 0.18`, `penalty.awardShare = 0.0745`,
    `takers.freeKickWeight = 1.5`, `goalKind = { header: 1, solo: 1 }`, `ladder.score.F = 992`), and
    removes the Engine 6 fields (`match.penaltyShare`, `penalty.missable`, `opponent.injuries`,
    `goalKind.weighted`, `manager.splitManaged`) from `EngineCoefficients` and
    `ENGINE_COEFFICIENTS`.
  - `src/engine/coefficients-v7.ts`: reduced to `export const ENGINE_COEFFICIENTS_V7:
EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS)` so calibration scripts
    (`scripts/calibration/probe.mts`, `scripts/calibration/win-curve.mts`, `scripts/calibrate.mts`,
    `scripts/audit/achievements-rate.mts`, which are outside this row's edit scope) keep working
    when passed `--coeffs v7`.
  - `src/engine/match.ts`: deletes the Engine 6 fallback branches (`manager.splitManaged`,
    `penalty.missable`, `opponent.injuries`, `goalKind.weighted`) in `playMatchCore` and
    `goalKindOf`, and guards an empty attacking pool in `kindScale` (`if (attackers.length === 0)
return 1`).
  - `src/engine/token.ts`: `managerSchemaFor(version)` keeps version 6 strict (tactic and sub tuples
    only via `v6ManagerSchema`) while version 7 accepts penalty (`"p"`) and free-kick (`"f"`) taker
    tuples, and `decodeToken(s, version = RUN_TOKEN_VERSION)` validates both the `pd<version>.`
    prefix and manager tuples against `version`.
- **Retained Engine 6 wiring and proxy:**
  - `src/engine/versions/index.ts` and `src/engine/versions/label.ts`: registers `RETAINED[6]` with
    an identity `adapt` (`CupResult` in Engine 7 only adds optional penalty incidents, rotations,
    and `oppEnergy`) and sets `RETAINED_TOKEN_VERSIONS = [1, 2, 3, 4, 5, 6]`.
  - `src/proxy.ts`: imports `decodeV6Token` from `./engine/versions/v6/src/engine/token` and
    validates `pd6.` tokens in `brokenShareLink` so `/r/pd6.<payload>` redirects to
    `/r/pd6?t=<payload>` and `/r/pd6?t=<payload>` rewrites to `/r/pd6.<payload>`.
  - `scripts/build/check-retained-replays.mts` and `scripts/build/measure-retained-json.mjs`: routes
    the `v6` golden tokens (`2b26ee82...` and `eb366464...`) through the retained `v6` bundle, adds
    the live `v7` golden replay check (`c91cb42c...` and `2b7223f3...`), and includes `"v6"` in
    retained JSON chunk measurement.
  - `scripts/audit/tokens.mts`: adds `6` to `RETAINED` and moves `7` to live (`GOLDEN_CUP8` and
    `GOLDEN_KANTO151`).
- **Grace window and leaderboard validation:**
  - `src/leaderboard/server/grace.ts`: enables `GRACE` for version `6` (`pokedraft-engine-6`,
    `flipDate: "2026-10-21"`, `until: "2026-10-23T04:00:00Z"`).
  - `src/leaderboard/server/handlers.ts` and `src/ui/read-token.ts`: in `parseSubmission`, rejects a
    live-version (`pd7`) Daily submission when `dailyDate < graceSetting.flipDate` with `409
ENGINE_VERSION_MISMATCH` (6g Red reviewer carryover), and passes the token's own version into
    `decodeToken(token, version)` in `parseSubmission`, `canonicalToken`, and `readVersioned` so
    retired `pd6` tokens are validated against `managerSchemaFor(6)` rather than the live version 7
    schema (6b3 skeptics carryover).
- **Touchline split, 65' stop removal, set-piece layout, and SoT fix:**
  - `src/ui/manager/intel.ts`: `assistantStatus(tacticManaged, subsManaged)` returns the four-state
    copy (`"Assistant: subs on, tactics on"`, `"Assistant: subs on, tactics off"`, `"Assistant: subs
off, tactics on"`, `"Assistant: subs off, tactics off"`).
  - `src/ui/manager/touchline.ts`: tracks `tacticManaged` (`tacticManagedAt`, tactic at
    `SPLIT_TACTIC_MINUTE = 45` or later) and `subsManaged` (`subsManagedAt`, any sub) separately on
    `Touchline`, and removes `SET_PIECES_ON` and `takesOver`.
  - `src/components/matchday/Touchline.tsx` and `src/components/matchday/MatchdayFlow.tsx`: renders
    `assistantStatus(line.tacticManaged, line.subsManaged)`, shows per-part takeover notes via
    `takeoverCopy` (`SUBS_TAKEOVER_COPY`, `TACTICS_TAKEOVER_COPY`, `TAKEOVER_COPY`), and mounts
    `SetPieceTakers` unconditionally in pre-match and on the touchline.
  - `src/ui/matchday/clock.ts` and `src/components/matchday/MatchPlayer.tsx`: removes `"fatigue"`
    from `StopKind` and the 65' auto-pause from `stopsFor` while keeping the half-time fatigue line,
    and excludes missed penalties (`b.penalty !== "missed"`) from `userShots` and `oppShots`.
  - `src/components/matchday/SetPieceTakers.module.css`: changes `.takers` to
    `grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))` so the two pickers stack cleanly
    on 320px and 308px touchline drawers without truncating `"Auto (best shooter)"` and sit side by
    side on wider containers.
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
 ❯ src/engine/__tests__/goldens.test.ts (7 tests | 4 failed) 143ms
   ❯ engine goldens (any byte of drift in draft, rating, match or cup output moves a hash) (7)
     × pins the engine version these goldens were cut against 3ms
     × byte-pins a full cup8 classic3 run 9ms
     × byte-pins a full kanto151 run 5ms
     × round-trips both tokens exactly 3ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens (any byte of drift in draft, rating, match or cup output moves a hash) > pins the engine version these goldens were cut against
AssertionError: expected 'pokedraft-engine-7' to be 'pokedraft-engine-6' // Object.is equality

Expected: "pokedraft-engine-6"
Received: "pokedraft-engine-7"

 ❯ src/engine/__tests__/goldens.test.ts:76:28
     74| describe("engine goldens (any byte of drift in draft, rating, match or…
     75|   it("pins the engine version these goldens were cut against", () => {
     76|     expect(ENGINE_VERSION).toBe("pokedraft-engine-6");
       |                            ^
     77|   });
     78|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens (any byte of drift in draft, rating, match or cup output moves a hash) > byte-pins a full cup8 classic3 run
AssertionError: expected '4adf37a539b999770100b571257b8368f2f64…' to be '91d7a44a3e489b6740655ea38cf75d4ad83d2…' // Object.is equality

Expected: "91d7a44a3e489b6740655ea38cf75d4ad83d2399b7cd53d706229ac8cebb30a4"
Received: "4adf37a539b999770100b571257b8368f2f644f3067dbe0887fa1276729ee985"

 ❯ src/engine/__tests__/goldens.test.ts:126:23
    124|     expect(CUP8_TOKEN.actions).toHaveLength(18);
    125|     expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqu…
    126|     expect(sha256(s)).toBe("91d7a44a3e489b6740655ea38cf75d4ad83d2399b7…
       |                       ^
    127|     expect(sha256(JSON.stringify(run))).toBe(
    128|       "2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e0…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens (any byte of drift in draft, rating, match or cup output moves a hash) > byte-pins a full kanto151 run
AssertionError: expected '553345e3d399a41c632f7eca364c6d5875a73…' to be '6b4f9d46c3b88d5dab4135b91913e37ba1b90…' // Object.is equality

Expected: "6b4f9d46c3b88d5dab4135b91913e37ba1b909b41e9efd227fd9bd217b935c14"
Received: "553345e3d399a41c632f7eca364c6d5875a732b551c372dc56c422566285e01f"

 ❯ src/engine/__tests__/goldens.test.ts:137:23
    135|     expect(KANTO_TOKEN.actions).toHaveLength(36);
    136|     expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqu…
    137|     expect(sha256(s)).toBe("6b4f9d46c3b88d5dab4135b91913e37ba1b909b41e…
       |                       ^
    138|     expect(sha256(JSON.stringify(run))).toBe(
    139|       "eb3664642c3c0bd9ee50cb4382182c73e070dad7896e620492d5b0e5b8b1274…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/engine/__tests__/goldens.test.ts > engine goldens (any byte of drift in draft, rating, match or cup output moves a hash) > round-trips both tokens exactly
AssertionError: expected { v: 7, settings: { …(5) }, …(2) } to deeply equal { v: 6, settings: { …(5) }, …(2) }

- Expected
+ Received

@@ -153,7 +153,7 @@
      ],
      "mode": "cup8",
      "order": "squadFirst",
      "style": "classic3",
    },
-   "v": 6,
+   "v": 7,
  }

 ❯ src/engine/__tests__/goldens.test.ts:146:30
    144|     for (const t of [CUP8_TOKEN, KANTO_TOKEN]) {
    145|       const s = encodeToken(t);
    146|       expect(decodeToken(s)).toEqual(t);
       |                              ^
    147|       expect(encodeToken(decodeToken(s))).toBe(s);
    148|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
```

Commit `0256f355` re-pinned `src/engine/__tests__/goldens.test.ts` (7 of 7 passed). Commit
`9f3cd902` then deleted the Engine 6 branches and rule flags from `src/engine/match.ts` and
`src/engine/coefficients.ts` with zero diff to `src/engine/__tests__/goldens.test.ts` (7 of 7
passed, byte-identical replay hashes `c91cb42c...` and `2b7223f3...`).

### 2. Empty attacking pool in `goalKindOf` (`9b02b64e` -> `69567762`)

Commit `9b02b64e` added a guard test in `src/engine/__tests__/goal-kind.test.ts` for an empty
attacking pool (`pool = []`, 1 of 5 failed):

```text
 ❯ src/engine/__tests__/goal-kind.test.ts (5 tests | 1 failed) 435ms
   ❯ zero goal-kind weights ignore the attack (catches non-zero baseline drift) (2)
     × an empty pool falls back to the unscaled kind shares instead of NaN open-play 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/engine/__tests__/goal-kind.test.ts > zero goal-kind weights ignore the attack (catches non-zero baseline drift) > an empty pool falls back to the unscaled kind shares instead of NaN open-play
AssertionError: expected 'open-play' to be 'header' // Object.is equality

Expected: "header"
Received: "open-play"

 ❯ src/engine/__tests__/goal-kind.test.ts:126:55
    124|
    125|   it("an empty pool falls back to the unscaled kind shares instead of …
    126|     expect(goalKindOf(0.05, [], ENGINE_COEFFICIENTS)).toBe("header");
       |                                                       ^
    127|     expect(goalKindOf(0.15, [], ENGINE_COEFFICIENTS)).toBe("free-kick"…
    128|     expect(goalKindOf(0.3, [], ENGINE_COEFFICIENTS)).toBe("solo");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

Commit `69567762` guarded `if (attackers.length === 0) return 1;` in `kindScale` (5 of 5 passed).

### 3. Retained `pd6.` share links in proxy (`f7548b0f` -> `0b3a6df2`)

Commit `f7548b0f` updated `src/__tests__/proxy.test.ts` to assert that `/r/pd6?t=<payload>` rewrites
to `/r/pd6.<payload>` and that `pd6.` golden share links pass through `brokenShareLink` (2 of 17
failed):

```text
 ❯ src/__tests__/proxy.test.ts (17 tests | 2 failed) 20ms
   ❯ passcode gate (catches a gate that breaks link previews or leaks the API) (17)
     × restores the payload from a message-safe query link before rendering the canonical run 5ms
     × passes a golden share link of every retained, live and flip-retained version (regression guard, no RED: behaviour already correct; catches pd6 links 404ing at the flip) 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > restores the payload from a message-safe query link before rendering the canonical run
AssertionError: expected 'https://pokedraft.test/run-not-found' to be 'https://pokedraft.test/r/pd6.W1siYyIs…' // Object.is equality

Expected: "https://pokedraft.test/r/pd6.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAiLDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwxODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsicCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXV0"
Received: "https://pokedraft.test/run-not-found"

 ❯ src/__tests__/proxy.test.ts:224:141
    225|
    226|   it("keeps a shipped engine-5 share link on its page once engine 6 is…
    227|     vi.stubEnv("FRIENDS_PASSCODE", "");
       |                     ^
    228|     expect(proxy(req(`/r/${GOLDEN_CUP8_V5}`)).headers.get("x-middlewar…
    229|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > passes a golden share link of every retained, live and flip-retained version (regression guard, no RED: behaviour already correct; catches pd6 links 404ing at the flip)
AssertionError: expected [ 6, …(1) ] to deeply equal [ 6, null ]

- Expected
+ Received

  [
    6,
-   null,
+   "https://pokedraft.test/run-not-found",
  ]

 ❯ src/__tests__/proxy.test.ts:242:83
    243|   });
    244|
    245|   it("keeps missing, malformed and unsupported query payloads on the r…
       |                                                                      ^
    246|     vi.stubEnv("FRIENDS_PASSCODE", "");
    247|     for (const path of [

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 15 passed (17)
```

Commit `0b3a6df2` wired `RETAINED[6]`, `RETAINED_TOKEN_VERSIONS = [1, 2, 3, 4, 5, 6]`, and
`decodeV6Token` in `src/proxy.ts` (59 of 59 passed across 4 test files).

### 4. Engine 6 grace window, pre-flip Daily rejection, and retired token schema (`2b53091d` -> `d399963c`)

Commit `2b53091d` added failing guards in `src/leaderboard/server/__tests__/grace.test.ts` for:

1. setting `GRACE` for Engine 6 (later shifted by one day in `ac067baf` to `flipDate: "2026-10-21"`,
   `until: "2026-10-23T04:00:00Z"`),
2. refusing a live `pd7` token on the previous day's pre-flip Daily with `409
ENGINE_VERSION_MISMATCH`, and
3. refusing a forged `pd6` token carrying an Engine 7 `"p"` taker tuple in `canonicalToken` and
   `parseSubmission` (`422 ILLEGAL_ACTION` without spending a rate-limit attempt; at `2b53091d` the
   test failed at line 163 on `expect(canonicalToken(forgedPd6)).toBeNull()` before reaching the
   `submit` assertion) (3 of 14 failed):

```text
 ❯ src/leaderboard/server/__tests__/grace.test.ts (14 tests | 3 failed) 2205ms
   ❯ grace window (catches runs played on the retired engine refused the moment the engine flips) (13)
     × sets GRACE for engine 6 until 2026-10-22T04:00:00Z with flipDate 2026-10-20 734ms
     × refuses a live-engine run for the previous day's pre-flip Daily with 409 (catches 6g note 3: pre-flip daily board mixing engines) 107ms
     × refuses a forged pd6 token carrying an engine-7 taker tuple in parseSubmission without spending an attempt (catches 6b3 skeptics) 88ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > sets GRACE for engine 6 until 2026-10-22T04:00:00Z with flipDate 2026-10-20
AssertionError: expected null to deeply equal { version: 6, …(3) }

- Expected:
{
  "engine": "pokedraft-engine-6",
  "flipDate": "2026-10-20",
  "until": "2026-10-22T04:00:00Z",
  "version": 6,
}

+ Received:
null

 ❯ src/leaderboard/server/__tests__/grace.test.ts:81:19
     79| describe("grace window (catches runs played on the retired engine refu…
     80|   it("sets GRACE for engine 6 until 2026-10-22T04:00:00Z with flipDate…
     81|     expect(GRACE).toEqual(GRACE_V6);
       |                   ^
     82|   });
     83|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > refuses a live-engine run for the previous day's pre-flip Daily with 409 (catches 6g note 3: pre-flip daily board mixing engines)
TypeError: Cannot read properties of undefined (reading 'code')
 ❯ src/leaderboard/server/__tests__/grace.test.ts:151:40
    149|     const token = scriptedToken(dailySettings("4-3-3"), dailySeed(toIs…
    150|     const res = await submit({ nickname: "Ash", token, engineVersion: …
    151|     expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VE…
       |                                        ^
    152|     expect(await rows()).toEqual([]);
    153|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > refuses a forged pd6 token carrying an engine-7 taker tuple in parseSubmission without spending an attempt (catches 6b3 skeptics)
AssertionError: expected 'pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5I…' to be null

- Expected:
null

+ Received:
"pd6.W1siYyIsIjQtMy0zIiwiMTIzNDU2Nzg5IiwiYyIsInMiXSwiZ3JhY2UtZm9yZ2VkLXRha2VyIixbWyJwIiw2ODEsInMwIl0sWyJwIiwyMzIsInMxIl0sWyJwIiwyMzAsInMyIl0sWyJwIiw4ODMsInMzIl0sWyJwIiwxMDI1LCJzNCJdLFsicCIsMjg2LCJzNSJdLFsicCIsMTAyMSwiczYiXSxbInAiLDY5MSwiczciXSxbInAiLDg0OSwiczgiXSxbInAiLDk0LCJzOSJdLFsicCIsNzU1LCJzMTAiXSxbInAiLDY0OCwiYjAiXSxbInAiLDk5MCwiYjEiXSxbInAiLDc0NSwiYjIiXSxbInAiLDY4MCwiYjMiXSxbInAiLDM4OSwiYjQiXV0sW1sicCIsMCwwLDEwXV1d"

 ❯ src/leaderboard/server/__tests__/grace.test.ts:163:39
    161|       }),
    162|     );
    163|     expect(canonicalToken(forgedPd6)).toBeNull();
       |                                       ^
    164|     const res = await submit({
    165|       nickname: "Ash",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  1 failed (1)
      Tests  3 failed | 11 passed (14)
```

Commit `d399963c` enabled `GRACE`, added the `dailyDate < graceSetting.flipDate` guard in
`parseSubmission`, and passed the token version to `decodeToken(token, version)` in
`parseSubmission`, `canonicalToken`, and `readVersioned` (66 of 66 passed across `grace.test.ts`
and `handlers.test.ts`).

### 5. Split assistant status, 65' stop removal, and missed-penalty SoT (`5d431a45` -> `e2cacbd5`)

Commit `5d431a45` added failing guards across `src/ui/manager/__tests__/intel.test.ts`,
`src/ui/matchday/__tests__/clock.test.ts`, `src/ui/manager/__tests__/touchline.test.ts`,
`src/components/matchday/__tests__/Touchline.test.tsx`, and
`src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx` (8 of 61 failed):

```text
 ❯ src/ui/manager/__tests__/intel.test.ts (14 tests | 1 failed) 6ms
   ❯ assistantStatus (catches a status line that collapses the split assistant states) (1)
     × reports each half of the assistant independently: subs then tactics 2ms
 ❯ src/ui/matchday/__tests__/clock.test.ts (9 tests | 1 failed) 7ms
   ❯ no 65' fatigue stop under engine 7 (catches the interim engine 6 stop lingering after splitManaged ships) (1)
     × stops only at half-time even when an outfield starter is below 65 energy at 65' 4ms
 ❯ src/ui/manager/__tests__/touchline.test.ts (21 tests | 2 failed) 68ms
   ❯ touchlineAt (catches a touchline that offers a used bench player or counts the assistant's pending change) (7)
     × tracks tacticManaged (tactic at >= 45') and subsManaged (any sub) separately 5ms
   ❯ nominated takers on the touchline (catches a nomination that takes over the assistant) (4)
     × records { type: 'taker', match: 0, minute: 0, set: 'penalty', slot: 10 } and leaves both assistant halves on 5ms
 ❯ src/components/matchday/__tests__/Touchline.test.tsx (15 tests | 2 failed) 218ms
   ❯ Touchline (catches a panel that offers used players or records nothing) (5)
     × closes the substitution once all five are used, and says the assistant has stepped back 14ms
   ❯ Touchline intelligence (catches a touchline that hides the assistant's state, the bench's fit or a booking) (6)
     × states each half of the assistant's engine 7 behaviour and the matching takeover copy 10ms
 ❯ src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx (2 tests | 2 failed) 414ms
   ❯ half-time fatigue line without a 65' stop (catches the interim 65' stop lingering or half-time losing its fatigue line) (2)
     × never stops at 65' even after a kickoff tactic when outfield players are below 65 energy 402ms
     × excludes missed penalties from Shots on Target while counting saved penalties (catches 6b3 Red SoT bug) 12ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx > half-time fatigue line without a 65' stop (catches the interim 65' stop lingering or half-time losing its fatigue line) > never stops at 65' even after a kickoff tactic when outfield players are below 65 energy
AssertionError: expected <div class="prompt" …(3)>…(2)</div> to be null
 ❯ src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx:111:41

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/8]⎯

 FAIL  src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx > half-time fatigue line without a 65' stop (catches the interim 65' stop lingering or half-time losing its fatigue line) > excludes missed penalties from Shots on Target while counting saved penalties (catches 6b3 Red SoT bug)
AssertionError: expected [ '1 SoT', '1 SoT' ] to deeply equal [ '0 SoT', '1 SoT' ]
 ❯ src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx:154:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/8]⎯

 FAIL  src/components/matchday/__tests__/Touchline.test.tsx > Touchline (catches a panel that offers used players or records nothing) > closes the substitution once all five are used, and says the assistant has stepped back
TestingLibraryElementError: Unable to find an element by: [data-testid="takeover"]
 ❯ src/components/matchday/__tests__/Touchline.test.tsx:76:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  src/components/matchday/__tests__/Touchline.test.tsx > Touchline intelligence (catches a touchline that hides the assistant's state, the bench's fit or a booking) > states each half of the assistant's engine 7 behaviour and the matching takeover copy
AssertionError: expected 'Assistant: subs on, tactics on' to be 'Assistant: subs off, tactics on' // Object.is equality
 ❯ src/components/matchday/__tests__/Touchline.test.tsx:163:64

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  src/ui/manager/__tests__/intel.test.ts > assistantStatus (catches a status line that collapses the split assistant states) > reports each half of the assistant independently: subs then tactics
AssertionError: expected 'Assistant: subs off, tactics off' to be 'Assistant: subs on, tactics off' // Object.is equality
 ❯ src/ui/manager/__tests__/intel.test.ts:118:82

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  src/ui/manager/__tests__/touchline.test.ts > touchlineAt (catches a touchline that offers a used bench player or counts the assistant's pending change) > tracks tacticManaged (tactic at >= 45') and subsManaged (any sub) separately
AssertionError: expected { Object (minute, tactic, ...) } to match object { tacticManaged: false, …(1) }
 ❯ src/ui/manager/__tests__/touchline.test.ts:178:52

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/8]⎯

 FAIL  src/ui/manager/__tests__/touchline.test.ts > nominated takers on the touchline (catches a nomination that takes over the assistant) > records { type: 'taker', match: 0, minute: 0, set: 'penalty', slot: 10 } and leaves both assistant halves on
AssertionError: expected { Object (minute, tactic, ...) } to match object { tacticManaged: false, …(1) }
 ❯ src/ui/manager/__tests__/touchline.test.ts:447:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/8]⎯

 FAIL  src/ui/matchday/__tests__/clock.test.ts > no 65' fatigue stop under engine 7 (catches the interim engine 6 stop lingering after splitManaged ships) > stops only at half-time even when an outfield starter is below 65 energy at 65'
AssertionError: expected [ 'halftime', 'fatigue:65' ] to deeply equal [ 'halftime' ]
 ❯ src/ui/matchday/__tests__/clock.test.ts:109:158

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯


 Test Files  5 failed (5)
      Tests  8 failed | 53 passed (61)
```

Commit `e2cacbd5` implemented the four-state `assistantStatus`, per-part takeover copy
(`TAKEOVER_COPY`, `SUBS_TAKEOVER_COPY`, `TACTICS_TAKEOVER_COPY` via `takeoverCopy`), 65' fatigue
stop removal, and missed-penalty SoT exclusion (61 of 61 passed across all 5 files).

## Calibration pins (from 6b8 at `c1f4f838`)

Copied from `docs/reports/engine-7/calibration.json` (run at `c1f4f838` and sha256-matched by the
6b8 independent Red reviewer; `ENGINE_COEFFICIENTS` at head carries the exact same values):

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

Every golden draft payload (`CUP8_TOKEN` on seed `golden-cup8`, `KANTO_TOKEN` on seed
`golden-kanto151`, and `panel-0` to `panel-19`) is unchanged, now encoded with `v: 7` (`pd7.`) and
replayed through Engine 7:

- `CUP8_TOKEN` (`golden-cup8`):
  - Token SHA moves from `91d7a44a3e489b6740655ea38cf75d4ad83d2399b7cd53d706229ac8cebb30a4` (`pd6.`)
    to `4adf37a539b999770100b571257b8368f2f644f3067dbe0887fa1276729ee985` (`pd7.`) because the wire
    prefix changed from `pd6.` to `pd7.`.
  - Outcome `[run.cup.rating.score, run.cup.wins, run.cup.draws, run.cup.losses, run.cup.finish]`
    stayed `[593, 5, 0, 1, "QF"]` (`[593, 5, "QF"]`). Why: `src/scouting`, `src/data`, draft RNG,
    and `ENGINE_COEFFICIENTS.rating` are unchanged so `rating.score` stays `593`; across the six
    played matches, the user wins the first five matches under both engines (`G1: 1-0` to `3-0`,
    `G2: 6-0` to `7-0`, `G3: 6-1`, `R32: 6-2`, `R16: 1-0` to `2-0`) and in `QF` draws `0-0` after
    extra time and loses `4-5` on penalties under both engines.
  - Replay SHA moves from `2b26ee82cbf26da1d64e1c4978b25e846537085747d3845d78b555cb7d8f7e05` to
    `c91cb42cac62bec6e43a649c4e914a1208108ef94a92534acfd900d13df1fe30` because `engine` (`"pokedraft-engine-7"`),
    the `G1`/`G2`/`R16` goal totals, weighted goal kinds, penalty incidents, opponent injuries and
    rotations, and `oppEnergy` on each window snapshot change in the serialized `CupResult`.
- `KANTO_TOKEN` (`golden-kanto151`):
  - Token SHA moves from `6b4f9d46c3b88d5dab4135b91913e37ba1b909b41e9efd227fd9bd217b935c14` (`pd6.`)
    to `553345e3d399a41c632f7eca364c6d5875a732b551c372dc56c422566285e01f` (`pd7.`).
  - Outcome `[kanto.cup.rating.score, kanto.cup.wins, kanto.cup.draws, kanto.cup.losses,
kanto.cup.finish]` stayed `[480, 3, 0, 1, "R32"]` (`[480, 3, "R32"]`). Why: `rating.score` stays
    `480` because draft RNG, scouting, and rating coefficients are unchanged, and all four played
    matches keep the same scorelines and outcomes under both engines (`G1: 3-0 [W]`, `G2: 3-0 [W]`,
    `G3: 1-0 [W]`, `R32: 1-2 [L]`).
  - Replay SHA moves from `eb3664642c3c0bd9ee50cb4382182c73e070dad7896e620492d5b0e5b8b12747` to
    `2b7223f3888259596fd24740506564cdca93ff13e9c035ecb417d681c2858a4d` because `engine`, goal
    kinds, opponent rotations, and `oppEnergy` change inside the match objects.
- `20-run panel` (`panel-0` to `panel-19`): the test (`pins the Team Scores of a 20-run seeded
  panel`, `src/engine/__tests__/goldens.test.ts` lines 151-162) pins only
  `replay(token(settings, "panel-${i}")).cup.rating.score` (`[362, 473, 487, 521, 428, 437, 376,
592, 391, 498, 590, 502, 497, 432, 563, 398, 491, 555, 456, 484]`), which did not move because
  `src/scouting`, `src/data`, draft RNG, and `ENGINE_COEFFICIENTS.rating` are unchanged.

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
  `assistantStatus` copy and per-part takeover notes (`TAKEOVER_COPY`, `SUBS_TAKEOVER_COPY`,
  `TACTICS_TAKEOVER_COPY` via `takeoverCopy` in `src/components/matchday/Touchline.tsx`). The 65'
  interim fatigue stop is removed.
- **Scout edge badge margin (`EDGE_MARGIN`):**
  In `src/ui/manager/intel.ts`, `tacticEdge` compares `own / gives` against `1 + EDGE_MARGIN` and
  `1 - EDGE_MARGIN` with `EDGE_MARGIN = 0.04`. With `styleEdges` scaled by 1.15, each opponent
  style still puts at most two tactics into `"favourable"` (pressing: Counter `1.115 / 0.8275 =
1.347` and Press `1.08 / 1.02 = 1.059`; possession: Press `1.2875 / 0.9425 = 1.366` and Counter
  `1.0 / 0.77 = 1.299`; direct: Defend `0.655 / 0.4825 = 1.358`; balanced: `null`), guarded in
  `src/ui/manager/__tests__/intel.test.ts`. `EDGE_MARGIN` stays `0.04`.
- **Achievements (Giant killer):**
  6b8 measured Giant killer at 2.5% (5/200), inside the 2% to 20% target band, so the threshold
  stays at `100`.

## Carryovers closed

- **(6g Red reviewer, note 3) `parseSubmission` allowed a live-version Daily submission for a
  pre-flip date:** Fixed in `src/leaderboard/server/handlers.ts` with a RED-then-GREEN guard in
  `src/leaderboard/server/__tests__/grace.test.ts` (`2b53091d` -> `d399963c`). When `grace === null`
  and `graceSetting !== null` and `dailyDate !== null && dailyDate < graceSetting.flipDate`,
  `parseSubmission` rejects the submission with `409 ENGINE_VERSION_MISMATCH`.
- **(6b3 skeptics, REQUIRED) `parseSubmission`, `canonicalToken`, and `readVersioned` validated
  retired `pd6` tokens against the live schema:** Fixed in `src/leaderboard/server/handlers.ts` and
  `src/ui/read-token.ts` with a RED-then-GREEN guard in
  `src/leaderboard/server/__tests__/grace.test.ts` (`2b53091d` -> `d399963c`). All three now pass
  the token's version to `decodeToken(token, version)`, so a `pd6` token carrying `"p"` or `"f"`
  taker tuples is rejected by `managerSchemaFor(6)` (`null` in `canonicalToken` and `readAnyToken`,
  and `422 ILLEGAL_ACTION` from the frozen `v6` codec in `parseSubmission` without spending a
  rate-limit attempt).
- **(6b3 skeptics, optional) Live core at Engine 6 coefficients accepted a taker action:** Closed as
  moot in 6b9 because the Engine 6 branches are deleted from `src/engine/match.ts` and Engine 7
  makes taker nominations live.
- **(6b3) "Your calls" and nominations:** `yourCallsRuns` and `callLabel` in
  `src/ui/manager/your-calls.ts` (landed in 6b3 and guarded in
  `src/ui/manager/__tests__/your-calls.test.ts`) include `"taker"` actions in `callsIn` and label
  them `"your penalty taker from kickoff"` or `"your free-kick taker at 60'"`, while
  `touchlineAt` in `src/ui/manager/touchline.ts` leaves `tacticManaged` and `subsManaged` false on a
  taker nomination (guarded in `src/ui/manager/__tests__/touchline.test.ts`).
- **(6b3 Red) Missed penalty counted as a shot on target:** Fixed in
  `src/components/matchday/MatchPlayer.tsx` (`userShots` and `oppShots` exclude
  `b.penalty === "missed"`) with a RED-then-GREEN guard in
  `src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx` (`5d431a45` -> `e2cacbd5`).
- **(6b3 Red) 320px touchline `SetPieceTakers` truncation:** Fixed in
  `src/components/matchday/SetPieceTakers.module.css` using `grid-template-columns:
repeat(auto-fit, minmax(210px, 1fr))` on `.takers` so the selects stack into a single full-width
  column (296px at 320px, 284px at 308px) on narrow touchline sheets and sit side by side on wider
  containers, preserving the full `"Auto (best shooter)"` copy. Proven at 390px, 360px, 320px, and
  308px in `e2e/penalty-takers.spec.ts` and `docs/reports/engine-7/`.
- **(6b4) `e2e/data-split.spec.ts` chunk glob and `switchToV7` removal:** `e2e/data-split.spec.ts`
  now imports `CLIENT_CHUNKS` (`**/_next/static/**/chunks/**`) from `e2e/v7-switch.ts`, and
  `switchToV7` was deleted after migrating `e2e/penalty-takers.spec.ts` and
  `e2e/opponent-injuries.spec.ts` to run directly against live Engine 7.
- **(6b5 skeptics) Empty attacking pool in `goalKindOf`:** Fixed in `src/engine/match.ts` (`if
(attackers.length === 0) return 1` in `kindScale`) with a RED-then-GREEN guard in
  `src/engine/__tests__/goal-kind.test.ts` (`9b02b64e` -> `69567762`).
- **(6a2) Retained `pd6` runs and `matchStory` river:** Recorded as an intentional boundary. The
  frozen `v6` bundle (`src/engine/versions/v6/index.ts`) exports `replay`, `ENGINE_VERSION`,
  `RUN_TOKEN_VERSION`, and `BUNDLE_MARKER`, and `storySource` in `src/ui/matchday/river.ts` returns
  `null` when `cup.engine !== ENGINE_VERSION`. Shared `pd6` replays therefore omit the xG river just
  like `v1` to `v5`. Exporting `matchStory` (`src/engine/story.ts`) in future engine freeze bundles
  is noted under Carryovers for Engine 8.

## Brief vs code

- **Calibration scripts importing `@/engine/coefficients-v7`:** `scripts/calibration/probe.mts`,
  `scripts/calibration/win-curve.mts`, `scripts/calibrate.mts`, and
  `scripts/audit/achievements-rate.mts` import `ENGINE_COEFFICIENTS_V7` from
  `@/engine/coefficients-v7`, and the Engine Scope table does not grant 6b9 edit access to
  `scripts/calibration/` or `scripts/audit/achievements-rate.mts`. Keeping
  `src/engine/coefficients-v7.ts` as `structuredClone(ENGINE_COEFFICIENTS)` preserves `--coeffs v7`
  on every calibration script without touching out-of-scope files.
- **Legacy shootout property names in `src/engine/__tests__/depth.test.ts`:** Line 154 spread
  `{ ...ENGINE_COEFFICIENTS.shootout, baseConvertProb: 1, edgeMaxBonus: 0 }` (Engine 4 property
  names), which TypeScript allowed only while `EngineCoefficients` had extra optional fields.
  Updating to `base: 1, band: 0` fixed the type error and made all 36 penalties convert (`36` vs the
  accidental `27` at `base: 0.75`).
- **Latent Engine 6 assumptions in `scripts/e2e/render-pins.ts` and `e2e/copy-pass.spec.ts`:**
  - `injuryStaging()` did not filter `injury.side === "user"`, which matched an opponent injury in
    G1 under Engine 7 (opponent injuries have no `sub` incident). Adding `b.injury.side === "user"`
    restored the user injury pin (`QF 42' Roselia -> Kommo-o`).
  - `deepLink()` picked the very first user goal in G1 (`49'`), which in Engine 7 sits 6 minutes
    before the `55'` penalty goal (`< 44px` apart on the timeline scrubber, tripping Playwright's
    pointer-intercept check). Filtering for the first user goal with no other goal within 7 minutes
    selected `59'` (`before: "2-0"`, `after: "3-0"`).
  - `e2e/copy-pass.spec.ts` hardcoded `"1-0"` after navigating to `DEEP_LINK.href`, which failed at
    `ac067baf` once `DEEP_LINK` moved to the `59'` goal (`after: "3-0"`). Commit `b4749fda` updated
    `e2e/copy-pass.spec.ts` to assert `DEEP_LINK.after` (`"3-0"`) while checking
    `expect(DEEP_LINK.after).toMatch(/^\d+-\d+$/)`.
  - `fatigue()` only passed `["t", m, 0, "p"]`; under Engine 7's split management, that left
    `subsManaged` false so the assistant subbed off tired starters at 60' and 75'. Adding a
    keeper-for-keeper sub `["u", m, 1, 0, 4]` keeps both `tacticManaged` and `subsManaged` true and
    preserves `R16`, `116'`, `spent: 2`, `tired: 10`.

## Gates at `77736a9d`

All commands run at `77736a9d` (code-identical to this docs commit), with raw outputs saved under
`/private/tmp/claude-501/-Users-paulo-Projects-pokedraft/efd4af8c-9b46-4d17-b905-07bae2bb896e/scratchpad/fix-6b9-logs/`:

- `pnpm lint`: exit 0 (`lint.log`).
- `pnpm typecheck`: exit 0 (`typecheck.log`).
- `pnpm test`: 249 test files passed, 2,174 tests passed (`test.log`).
- `pnpm vitest run src/engine`: 32 test files passed, 354 tests passed (`test-engine.log`).
- `pnpm build`: exit 0 (1,025 Pokedex and 1,025 scouting records validated; production build clean,
  `build.log`).
- `pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: exit 0 (13 emitted
  golden replays passed, 1 dispatcher: `v1` 2, `v2` 2, `v3` 1, `v4` 2, `v5` 2, `v6` 2
  `2b26ee82...` / `eb366464...`, live `v7` 2 `c91cb42c...` / `2b7223f3...`,
  `check-retained-replays.log`).
- `node scripts/build/measure-retained-json.mjs .next/server/chunks`: exit 0 (`totalCopies: 4`,
  `totalPayloadBytes: 2891853`, `measure-retained-json.log`).
- `pnpm e2e:pins --check`: exit 0 (`e2e/pins.ts is current`, `e2e-pins-check.log`).
- All nine `check:*` scripts exited 0: `check:mirrors`, `check:image-seam`, `check:image-packs`,
  `check:client-bundle` (`0` client files, `24` server files), `check:theme-contrast`,
  `check:theme-colors`, `check:dashes`, `check:breakpoints`, `check:theme-cvd` (`check-*.log`).
- `pnpm exec prettier --check`: exited 0 on all touched files (`prettier-check.log`).
- Playwright (`CI=1`, headless, port 3955 against fresh `pnpm build`):
  - `e2e/copy-pass.spec.ts` (`--project=chromium`): 7 passed (`copy-pass.log`; failed 1 of 7 at
    `ac067baf` before `b4749fda`).
  - Full Chromium project (`CI=1 PLAYWRIGHT_PORT=3955 pnpm exec playwright test --project=chromium`):
    640 passed, 5 skipped, 0 failed (`playwright-chromium.log`).

## NOT RUN

- Non-Chromium Playwright projects (mobile-webkit, etc.) in this fix round.
- Independent Red reviewer and Gemini review (`agy -p ... --model gemini-4-argon-high --effort high
--mode plan`), run by the coordinator.
- Calibration re-runs at reduced N on the head, preview deployment smoke checks, merge, and
  post-merge production verification, run by the coordinator.
- Hosted GitHub Actions CI (runs on push / PR).
- Owner phone check and screen reader pass: NOT RUN.

## Carryovers

- For Engine 8 freeze tooling (`scripts/engine/freeze-version.mts`): include `src/engine/story.ts`
  (`matchStory`) in the frozen bundle roots and `RetainedBundle` interface if retained replays of
  future retired engines should render the xG river (`src/ui/matchday/river.ts`).
- From 6b8 for the owner: P1 good (+1.07 vs +3 to +6 under the P1/P2 conflict rule), P7 (+0.046 on
  KO W at gap 0 from Engine 7's penalty rules), P8 (68.78%, needs `match.roleFactor`), and the
  open-play goal-kind share (49.54% vs 58.8% in Engine 6).
