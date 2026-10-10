# Dispatch 6 decision log

Lane owner: Claude Code, Opus 5.5. Mode `pokedraft-mode`. Red tier (scouting, engine semantics, calibration). Three PRs in order: 6A version retention (`feat/engine-version-retention`), 6B scouting fixes, 6C engine fixes and recalibration.

## State anchor

On 2026-10-10 a fresh clone's `origin/main` was `90fa976bc33b5882b1e512b8b42da650dc3a229e` (PR #8), with no newer commits. That matches the dispatch anchor. Baseline on that head: `pnpm test` 49 files, 423 tests pass, which matches `STATE.md`.

## GATE 0 recon

| Fact | Cite | Consequence |
|---|---|---|
| The engine reads its data and numbers as module singletons: `SPECIES` is built from `scouting.json` at module load, and every sim function defaults to `ENGINE_COEFFICIENTS` | `src/engine/species.ts:72-102`, `src/scouting/scouting-data.ts:40`, `src/engine/match.ts:106`, `cup.ts:108` | A data-only bundle cannot hold engine-1. 6C changes code (shootout, scorer pick, awards), so the retained bundle has to carry the engine-1 code as well as its data. |
| Tokens carry `RUN_TOKEN_VERSION` 1 in a `pd<N>.` prefix, separate from `ENGINE_VERSION` `pokedraft-engine-1`; `decodeToken` raises `unknownVersion` for any other N | `src/engine/types.ts:16`, `:332-339`; `src/engine/token.ts:22`, `:232-237` | The token version is the routing key. Each engine bump also bumps the token version, so a token always names the engine that issued it. |
| `replay()` decodes, runs the draft, then the cup | `src/engine/replay.ts:6-20` | The retained bundle exports its own frozen `replay`. |
| Server replay callers: `/r/[token]` (page, metadata, OG image through `loadRun`) and `/card` through `cardModel`. Client replay callers replay only tokens the live engine just issued | `src/app/r/[token]/run.ts:6`, `src/app/card/route.tsx:10`, `src/components/share/card.tsx:59-66`; `src/components/run/PlayScreen.tsx:127`, `src/components/builder/Builder.tsx:113` | Only the two server paths need the dispatcher. The client never sees an old token except through a link. |
| The leaderboard decodes with the live `decodeToken`, so a token from another version is 409 `ENGINE_VERSION_MISMATCH` | `docs/decisions/dispatch-4.md` GATE 0 row on `decodeToken`; `src/leaderboard/server/handlers.ts` | Submit stays current-only with no change. |
| `server-only` throws on import outside the `react-server` condition, and Vitest has no alias for it | `node_modules/server-only/package.json` exports; `vitest.config.mts` | Vitest aliases it to `empty.js`, the module Next uses on the server. |
| Shootout decree: after `maxSuddenDeath` (20) level pairs the user scores and the opponent misses by override | `src/engine/match.ts:247-254`; `coefficients.ts:99` | 6C item 1. |
| Unplayed knockout matches carry `opponent: null` although the ladder is already built | `src/engine/cup.ts:111`, `:219-222` | 6C item 2. |
| User goals pick a scorer weighted by SHO times a line factor (DEF 0.25, MID 0.6, ATT 1) and an assister by PAS times a line factor; `MatchStarter` carries the line, not the role | `src/engine/match.ts:23-26`, `:158-188`; `coefficients.ts:94-95` | 6C item 3 needs the slot role on `MatchStarter`. |
| Player of the Tournament ranks by 3·goals + 2·assists + clean-sheet points (GK 2, DEF line 1), ties by quality; only goals, assists and appearances are exported | `src/engine/stats.ts:21-41`; `cup.ts:173-178`; `coefficients.ts:100` | 6C item 4: a typed contribution breakdown with minutes, exported. |
| Ladder is 300/320/340/360/480/760/850/980 with jitter 20 and tilt 5; top 2 of the group advance | `coefficients.ts:101-105`; `cup.ts:42`, `:217` | 6C item 5. R16 to QF is +280 against +120 for R32 to R16. |
| DIV already has a height term (0.35) and a heavy penalty; HAN has none | `src/scouting/coefficients.ts:55-56`, `:106-111` | 6B item 2 adds a bounded frame term to both, on top of the existing reach percentile. |
| AER takes height at 0.55; PHY takes no height at all | `src/scouting/coefficients.ts:52-53` | 6B item 5. The squiggle discount feeds AER and the new frame term. PHY has no height input to discount. |
| Feature percentiles are computed over all 1,025 species from `heightDm` and `weightHg` | `src/scouting/attributes.ts:53-75` | A squiggle body-length discount belongs before the percentile, on the raw height. |

