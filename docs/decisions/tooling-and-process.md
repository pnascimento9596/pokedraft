# Tooling and process

Section D of the hand-off, verbatim:

## D. Tooling and process (my own, from running the last three dispatches)

14. **Commit the review packet builder.** The GLM packet scripts lived only in a session scratchpad
    and are gone with it. Commit them under `tools/review/` (script in the appendix below), with the
    output path parameterized instead of hardcoded. Include the frozen-bundle exclusion as a flag
    (`--exclude src/engine/versions/v5`).
15. **Sol cross-vendor review lane is unavailable.** `codex exec` with `gpt-5.6-sol` fails with
    "model is not supported when using Codex with a ChatGPT account". Either log Codex in with an
    API key that has the model, or record in the overrides that Sol is optional and GLM is the gate.
    Do not let an agent silently swap models.
16. **Playwright silently reuses another worktree's server.** Every worktree defaults to port 3400
    (`playwright.config.ts:8`) and `reuseExistingServer: !process.env.CI` (line 66), so a local run
    can test a different branch's build without saying so. Last dispatch this produced 195 bogus
    failures. Fix: derive a default port from the worktree path, or check `/api/health` sha matches
    `git rev-parse HEAD` before the suite starts and fail loudly if not. Until then always run
    `PLAYWRIGHT_PORT=<unique> CI=1 pnpm exec playwright test` after a fresh `pnpm build`.
17. **Engine bumps churn e2e pins.** Engine 6 needed hand re-pins across about eight specs plus
    `e2e/mobile/scenes.ts` (records like "1-2-1", share-link regexes, two-leg scores). Centralize
    seed-dependent expectations in one fixture module (for example `e2e/pins.ts`) generated from the
    engine by a script, so the next engine bump updates one file.
18. **Slow statistical tests.** Engine 6 made `runCup` slower; the scorer-role suite timed out at
    15 s on the 4-worker hosted runner and now has `{ timeout: 60_000 }` like the other statistical
    suites. Audit the other suites that call `runCup` in loops against hosted timings (the CI log
    prints per-test ms) before they flake.
19. **STATE.md header vs practice.** The header says "Updated in the same PR as every merge", but
    #61 and #62 wrote "Not merged at the time of writing" and needed follow-up syncs (#63). Either
    change the header to describe the follow-up docs PR pattern, or adopt a convention that STATE
    cites the reviewed head and the merge is recorded in the next PR. Also cite the squash SHA, not
    the gate SHA, once merged.
20. **Worktree sprawl.** `git worktree list` shows 28 worktrees, many for merged branches. Ask the
    owner before removing any; the repo rule is to preserve other worktrees.


---

# Decisions and evidence

Branch `chore/tooling-and-process` off `origin/main` at `648cf2f`. Items 14 to 19. Item 20 is out
of scope for this lane: the implementer removed no worktree (the coordinator did later, see item 20). No file under `src/` changed, so the
app, engine, data and goldens are as on main.

## 14. Review packet builder

`tools/review/review-packet.py` is the appendix script, written out readably. Changes from the
appendix:

- `--out-dir` sets where the packet and its `.meta.json` go. Without it the script makes a new
  directory with `tempfile.mkdtemp(prefix="pokedraft-review-")`. No user path is hardcoded.
- `--exclude <path>` is repeatable and adds `"--", ".", ":!<path>"` to both `git diff` calls, the
  frozen-bundle variant from the appendix. The packet names every excluded path at the top.
- `--base` defaults to `origin/main`.
- The clean-tree check stays, as an explicit `sys.exit` with a message rather than `assert`, so
  `python -O` cannot strip it.

`tools/review/strip-verdict.py` strips ANSI escapes and the braille spinner
(`[⠀-⣿]\s*`), then requires the canary, the full 40-character head SHA and exactly one of
`APPROVE` or `REQUEST_CHANGES`. Exit 0 APPROVE, 2 REQUEST_CHANGES, 1 does not count.
`tools/review/README.md` has the full loop: build, `ollama run glm-5.3-flash:cloud --think high
--hidethinking`, check, and the fix-round evidence file (previous verdict verbatim plus
`git diff <previous head> HEAD`).

`scripts/review/glm-review.sh` (dispatch 1, data-review wrapper) is left in place; the README
points at it as the older path.

Smoke run on the clean tree at `860f47c` (the item 14 commit):

