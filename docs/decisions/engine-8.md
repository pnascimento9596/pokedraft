# Engine 8 flip (8x)

Wave 7 row 8x, Red. Branch `feat/flip-engine-8` off `origin/main` at `2c288bbc` (the 8e squash, PR #173). The first commit (`e0223cc8`) records the PR #173 merge in `STATE.md`.

## Who notices

Every player starting a new run or viewing a board:

- New runs play on Engine 8 (`pokedraft-engine-8`) and encode `pd8.` tokens.
- Defend against a direct side now uses the calibrated V8 style edge (`directDefendOwn: 1.05`, `styleEdges.direct.defend: [1.05, 0.52]`), up from Engine 7's `0.655` and `[0.655, 0.4825]`.
- Shared `pd7` links (`/r/pd7?t=...` and legacy `/r/pd7.<payload>`) continue to replay identically through the frozen `v7` engine bundle.
- Leaderboard rows from Engine 7 show the `Engine v7` chip alongside the `All engines` toggle.
- An in-flight Engine 7 run can still submit during the grace window (`flipDate: "2026-10-22"`, `until: "2026-10-24T04:00:00Z"`) with the note `Ranked on the engine 7 board.`.

## Scope and files

- **Engine constants and coefficients:**
  - `src/engine/types.ts`: `ENGINE_VERSION = "pokedraft-engine-8"`, `RUN_TOKEN_VERSION = 8`.
  - `src/engine/coefficients.ts`: `ENGINE_COEFFICIENTS.manager.directDefendOwn` is `1.05` and `ENGINE_COEFFICIENTS.manager.styleEdges.direct.defend` is `[1.05, 0.52]`. A comment above `directDefendOwn` documents why `directDefendOwn` and `styleEdges.direct.defend[0]` must stay equal (`src/engine/match.ts` reads `directDefendOwn` when the edge exists; `src/ui/manager/intel.ts` and `scripts/calibration/probe-modes.ts` read it unconditionally).
  - `src/engine/coefficients-v7.ts`: holds a literal deep copy of the Engine 7 live values (`directDefendOwn: 0.655`, `styleEdges.direct.defend: [0.655, 0.4825]`) so `loadCoefficients("v7")` in `scripts/calibration/coeffs.ts` and tests importing `ENGINE_COEFFICIENTS_V7` keep Engine 7 semantics.
  - `src/engine/coefficients-v8.ts`: reduced to `export const ENGINE_COEFFICIENTS_V8: EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS);` while keeping the `client-import` ESLint boundary in `eslint.config.mjs`.
- **Retained Engine 7 wiring and proxy:**
  - `src/engine/versions/index.ts`: registers `RETAINED[7]` with an identity `adapt` (`CupResult` in Engine 8 adds no fields over Engine 7; Engine 8 changes only coefficients) and lazily imports `./v7`.
  - `src/engine/versions/label.ts` and `src/ui/manager/coached.ts`: sets `RETAINED_TOKEN_VERSIONS = [1, 2, 3, 4, 5, 6, 7]` and `MANAGER_TOKEN_VERSIONS = [6, 7, 8]`.
  - `src/proxy.ts`: imports `decodeV7Token` from `./engine/versions/v7/src/engine/token` and validates `pd7.` tokens in `brokenShareLink`: `/r/pd7?t=<payload>` rewrites to `/r/pd7.<payload>`, a valid `/r/pd7.<payload>` passes through, and a malformed one redirects to `/run-not-found`.
  - `scripts/build/measure-retained-json.mjs` and `scripts/build/check-retained-replays.mts`: adds `"v7"` to `VERSIONS`, routes the `v7` golden tokens (`c91cb42c...` and `2b7223f3...`) through the retained `v7` bundle, and adds the live `v8` golden replay checks (`21f36d60...` and `de30f335...`).
  - `scripts/audit/tokens.mts` and `scripts/audit/tokens.test.ts`: `GOLDEN_CUP8_TOKEN_SHA256` moves from `4adf37a539b999770100b571257b8368f2f644f3067dbe0887fa1276729ee985` to `ae0d6830dfa84bcbad2be1fbbedb6ab3ed4d38a4e6ed000d529af87f8a443f0c`. The Engine 8 golden fixtures `GOLDEN_CUP8_V8` and `GOLDEN_KANTO151_V8` are exported from `src/engine/versions/__tests__/fixtures.ts` and re-exported in `src/leaderboard/server/__tests__/fixtures.ts`.
- **Grace window:**
  - `src/leaderboard/server/grace.ts`: sets `GRACE = { version: 7, engine: "pokedraft-engine-7", until: "2026-10-24T04:00:00Z", flipDate: "2026-10-22" }`.

## RED commit and verbatim output (`a3879716` -> `2882b283`)

Commit `a3879716` (`test(engine): add failing guards for engine 8 flip, retained v7, and grace`) added the failing tests across 11 files (`src/__tests__/proxy.test.ts`, `src/app/api/health/__tests__/route.test.ts`, `src/engine/__tests__/coefficient-boundaries.test.ts`, `src/engine/__tests__/direct-defend.test.ts`, `src/engine/__tests__/token.test.ts`, `src/engine/versions/__tests__/fixtures.ts`, `src/engine/versions/__tests__/lazy-loading.test.ts`, `src/engine/versions/__tests__/versions.test.ts`, `src/leaderboard/server/__tests__/fixtures.ts`, `src/leaderboard/server/__tests__/grace.test.ts`, `src/ui/manager/__tests__/coached.test.ts`). Running Vitest against those 9 test files failed 41 of 137 tests (logged at `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/vitest-red.log`):

```text
 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > restores the payload from a message-safe query link before rendering the canonical run
AssertionError: expected 'https://pokedraft.test/run-not-found' to be 'https://pokedraft.test/r/pd8.W1siYyIs…' // Object.is equality

 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > passes a golden share link of every retained, live and flip-retained version (regression guard, no RED: behaviour already correct; catches pd7 links 404ing at the flip)
AssertionError: expected [ 8, …(1) ] to deeply equal [ 8, null ]

 FAIL  src/app/api/health/__tests__/route.test.ts > GET /api/health > returns 200 with null deployment fields and current engine metadata when unset
AssertionError: expected { sha: null, env: null, …(3) } to deeply equal { sha: null, env: null, …(3) }
-   "engine": "pokedraft-engine-8",
+   "engine": "pokedraft-engine-7",

 FAIL  src/engine/__tests__/direct-defend.test.ts > defend against direct style edge (engine 8 flip) > promotes the calibrated V8 direct-Defend edge [1.05, 0.52] to live ENGINE_COEFFICIENTS and retains engine 7 in ENGINE_COEFFICIENTS_V7
AssertionError: expected 0.655 to be 1.05 // Object.is equality

 FAIL  src/engine/__tests__/direct-defend.test.ts > defend against direct style edge (engine 8 flip) > scales the user's Defend chance against a direct side by directDefendOwn (catches the field being read by nothing)
AssertionError: expected 0.0010903145032324785 to be 0.0017478324097619886 // Object.is equality

 FAIL  src/engine/versions/__tests__/versions.test.ts > replayAny (catches a retained token failing to route or losing its engine tag) > replays the golden v7 cup8 and kanto151 tokens with byte-identical output
RunTokenError: Unsupported token version: "pd8.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAiLDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwxODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsicCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXV0"

 FAIL  src/leaderboard/server/__tests__/grace.test.ts > grace window (catches runs played on the retired engine refused the moment the engine flips) > sets GRACE for engine 7 until 2026-10-24T04:00:00Z with flipDate 2026-10-22
AssertionError: expected { version: 6, …(3) } to deeply equal { version: 7, …(3) }

 Test Files  9 failed (9)
      Tests  41 failed | 96 passed (137)
```

Commit `2882b283` (`feat(engine): switch live engine to v8, wire retained v7, and set engine 7 grace`) flipped the constants, coefficients, retained `v7` wiring, proxy, and grace window, turning all 9 test files (137 of 137 tests) GREEN (`/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/vitest-switch-green.log`).

## Parity proof (live `matchStory` with `ENGINE_COEFFICIENTS_V7` vs frozen `v7.matchStory`)

 Engine 8 adds no engine rule flags and deletes no branches (`src/engine/match.ts` is untouched in this PR). To prove that the live engine code is byte-for-byte identical to frozen `v7` when passed `ENGINE_COEFFICIENTS_V7`, `src/engine/__tests__/direct-defend.test.ts` compares `matchStory(seed, m, { lineup, mode: "cup8", manager }, ENGINE_COEFFICIENTS_V7)` against `v7.matchStory(seed, m, { lineup, mode: "cup8", manager })` across every match index `0..7` once unmanaged (`manager: undefined`) and once with Defend held at `0'` and `45'` (`manager: [{ type: "tactic", match: m, minute: 0, tactic: "defend" }, { type: "tactic", match: m, minute: 45, tactic: "defend" }]`), capturing thrown unplayed-round errors as results (`/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/parity-200.log`):

| Sweep                           | Stories | Errors in both (notPlayed) | Played stories | Defend vs direct played | Mismatches |
| ------------------------------- | ------- | -------------------------- | -------------- | ----------------------- | ---------- |
| 50 seeds (`panel-0..49`, test)  | 800     | 316                        | 484            | 73                      | 0          |
| 200 seeds (`panel-0..199`, log) | 3,200   | 1,286                      | 1,914          | 286                     | 0          |

## Goldens, unit tests, and `e2e/pins.ts` diff (`0451c7ee`)

### `src/engine/__tests__/goldens.test.ts`

Logged at `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/golden-hashes-v8.log`:

- `CUP8_TOKEN` (`golden-cup8`):
  - Token sha256 moves from `4adf37a539b999770100b571257b8368f2f644f3067dbe0887fa1276729ee985` (`pd7.`) to `ae0d6830dfa84bcbad2be1fbbedb6ab3ed4d38a4e6ed000d529af87f8a443f0c` (`pd8.`).
  - Outcome `[run.cup.rating.score, run.cup.wins, run.cup.finish]` stays `[593, 5, "QF"]`. In `QF` (against direct opponent Driftveil FC), the user never leads by 2+ goals from `65'` on, so the unmanaged assistant never switches to `defend` and every match event in `golden-cup8` is unchanged.
  - Replay sha256 moves from `c91cb42cac62bec6e43a649c4e914a1208108ef94a92534acfd900d13df1fe30` to `21f36d607fdd6a1b2a79c61707e3ccfcaf448175470b8eb4c51f552467946528` because `cup.engine` changes from `"pokedraft-engine-7"` to `"pokedraft-engine-8"`.
- `KANTO_TOKEN` (`golden-kanto151`):
  - Token sha256 moves from `553345e3d399a41c632f7eca364c6d5875a732b551c372dc56c422566285e01f` (`pd7.`) to `4c1a9b94a4d03a60748fd8ea0fa17d87c66170725a37c5a5fc5cf22ce7b21e62` (`pd8.`).
  - Outcome `[kanto.cup.rating.score, kanto.cup.wins, kanto.cup.finish]` stays `[480, 3, "R32"]`.
  - Replay sha256 moves from `2b7223f3888259596fd24740506564cdca93ff13e9c035ecb417d681c2858a4d` to `de30f3358babc4c1b07cbdb843f78d8fb4e879aa1fb4a8d72eeaa9e7ba6aac98` because `cup.engine` changes to `"pokedraft-engine-8"`.
- `20-run panel` (`panel-0` to `panel-19`): Team Scores `[362, 473, 487, 521, 428, 437, 376, 592, 391, 498, 590, 502, 497, 432, 563, 398, 491, 555, 456, 484]` are unchanged because `src/scouting`, `src/data`, draft RNG, and `ENGINE_COEFFICIENTS.rating` are untouched.

### Unit test simulation pins that moved under the V8 `direct.defend` edge

Only four simulation assertions across the entire unit suite changed values when `directDefendOwn` (`0.655` -> `1.05`) and `styleEdges.direct.defend` (`[0.655, 0.4825]` -> `[1.05, 0.52]`) went live:

- `src/engine/__tests__/cup.test.ts`:
  - Across the 200-run sweep (`cup-sweep-0` to `cup-sweep-199`), `flawless` moves from `48` to `49`: one additional run wins a match against a direct opponent when the assistant switches to `defend` at `65'+` with a 2-goal lead and completes an `8-0-0` cup.
  - On seed `golden-4`, `goldenBoot.goals` moves from `7` to `8`: the top scorer adds one goal after the assistant switches to `defend` while protecting a late lead against a direct opponent (`directDefendOwn: 1.05` vs `0.655`).
- `src/engine/__tests__/goal-kind.test.ts`:
  - Across the 50-seed panel (`panel-0` to `panel-49`), `user: { goals: 529, changed: 65 }` moves to `user: { goals: 535, changed: 66 }`, while `opp: { goals: 193, changed: 9 }` and `moved: 0` are unchanged.
- `src/ui/manager/__tests__/your-calls.test.ts`:
  - On seed `calls-18`, match 4 is against direct opponent Celestic United with `{ type: "tactic", match: 4, minute: 0, tactic: "defend" }`. Under `directDefendOwn: 1.05`, the user scores a third goal, moving `score` from `"Assistant 0-1, You 2-0"` to `"Assistant 0-1, You 3-0"`.
- `src/leaderboard/server/__tests__/handlers.test.ts`:
  - On seed `lb-coach` with `{ type: "tactic", match: 0, minute: 30, tactic: "attack" }`, a match against a direct opponent where the assistant switches to `defend` changes its goal list, moving the `pdfp1` `runFingerprint` from `b573d76870f33a8c9b38703d4bb260f227b89523f82081344ea3eea26d08ab0b` to `69a9a324a5a060a56baea8e3030f24d22b5df2998285f948563ae8898b54fc17`.

### `e2e/pins.ts`

Regenerated with `pnpm e2e:pins` (logged at `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/e2e-pins.log` and `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/e2e-pins-diff.log`):

- `ENGINE_VERSION`: `"pokedraft-engine-7"` -> `"pokedraft-engine-8"`.
- `TOKEN_VERSIONS`: `[1, 2, 3, 4, 5, 6, 7]` -> `[1, 2, 3, 4, 5, 6, 7, 8]`.
- `LIVE_TOKEN`, `SHARE_LINK`, `LIVE_PREFIX`, `LIVE_GOLDEN_CUP8`, `LIVE_GOLDEN_KANTO151`, `EXHIBITION_ROUTE.friendly`, `DEEP_LINK.token`, `DEEP_LINK.href`, `HEAD_TO_HEAD.cup8.theirs`, `HEAD_TO_HEAD.kanto151.theirs`, `GIANT_KILLER.token`, `CHAMPION.token`, `SHOOTOUT.token`, `FATIGUE.token`: prefix `pd7` -> `pd8`.
- Every simulation record, score, minute, and seed in `e2e/pins.ts` is unchanged.

## Calibration pins (from 8e at `50127bc7`)

Copied from `docs/decisions/engine-8-calibration.md` and `docs/reports/engine-8/calibration.json` (run at `50127bc7` with `--coeffs v8`, which is now identical to live `ENGINE_COEFFICIENTS`):

- P1 good: `+3.07` points (`[+1.26, +4.89]`, pass); P1 random: `+6.50` (`[+3.65, +9.35]`, pass).
- P2 good: `+4.64` (`[+2.91, +6.38]`, pass); P2 random: `+9.91` (`[+7.15, +12.66]`, pass).
- P3 good: `0.00` (`[-1.85, +1.85]`, pass); P3 random: `0.00` (`[-2.92, +2.92]`, pass).
- P4 shootouts: `+18.37` over `5,438` shootouts in `17,000` cups (pass).
- P5 buckets: `3.65%`, `11.79%`, `29.53%` (all inside the v4 intervals, pass).
- P6 good: `5.912` wins; P6 careless 151: `3.331` wins (pass).
- P7 worst `+0.046` and P8 `68.61%`: recorded as measured per `docs/decisions/engine-8-calibration.md`.
- Achievements (200 good-bot cups): Giant killer `5` of `200` (`2.5%`, threshold stays `100`), Hat-trick hero `146` of `200` (`73.0%`).

## Gates and measurements

All outputs saved under `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/8x/`:

- `pnpm lint`: exit 0 (`lint.log`).
- `pnpm typecheck`: exit 0 (`typecheck.log`).
- `pnpm test`: 259 test files passed, 2,298 tests passed (`vitest-full.log`).
- `pnpm build`: exit 0 (`build.log`).
- `node scripts/build/measure-retained-json.mjs`: `totalCopies: 4`, `totalPayloadBytes: 2891853` (`live/pokedex` + `v1..v7/pokedex` = 1 copy at 484,169 B; `live/scouting` + `v6/scouting` + `v7/scouting` = 1 copy at 802,132 B; `v1/scouting` = 1 copy at 802,414 B; `v2..v5/scouting` = 1 copy at 803,138 B; `measure-retained-json.log`).
- `pnpm exec tsx scripts/build/check-retained-replays.mts`: 15 emitted golden replays passed, 1 dispatcher(s) (`v1` 2, `v2` 2, `v3` 1, `v4` 2, `v5` 2, `v6` 2, `v7` 2 `c91cb42c...` and `2b7223f3...`, live `v8` 2 `21f36d60...` and `de30f335...`; `check-retained-replays.log`).
- `pnpm check:client-bundle`: `client bundle holds no retained engine bundle; server build holds 28 files with it`; `retained-engine-bundle:v7` count is `0` in `.next/static` and `4` in `.next/server` (`check-client-bundle.log`).
- Static and pin checks (`checks.log`, `checks-theme.log`, `format-check.log`): `pnpm check:image-seam`, `pnpm check:image-packs`, `pnpm check:theme-colors`, `pnpm check:breakpoints`, `pnpm check:dashes`, `pnpm check:mirrors`, `pnpm check:theme-contrast`, `pnpm check:theme-cvd`, `pnpm format:check`, and `pnpm e2e:pins --check` all exited 0.
- Playwright Chromium proof (`playwright.log`): `pnpm exec playwright test e2e/grace-submit.spec.ts e2e/share.spec.ts e2e/seed-board.spec.ts e2e/head-to-head.spec.ts --project=chromium` passed 37 of 37 tests in 9.0s.
- Live `next start` proof (`live-server-proof.log`, stopped by PID):
  - `GET /api/health` -> `{"sha":null,"env":null,"region":null,"engine":"pokedraft-engine-8","tokenVersions":[1,2,3,4,5,6,7,8]}`.
  - `GET /r/<GOLDEN_CUP8_V7>` -> HTTP 200, `data-testid="engine-label"` (`Played on engine v7`), `5-0-1`, Team Score `593`.
  - `GET /r/<GOLDEN_CUP8_V8>` -> HTTP 200, `0` `data-testid="engine-label"` elements, `5-0-1`, Team Score `593`.

## NOT RUN

- Full multi-project Playwright matrix (non-Chromium mobile/webkit projects).
- Independent Red reviewer and GLM review (run by the coordinator).
- Preview/production deployment verification and database smoke checks (run by the coordinator post-merge).
- Owner physical device check and VoiceOver pass.

## Risks and carryovers

- **Engine 6 grace window closed a day early:** The Engine 6 grace window ran until `2026-10-23T04:00:00Z`, and `GRACE` in `src/leaderboard/server/grace.ts` holds a single window (`GraceWindow | null`). Replacing it with Engine 7's grace window (`version: 7`, `engine: "pokedraft-engine-7"`, `flipDate: "2026-10-22"`, `until: "2026-10-24T04:00:00Z"`) closes Engine 6's grace window at the flip, one day early. After this change, a `pd6` leaderboard submission (`POST /api/leaderboard` with a `pd6.` token) is rejected with HTTP `409` and error code `ENGINE_VERSION_MISMATCH` (guarded in `src/leaderboard/server/__tests__/grace.test.ts`).
- **Grace window clock check at landing:** `GRACE.flipDate` (`"2026-10-22"`) and `GRACE.until` (`"2026-10-24T04:00:00Z"`) are set for landing in the New York hour `00:00` to `01:59` on `2026-10-22` (`2026-10-24 00:00 EDT = 04:00Z`). If landing slips, the coordinator moves those two constants in `src/leaderboard/server/grace.ts`.
- **Calibration carryovers from 8e:** P7 (`+0.046`) and P8 (`68.61%`) remain recorded as measured per `docs/decisions/engine-8-calibration.md`.