## Sequencing consequence of 6B

6B changes `scouting.json`, which moves every Team Score. If 6B kept token version 1, a run played after 6B would carry `pd1.` and replay through the frozen engine-1 bundle with the wrong data. So 6B also bumps the version, and its own data is frozen before 6C changes the code.

| PR | Live engine after merge | Token prefix | Retained bundles |
|---|---|---|---|
| 6A | `pokedraft-engine-1` | `pd1.` | v1 |
| 6B | `pokedraft-engine-2` (new scouting, engine-1 code) | `pd2.` | v1 |
| 6C | `pokedraft-engine-3` | `pd3.` | v1, v2 |

## Playbook checklist (Feature, per PR)

1. `how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode.
2. `architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design.
3. Throughput checkpoint for 6A.
   - Blocking first steps. Freeze before any change to engine numbers.
   - Independent workstreams. n/a: one coupled change (bundle, dispatcher, two server callers).
   - Shared mutable state. n/a: one owner.
   - Smallest safe decomposition. One owner, two commits: the frozen bundle, then the dispatcher and its callers.
4. Delegate code-writing. Deviation: the lane owner wrote 6A directly. The change is a copy lever and a 60-line dispatcher; review separation comes from the independent reviewer, not a delegate.
5. Verify on the matching surface. Vitest goldens through the bundle, a production cross-check of the old link, a real build with the client-bundle check, Playwright share and a11y specs.
6. Small ordered commits. Done.
7. `interrogate` if contested. The reviewer applies the rubric.
8. Opening a PR.

The multi-phase plan playbook is `skip: the dispatch is the plan and the autonomy grant`.

## Decisions

