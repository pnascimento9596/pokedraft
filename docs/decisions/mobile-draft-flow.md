# Mobile draft flow polish

## Scope

Narrow presentation follow-up to Silph Stadium. Base `a78cddf35baf3aa8406e0d86ece787917d8dc101`; branch `fix/mobile-draft-flow`. Preserve engine and backend scoring, draft transitions, formation indices, all existing options, initially open home settings and the unchanged confirmation popup.

## Recon and reproduction

`DraftBoard.module.css:4` places the mobile pitch before the side containing the wheel. `DraftBoard.tsx:120-160` already exposes the authoritative `rollId` and choosing phase but has no corresponding viewport movement. `Pitch.module.css:83-85` adds a dashed empty-card border and `DraftBoard.module.css:220-223` adds a second dashed armed outline.

Parent production-browser reproduction at 390x844 showed round 1's wheel at y1268 with height78. Placing a candidate in attacker slot `s9` left round 2's wheel at y1268 and scrollY0. An armed empty slot had both a dashed border and a dashed 2px outline. The phone draft field's CSS height was740px. Receipt is `output/mobile-draft-flow/baseline-repro.json`.

## Chosen fix

Use the existing run/phase/roll identity and a local element reference for presentation-only scrolling. Bring a new active roll into the phone viewport on initial draft mount and after placement/reroll. Do not restart scrolling on candidate selection, manual swipes, swaps, reveals or drawer toggles. Position First still chooses a slot before a roll; the start lobby still requires Start run. Reduced motion must avoid a smooth-scroll animation.

Trial a620px draft-only phone field while retaining every starter, existing formation coordinates, readable text and44px targets. The exact size is subject to all-formation browser verification. Keep the builder field unchanged. Replace stacked empty/armed position frames with one solid frame using existing contrast-tested tokens; retain keyboard focus and drop/swap feedback.

## Throughput checkpoint

- Blocking first steps completed. Inspect source, reproduce in a browser and freeze protected files.
- Independent workstreams are not useful. Scrolling, card spacing and placement interaction share the draft screen.
- Shared writes are separated. One child owns runtime/tests, parent owns decision log, state row, review and release.
- Smallest safe decomposition is one implementation owner for the three presentation files, then independent parent verification and GLM review.

Architect exploration is skipped because the dispatch fixes the design. Cursor-only tools are not installed. Model the Domain keeps existing `Run`/`rollId` authoritative instead of adding a new draft state; Prove It Works requires actual viewport and hitbox measurements.

## Picker overlap refinement

Paulo's actual iPhone screenshot shows the fixed candidate drawer covering bench cards, a nested picker scrollbar and the fixed reroll row crowding the candidate bottoms. The screenshot also shows challenge ratings enabled and the artwork pack, so default ratings-off pixel sprites are not enough proof.

Keep this in the same coupled draft-screen change. On phones, use a compact in-flow candidate panel with rerolls directly underneath. Remove nested vertical and horizontal picker scrolling; let large Open-mode candidate pools use document scrolling without truncating valid candidates. Retain type badges, complete actual rating text, artwork selection, 11px text and44px targets. Keep the existing choose/minimize behavior where useful, but no floating overlap with bench or controls. Verify ratings-on artwork views and actual card/reroll bounds at375/390px.

## Verified source acceptance

The implementation uses one wheel reference and the existing `rollId`/choosing phase to scroll once per active phone roll. Scrolling is immediate and does not change focus. Candidate selection, manual swipes, picker toggles, swaps and completed drafts do not trigger another wheel scroll. The phone draft field is620px; the builder remains740px. Empty and armed positions have one solid frame, with distinct keyboard focus preserved.

The phone picker and rerolls are in normal page flow. Classic cards fit in a compact three-column grid; Open candidates wrap without truncation or nested scrolling. Parent screenshot inspection confirmed artwork-plus-ratings text and separation from the bench and reroll controls.

Review 1 (GLM 5.3 Flash on bd67789) requested changes on B1 (committed-slot highlight cue was indistinguishable from empty slots when both used solid frames). Resolved by styling `.token[data-highlight]` with `outline: 3px solid var(--stadium-ring); outline-offset: 2px;`, making committed slots distinctly outlined while maintaining the single solid border on empty/uncommitted slots. Reset `scrolledRoll.current = null` on seed change or restart in `DraftBoard.tsx`. Guarded in `e2e/draft-flow.spec.ts`.

RED commit `258985928bfb93b79a0147b8011fab02fad1e9fb` precedes fix `28c410cc9908a6c74f4ecc0923ad1cb59371a93f`. Parent lint, typecheck,864 units in93 files, production build, theme/color/CVD/image/bundle/mirror gates passed. Parent full Playwright run passed683 cases with55 conditional skips and zero failures; twelve new Chromium/WebKit guards cover375/390px, full drafting, once-per-roll scrolling, rerolls, Position First, all eight formations and solid frames. Protected167-file hash comparison passed.

The parent renamed the new guard to `e2e/draft-flow.spec.ts` and removed its import from Silph tests, making it a standalone normal-CI test. The worktree was moved to `pokedraft-mobile-flow` because the existing ignore regex also matches absolute directory names containing `mobile-draft`. No tracked Playwright config or screenshot baseline changed; parent verification used the canonical config rather than the child's temporary runner. Logs are under `output/mobile-draft-flow/logs/parent-*`.

## Not run

Exact-head independent review, remote CI, push, PR, merge and production verification remain pending. Physical-device Safari testing is not claimed. This lane does not alter the start-lobby contract, confirmation popup, settings, image packs, engine, scoring or seeded outcomes.
