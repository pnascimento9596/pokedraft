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
