# Dispatch 8 decision log

Lane owner: Codex. Contract: the user's dispatch 8, warm theme port. Yellow presentation lane with independent review on each exact PR head. The explicitly authorized health endpoint is the sole API addition. Frozen engine, scouting, data figures and image seams remain protected.

## State anchor and prerequisite

- Fresh clone at `/Users/paulo/Projects/pokedraft`. Initial `git status --short` was empty. No recovery patch was needed.
- Fetched, switched to `main`, and pulled with `--ff-only`. HEAD and origin/main both equal `87c7633f6b367f989df29203770ee0f6d8f84a07`. No commits after the supplied anchor.
- Only local branch was main. No merged branch deletion was needed. Remote branches were untouched.
- PR #24 merged as `7077a3c649a7b2281e6cfe74baa201ea22796ca8`. Its CI run 38118162652 passed both jobs. GitHub production deployment 6992158632 reports success at the anchor SHA.
- Production GET `/api/health?dispatch=8-recon` returned 404 before any edits.
- Read `docs/queue/dispatch-7-deferred.md` and the platform audit's index and relevant evidence. SE-06 points to an E-route-matrix appendix C that is absent from the committed repository. The dispatch and SE-06's concrete endpoint requirements are the implementation contract.
- Re-executed the unchanged production acceptance suite on the anchor. Command: `PLAYWRIGHT_BASE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test e2e/mobile-acceptance.spec.ts --workers=4`. Result: 242 passed, 46 skipped, zero failures, 1.6 minutes. Local receipt: `output/dispatch-8/prereq-mobile.log`. Browser device emulation does not establish physical iPhone/Android keyboard or touch behavior where the suite explicitly skips it.

## Playbook and throughput checkpoint

Read the Principles section of poteto-mode. Apply figure-it-out, with this dispatch as the concrete workflow. Keep this Markdown decision log as requested instead of the portable skill's TSV default.

- [x] Phase A: Frame. Seven independently shipped units, with production verification after each. Done means every listed route uses the new light and dark theme, the unchanged mobile acceptance suite passes, figures are preserved, contrast and color lint run in CI, and baseline/final three-run mobile Lighthouse receipts are available.
- [x] Phase B: Design the workflow. Preserve the dispatch's PR areas and order. Each ships only after exact-head review and its required gates. The dispatch's multiple-PR instruction supersedes the repository's one-PR-per-dispatch default.
- [ ] Phase C: Run the loop. PR 8.0 health and measurement first. Then PR 8A tokens/font/components; 8B home/builder; 8C draft/wheel; 8D results/share; 8E daily/leaderboard; 8F history/help/404/gate.
- [ ] Phase D: Keep the audit trail. Append actual decisions and evidence as each unit completes.
- [ ] Phase E: Verify and hand back. Produce the full readback only after the required production gates.

`architect skipped: dispatch fixed the design`. `how`, `swarm`, `arena`, `reflect`, `deslop`, `control-ui`, `control-cli`, and `create-skill`: `skip: not installed`. Browser evidence uses Playwright. GLM 5.3 Flash cloud is installed for the prescribed first independent reviewer; availability is not yet a verdict. No delegation is needed for the first unit.

## GATE 0 styling recon

The app uses global CSS variables in `src/app/globals.css` and per-component CSS Modules. There is no Tailwind or component library. The layout imports Big Shoulders and Barlow Semi Condensed through next/font (`src/app/layout.tsx:3`). The current root defaults to dark, with a light block and a prefers-light mirror (`globals.css:21`). The card renderer holds separate inline colors (`src/components/share/card.tsx:84`). The pitch is CSS, and there is no chart library. A source census of routes, styling sites and figure-rendering sites is saved locally as `output/dispatch-8/recon.json`; this is a source inventory, not browser acceptance.

