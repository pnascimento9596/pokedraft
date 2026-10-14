# CI UI regression repair

## Scope and authority

Paulo asked to resume the interrupted Gemini lane and fix failing GitHub jobs with narrow, clean changes. He authorized merge and production deployment after verification. This is a Yellow, display-only repair. Engine, generated data, scouting, storage, draft actions, leaderboard, and database contracts are unchanged.

Base is `94ec3807d4c9c1125653ca19a8647f3630cd50ff`. Main CI run `38493152132` failed 33 browser cases and passed 662. No open PR existed at pickup. The original checkout had six modified files. Those bytes were preserved in the original checkout and copied to the isolated `fix/ci-ui-regressions` worktree.

## GATE 0

- I inspected the inherited diff and matched it to the actual failed job log instead of treating the transcript's partial successes as a completed gate.
- `src/components/pitch/Pitch.module.css` defined 94px cards and a 450px fitted phone field at the base. The overlap and compact-field guards failed. The builder also supplied the draft-only `fit` prop in `src/components/builder/Builder.tsx`.
- `src/components/run/RoadStrip.module.css` defined 24px phone and 28px desktop tooltip wrappers with 11px labels. Existing browser guards require 44px targets and 15px labels. The larger controls need enough grid-row height, including the bar and value row.
- `src/components/results/MatchList.module.css` used stadium text colors on the theme-dependent results panel. The light-theme axe findings identified the match-star name and headline. RoadStrip also used dark-theme-only text colors.
- `src/components/run/DraftBoard.module.css` controls the fixed phone drawer and root scroll padding. The inherited 300px cap passed the mobile coverage checks but introduced nested scrolling with artwork and ratings.
- `src/components/pitch/PitchCard.tsx` hid the duplicate filled-slot badge. `src/components/pitch/Pitch.tsx` still referenced that hidden badge between the visible role and species in `aria-labelledby`. A direct browser axe probe reproduced 15 label/name mismatches on shared results. Omitting only that hidden reference removed every mismatch while preserving the legacy `aria-label`.

## Evidence and decisions

A detached clean-main production build reproduced 27 non-mobile failures, with 64 passes. A fresh production build of the inherited candidate produced 151 passes, 4 existing conditional skips, and 14 failures. The new failures were eight nested-scroll guards, four accessible-name cases, and two desktop chart-clip cases.

The accessible-name guard was committed RED before the correction in `9f93aa1`. It failed with `Unable to find an accessible element with the role "button" and name "LCB Bulbasaur DF Bulbasaur Grass Poison"`; four sibling tests passed. After the correction, both pitch component files passed all 12 tests.

The drawer cap was removed. The original `calc(100dvh - 225px)` maximum remains. Root scroll padding now uses `min(max(360px, calc(100dvh - 225px)), calc(100dvh - 156px))` while the drawer is open and the phase is choosing, including before reveal. On 390x664 the independent browser probe measured the keeper clearing the drawer after the padding increased to 439px. The eight original flow guards went from eight failures to green, and the targeted mobile matrix passed all 23 cases. Parent read back these artifacts and runs the complete suite independently.

Real 390px and 1440px screenshots exposed one adjacent contrast defect in the expanded drawer. A scoped axe probe measured the toggle at 1.54:1 and the instruction at 2.62:1 against the dark stadium panel in light mode. The focused regression was committed RED as `decf570`, with one failure and one dark-theme pass. Two scoped rules use the stadium foreground tokens for these elements. Other themes and panels retain their existing tokens.

- Fix Root Causes. Repair geometry, semantic color selection, accessible-label order, and scrolling reservation rather than changing expected behavior.
- Laziness Protocol. Retain only narrow presentation changes. No engine edits, test retries, disabled assertions, or new abstractions.
- Prove It Works. Use fresh production builds on separate ports, a clean-main comparison, real Chromium and WebKit runs, and exact-head remote checks.

## Playbook exceptions

`how`, `why`, `architect`, `swarm`, `arena`, `deslop`, and control plugins are not installed in this harness. First-person source recon, git history, and Playwright are the available equivalents. Architect skipped because the repair preserves the current product design. Comment Sicko is not installed; the independent release reviewer receives the comment and scope audit. No new application comments were added.

