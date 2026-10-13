# Silph Stadium

## Scope and outcome

UI-only overhaul in `feat/silph-stadium-3d`, based on `26bba59`. The engine, scouting, data, storage, API, passcode/proxy and client-engine adapters remain unchanged. Parent owns independent review and shipping. No push, PR or merge was performed.

The supplied reference is a generated concept, not a trustworthy Pokémon dataset or a runnable screenshot baseline. The implementation uses actual species, types, ratings, reroll limits and local records. Pixel-exact equivalence to that concept is not claimed.

## Decisions

- Keep `PitchProps` as the domain boundary. `Pitch3DStage` paints SVG turf and chemistry under HTML buttons. `PitchCard` uses `PlayerImage` as its only artwork source.
- Centralize all 18 authentic type colors in the typed `src/design/stadium.ts` registry. Keep literal stadium colors under `src/design`, so the existing theme-color guard stays intact.
- Use one presentation projection for starter positions and chemistry endpoints. Space the engine's existing formation rows without reordering slots, roles, channels or adjacency. Desktop goal direction remains the same as mobile.
- Counter-rotate cards by -26 degrees above the 26-degree slab. Raise them 40px to avoid intersecting the turf; keep chemistry at 1px so lines cannot paint over card labels. Native browser endpoint measurements verify that links terminate inside the corresponding card.
- Preserve the existing 11px text floor rather than the mockup's 10px badges. Use 88px mobile cards instead of 80px to accommodate authentic dual types and readable names. The 740px mobile field deliberately permits page scrolling rather than hiding players or compressing touch targets.
- Minimize the challenge drawer after choosing a Squad First candidate, so placement targets are not covered. Empty-slot taps can reopen it without adding an engine action. Position First still sends the existing `chooseSlot` action. Classic candidates are never truncated.
- Bare `/play` derives the existing Open, Squad First, 4-3-3 lobby through `DEFAULT_PANEL`, `playHref` and `parsePlayQuery`. Nonempty queries still go through the existing parser and retain its error behavior.
- A zero-valued note is not ratings-off. A real Pichu keeper rating of 0 has a separate RED-then-GREEN guard.
- Partial chemistry is unavailable through the frozen public engine API. Show `Chemistry after draft` until a complete lineup exists instead of inventing scores or filling missing slots with fake players. Complete chemistry and links come from `rateTeam`.

These choices follow Model the Domain and Prove It Works. The palette and projection encode presentation rules; literal tests and production-browser screenshots prove their output.

## Requirement matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| Dark shell, outlined yellow/blue wordmark, glass dugout, iridescent real mode actions | `src/design/stadium.css`, `src/components/home/SidePanel.module.css`, after screenshots | Implemented; light-theme toggle retained |
| Landscape 4:3 desktop slab, 1200px perspective, 26-degree tilt, counter-tilted HTML cards, extruded edge, neon Poké Ball markings | `Pitch3DStage.tsx`, `Pitch.module.css`, desktop pitch captures | Implemented; no SVG foreignObject |
| Actual species, authentic types, role/slot labels, optional real scores, empty drafting cards | Four literal card guard tests; builder/challenge rating tests | Implemented, including numeric zero and score suppression |
| All formations, all 11 starters, 44px rendered minima and separate hitboxes at 375/390/1280 | `e2e/silph-stadium.spec.ts`, three viewport tests covering eight formations | Passed; all centers reach their HTML button |
| 320px dugout, generation/order/style controls, five-card bench, actual local records | `dugout-records-1280.png`, existing settings/mode tests | Implemented; captured Classic score 374, record 2-1-1, one real saved run |
| Mobile hub, real filled count, builder/challenge drawers, candidate pick then slot placement, actual reroll remaining/maximum | New touch tests at 375/390; existing reroll and picker tests | Passed; accessible font-floor deviation documented above |
| Wheel/reveal, reduced motion, drag/tap swap, grass scrolling, full draft/results | Existing wheel/mode tests; new real touch/drag/scroll tests | Passed in new coverage; seeded 151 record 3-0-2 and Classic record 2-1-1 retained |
| Chemistry alignment and actual values | Native SVG endpoint/card checks and full-lineup `rateTeam` | Full squads passed; partial chemistry and partial chemistry links remain unavailable |
| Legacy one-screen/no-scroll mobile expectations | Full affected browser matrix | 20 presentation compatibility failures remain; details below |

## Verified gates

Logs are local under `output/silph-stadium/logs` and are not fabricated or promoted to screenshot baselines.