| Existing role | Target token or rule | Existing owner |
| --- | --- | --- |
| `--bg`, `--night` | `--canvas` | globals.css |
| `--bg-raised`, `--panel` | `--surface` | globals.css, module cards |
| `--bg-sunk` | `--surface-sunken` | globals.css |
| `--line`, `--line-strong` | `--border`, `--border-strong`; inner rules use `--border-soft` | globals.css and CSS Modules |
| `--line-field` | `--border-control` | inputs and control edges |
| `--ink`, `--ink-soft`, `--ink-faint` | `--text`, `--text-soft`/`--text-muted`, `--text-faint` | globals.css |
| `--flood`, `--flood-text`, `--flood-line`, `--focus` | `--accent`, `--link`, palette-derived state tokens with verified contrast | actions and selected states |
| `--grass-1`, `--grass-2`, `--grass-edge` | `--pitch`, `--pitch-stripe`, emphasis frame | pitch and share renderer |
| `--chalk`, `--chalk-soft` | `--pitch-line`, `--pitch-line-soft` | pitch markings |
| `--token-bg`, `--token-ring`, `--token-weak` | palette-derived token frame and name tag, control edge, risk mark | Pitch wrappers only |
| `--win`, `--draw`, `--loss`, `--live` | `--ok-*`, neutral, `--risk-mark` | results, draft status |
| `--type-*`, `--type-*-ink` | documented muted type foregrounds and 14–18% tint backgrounds | globals.css, TypeChip |
| `--font-display`, `--font-body` | one Inter variable with weights 400/600/700 | layout and all text |
| `--radius`, old `--radius-sm`, `--shadow` | exact Appendix A shape and elevation tokens | globals.css and CSS Modules |
| share `#eef6f0`, `#a9bcb0`, `#ffd23f` and inline backgrounds | shared light token values | share/card.tsx |
| global/body/hero gradients | canvas or palette surface; only pitch stripes retain a gradient | global and component CSS |

Figure owners include Builder (Team Score and quality), Picker (role quality and raw fit), Pitch (slot/rating wrappers), FitReveal (role quality), ResultsView and MatchList (Team Score, records, match scores, scorer counts), RoadStrip (opponent ratings), SidePanel (best record), Board and SubmitPanel (rank, record, score), HistoryList (record and score), and share/card.tsx (identical exported content). Preserve existing calculations and record number-only text before restyling results and leaderboard.

## Decisions

| Phase | Decision | Why | Evidence | Result |
| --- | --- | --- | --- | --- |
| Recon | Confirm production acceptance before editing runtime code | Prove It Works requires the real artifact | prerequisite command and log above | PASS, with 46 explicit skips |
| Sequencing | Ship health and clean measurement before any theme | Sequence Work into Verifiable Units; baseline must precede treatment | dispatch PR 8.0 | in progress |
| Contrast | Use the source's explicit permission to darken light control border | Source value is below its required 3:1 | WCAG calculation: `#8E9684` on `#F8F4EB` = 2.7946:1 | adjustment pending PR 8A |
| Contrast | Treat viz-8 as heat fill only and enforce that restriction | Source forbids it as a line; its surface contrast is 1.6524:1 | Appendix A section 3 and chart rules | pending executable gate |
| Access | Use connected Neon without fetching a connection string | Live verification row cleanup has existing dispatch authority; secrets stay undisclosed | Neon list_projects confirms pokedraft project | access verified |

## NOT RUN / not reached

The theme PRs, Appendix A commit, component and visual snapshots, before screenshot set, three-run GitHub Lighthouse baseline and final set, contrast CI, stray-hex CI, color-blindness checks, theme production verification, independent merge verdicts and merges are NOT REACHED at this checkpoint. Physical-device acceptance is NOT RUN. No completion claim is made from this log.

## PR 8.0 implementation checkpoint

