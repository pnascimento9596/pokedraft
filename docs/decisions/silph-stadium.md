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

## Not run

Independent reviewer receipt, remote CI for this branch, production deployment, live-site tests, push, PR and merge. Parent owns these. Cursor-only tools and architect exploration were skipped because they are not installed and the dispatch fixed the design. No baseline approval or legacy no-scroll test rewrite was performed.