| ts | pr | decision | why | evidence | result |
|---|---|---|---|---|---|
| 2026-10-10T11:58 | 6A | Freeze by copying the import closure of `replay.ts` and `types.ts` byte for byte into `src/engine/versions/v1/`, keeping repository-relative paths, with a lever script (`scripts/engine/freeze-version.mts`) | principle-build-the-lever: 6B needs the same freeze; keeping paths means only the `@/` alias needs rewriting and every relative import stays valid | 29 files, 1.4 MB, `MANIFEST.json` holds the source sha256 of each | `pd1.` goldens replay byte-identical through the bundle |
| 2026-10-10T11:58 | 6A | The bundle also freezes `pokedex.json`, `type-chart.json` and the scouting code, not only `scouting.json` and coefficients | a frozen bundle that reads a live file is not frozen; any later data or scouting-code change would move old replays | closure list in the lever output | self-contained except `zod` and `server-only` |
| 2026-10-10T12:05 | 6A | A retained bundle wins over the live engine even while its version is current | the production path for `pd1.` links runs through the bundle from the day it ships, so live verification exercises it, not only the tests | `src/engine/versions/index.ts` | |
| 2026-10-10T12:05 | 6A | The dispatcher casts the bundle's output to the live types | the bundle has its own copy of the branded types, which TypeScript treats as distinct; the golden test proves the bytes match. When 6C changes the result shape, the cast becomes a typed adapter | `versions.test.ts` | |
| 2026-10-10T12:05 | 6A | `cardModel` takes the replay function from its caller | `card.tsx` must not import the server-only dispatcher; the `/card` route passes `replayAnyVersion` | `src/app/card/route.tsx` | |
| 2026-10-10T12:10 | 6A | Client-bundle proof is a build-output check (`pnpm check:client-bundle`, in CI after `pnpm build`): no `.next/static` file may hold `retained-engine-bundle:`, and `.next/server` must, so the absence means something | the dispatch asks for an assertion on build output; `server-only` is the first guard and this is the second | RED 1: a client component importing the dispatcher failed the Turbopack build ("You're importing a module that depends on server-only"); RED 2: with both `server-only` imports removed the build passed and the check named `.next/static/chunks/2owourzxkqzjc.js` and exited 1; restored, the check passes with 6 server files | |
| 2026-10-10T12:12 | 6A | The marker is a real field (`ReplayedAnyRun.bundle`) recording which bundle replayed the run | an unused export can be tree-shaken, and then the server-side half of the check would fail for the wrong reason | | |
| 2026-10-10T12:15 | 6A | The dispatch 5 era link pinned in the tests is the one `e2e/a11y.spec.ts` opens; its expected record comes from production, not from the code under test | `curl` of production `/r/<token>` returned the title "pokedraft run: 8-0-0, Team Score 845" | `versions.test.ts` | pinned [845, 8, 0, 0] |
| 2026-10-10T12:15 | 6A | Guard-test sequencing deviation: the retention tests landed with the dispatcher, not before | they import modules that did not exist; a RED run would fail on the missing module, not on behaviour (same deviation as dispatch 4's replay-count test) | | recorded |
| 2026-10-10T12:20 | 6A | `wheel.test.tsx` "settles on the engine roll for 500 seeded rolls" failed once in three full-suite runs at 6.5 s, and passed alone and in two more full runs | a load-sensitive timeout in a test this PR does not touch, not a behaviour change | 434 of 434 twice after | carryover |
| 2026-10-10T12:11 | 6A | Merge check: both daily boards (`GET /api/leaderboard`, America/New_York 2026-10-10) were empty at 12:11:58 EDT, before the squash | standing ruling: a day's board never mixes engines | receipt comment on PR #9 | merged `9af2a74` |
| 2026-10-10T12:30 | 6B | 6B bumps the live engine to `pokedraft-engine-2` (`pd2.`); 6C becomes engine-3 and freezes v2 first | the new `scouting.json` moves every Team Score; without a bump, new runs would carry `pd1.` and replay on the frozen v1 bundle with the old data | `src/engine/types.ts` | 3 engines, v1 and v2 retained after 6C |
| 2026-10-10T12:18 | 6B | Layer 2 reconciliation done by a fresh reviewer subagent, scoped to a worklist of 94 ids (61 stale citations, 52 size double-count candidates, Wishiwashi below the fit floor); lane owner re-verified scope | principle-separate-author-and-reviewer, dispatch 1 precedent | own node diff vs HEAD: 73 entries changed, 0 outside the worklist, 14 adjustments removed, 7 trimmed, 0 added, no field other than `adjustments` and `rationale` changed | 9 gens VALID, scouting tests 80 of 80, check-moves 0 not learnable |
| 2026-10-10T12:20 | 6B | Rejected the reviewer's Wishiwashi REF +5 and fixed it in Layer 1: no frame term for species whose ability already sets body size (`frame.sizeAbilities: ["schooling"]`) | the REF call rested on a general "darting fish" claim no field supports (no fabricated data); the real cause was the frame term (-5.77) cancelling Schooling's +8 HAN/DIV, a double count in Layer 1 | RED `a27eb16`: `[-5.77, -5.77, 8]` vs `[0, 0, 8]` | panel 42 of 42 with the review entry restored to `{}` |
| 2026-10-10T12:22 | 6B | Fixed: after the bump the proxy rewrote every `pd1.` share link to `/run-not-found`, because it checks links with the live `decodeToken`. Tokens whose version has a retained bundle now pass through to the page | old links must keep replaying; 6A's live check passed only because v1 was still current | RED `b72b1c3` (`expected 'https://pokedraft.test/run-not-found' to be null`); `RETAINED_TOKEN_VERSIONS` is client-safe and pinned to the dispatcher's table | a garbage `pd1.` token now gets the page's friendly 200 instead of the 404 |
| 2026-10-10T12:25 | 6B | Fixed: shared builder links (`/?b=pd1.`, `/card?b=pd1.`) also decoded with the live engine and would open empty. A retained-version builder token is read on today's engine | a builder token names a lineup and replays no cup, and the token format is unchanged | RED `2cdd743` (null); the `/card?b=` route test also went RED on the bump. The guard's expected count was first written as 10 and corrected to 11 after decoding the token (11 `place` actions) | |
| 2026-10-10T12:28 | 6B | Re-pinned the live goldens to engine-2. Their draft bodies equal the v1 goldens byte for byte, so only rating and cup output moved | goldens pin the live engine; the v1 goldens still pin the retained bundle | cup8 592 -> 593 (3 wins, R16), kanto 480 (3 wins, QF); 20-run panel moved by at most 9 (465 -> 456) | `versions.test.ts` still passes |
| 2026-10-10T12:30 | 6B | GLM 6A nits carried: typed adapter (6C, when the result shape changes); provenance filter tightening (6C freeze of v2); label through real routing (done: `e2e/old-links.spec.ts`); keep the dispatcher rationale visible (comment kept) | | | |
| 2026-10-10T12:55 | 6B | Fresh auditor on the 60 species whose fits moved most (`pnpm data:audit-moved origin/main 60`): AGREE 56, DISAGREE 4. Fixed 3 in this PR (Cresselia in Layer 1 via `uprightAbilities: ["levitate"]`; Wailord and Dondozo size-only GKP removed in Layer 2) and queued Jigglypuff | the three were caused by this PR's Layer 1 change; Jigglypuff's roles predate it (minimal scope) | `docs/reports/scouting-audit-v2.md` lane owner response; RED for Cresselia `[58.77, 72.63]` vs `[77.96, 88.55]` | Cresselia GK 86 -> 88 vs main |
