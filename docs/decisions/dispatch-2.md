# Dispatch 2 decision log

Lane owner: Claude Code, Opus 5.5. Branch `feat/engine`. Mode `pokedraft-mode`. Red tier.

## State anchor

On 2026-10-09 fetched `origin/main` was `affffadcfb9568f21b8802dbe5e5cbc958814c6e`, and `git show origin/main:src/data/scouting.json | shasum -a 256` gave `5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775`. Both match the dispatch anchor. `main` had not moved.

## GATE 0 recon

wcdraft is a shallow clone at `b4530162c11a1057726eb15360eb75a6e8b211e1`, outside this repo. Paths below are under `wcdraft/packages/core/src/`.

| File | Cite | Decision |
|---|---|---|
| `rng.ts` | `:100-127` `createRng`; `:113-116` int is multiply-and-floor and says rejection sampling was skipped on purpose | Adapt. The engine keeps cyrb128 and sfc32 (imported from `src/lib/rng.ts`, so there is one algorithm in the repo) and replaces `int` with rejection sampling on 32-bit outputs. |
| `rng.ts` | `:159-238` `deriveSubseed`: JSON tuple material, domain tag, four sfc32 words as hex | Port with a pokedraft domain (`pokedraft-subseed-v1`) and pokedraft substream names (`draft_roll`, `daily`, `match_sim`, `event_gen`, `opponent_selection`, `availability`, `group_table`). |
| `rng.ts` | `:269-305` `canonicalSortBy`: numbers numeric, strings by code point, stable | Port as is. |
| `run-token.ts` | `:15-27` versioned prefixes `t1.` to `t4.`, 8 KB cap; `:175` `RunTokenError`; `:183-214` base64url for browser and Node; `:570` decode returns null on failure | Adapt. One version (`v1`), a typed error with codes instead of a null return, and an unknown version raises. wcdraft's four historical body shapes are not needed. |
| `engine/match.ts` | `:209-271` `generateChances`: n chances, p = λ/n capped at 0.6, so goals are binomial; `:150-165` weighted pick over a canonically sorted pool; `:489-766` group or knockout, extra time at λ/3 over 17 chances, then shootout | Port the structure: binomial fixed-chance goals, canonically sorted sampling pools, extra time then penalties. Drop fouls, cards and offsides (no consumer). Takers by SHO and keeper by REF and DIV replace wcdraft's flat card-id order at `:828-831`. |
| `engine/match.ts` | `:50-115` exp series for pre-match win probability, display only | Not ported. Nothing displays it yet, and the lint bans `Math.exp`. |
| `engine/calibration.ts` | `:97-172` LAMBDA (BASE 1.1, SPREAD 5.5, MIN 0.3, MAX 3.4, W_DEF 0.7, W_GK 0.3, mid control band 0.85 to 1.15, KO factor 0.82); `:187-194` CHANCES 50, 17, cap 0.6; `:248-281` dispersion; `:356-374` shootout | Port the numbers as starting values into `src/engine/coefficients.ts`, the one typed table GATE 6 tunes. wcdraft's mutable `__UNSAFE_setCalibrationOverride` (`:573-617`) is not ported; calibration passes a coefficient object instead. |
| `engine/team-strength.ts` | `:88-118` channel = mean of rating times position compatibility, times a bounded synergy multiplier | Adapt. Channels come from role-relative quality per slot (see normalization below). The weakest-link drag and bench depth are new. |
| `engine/synergy.ts` | `:56-133` nation clusters plus adjacency links, multiplier band 1 to 1.12 (`calibration.ts:422-436`) | Adapt. Adjacency edges score shared type, same evolution line, same generation and type coverage, each edge capped, and the total feeds a bounded synergy term. |
| `engine/compatibility.ts` | `:23-34` MAX over eligible positions of a line factor | Not ported. The dispatch names `src/scouting/fit.ts` (`roleCompat`, `familiarity`) the one compatibility authority. Published `fits` already include familiarity. |
| `engine/group-stage.ts` | `:79-96` other group matches on their own substreams; `:168-177` draw lots by a seeded shuffle; `:317-374` points, GD, GF, then head to head, then lots | Port. Top 2 advance; wcdraft's best-third rule (`:399-405`) is dropped. |
| `engine/tournament.ts` | `:294-295`, `:387-388` one `match_sim` and one `event_gen` substream per match index | Port the per-match substream keying. |
| `engine/opponent-selection.ts` | `:96-115` `pickEscalating` picks within a strength band per round from a canonically sorted pool; `:216` one `opponent_selection` substream | Adapt. pokedraft has no real teams, so opponents are a fixed per-round score ladder with a seeded jitter and line tilt, named from a canonically sorted club list. |
| `engine/stats.ts` | `:162` per-player run stats from match events | Adapt to Golden Boot, top assister and player of the tournament over the user's squad. |
| `engine/availability.ts` | `:202-203` one draw per match on an `availability` substream at 0.125; `:73-110` best bench replacement by projected contribution, ties by id | Port a one-match version: no tournament-ending injuries or suspensions. The replacement is the bench species with the best quality at the slot role. |
| `types/formation.ts` | `:197-204` slots with L/C/R channel; `:273-370` adjacency derived by rule (same channel within a line, sort-adjacent across channels, consecutive lines with same or adjacent channel); `:398-536` the eight templates | Port the rule and the eight templates as is, plus pitch x/y, which wcdraft does not carry. Slot positions map onto the scouting roles (LB/RB to FB, LCB/CB/RCB to CB, LWB/RWB to WB, CDM/LDM/RDM to DM, LCM/CM/RCM to CM, CAM/LAM/RAM to AM, LM/RM to WM, LW/RW to W, ST/LF/RF to ST). |
| `rng.golden.test.ts` | `:39-47` pins `next`, `int`, `pick` sequences | Same shape for the new stream. |
| `formation-adjacency.golden.test.ts`, `synergy.golden.test.ts`, `sim.golden.test.ts`, `group-stage.golden.test.ts`, `top-scorer.golden.test.ts` | golden pins per subsystem | Same discipline: adjacency, a full cup8 run, a kanto151 run, token round trip, 20-run panel. |
| `eslint.config.mjs` (repo root) | `:61-118` bans Math.random, Date.now, performance.now, crypto.getRandomValues, new Date(), Math.exp/log/pow and localeCompare in core | Port for `src/engine`, plus the DOM globals the dispatch names. |