- Guard commit `a20f765` precedes the health fix. RED receipt: 10 failed and 7 passed, comprising absent-route failures plus the missing public exemption. GREEN narrow receipt: 26 passed across health, proxy and measurement tests.
- Health response schema: `sha`, `env`, `region` are strings or null; `engine` is the current engine version; `tokenVersions` lists retained versions plus the current version. Only `?db=1` adds `db.status` (`ok` or `unavailable`). A failed connectivity query returns 503 without database details. No writes, rate limiter or default connectivity query. `connection()` keeps the handler dynamic under this app's Cache Components configuration.
- Added a manual GitHub-hosted workflow with pinned Lighthouse 13.5.0 and Playwright Chromium. Three sequential mobile runs per existing audit route; per-metric medians only after all 24 runs succeed. Each run retains unrounded CLS, warnings, CPU benchmark, load, browser and configuration. Expected production SHA is checked with a cache-busted health GET before and after the batch. A local invocation with a valid SHA and phase rejected the machine before measuring anything. Baseline/final raw reports remain workflow artifacts for 90 days.
- Local full validation: lint PASS; typecheck PASS; 705 tests in 76 files PASS; build PASS and marks `/api/health` dynamic; client bundle provenance PASS; mirrors, image seam and image packs PASS. Build still has the pre-existing Big Shoulders fallback warning, assigned to PR 8A.
- Local e2e: 443 passed, 51 skipped, 1 failed of 495 listed tests. The failure is Pixel 7's existing SX-05 expected-fail case reporting `Expected to fail, but passed`. No theme or pitch CSS changed in PR 8.0. Keep its marker until the planned short-field fix and confirm the unchanged expectation in GitHub Linux CI before landing.
- Before screenshots captured on production at the unchanged anchor: 32 viewport images (8 routes × 2 widths × 2 themes), plus 16 full-page mobile images. Raw PNGs and JSONL evidence are under `output/dispatch-8/before`. Every record reports zero horizontal overflow. The 404 screenshots record the browser's expected 404 console message. The gate and missing-replay states still need captures. A home mobile light image was visually inspected.
- Source census: 22 CSS files, 9 `page.tsx` routes, 32 component `.tsx` files outside tests, 79 matched figure-rendering lines. This supplements the initial mapping without changing a figure.
- Appendix A is drafted verbatim at `docs/design/theme-source-biotraxiq.md`, untracked for the later PR 8A. It is excluded from PR 8.0, which ships carryovers alone. Do not run a formatter on the source document.
- MCP access: Neon verified the pokedraft project and its main/preview branches without connection strings. Render OAuth succeeded and tools loaded. Per the user's reply, Render stays unselected. Computer Use's skill loaded, but this session exposes no node_repl runtime; Computer Use operations are NOT RUN. Playwright remains available.

The later checkpoint supersedes the initial screenshot and source-document availability entries only. It does not establish a Lighthouse measurement, independent approval, merge or production health proof.

### PR 8.0 independent review and durable evidence

GLM 5.3 Flash approved pushed head `269ea75a3465e5c7defc3f15ca251b0fc52ca9bb`, with a valid echoed canary. Linux CI run `38128867885` passed: 705 unit/component tests in 76 files, 444 Playwright tests passed and 51 skipped. The reviewer identified stale STATE counts, mutable measurement action tags and local-only evidence references. Before shipment, this lane corrected STATE, pinned the measurement actions to their verified upstream commit SHAs, and archived the receipts and before captures in `docs/reports/dispatch-8/`. The changed head requires a new review.

The `.mjs` import specifier for the `.mts` measurement helper follows TypeScript's output-extension resolution and is verified by typecheck, Vitest and tsx. Retained token versions currently exclude the live version by contract; the health test asserts the literal supported set `[1, 2, 3]`. No speculative version semantics change was added.

### PR 8.0 shipped and verified

PR #25 squash-merged as `56b9f754d88388223725ad2f3512f239b18fd229`, reviewed head `2eda683327f9ff7cd08cdf05b7f7e1211497b2b0`. GLM 5.3 Flash APPROVE, canary verified. Linux CI `38129942178` passed both jobs on that exact head: 705 unit/component cases in 76 files, 444 browser cases passed and 51 skipped. Vercel production deployment `dpl_6ePJi9yKfokXhk1CvqbzkyasCEyg` serves the merge SHA, proven by a cache-busted `/api/health` response: HTTP 200, `no-store`, production, iad1, engine 3, token versions 1/2/3.