| Gate | Actual result | Log |
| --- | --- | --- |
| Baseline production build before runtime edits | Exit 0 | `baseline-build.log` |
| Initial RED commit `848ac511600e3f594de1a977cf5c63c8bc39a66e` | 2 failed guard tests | `red.log` |
| Planned complete lint/typecheck/test/build pass | All exit 0; 863 tests in 93 files passed | `final-lint.log`, `final-typecheck.log`, `final-test.log`, gate build logs |
| Additional zero-note RED commit `206d907` | 1 failed, 3 passed | `zero-red.log` |
| Final affected component tests after fixes | 137 passed in 13 files | `handoff-focused-units.log` |
| Final complete unit rerun after the zero-note guard | 864 passed in 93 files; exit 0 | `post-fix-full-unit.log` |
| Final production build | Exit 0 | `final-build.log` |
| Theme contrast/colors/CVD, image seam, client bundle | All exit 0 | `verified-*.log` and `final-*.log` |
| New browser suite | 9 passed; includes native chemistry endpoints, 24 formation/viewport combinations, touch placement, complete seeded results, drag and grass scroll | `final-new-suite.log`, full matrix |
| Final focused new suite plus mobile-targets across matching projects | 90 passed | `final-focused-browser.log` |
| Last complete affected browser matrix, port 3439, max 4 workers | 433 passed, 21 failed, 54 skipped | `final-matrix.log` |
| Known WebKit two-tab lazy-import race rerun | 1 passed | `progress-retry.log` |

The complete gate pass preceded late browser-driven presentation fixes. Those fixes received scoped lint/type checking, fresh production builds, focused browser checks and the final 864-test unit rerun. The implementation did not repeatedly run the whole four-gate ladder during iterations.

## Remaining browser failures and gaps

The 21 failures in the last affected matrix comprise:

- 12 `mobile-acceptance` cases. The old taps-only flow and finished-draft swap helpers demand no page scrolling and an already-visible keeper. That conflicts with the requested scrollable pitch containing all 11 targets at accessible sizes.
- 8 `mobile-draft` cases. Three demand an initially visible first slot and fixed one-screen spin layout. Three require the swap hint and taken slot to remain immediately visible while the candidate drawer is expanded. Two require a sideways, screen-height landscape pitch rather than the new consistent goal orientation and scrollable slab.
- 1 known `webkit-progress` two-tabs lazy-import race. Parent reported the same failure on main CI run `38347918588`; a targeted rerun passed. Frozen run storage and engine code were not changed to address it.

The three expanded-drawer swap-hint cases are a usability carryover, not dismissed as proof of correctness. The drawer can be minimized and the new touch placement and complete-draft swap tests pass. Parent must decide how the legacy no-scroll acceptance contract should change. No legacy assertions were weakened and no Playwright project matchers or screenshot baselines were changed. Only old card-anatomy selectors were updated to target the actual species-name and picture elements, retaining the original separation and font assertions.

Partial chemistry needs an approved engine/API change or an explicitly authorized presentation calculation. Neither is permitted by this dispatch. Exact pixel parity with the generated concept remains inapplicable.

## Browser artifacts

- Nine immutable baseline screenshots in `output/silph-stadium/before`: builder empty/filled and draft at 375, 390 and 1280.
- Twenty-five final production-browser captures in `output/silph-stadium/after`: empty/filled builder, partial/filled draft, both drawers, dugout/banner/actual records and results.
- Supplied reference preserved separately at `output/silph-stadium/reference/mockup.jpg`.
- Complete file/dimension/hash list at `output/silph-stadium/screenshot-manifest.json`.
- Actual failing case details at `output/silph-stadium/failures.json`; original Playwright traces remain under `test-results`.
- Rerunnable capture scripts at `output/silph-stadium/capture-before.cjs` and `capture-after.cjs`. Do not rerun the former into the immutable baseline directory.

## Resumed parent verification

The parent resumed the existing worktree at `eae10ef` without recreating the implementation or baseline captures. The mobile drawer and swap-feedback fixes left in the working tree were built and exercised in WebKit iPhone SE, WebKit iPhone 14 and Chromium Pixel 7. The focused run passed 26 cases and skipped four landscape cases assigned only to iPhone 14. The corresponding log is `output/silph-stadium/logs/resume-mobile.log`.

The authorized vertical-scroll layout supersedes the old one-screen draft assumptions. The acceptance tests now scroll deliberately before real taps, retain uncovered-target checks and seeded result assertions, measure pitch stability in document coordinates, and verify all eleven landscape targets remain separate and reachable. The drawer reserves scroll padding, shrinks on short viewports, and minimizes when selecting a placed player. Swap feedback stays visible without requiring another scroll.