### pokedraft side

- `src/scouting/fit.ts:24-29` `familiarity(naturalRoles, role)` is the max `roleCompat` over best roles. `:33-41` `fit(attrs, naturalRoles, role)` rounds blend times familiarity and clamps to 0..100. The signature takes attributes and roles, not a species, which is the difference from the sketch the dispatch mentions.
- `src/scouting/coefficients.ts:199-216` role lines (GK 0, CB/FB/WB 1, DM/CM/AM/WM 2, W/ST 3) and the compat table.
- `src/scouting/scouting-data.ts` parses `scouting.json` with Zod. The engine builds species from this parsed array plus `POKEDEX`.

### Measured data facts (2026-10-09, `main` at the anchor)

| Role | min | p25 | p50 | p75 | p90 | max |
|---|---|---|---|---|---|---|
| GK | 11 | 22 | 32 | 40 | 65 | 93 |
| CB | 19 | 42 | 56 | 73 | 83 | 94 |
| FB | 20 | 43 | 57 | 66 | 74 | 92 |
| WB | 19 | 44 | 56 | 68 | 75 | 89 |
| DM | 19 | 43 | 60 | 74 | 81 | 95 |
| CM | 18 | 43 | 60 | 72 | 81 | 96 |
| AM | 16 | 43 | 57 | 73 | 83 | 97 |
| WM | 18 | 44 | 57 | 70 | 79 | 90 |
| W | 9 | 39 | 55 | 72 | 84 | 97 |
| ST | 14 | 41 | 55 | 71 | 83 | 95 |

- Region maps one to one onto generation (kanto 151 = gen 1, through paldea 120 = gen 9).
- 71 legendary and 23 mythical species, 94 special in all.
- 161 of 162 region and type combos are non-empty in the full pool. None is special-only at the start of a run, so the special-only skip only triggers as drafting empties combos.

## Feature playbook checklist (verbatim steps)

1. `how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode.
2. `architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps. GATE 0.5 CI, the GATE 1 contract (`types.ts`) and the coefficient table land before any fan-out.
   - Independent workstreams. Wave 1: RNG, species pool and quality, formations, type chart. Wave 2 in parallel: draft plus token, and team plus match plus cup plus stats plus recap. Wave 3: replay, goldens and fairness run tests. Then calibration.
   - Shared mutable state. Each agent owns named files only. `coefficients.ts` and `types.ts` belong to the lane owner; agents request changes instead of editing them.
   - Smallest safe decomposition. One agent per wave slot; the sim files are coupled (team feeds match feeds cup), so one owner writes all of them.