Production `pnpm test:live`: 4 passed. Unchanged production mobile acceptance: 242 passed, 46 skipped across iPhone SE, iPhone 14 and Pixel 7. The daily `verify-bot` row (`95917e19-bb08-4f7f-9f91-c9c002407671`, 2026-10-11) was removed by an exact id/nickname/mode/date predicate; readback found zero remaining verify-bot rows. A 390 px production home screenshot was captured. Clean-runner Lighthouse baseline workflow `38130597740` is running against this merge SHA. No baseline numbers are claimed before its complete three-run receipts.

Additional before scans with Show ratings ON reproduce SX-03 on all 16 filled slots, at 390 and 1440 in both themes. Their accessible names omit the visible token note. SX-04 is not reproduced in the checked states, including completed results; no fictitious nodes or fixes are reported. Chromium layout-shift observers recorded no entries for ratings-on builder cold loads and saved-result reloads at 360 and 390. These become strict-zero regression cases in the corresponding restyles.

### PR 8A guard before implementation

Added component contracts for all nine requested primitives and installed lucide-react. The guard run fails during collection because `../primitives` does not exist yet (one failed suite, no executed cases). This failing guard is committed before implementation. The font fallback is supported by Next's Inter metrics: Arial, size adjust 107.12%, ascent 90.44%, descent 22.52%, line gap 0%.

### Clean mobile Lighthouse baseline complete

GitHub-hosted Ubuntu run `38130597740` completed successfully against PR 8.0 merge `56b9f754d88388223725ad2f3512f239b18fd229`. Each route has exactly three valid mobile runs, with stable cache-busted health identities before and after. Runner image ubuntu24 `20261004.327.1`, Node 22.23.3, four CPUs, Lighthouse 13.5.0, Chrome for Testing 156.0.8078.4. The eight-route median report is committed at `docs/reports/dispatch-8/lighthouse-baseline/summary.md`, with raw sample metrics and environment. Full Lighthouse reports are retained by the workflow artifact. Every route's median Accessibility is 100 and CLS is 0. This report supersedes the pending baseline entries above; dispatch 7's incomparable single-run numbers are not used for a theme regression claim.

PR 8A relocates the existing card renderer's colors into `src/design/card-tokens.ts` without changing their values. They remain explicitly named LEGACY_CARD until PR 8D applies the light warm share-card design. This allows the stray-hex gate to run immediately without silently combining the share restyle into the foundation PR.

### Foundation browser contrast guard

The complete axe tag set exposed 16 insufficient-contrast nodes in unplayed daily match rows in each theme. The existing `opacity: 0.7` faded text along with its row. Before changing that style, this lane removed the historical type/reroll axe exceptions and the unplayed-row contrast exception, enabled `image-redundant-alt` explicitly, and committed those stricter guards. The measured RED receipt is `foundation-browser-3.log`: the two daily-results axe cases fail, while 126 other cases pass. The unchanged mobile acceptance suite remained green in the preceding combined run; a font-driven 43.2 px passcode input regression was corrected with a global 44 px field floor.

### PR 8A local foundation checkpoint

Local lint, typecheck and production build pass; the Big Shoulders fallback warning is gone. The full bounded unit/component suite passes 734 cases in 80 files. Foundation browser verification passes 94 cases: 44 primitive screenshots with axe, the full 20 route/state axe scans, and 30 rendered contrast checks. All historical axe and contrast exemptions are removed. The unplayed match rows use neutral sunken styling without faded text. A real zero-valued ModuleCard meta is retained instead of being hidden by a truthiness check.

There are 44 component screenshots: nine primitives plus emphasis/quiet module variants, at 390 and 1440 in both themes. Platform-neutral snapshot paths permit the same checked-in pixels to run on Linux; the 2.5% pixel allowance covers renderer antialiasing, while explicit 44 px control/row checks guard geometry. The 32-route/viewport/theme capture matrix has no horizontal overflow; local leaderboard captures honestly show database Unavailable because no production credential is copied locally.