Existing browser guards already reproduce the presentation regressions. The new cheap component guard follows RED-before-fix sequencing. No browser assertion is weakened.

## Acceptance

The first complete browser sweep passed 687 cases, skipped 55 existing conditional cases, and failed eight. Seven were landscape clipping regressions introduced by the inherited compact empty-card size. The decorative plus image consumed 30px alongside the header, slot, and instruction, leaving the instruction a zero-height box. Empty cards now omit that decoration; their visible role, slot, draft instruction, semantics, and tap targets remain.

The second full sweep passed 694, skipped 55, and failed three. Two light-theme desktop scans showed that the new stadium instruction foreground needed the same phone fixed-drawer boundary as its dark background. Both new foreground rules are now scoped to the open choosing drawer below 960px and at least 500px tall. The original desktop colors remain.

The WebKit two-tab failure appeared in both sweeps. Trace snapshots show `aria-busy=true` and `Loading the draft` when the test clicks the second tab's Start. The mount-time restore then rejects the wrong-seed snapshot and returns to Start without entering Round 1. This is a click protocol race, not a reason to change persistence or extend the assertion deadline. The test now uses the existing `ready` helper and waits for Start not to be busy before that click. All round, squad, and checkpoint assertions remain. Twenty repeated two-tab cases passed across Chromium and WebKit, with no retries or flakiness reported.

After the empty-decoration repair, the focused landscape, hitbox, drawer-contrast, and two-tab matrix passed 30 cases with 46 existing conditional skips.

At `b886aed`, local lint, typecheck, production build, and client-bundle guard passed. The unit suite passed 881 tests in 97 files. The complete production-build browser suite passed 697 cases with 55 existing conditional skips, zero failures, and zero retries, for 752 cases total. Mirror, image-seam, image-pack, theme contrast, theme-color, and color-blindness guards also passed.

## Independent review correction

GLM 5.3 Flash rejected `b886aed` because the inherited filled-card heights could not contain their role, artwork, name, and types. The existing hitbox and pair-overlap guards did not prove internal containment. Twelve real-browser cases across Chromium and WebKit, builder and completed draft, at 390px, 700px, and 1024px all failed before correction. The regression was committed RED as `82fe1ef`.

Base and unfitted phone cards now retain their original content-sufficient heights, 94px and 90px. Restoring 90px globally to fitted cards made four existing empty-target guards fail and caused two filled-card overlap cases. The fitted height is therefore 88px for filled cards only; empty cards retain their compact dimensions. A direct rated-draft browser matrix at 390px found no content overflow or overlapping filled targets at 88px across all eight formations. The strengthened two-engine filled-target guard was committed RED as `a7a1790`, with two failures and ten passes on the 90px candidate. Narrower widths and repaired field spacing remain, with no artwork reduction. Fresh full browser validation, exact-head independent review, CI, merge, and production verification are required.

## Original screenshot request audit

Paulo supplied the original PR46 request and its three screenshots during this repair. Home-only disclaimer scoping and icon-only pitch types were implemented; the new browser acceptance guards verify the disclaimer on home and its absence from lobby, draft, and shared results, plus unclipped phone round labels. Those two cases passed before any further changes.

The larger-card request also requires identifiable names, not ambiguous ellipses. Both Chromium and WebKit clipped the real `Crabominable` card on a 390px phone. The acceptance guard was committed RED as `309bc77`. Type icons now sit in a narrow column beside the unchanged 30px artwork, freeing a two-line, 12px name area. Corner role/rating badges and primary-type outlines retain their contracts. No visible type words are added. Base, phone, and fitted filled-card heights remain 94px, 90px, and 88px, larger than the pre-PR46 fitted 68px layout.

A 48-scene browser prototype restoring the wider 62px/68px tokens still found overlap in eleven builder/draft/formation cases. The narrower repaired widths therefore remain rather than widening cards back into neighbors. Focused source verification after the content reflow passed 119 browser cases with four existing conditional skips, including full-name, footer, chart-label, internal-containment, filled-target, all-formation, and draft-flow coverage. Final whole-suite verification and independent review remain required for this new source state.

Physical-device testing and Lighthouse performance measurement are outside this repair.
