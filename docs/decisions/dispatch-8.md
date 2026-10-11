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