```
$ python3 -I tools/review/review-packet.py smoke . tools/review/README.md --out-dir <scratch>/smoke --exclude src/engine/versions/v5
{"sha": "860f47c409ee3ef16e9b6b02e1d6839d6216b810", "base": "648cf2f4fbc40a44a3488c2702b7f6a3a9d48de6", "canary": "smoke-5388917ef6f0c11bb931fc2e841df192", "packet": "<scratch>/smoke/pokedraft-smoke-review.packet", "bytes": 16800}
$ python3 -I tools/review/review-packet.py smoke2 . tools/review/README.md
{"sha": "860f47c4...", "base": "648cf2f4...", "canary": "smoke2-4cb9d20d493fb0b50ffd19b61518adf0", "packet": "/var/folders/.../T/pokedraft-review-ywavlg5p/pokedraft-smoke2-review.packet", "bytes": 16752}
```

- The default run landed in a fresh temp directory.
- `--exclude tools/review/README.md` dropped the diff count from 3 files to 2, and the stat lists
  only the two scripts.
- With an untracked file present the script printed
  `review requires a clean tree: commit or remove every change first` and exited 1.
- `strip-verdict.py` on synthetic replies (built by a scratch script, not a review): ANSI plus
  braille plus full SHA plus canary plus APPROVE exited 0; a 7-character SHA exited 1; a reply
  holding both verdict words exited 1; REQUEST_CHANGES exited 2.

No GLM review was run in this lane. The script was not run against `ollama`.

## 15. Sol lane

`codex exec` with `gpt-5.6-sol` cannot run on the current ChatGPT login, and this lane has no API
key. `tools/pstack-core/pokedraft-overrides.md` (Review) now says: Sol is an optional cross-vendor
lane, never the gate; when it does not run it is recorded as NOT RUN; GLM 5.3 Flash stays the
gate; never swap a reviewer's model silently, stop that lane and move to the next reviewer in the
order. It also points at `tools/review/`.

`pnpm check:mirrors` covers `CLAUDE.md`/`AGENTS.md` and the two `pokedraft-mode` SKILL.md copies
only (`scripts/check-mirrors.sh`). The overrides file has no mirror (`find . -name
pokedraft-overrides.md` finds one copy). The check passed.

## 16. Playwright reused another worktree's server

How `/api/health` gets its sha: `src/app/api/health/route.ts:8` reads
`process.env.VERCEL_GIT_COMMIT_SHA`, so a local `next start` reports `null` unless that variable is
set. Nothing else in `src/` reads it.

Changes, all test infrastructure:

- `e2e/local-server.ts` `localServerPort(path)` maps the checkout path to 3400 to 3999 (first 4
  bytes of its SHA-256, mod 600). `playwright.config.ts` uses it when `PLAYWRIGHT_PORT` is unset.
- The `webServer` Playwright starts gets `VERCEL_GIT_COMMIT_SHA=<git rev-parse HEAD>`
  (Playwright merges `webServer.env` over `process.env`), so its health reports this checkout.
- `e2e/global-setup.ts` runs after the webServer step (Playwright 1.64 runs plugin setup, which
  includes webServer, before `globalSetup`). It fetches `/api/health` and throws when the sha
  differs from HEAD. It returns early when `CI` is set (CI never reuses a server) or
  `PLAYWRIGHT_BASE_URL` targets a deployment. When the health sha is `null` it warns that the check
  was skipped and why.
- `README.md` no longer says port 3400.

Evidence, all on port 3484, `CI` unset so reuse is on, HEAD `180bfe0`:

| Server on 3484 | Result |
| --- | --- |
| `next start` with `VERCEL_GIT_COMMIT_SHA=648cf2f…` (another commit) | exit 1 before any test: `The server on http://localhost:3484 reports sha 648cf2f4fbc40a44a3488c2702b7f6a3a9d48de6, but this checkout is at 180bfe06aebe018897773594ae0230140a58cb9b. Playwright reused a server started from another worktree or an older commit. Stop that server, or set PLAYWRIGHT_PORT to a free port, then rebuild and rerun.` |
| `next start` with `VERCEL_GIT_COMMIT_SHA=180bfe0…` (HEAD) | exit 0, health spec 1 passed, no warning |
| none (Playwright starts its own) | exit 0, health spec 1 passed |
| `next start` with no sha | exit 0 with `Server commit check skipped: http://localhost:3484/api/health reports no sha (started outside Playwright without VERCEL_GIT_COMMIT_SHA). The suite may be testing another build.` |

