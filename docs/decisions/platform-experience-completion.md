# Platform experience completion

October 15, 2026. This is the second dispatch in the approved handoff roadmap.

The candidate is rebased onto PR [#51](https://github.com/pnascimento9596/pokedraft/pull/51), merged at 18:07:36 UTC as `6218750ea2c9896e469b1496d5d20691b4b78d6f` from reviewed head `4b7439ca2cff41aa6211df9cd7a7a2fb565673d3`. Its hosted gates passed with 1,003 unit tests and 732 browser tests plus 55 skips. The landing owner confirmed cache-busted production health at 18:08:36 UTC with HTTP 200, no-store, exact squash identity, engine 4, and token versions 1 through 4. Vercel production deployment `dpl_GHSGZTdQ73mA2u7UiXDVGg1218yU` is READY. The landing owner also completed 21 production browser checks, including current Boss XI/shootout identity, retained v1/v2/v3 outcomes, v3 contribution, malformed-link HTTP 404 contracts, and share/card/download behavior. This receipt does not claim deployment of the experience candidate.

## Scope

Players can inspect partial line strength when ratings are enabled, read filled tactical slot labels, inspect chemistry links by reason, and scout all sixteen occupied squad positions. The dossier shows a role fit mini pitch and compares role ratings and chemistry for the actual Builder placement or swap. Blind mode keeps qualitative chemistry and fit information while hiding numerical ratings.

History now records optional squad identity for new runs. Existing records remain readable without invented species. The local career view includes ranked match win rate by formation and a searchable, paginated Hall of Fame covering all 1,025 species. Counts include the bench, exclude friendlies, and describe only available browser history. History and leaderboard rows show known squad sprites and seeded challenge links. Missing historical squad data has an explicit unavailable state.

Exhibitions replay recorded goals, preserve the recorded full time score, pause and resume, and reset playback for rematches. Exhibition matches remain unranked and do not write history or leaderboard entries. Draft sound controls remain visible on phones, and special reveals use procedural cues after gesture unlock.

## Recon and decisions

- `src/components/builder/Builder.tsx` owns lazy engine readiness and the action toolbar. Feedback originally mounted above the toolbar after the engine resolved. The existing ratings legend already reserves space to prevent the same class of movement. WebKit completed a Randomize click but left zero filled cards at 700 and 1,024 px. A committed failing ordering guard precedes moving feedback below the toolbar. This preserves action positions during feedback loading and animation.
- `src/components/pitch/PitchCard.tsx` exposes tactical slot labels for filled cards. Browser axe checks caught accessible names that omitted those visible labels. The 700 px layout also caught labels extending beyond their cards into the next row. Labels now sit inside the card footprint and participate in the accessible name. A committed failing unit guard and the existing browser checks preserve both fixes.
- `src/components/builder/Picker.module.css` constrains phone controls so the species list keeps more than half the 320 by 568 sheet. Filled-slot actions and ratings sorting previously made the list fall to 163 of 512 px. Compact phone header controls keep 44 px targets.
- `src/ui/chemistry-labels.ts` holds the data-free display registry. Importing it through `partial-rating.ts` pulled live species into the eager Builder graph. The calculation module re-exports the registry for existing callers, while the eager component imports the registry directly.
- `e2e/data-split.spec.ts` checks both literal Pokedex and scouting markers after the user action. The build emits two chunks. The former one-chunk assertion tested bundler packaging rather than the data boundary. The no-data-before-load and slow-data interaction checks remain in place.

Architect skipped. The approved dispatch fixed the product design. Cursor-only how, deslop, control-ui, control-cli, and reflect are not installed. GATE 0 used direct source, browser, trace, and test evidence.

## Validation

The final runtime candidate passed `pnpm lint`, standalone `pnpm typecheck`, 1,037 unit tests in 117 files, build-boundary validation of 1,025 Pokedex and 1,025 scouting rows, and `pnpm build`. Image seam, client bundle, mirror, theme color, contrast, and color-vision scripts passed. The client bundle contains no retained engine bundle.

The combined production-build browser selection passed 56 tests. It covers data split and slow-loading behavior, dark/light axe scans, rating layouts, both Chromium and WebKit card containment, and the ten platform experience cases. Full mobile acceptance passed 249 tests with 48 expected skips across iPhone SE, iPhone 14, and Pixel 7 profiles. The final platform-only rerun passed 14 tests, overlapping ten cases in the 56-test selection. It additionally checks visible 44 px draft sound controls and known/unknown leaderboard squad previews at 1,280 and 320 px.

After rebasing onto the shipped PR #51 squash, lint, standalone typecheck, all 1,037 unit tests in 117 files, production build, and all seam/mirror/theme checks passed again. A fresh production server passed 61 focused browser tests, adding health metadata to the complete 60-case UI/data/accessibility selection. Rebased logs are `/tmp/pokedraft-experience-rebased-browser.log` and `/tmp/pokedraft-experience-rebased-build.log`. The 249-pass mobile run above precedes this rebase; its runtime source is retained, while hosted CI provides the next full browser run. No physical-device proof is claimed.

Logs remain local at `/tmp/pokedraft-experience-candidate-browser.log`, `/tmp/pokedraft-experience-mobile-final.log`, `/tmp/pokedraft-experience-extra-proof.log`, and `/tmp/pokedraft-experience-build.log`. These are implementation results. The implementer does not self-review. Landing requires independent review after the final commit and any rebase.

Executable browser coverage lives in `e2e/platform-experience.spec.ts`, `e2e/builder-ratings-layout.spec.ts`, `e2e/pitch-card-containment.spec.ts`, `e2e/data-split.spec.ts`, `e2e/a11y.spec.ts`, and the existing mobile acceptance suite. Screenshots and failure traces are under ignored `output/playwright/`.

## Limits and remaining dispatches

NOT RUN on physical iPhone, Android, or audio hardware. Browser emulation cannot prove physical keyboard, speaker quality, or real iOS touch drag behavior. No production deployment or production database migration is part of this implementation receipt. Independent review and deployment identity are recorded by the landing owner.

Retained engine bytes, generated species/scouting artifacts, deterministic match behavior, API schemas, and production database migrations are outside this dispatch. Backend admission concurrency and remaining platform work ship in their own reviewed dispatch. Full lifecycle account storage and reconstructed species for old local records are not claimed.

## Principles

Test Behavior, Not Implementation shaped the literal Hall of Fame, seeded challenge, actual swap, recorded-goal replay, and dual data-marker browser assertions. Prove It Works required production-build browser evidence for layout and accessibility. Technical Writing keeps production and branch claims distinct and reports unavailable historical evidence explicitly.