Parent lint, typecheck, all 864 unit tests in 93 files, production build, theme color/contrast/CVD, image seam, client bundle and mirror checks passed. Hash comparison verified all 163 protected files unchanged against the saved base manifest. Logs use the `resume-` prefix.

The first parent full browser run passed 580 cases, failed 87 and skipped 55. This broader run exposed background fallback, wordmark contrast, accessible card/reroll names, square missing-art placeholders, and outdated bare-play and collapsed-hub expectations. These failures remain recorded in `resume-full-e2e.log`; they are not represented as an accepted gate. The existing main run `38347918588` independently confirms the Round 1 two-tab race on Chromium. No storage or engine fix is in this lane.

## Final parent source acceptance

The resumed fixes add canvas fallback beneath the stadium gradient, a dark wordmark backing in both themes, accessible names containing visible card and reroll text, distinct armed and keyboard-focus rings, and square artwork/error placeholders bounded by the card's available space. Bare `/play` is tested as a valid lobby; the malformed-link data-split guard now uses an explicitly invalid query. The mobile type test opens the collapsed hub before inspecting its header.

Parent re-execution passed lint, typecheck, 864 tests in 93 files and production build. The full final Playwright run passed 667 cases with 55 existing conditional or project-specific skips and no failures. These results supersede the historical failed matrices above. Logs are `parent-final-lint.log`, `parent-final-typecheck.log`, `parent-final-unit.log`, `parent-final-build-v2.log`, and `parent-final-e2e-v2.log` under `output/silph-stadium/logs`.

Theme color, rendered contrast, color-blindness simulation, image seam, client bundle and mirror checks pass without guard changes. The parent corrected the CSS background declaration to retain the gradient and canvas fallback without introducing a forbidden image-loading seam. The reroll tests now assert the complete visible and accessible count, not the former shorter label. The Round 1 two-tab test passed unchanged in the final full run.

The parent captured 34 additional production-build images at 375, 390 and 1280px under `output/silph-stadium/after-final`. These include full-page home and completed draft views as well as pitch, drawers, dugout and real seeded results. The parent visually inspected the final 1280px home and 375/390px filled pitches. Cards remain above turf, chemistry remains behind them, and starters and bench remain separated. The mobile field is deliberately tall and scrollable. Generated reference framing, duplicated illustrative players and bogus type labels are not reproduced. Full scripts and captures remain local build evidence, not overwritten screenshot baselines.

The named data boundary stays `PitchProps`; engine-owned slots, roles, adjacency, seeded output and draft transitions remain frozen. All 163 protected paths still match the original SHA-256 manifest. No dependency or Playwright project configuration changed. Partial chemistry remains unavailable until a complete lineup exists because the frozen engine API requires a complete team. This is an explicit specification limitation, not a fabricated partial total.

## Settings preservation and Linux correction

Paulo's pre-merge review confirmed the visual direction and required all existing options, initially open and easy-to-find settings, and the existing Play confirmation. Formation, all nine generations, Open or Classic style, both draft orders, legendaries, separate builder/challenge rating settings, image pack and mirroring customizations, and theme choice remain available. Settings helpers, persisted defaults and `ConfirmPlay.tsx` are unchanged.

A new literal browser guard exposed the mobile Formation selector below the 844px viewport. RED commit `a63a670` recorded two failures before moving the open settings above the builder. Formation now appears in the first 375/390px screen. Play 8-0 and Play 151 still open the unchanged `Settings confirmed?` dialog; Yes uses the selected settings and No or Escape returns focus to Formation. Parent screenshots show the real 4-4-2 confirmation and default-open mobile panel.

The first Linux CI run `38402356772` had one persistent failure in the quiet component screenshot and one two-tab case that passed on retry. Inspection of downloaded actual, expected and diff images established that the transparent gallery card inherited the new stadium background. The gallery now uses the original `--canvas` as its fixture backdrop. No snapshot, pixel tolerance, primitive styles or product accessibility assertion changed.

Parent reruns passed 66 focused browser cases with two project skips, the full 671-case browser suite with 55 conditional skips and zero failures, 864 units in 93 files, lint, typecheck, production build and all theme/image/bundle/mirror checks. All 163 protected hashes still match. Logs use `settings-visible-` under `output/silph-stadium/logs`. The prior `3bf9681` reviewer receipt is superseded; a fresh exact-head receipt and Linux CI are required.

## Not run

Production deployment, live-site tests and merge remain pending. PR #42 is open; its first exact-head GLM approval covered the previous source and does not approve the new settings-order correction. Cursor-only tools and architect exploration were skipped because they are not installed and the dispatch fixed the design. Literal pixel parity, physical-device tests and authenticated Vercel preview UI tests are not claimed.