Unit tests in `scripts/e2e/local-server.test.ts` pin `localServerPort("/work/a") = 3914`,
`"/work/b" = 3949`, and the mismatch, match and unknown outcomes of `checkServerSha`.

Limits:

- Across the 32 paths in `git worktree list` the derived ports give 31 distinct values. One pair
  collides (`pokedraft-platform-overhaul` and `pokedraft-progress-fix`, both 3730). The sha check is
  what catches that case. None of the 32 lands in 3481 to 3484.
- The check proves the server was started for the same commit, not that `.next` was rebuilt after
  the last edit. Run `pnpm build` before a suite that matters, as before.
- A server started by hand without the variable is only warned about, by design of the brief.

## 17. Engine-derived e2e pins

`scripts/e2e/render-pins.ts` computes every e2e expectation that moves with the live engine and
`scripts/e2e/generate-pins.mts` writes it to `e2e/pins.ts` (`pnpm e2e:pins`, or `--check` to exit
1 when stale). `scripts/e2e/render-pins.test.ts` runs in `pnpm test`, so CI fails a stale file with
no workflow change.

What it generates:

- `ENGINE_VERSION`, `TOKEN_VERSIONS`, `LIVE_TOKEN` (`/^pd6\./`) and `SHARE_LINK`, from
  `ENGINE_VERSION`, `RUN_TOKEN_VERSION` and `RETAINED_TOKEN_VERSIONS`.
- `RUN_151`, `RUN_8_0`, `RUN_KEYBOARD`, `RUN_POSITION_FIRST`: url and record. The draft repeats
  what the specs do in the browser: the first offered player (`candidatesFor`, the list the
  candidate cards render) into the first open slot in DOM order (`ALL_REFS`, s0 to s10 then b0 to
  b4, matching `Pitch.tsx`), choosing that slot first in Position First. The record comes from
  `replay` of the resulting token, the same call a share link makes.
- `MIRROR_EXHIBITION`: the golden engine-3 cup8 squad saved as the Builder squad and played against
  itself, using `exhibitionFixture`, `playSingle`, `playTwoLegs`, `finalScore` and `goalLine`. The
  rematch that first reaches extra time and the next rematch decided on aggregate are computed, and
  the spec clicks Play rematch that many times instead of assuming rematch 1 and 2.

Behaviour preservation. The first generated file reproduced every hand pin it replaces: records
3-0-2, 1-2-1, 4-0-1, 0-3-0; exhibition 1 - 3, rematch 1 with legs 0 - 1 and 5 - 6, aggregate 5 - 7,
goal `117' Talonflame (solo run)`, 3 - 1, rematch 2 with aggregate 5 - 10. Two runs of the
generator gave the same bytes (sha1 `f0ce7b53…`). Changing one record in `e2e/pins.ts` to 3-1-1
made the vitest guard fail with the diff and `--check` exit 1; regenerating restored the same
bytes.

Migrated (`file`: what now comes from `e2e/pins.ts`):

- `e2e/helpers.ts`: share-link regex.
- `e2e/challenge.spec.ts`: both URLs and records.
- `e2e/keyboard.spec.ts`, `e2e/draft-modes.spec.ts` (Position First): URL and record.
- `e2e/leaderboard.spec.ts`: engine version and live token prefix.
- `e2e/health.spec.ts`: engine version and token versions.
- `e2e/manager-mode.spec.ts`: share-link regex.
- `e2e/exhibition-two-legs.spec.ts`: every score, the goal line and both rematch counts.
- `e2e/mobile/scenes.ts`: `PLAY_8_0`, `PLAY_151`, `RECORD_8_0`, `RECORD_151` re-exported from the
  pins, so `mobile-acceptance.spec.ts` follows.
- `e2e/run-persist.spec.ts`, `e2e/layout-shift.spec.ts`, `e2e/progress-isolation.spec.ts` (5
  records), `e2e/silph-stadium.spec.ts`: the e2e-151 record.

Not migrated, on purpose:

- Frozen-token pins replay retained bundles and do not move on an engine bump:
  `e2e/share.spec.ts:25-70`, `e2e/old-links.spec.ts:11`, `e2e/engine-v4.spec.ts:9-43`,
  `e2e/club-region-identity.spec.ts:16-17`, `e2e/theme-results.spec.ts:13-14`,
  `e2e/theme-type.spec.ts:54`, `e2e/recorded-saves.spec.ts:14,42` (pd5, now retained).