The React best-practices checklist found no added effects, fetch waterfalls or request-shared mutable component state. Next already optimizes lucide-react named imports in its installed default package list (`node_modules/next/dist/server/config.js`). The new primitives use native controls, tables and dialogs; keyboard tooltip focus is covered in the real browser.

The exact source CSS block remains intact in tokens.css; permitted AA/game overrides follow it. All 18 type colors pass text contrast at 14%, 16% and 18% tint, and data-mark contrast on surface. The first CVD palette failed separation, so hue/lightness were adjusted within the muted saturation cap. The final report retains the five closest pairs per theme and simulation and passes the 4.0 Oklab-scale guard in both themes and both simulations. These are measured simulation results, not claimed human-subject testing.

Still pending: independent review and Linux full e2e for PR 8A, production Inter HTML/network proof and font-change Lighthouse receipts. SX-03 remains explicitly assigned to the ratings-on builder restyle in PR 8B. SX-05 remains an expected failure pending the short-field layout in PR 8C; its marker is unchanged here. SX-04 was not reproduced and remains guarded by the now-explicit image rule. Strict-zero ratings-on and restored-run CLS browser tests are added in the corresponding area PRs.

### PR 8A Linux resource correction

Linux CI run 38132610243 passed the new palette/color/simulation/lint/typecheck gates, then the first asynchronous builder guard exhausted Testing Library's 1-second default while importing its deferred engine. The run spawned 80 isolated workers on a four-CPU runner. The same unchanged 734-case suite passed locally with four workers. The CI command is bounded to four workers to avoid CPU contention without changing a test, timeout, assertion or runtime behavior. Full CI must be rerun on the changed head; the previous review cannot authorize that head.

GLM 5.3 Flash independently approved 28399647d82f52c9fc88bda8b7a9e6fb50acdd8c with an echoed canary, contingent on required CI. Its warnings exposed stale packet logs: the current committed contrast report already checked14/18% endpoints, but the packet carried an earlier16% log; a local lint log also carried an ignored optimizer failure. Both receipts are regenerated from the current tree. output/ is explicitly excluded from ESLint, as it already is from TypeScript, so local evidence and isolated worktrees cannot contaminate source gates. Risk text report context now names its actual tinted pill surface. No prior APPROVE is used for the changed head.

Full Linux browser run38132610243 recorded474 passes,51skips and14 failures. Four existing ratings-layout guards reproduced font-driven collisions/truncation; ten new small-text snapshots exceeded the macOS reference rasterization tolerance. Slot pills now have an explicit relative line height instead of inheriting the body's22px absolute height; the320px picker puts its Swap tag below the name to reserve name width. These are font-compatibility corrections, with existing tests unchanged. Visual baselines are platform-specific: ten Linux images come directly from this CI artifact; the other34 macOS references already matched on Linux within the unchanged2.5% threshold. The provenance JSON names these sources without claiming34 Linux captures. Both reference sets stay reviewable.

Current foundation browser checkpoint:102 passes, covering44 visual/axe cases,20 strict route/state axe scans,30 rendered contrast cases and8 unchanged ratings-layout cases. The font compatibility corrections resolve all four existing ratings failures locally. Current lint/typecheck/build receipts are archived alongside that current browser receipt. Full Linux rerun remains pending.
### PR 8B builder guards before implementation

An isolated worktree prepares the next area while PR 8A remains under review. New filled-builder axe cases at390/1440 in light/dark fail on the existing ratings-on accessible-name mismatch, four failures. Existing layout-shift cases and new strict-zero Show-ratings-ON cold-load checks at360/390 all pass, five cases. RED measured against the unchanged8A local production build. Guard files are committed before label or page-structure changes.


### PR 8A shipped and verified

