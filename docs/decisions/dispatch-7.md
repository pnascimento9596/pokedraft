# Dispatch 7 decision log

Lane owner: Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), later Opus 5.5 (`claude-opus-5-5`), started with Ultracode on and effort max; the user switched to effort medium and Ultracode off mid-dispatch to save tokens, so later work uses single subagents and no second verification pass. Mode `pokedraft-mode`: the `pokedraft-mode` skill and agent type are not registered in this session, so the lane owner read `tools/pstack-core/skills/pokedraft-mode/SKILL.md`, `pokedraft-overrides.md` and `poteto-mode` directly, and every subagent brief inlines the same load order (`briefs/common.md`). Scope: full-platform audit, mobile-first polish, performance and QA. Tiers vary per PR and are stated on each row.

## State anchor

- On 2026-10-10 `origin/main` was `928e4b137811d6ef22699c6d33870039aa693f8a` (PR #11, `pokedraft-engine-3`), with no newer commits. That matches the dispatch anchor. Retained engines v1 and v2 under `src/engine/versions/`.
- Production deployment `dpl_3S5vGX1gDAbMwyzdmEq2gVMiP1jo` at `928e4b1`, created 2026-10-10T17:57Z (read from `vercel api`, `baseline-env.json`).
- The repository is PUBLIC (`gh repo view --json visibility`: `PUBLIC`), although the dispatch calls it private. Consequences: GitHub-hosted Actions minutes are free, everything committed (reports, screenshots, logs) is world-readable, and the secret rules apply with more force.
- Step zero: the pristine checkout was clean on `main` = `origin/main`. Deleted five local branches whose PRs are merged and whose tips are preserved on `origin` (`feat/engine` 4f7dd28, `feat/finish` d95ce8c, `feat/foundation` 8a396b4, `feat/image-packs` 7caef5b, `feat/live-hardening` c50835b). Kept `feat/ui` (checked out by a second worktree at `/Users/paulo/pokedraft-ui`, outside this repo) and `ui/builder`, `ui/results`, `ui/run` (tips are on no remote branch and are not ancestors of `origin/feat/ui`, so they are not shown merged).
- Test baseline on the anchor: `STATE.md` records 53 test files and 466 tests and 24 Playwright tests. The baseline agent re-ran the whole unit suite on the anchor plus the new audit tooling tests (508 tests, pass); later counts come from the runs listed in each row.

## Isolation architecture

- `/Users/paulo/pokedraft` stays pristine on `928e4b1`. Its existing `.next` build is the local production build every audit agent serves (`next start`, own port per agent). No agent builds or edits there.
- Implementers and auditors work in separate clones under the session scratchpad. Only the baseline agent writes to the audit clone during wave 1.
- Noise-sensitive measurements (Lighthouse, e2e flake runs, acceptance runs) run on GitHub-hosted `ubuntu-latest` because the development Mac shares its CPU with another project's self-hosted CI runner (load average 15 to 40 on 12 cores, none of it ours). Functional audits run locally.
- Production is read-only for audit agents. POST timing and concurrency are measured on the local server or a Preview deployment against the Neon `preview` branch, never on production, because a POST writes rows and burns the 10-per-hour submit limit the live verification needs.

## GATE 0 recon (carryovers for the first Yellow PR)

| Fact | Cite | Consequence |
|---|---|---|
| `RoadStrip` renders `NOMINAL_LADDER` under "Approximate opponent ratings"; the engine already exports `buildLadder(seed, mode)` | `src/components/run/RoadStrip.tsx`, `src/ui/lineup.ts:86`, `src/engine/index.ts:6`, `src/engine/opponents.ts:69-92` | PR 7A wires the exact ladder where the seed is known (draft, Daily, `?seed=`); a fresh start screen shows no numbers rather than invented ones |
| `quality` is the mid-rank percentile of a species' fit for a role among all 1,025; `weakest` is already ranked by quality; the UI prints raw fit | `src/engine/species.ts:32-47`, `src/engine/team.ts:70-75,105`, `FitReveal.tsx:32-33`, `Picker.tsx:86-90`, `Builder.tsx:117-127` | PR 7A shows quality as 0 to 100 "vs other <role>s" and moves raw fit to a tap; no engine change |
| The live recap writes `after ${kicks.length/2 - 5} rounds` for any non-"kicks" decider, which is 21 for a legacy decree of 26 pairs; the results line and the adapter say 20 | `src/engine/recap.ts:77-91`, `src/components/results/format.ts:16`, `src/engine/versions/legacy.ts:21-30` | PR 7A fixes the count at 20 behind a RED test; engine-3 never emits "decree", so no golden moves |
| The retained recaps write "Won the shootout 26-25." and are digest-pinned | `src/engine/versions/v1\|v2/src/engine/recap.ts:73-77`, `versions.test.ts:74-78,106-110` | Not touched |
| `shootoutLine` switches on `decider` with no default | `src/components/results/format.ts:26-38` | PR 7A adds a `never` check that throws |
| Only the cup8 raw digest sits beside the adapted-result test | `src/engine/versions/__tests__/versions.test.ts:126-129`; kanto digest at `:69-71` | PR 7A adds the kanto151 raw digest there |
| `roleFactor` comment cites dispatch-6.md only | `src/engine/coefficients.ts:98-99` | PR 7A adds a pointer to `docs/calibration.md` (comment only) |
| Mobile draft screen is one column: header, wheel, candidates, then the pitch (about 550 px tall at 358 px wide), then the road strip; the whole pitch has `touch-action: none` | `DraftBoard.module.css:1-10`, `Pitch.module.css:8-30,81` | Lead for the mobile audit: a Squad First round needs a scroll between the candidate and the slot; the pitch is a scroll trap. Proven or refuted by wave 2 |
| No `viewport-fit`, no `env(safe-area-inset-*)`, no `touch-action: manipulation`, no `overscroll-behavior` on `html`/`body` anywhere in `src/` CSS | `rg` over `src/**/*.css` | Lead for wave 2 |

## Decisions

| When | Item | Decision | Why | Evidence | Result |
|---|---|---|---|---|---|
| 2026-10-10 | GATE 0 Lighthouse | Keep the local baseline (flagged BUSY where the load gate failed) and add a clean set from GitHub-hosted runners (`ci/lh-baseline-928e4b1`, deleted after) | The Mac sat above load 6 for 98% of 675 samples; only 8 of 24 prod and 3 of 24 local runs were clean | `docs/reports/audit-baseline.md`, `audit-data/baseline-env.json` | see the CI baseline section |
| 2026-10-10 | GATE 1 verification | One auditor per area with file and line evidence; no second adversarial pass | User asked to save tokens; each fix PR reproduces its finding before fixing it (RED first), which is the verification | `docs/reports/platform-audit.md` status column | a finding that does not reproduce is closed as not reproduced in its PR |
| 2026-10-10 | GATE 2 triage | No S1; all 55 S2 go to ten one-theme PRs (7B to 7K); 135 S3 deferred, 2 frozen | Dispatch triage order; themes group duplicates seen from two areas | `docs/reports/platform-audit.md`, `docs/queue/dispatch-7-deferred.md`, `docs/queue/dispatch-7-frozen.md` | |
| 2026-10-10 | Frozen flags | Only SF-20 and SF-29 treated as frozen; SD-01 is the data split the dispatch allows (Red, alone); SD-07, SD-13, SD-17 touch no frozen path | Auditor flags were broader than the dispatch's frozen list | dispatch 7 frozen list | |
| 2026-10-10 | PR 7A pitch label | On a pitch under 800 px the token pill shows the number only; "vs other <role>s" stays on the picker and the results card | The two-line pill made tokens overlap at 390 px (measured); the label is in the DOM for assistive tech | PR #12 proof images; `e2e/builder-ratings-layout.spec.ts` | |
| 2026-10-10 | PR 7A Linux overlap | Token gap 2 px to 1 px below 900 px | The new no-overlap test failed on CI Linux on an old 5.5 px2 keeper/centre-back overlap that main has too; the smallest change clears it | CI run 38088274928 (RED), 38088943609 (green) | GLM APPROVE on 6ff2a83 |
| 2026-10-10 | Merges | Merging to main needs the user: the permission classifier blocks `gh pr merge` for the lane owner | Merge is a production deploy | PR #12 | pending user |
| 2026-10-10 | Acceptance harness CI time | Accept a 5.8 min e2e step (was about 2.5) | WebKit on Linux paints in software; 4 workers was the best measured lever; the dispatch requires the suite in CI | PR #13, run 38089338114 | |