4. Delegate code-writing to a subagent. Done per wave; the lane owner writes only the contract, coefficients, lint rule and docs.
5. Verify on the matching surface. Engine surface: vitest, goldens, calibration script output. No UI in this lane.
6. Rebase into small, ordered commits. Done as commits land.
7. If the design is contested, `interrogate` before shipping. The independent reviewer applies the rubric.
8. Run Opening a PR.

## Decisions

| ts | phase | decision | why | evidence | result |
|---|---|---|---|---|---|
| 2026-10-09T23:12 | gate0.5 | Root cause of dispatch 1's "no run on first push": `ci.yml` only triggers on `pull_request` and on `push` to `main`, so a push to a feature branch never starts a run by design | the `on:` block; the Actions permissions API returned `enabled: true, allowed_actions: all` | `gh api repos/pnascimento9596/pokedraft/actions/permissions` | settings are not the cause |
| 2026-10-09T23:12 | gate0.5 | Opened PR 2 as a draft right after the first push; run 38003222303 queued at 23:12:10, 2 seconds after PR open | proves the PR-open trigger works on this repo today; dispatch 1's PR-open miss stays unexplained | `gh run list --branch feat/engine` | within 3 minutes |
| 2026-10-09T23:12 | gate0.5 | Add `workflow_dispatch`; cache the CSVs with `actions/cache@v6` keyed on the pinned PokéAPI commit; rename the vitest config to `.mts` and use `import.meta.dirname` | dispatch items; v6.1.0 is the latest `actions/cache` release | `vitest run` no longer prints the CommonJS config warning | commit on branch |
| 2026-10-09T23:15 | gate1 | Engine RNG imports `cyrb128` and `sfc32` from `src/lib/rng.ts` instead of copying them | CLAUDE.md names `src/lib/rng.ts` the only randomness source; one algorithm cannot drift | `src/lib/rng.ts` exports | the audit sample's multiply-and-floor `createRng` stays, so its golden does not move |
| 2026-10-09T23:15 | gate1 | Quality is the mid-rank percentile of a species' published fit within that role over all 1,025 species, computed once at module load | GK p50 is 32 and outfield p50 is 55 to 60, so raw fits would make GK the permanent weakest link; percentiles put every role on one 0..1 scale | table above | a team at every role's p75 has equal quality in every slot, so the drag has nothing to concentrate on |
| 2026-10-09T23:15 | gate1 | Slot fit is the published `fits[role]`, which already includes familiarity; `familiarity()` from `fit.ts` is called only to report out-of-position play and to rank bench cover | reuse the one compatibility authority; recomputing `fit()` would duplicate what `scouting.json` publishes | `fit.ts:33-41` | one compatibility table |
| 2026-10-09T23:15 | gate1 | Match strength keeps each team's line shape but centres it on Team Score / 10 | the calibration targets are keyed on Team Score ("a 900 team goes 8-0 about 12%"), so two teams with the same score must have the same average strength | `coefficients.ts` `match.shape` | tunable |
| 2026-10-09T23:15 | gate1 | A reroll excludes the value it replaces when any alternative exists | a reroll that returns the same type wastes one of 3 shared rerolls; uniform over the remaining options keeps it fair | principle-experience-first | fairness doc states it |
| 2026-10-09T23:15 | gate1 | The legendary cap of 3 applies to cup8 and kanto151; builder uses its toggle with no cap | kanto has 5 specials; without the cap a lucky 151 run could hold 4 or 5, which the "same skill gets the same odds" target forbids | 10k-run tests assert it per mode | |
| 2026-10-09T23:15 | gate1 | classic3 offers all eligible species when a combo has fewer than 3 | the type roll never rolls an empty combo, but it can roll one with 1 or 2 left | fairness doc | |
| 2026-10-09T23:15 | gate1 | Type coverage uses the PokéAPI type efficacy table at the pinned commit, built by a script into `src/data/type-chart.json` | "complementary type coverage" means matchups; hand-typing an 18 by 18 chart would be unsourced data | build script plus CI rebuild check | |
| 2026-10-09T23:20 | gate6 | Owner note: "about 6 of 8 wins" and "8-0 about 1 in 30" pull against each other. Default applied: the 8-0 targets (1 in 30 for a good player, 12% at 900, 30% at 950) take priority; if a miss must land, it lands on average wins and is reported as measured | a smooth difficulty climb cannot hit both; hand arithmetic says a flat early ladder with a steep SF and Final can (group 95%, R32 95%, R16 92%, QF 85%, SF 55%, F 10% gives about 3.5% flawless and 5.9 wins); the 8-0 targets are the skill curve | owner heads-up in session; the owner can flip the priority | ladder is a per-round table |