PR #26 squash `e8ce2d332824def968132287e07b8cbbe89b34c2`, reviewed head `89b390f0c4e1f7538c8166652d31cc05f91e6dbe`. GLM 5.3 Flash APPROVE with validated canary. Exact-head Linux CI `38148882020`: 734 unit/component tests in80 files;488 browser passes,51 skips. Vercel production deployment `dpl_5ty1tdnWdWe7yyv5SCumxNadXMhT` READY. First cache-busted health probe returned this merge SHA with no-store, production/iad1, engine3 and token versions1/2/3.

Production live suite:4 passes. Complete unchanged mobile acceptance rerun:242 passes,46 skips. The first parallel run passed241 cases but failed one browser-context close with ENOENT because two Playwright commands shared test-results; no layout assertion failed. The full rerun used an isolated output directory. Exact verify-bot row `cdd5b108-cf52-4536-83ae-d30cdfa644ec` was deleted with id/nickname/mode/date predicates; readback count0. The390px light/dark production screenshot matrix has zero horizontal overflow. Production HTML and linked CSS declare only Inter and its metric fallback; the network recorded one successful downloaded font and browser loaded family Inter. Big Shoulders and Barlow are absent. Font-change Lighthouse workflow `38150015655` is in progress; no final numbers claimed yet.

The source neutral borders on Pill, Tooltip, StatusNote and Sheet are decorative; interactive input, focus and action boundaries use checked control tokens. Sheet uses the native dialog, with its parent responsible for showModal/close to activate focus and backdrop behavior. Picker preserves that native lifecycle. Computer Use runtime and physical phones remain NOT RUN.

### PR 8B implementation checkpoint

Home and builder now use titled modules on a16px grid. Settings and records use list rules and table primitives; absent records say No saved runs or Unavailable. Picker uses raised palette surfaces, tinted type pills and a reason-bearing empty state. Existing actions, figures, seed contracts, native focus/back/swipe behavior and frozen image files are preserved.

SX-03: accessible names now reference the visible slot, species and rating note. The four committed ratings-on axe guards fail before the fix and pass after it. SX-02 and SX-06: exact-zero cold-load ratingsON and saved-run restore CLS at360/390 pass. Compact builder tags keep twelve-pixel name surfaces and reserve stable geometry; existing narrow-phone collision and overflow guards pass unchanged. Draft short-field SX-05 remains scheduled for8C.

Local full suite734/80 passes; lint/typecheck/build and palette/color/CVD/image/mirror/bundle gates pass. Focused browser run311 passes/46 skips includes unchanged mobile acceptance, full axe and contrast, existing ratings layout, new names and strict CLS. After rebasing onto the shipped8A, the full browser suite is running. Before/after pairs contain16 captures each: home, filled rated builder, picker and empty search at390x844/1440x900 in both themes, every capture overflow0. Visual inspection included filled mobile light and desktop dark.

Fixed-fixture results and leaderboard text is captured verbatim alongside its numeric values. PR8B numbers-only comparison preserves186 result numbers and10 board numbers in each theme, plus exact named score/record and board-row content. The baseline comes from the actual8A browser; expected values are not generated by the new implementation. Reuse scripts/audit/theme-figures.mjs for each subsequent area PR.


### Font-change clean-runner measurement complete

GitHub Ubuntu run38150015655 passed against productione8ce2d3, with the same pinned environment and three runs per route as baseline38130597740. All individual samples retain Accessibility100 and exact CLS0. Every route median LCP is below baseline: home2112.9ms, play2260.5, daily2382.3, leaderboard1812.3, history1659.0, help1808.4, results3688.0, Kanto start2262.0. These are measurements after the foundation, not causal estimates isolating the font. Raw reports remain in the run artifact and summaries/sample metrics/environment are committed in lighthouse-font-8a/. The final lane measurement remains due after all area PRs.


### PR 8B full browser target corrections

The rebased full local browser run recorded490 passes,51 skips and6 failures. The six failures reproduce two regressions on each device: the builder Team Score label inherited10.4px text, and the image-settings checkbox hit box was43px inside its new bordered row. The label now explicitly uses13/18 at600; the checkbox row reserves45px so its inner hit box is44px. No test or assertion changed. The six focused unchanged guards now all pass. Build and lint pass, and the after captures were regenerated. The required full Linux rerun and independent exact-head review are pending.
### PR 8C short-field guards before implementation