- Draft-roll pins, which depend on the draft engine but not the cup: `SQUAD_AFTER_FIVE` in
  `e2e/run-persist.spec.ts` and the five-player squad at `e2e/progress-isolation.spec.ts:64-70`.
  Neither moved in engine 6. A future generator could add them.
- Seeded URLs with no engine-derived expectation: `e2e/server-html.spec.ts:13`,
  `e2e/images.spec.ts:36,52`, `e2e/data-split.spec.ts:53`, `e2e/mobile-draft.spec.ts:38,245`,
  `e2e/progress-isolation.spec.ts:8`.
- Stubbed leaderboard rows and the `0 - 0` replay start in `e2e/platform-experience.spec.ts:107`
  are not engine output.
- The pd5 builder squads (`e2e/platform-experience.spec.ts:6`, `e2e/pitch-ci-regressions.spec.ts:5`,
  `e2e/mobile/scenes.ts`) are hand-built lineup tokens that the builder accepts under any retained
  version.

Full Playwright on a fresh `pnpm build`, `PLAYWRIGHT_PORT=3484 CI=1 pnpm exec playwright test`:

| Project | Before (main `648cf2f` e2e, build at start of lane) | After (`180bfe0`) |
| --- | --- | --- |
| chromium | 343 passed, 1 skipped | 343 passed, 1 skipped |
| iphone-se | 135 passed, 29 skipped | 135 passed, 29 skipped |
| iphone-14 | 173 passed, 3 skipped | 173 passed, 3 skipped |
| pixel-7 | 141 passed, 28 skipped | 141 passed, 28 skipped |
| webkit-wheel | 6 passed | 6 passed |
| webkit-progress | 6 passed | 6 passed |
| Total | 804 passed, 0 failed, 61 skipped, 0 retries (6.2 min) | 804 passed, 0 failed, 61 skipped, 0 retries (8.6 min) |

`CI=1` here means the item 16 global setup returned early in both runs, by design.

## 18. Slow statistical tests

Hosted timings come from the `check` job logs of main runs 38962915336 (`35b99cf`) and 38952480038
(`6915a84`). Vitest prints per-test ms there for tests over 300 ms. Local timings are from
`pnpm vitest run --reporter=json` at `860f47c` on this Mac (1,283 tests, 139 files, all passed). The
default budget is 15 s, so 40% is 6 s.

| Test (suites that call `runCup` or replay in loops, plus the other statistical ones) | Hosted ms (two runs) | Local ms | Budget before | Action |
| --- | --- | --- | --- | --- |
| `cup.test.ts` gives ST, W and AM 70 to 80% of user goals | 28,547 / 29,214 | 30,594 | 60 s (describe) | none |
| `cup.test.ts` never lets the goalkeeper score from open play | 6,587 / 6,447 | 3,267 | 60 s (same describe, lines 202 to 241) | none, already covered |
| `cup.test.ts` exports the winner's breakdown | 3,846 / 4,482 | 1,067 | 15 s | none, 30% at worst |
| `fairness.test.ts` classic3 offer positions | 13,196 / 13,204 | 3,588 | 60 s (describe) | none |
| `fairness.test.ts` kanto type roll | 8,566 / 7,665 | 9,336 | 60 s (describe) | none |
| `draft-runs.test.ts` three seeded drafts | 2,642 to 2,986 | 4,240 to 5,713 | 60 s each | none |
| `handlers.test.ts` stores the server's replay numbers | 4,838 / 4,741 | 4,200 | 15 s | none, 32%; first test in the file and pays the PGlite start, not a loop |
| `ResultsView.test.tsx` scout every starter | 3,507 / 3,594 | 2,968 | 15 s | none, UI test |
| `match.test.ts`, `goldens.test.ts`, `manager.test.ts`, `depth.test.ts`, `replay.test.ts`, `saves.test.ts`, `versions/__tests__/*`, `exhibition.test.ts`, `MatchHighlights.test.tsx`, `starCalculation.test.ts`, `RoadStrip.test.tsx`, `touchline.test.ts` | each test under 1,000 hosted | under 800 | 15 s | none |