A literal eight-formation matrix on iPhone SE, iPhone14 and Pixel7 fails24 cases against the unchanged8B build. It checks every starter name against every other picture and requires12px names at390px and wider. RED includes keeper and other line collisions, beyond the original4-4-2 carryover. The existing expected-fail remains unchanged until the layout is corrected.


### PR 8B shipped and production verified

PR #27 squash6e7d34e6071f21c976f875a0cbb1b7303407054e, reviewed249a6dd5151bbe52899600ade150f0ca50a2a970, GLM5.3Flash APPROVE with verified canary. LinuxCI38150679435 passed734 tests/80files and496 browser cases/51skips. Vercel initialpreview failed pre-build with git_info_fail, no build events; retry pinned to the same immutable GitSHA succeeded asdpl_2pKSfi6qjGtfR6KSbbTQbMCuqYB8. No paid tier, source change or production promotion was used for the retry. Official MCP documentation specifies that omitting target creates a preview; explicit target preview was rejected400 before any deployment, then corrected.

Productiondpl_Aiwm5aTj3vb9uwk3imYYJvtaXQTH is READY. First cache-busted health proves mergeSHA andno-store. Live4 passed; unchangedmobile242 passed/46skipped. Exact dailyverify-bot8b2e004b-fce6-40ef-aa73-cbe73e5019d7 deleted with id/name/mode/date predicate; readbackcount0. Eight production390px captures coverhome, filled ratedbuilder,picker,emptysearchinbothschemes, overflow0. GitHubUbuntuLighthouse38151791031 is running againstthe8Bmerge; no numbers claimed untilcomplete.

Reviewer16pxinput concern was verified in a real390pxbrowser: Formationselect16px andpickersearch16px, supplied by theglobalinput/select/textarea floor. The full post-fixLinuxsuite resolves the earlier6 local failures. The checkpoint STATE count is corrected inthis nextPR; no commits were made after8BAPPROVE. The numbers-only gate deliberately allowsprose/layout changes, as the dispatch requests; verbatimtext remains retained. REDbuilder receipt is now archived. The picker count and reason-bearingempty state remain two shortmessages; no accessibility violation is claimed from that duplication.

### PR 8C draft and wheel implementation checkpoint

The draft becomes the single emphasizedmodule with a warm pitch, quiet token depth and palette name surfaces. The short-field layout puts picture and name beside eachother, keeps44px token targets and12px names, and removes the originalexpected-fail onlyafter the24 formation/device guards pass. No formation positions, engine actions, seed/timing functions or PlayerImage implementation changed. Pitch stripes are the onlyremaining gradients inthis area. Wheel segments alternate palette surfaces with14% tint, accentrim and the existingtiming/reduced-motion path.

Challenge starts and RoadtoFinal use titledModuleCard headers. Chart marks gain keyboard-accessible detailtriggers with opponent/rating/source, neutral missing-opponent reason and internallyscrolling44px columns. The same source figures and ladderheight calculations remain. A narrow unit check22/2 and full734/80 pass; palette/color/CVD/type/build/image/bundle checks pass.

The first broadbrowser run recorded331 passes,50skips and16 failures:15 overflow failures from absolute tooltipwrappers inside the internal chart scroller, plus360px restored-resultCLS0.08412322274881516. Tooltip triggers now remain in flow and panels stay within the viewport. The play page reserves at least oneviewport of content height so a compactstart footer does not move visibly while a saved result restores. No guard was relaxed. The corrected focusedrun44/44 passes:24 allformation/device pairs,3 original4-4-2 cases,15 affectedoverflow cases and2 strictzero restoredCLS cases. Full finalbrowserverification after rebasingonto shipped8B is pending. Beforematrix16 captures includesstart,draft,completed squad andspinningwheel at390/1440both themes; aftermatrix andnumericdiff stilldue.