Result: no test above 40% of its budget runs without a 60 s timeout, so no timeout changed. The GK
test was the only candidate over 6 s, and it sits inside the scorer-role describe that already has
`{ timeout: 60_000 }`. Watch `exports the winner's breakdown` (up to 4.5 s hosted) on the next
engine change.

## 19. STATE.md header

The header now says each PR's STATE section cites its reviewed head and the squash SHA is recorded
in the next PR's STATE update, which is what #61, #62 and #63 did.

## Coordinator fix round: strip-verdict on real replies

GLM approved `7095144` in round 1, but `strip-verdict.py` called that real reply "does not count":
it found both verdict words, because GLM quoted the prompt's "APPROVE or REQUEST_CHANGES" in prose.
The script now reads only verdict lines (a line holding just the word, optionally labelled
`Verdict` and wrapped in Markdown) and also strips OSC escapes. Checked on the three real GLM
replies of this hand-off (PRs #64, #65 and #66 round 1): all three now count as APPROVE with exit 0,
where #66 exited 1 before. Synthetic replies: a `**Verdict: REQUEST_CHANGES**` line after an OSC
title and a prose echo exits 2; prose only exits 1; `# APPROVE` plus `## REQUEST_CHANGES` exits 1.

## 20. Worktree sprawl

The owner pre-approved removal on 2026-10-16. The coordinator removed a worktree only when its
branch's PR was MERGED and `git status --porcelain` (untracked files included) was empty, with plain
`git worktree remove` (no `--force`, so git refuses a dirty tree). Branches were kept. 23 worktrees
were removed and 32 became 9. Kept: the main checkout; the open lanes of this hand-off;
`dispatch-8/worktrees/daily-board` (merged but 3 uncommitted changes); and four worktrees whose
branches never had a PR (`pokedraft-club-regions`, `pokedraft-draft-exp`, `pokedraft-retained-json`,
and `pokedraft-platform-overhaul`, which also has 2 uncommitted changes). Those five need a human
look before anything else is removed.

# Section E product calls

The owner delegated items 21 to 24 to the coordinator on 2026-10-16. No code changes for any of
them.

- **21. Replay coaching advantage.** Keep the current rule: coached runs are marked and filterable,
  and the board defaults to All. Making Uncoached the default would hide the runs of the players who
  use the newest feature, which punishes the feature rather than the replay trick. Separate boards
  split an already small group. Revisit if anyone in the group says coached boards feel unfair; the
  cheapest change is then the default view, which is read-side only now that the filter runs in SQL.
- **22. Calibration drift.** Accepted as recorded. Section A (PR #64) changed comments and added a
  test only, so `scripts/calibration/engine6-compare.mts` has nothing new to measure.
- **23. Movesets.** Keep the canon rule (debut-generation level-up learnsets, and Protect as the
  usual keeper move). It is presentation-only, it follows the no-fabricated-data invariant, and a
  hand-picked "better" move list would be an editorial layer nobody can audit. Pikachu without
  Thunderbolt is surprising but true to its debut learnset.
- **24. Physical device check.** Still NOT RUN. An agent cannot hold a phone. The owner checks
  manager mode and Live match on one real phone after these PRs deploy.

## Gates

Run at `180bfe0` with only `STATE.md` and this file uncommitted (docs only):

- `pnpm lint`, `pnpm typecheck`, `pnpm build`: exit 0.
- `pnpm test`: 1,287 passed of 1,287 in 141 files (1,283 in 139 before, plus the 4 new tests in
  `scripts/e2e/`).
- `pnpm check:mirrors`: `mirrors identical`.
- `pnpm format:check`: `All matched files use Prettier code style!`, run after these docs were
  written.
- Full Playwright before and after: table in item 17.
- NOT RUN: hosted CI (runs on the PR), the GLM review (the implementer does not self-review), a Sol
  review (no access), `review-packet.py` against a live `ollama`.

## Principles

- Build the Lever: pins come from a generator with a check mode and a vitest guard, not a list of
  hand edits; the review packet is a committed script, not a scratchpad one-liner.
- Encode Lessons in Structure: the 195-failure lesson becomes a port rule plus a failing global
  setup, and "do not swap models" moves into the overrides.
- Laziness Protocol: item 18 measured first and changed nothing because nothing needed it; the
  health route was not changed, the existing `VERCEL_GIT_COMMIT_SHA` seam carries the sha.
- Prove It Works: each item 16 outcome was observed against a real `next start`, and the pin
  migration was checked against the full browser suite before and after.
