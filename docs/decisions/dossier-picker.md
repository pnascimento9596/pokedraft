# Dossier and picker (Wave 4, row 4f)

Branch `feat/dossier-picker` off `origin/main` at `63462b3` (after rows 4-0, 4e, 4a and 4c), with
`origin/main` merged at `337f9df` (PR #117, row 4b) before the PR opened. Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are
untouched.

## Scope

- **Scout in Position First.** Each offer card gets a 44 px Scout icon button
  (`aria-label="Scout {name}"`, `data-testid="scout-{id}"`), only while a slot is committed. A tap
  on the card still signs the player.
- **Slot context.** The dossier opens with `slotContext = { slot, lineup, candidateLineup }`. The
  candidate lineup comes from `applyAction(state, { type: "pick", species, slot })`, the draft
  engine's own action. The dossier shows "In slot: GK. Goalkeeper, Poor fit." for any slot context
  (Position First and the builder Picker).
- **Prev and Next.** When the dossier shows one of the round's offers and the round has more than
  one, it shows Prev, "1 of 3", Next and, with ratings on, Compare. Arrow Left and Right step while
  focus is in the dossier. Steps wrap. A hidden live line reads "Basculin, offer 2 of 3".
- **Compare.** Draws every offer's radar on the current axes. Each polygon has its own dash pattern
  (solid, dashed, dotted, dash and dot, long dashed, short dashed) and colour, the current offer is
  thicker, and a legend names each with a sample line ("Dewott (solid)"). The SVG description lists
  every offer's values.
- **GK radar.** Axes DIV, REF, HAN, GKP, KIC, AER when the role in context is GK: the slot
  context's role, else the role of the slot the player is drafted in (new `lineup` prop), else
  `bestRoles[0]`. Otherwise PAC, SHO, PAS, DRI, DEF, PHY. The description names the axes shown.
- **Review changes.** With ratings on, the Scout Report shows each attribute the Layer 2 review
  adjusted as "TAK 35, review +3" (baseline, then the signed change), or "The review kept every
  attribute at its baseline." The rationale stays as it was.
- **Back.** Over the Picker the dossier pushes its own history entry and drops it on close; the
  Picker's `popstate` handler ignores a pop that lands on its own sheet entry. One Back closes the
  dossier, a second closes the Picker.
- **Builder two-tap swap.** Tap a filled token to select it (highlight, `aria-pressed`, and the
  hint "Tap another player to swap, or tap again to change"). Tap another slot to swap through the
  engine's `swap` action. Tap the selected token again to open the Picker. An empty slot with no
  selection opens the Picker at once. Escape clears the selection. A drag swap also clears it.
- **Search folding.** NFD, strip combining marks, lower case, drop anything not `[a-z0-9]`, on both
  the query and the names. The dex-number match is unchanged.
- **4e leftover.** The dossier's role grid renders the Best star as a separate `aria-hidden` glyph
  and its labels, and the mini pitch's, come from `SUITABILITY_LABEL`.

Files: `src/components/scouting/ScoutingDossier.tsx` and `.module.css`,
`src/components/run/DraftBoard.tsx` and `.module.css`, `src/components/builder/Builder.tsx` and
`.module.css`, `src/components/builder/Picker.tsx`, `src/components/results/ResultsView.tsx`.
Tests: `src/components/scouting/__tests__/ScoutingDossier.test.tsx`,
`src/components/builder/__tests__/Picker.test.tsx`, `Builder.test.tsx`,
`announce-builder.test.tsx`, new `src/components/run/__tests__/dossier-picker.test.tsx`, new
`e2e/dossier-picker.spec.ts`, updated `e2e/draft-safety.spec.ts`. Builder edits stay in the tap
logic, the hint line under the pitch and the dossier prop; the heading block is untouched (4b).

## RED commit and output (verbatim excerpt)

RED commit `7aa7519` (tests only). Unit: 19 of 23 new tests failed in 4 files; the 4 passes are
labelled regression guards (no offer tabs without offers, no card Scout in Squad First, "nidoran"
finds both Nidoran, "#025" finds Pikachu).

```
     × position-first Scout opens with slot context (shows In slot: GK, catches no Scout path in Position First) 1420ms
     × the Scout button keeps one-tap picking: a card tap still signs the player at GK 267ms
     × GK dossier shows DIV REF HAN GKP KIC AER (catches outfield axes on a goalkeeper slot) 60ms
     × GK dossier uses the goalkeeper axes for a player drafted in goal (catches outfield axes on a placed keeper) 41ms
     × GK dossier falls back to the best role, so Machamp (best GK) shows the keeper axes 17ms
     × dossier review shows TAK review +3 for Bulbasaur (catches the review adjustment hiding behind the final number) 20ms
     × dossier review says when the review changed nothing (Pikachu has no adjustments) 22ms
     × role fit Best keeps its star out of the accessible name (catches the inline ★ Best left by 4e) 17ms
     × Prev and Next cycle the round's offers with 1 of 3 (catches a dossier stuck on one offer) 22ms
     × Compare draws every offer on the same axes with distinct dash patterns and a named legend (catches colour-only compare) 108ms
     × hides Compare with ratings off but keeps Prev and Next (blind challenges hide the radar) 43ms
     × search flabebe finds pick-669 (catches accents and punctuation blocking a match) 76ms
     × search mr mime finds pick-122 (catches accents and punctuation blocking a match) 43ms
     × search farfetchd finds pick-83 (catches accents and punctuation blocking a match) 49ms
     × search flabebe finds Flabébé and nothing else 37ms
     × builder tap A then B swaps A and B (catches a tap on a filled token opening the Picker) 268ms
     × builder tap on the selected token again opens the Picker for that slot 195ms
     × builder Escape clears the selection, and an empty slot still opens the Picker at once 101ms
     × Back closes only the dossier over the Picker, and a second Back closes the Picker (catches one Back closing both) 290ms
 Test Files  4 failed (4)
      Tests  19 failed | 70 passed (89)
```

Failure reasons were the intended ones, for example
`AssertionError: expected [ 'PAC', 'SHO', 'PAS', 'DRI', …(2) ] to deeply equal [ 'DIV', 'REF', 'HAN', 'GKP', …(2) ]`,
`TestingLibraryElementError: Unable to find an accessible element with the role "dialog" and name "Pick for LCB"`
(one Back closed both) and `AssertionError: expected [] to include 'pick-669'`.

E2E: `e2e/dossier-picker.spec.ts` against a `next build` of the RED sources (the dossier unit test
file was set aside for that build only, because `next build` type-checks test files and the new
props did not exist yet), chromium, `CI=1 --retries 0`: 6 of 6 failed.

```
  ✘  1 [chromium] › e2e/dossier-picker.spec.ts:44:9 › at 320x568 › position-first Scout opens with slot context (shows In slot: GK) and the GK radar (5.7s)
  ✘  4 [chromium] › e2e/dossier-picker.spec.ts:44:9 › at 390x844 › position-first Scout opens with slot context (shows In slot: GK) and the GK radar (5.8s)
  ✘  3 [chromium] › e2e/dossier-picker.spec.ts:88:5 › Back closes only the dossier over the Picker, and a second Back closes the Picker (5.8s)
  ✘  2 [chromium] › e2e/dossier-picker.spec.ts:44:9 › at 360x800 › position-first Scout opens with slot context (shows In slot: GK) and the GK radar (5.8s)
  ✘  6 [chromium] › e2e/dossier-picker.spec.ts:131:5 › search flabebe finds Flabébé, mr mime finds Mr. Mime, farfetchd finds Farfetch'd (5.4s)
  ✘  5 [chromium] › e2e/dossier-picker.spec.ts:107:5 › builder tap A then B swaps A and B, and a second tap on A opens the Picker (5.7s)
  6 failed
```

GREEN commit `362539c`. Two RED assertions were corrected in it, both still failing at RED for
their first assertion: the star test asserted `textContent` lacked "★ Best", but an `aria-hidden`
glyph is still in `textContent`, so it now checks each hidden star's parent reads "★ Best"; the
position-first radar query now names the radar, because the dossier also holds the portrait image.

## Where the literals come from

- Offers: `mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=classic3&seed=cap-0`, GK slot,
  offers Dewott (#502), Basculin (#550), Tympole (#535), read from the engine once with a scratch
  probe that was deleted.
- Attributes: `src/data/scouting.json`. Bulbasaur `baseline.TAK` 35, `adjustments` `{"TAK": 3}`.
  Pikachu GK axes DIV 42, REF 68, HAN 16, GKP 36, KIC 40, AER 34. Machamp `bestRoles[0]` is GK.
  Dewott, Basculin and Tympole outfield values as in the Compare test.
- Names: Flabébé #669, Mr. Mime #122, Farfetch’d #83 (curly apostrophe), Nidoran♀ #29, Nidoran♂ #32.

## Product decisions applied

All from hand-off 4.3 "4f": Scout icon button only in Position First; slot context from the engine;
Prev, Next and "1 of 3"; Compare with dash patterns and a legend; GK axes rule; review numbers
from the shipped data only; the dossier's own history entry; builder two-tap swap mirroring the
draft board; search folding. Blind challenges: the review numbers and Compare follow the
dossier's existing `showRatings` gate (the radar is already hidden with ratings off); Prev, Next,
the slot line and its qualitative fit stay.

## Re-decided where code broke a premise

- **"place" is builder only.** The hand-off says the candidate lineup comes from "the draft
  engine's own place action". `place` throws `DraftError` outside builder mode
  (`requireBuilder`, `src/engine/draft.ts:333-334`). The draft's own placement is
  `pick` with the committed slot (`draft.ts:273-298`), so the dossier uses that. Same principle:
  never hand-build the lineup.
- **"for each radar attribute".** The guard is "TAK review +3 for Bulbasaur", but TAK is not a
  radar axis. Listing the baseline of all six axes would add six numbers that equal the final
  value for 773 of 1,025 species (no adjustments). Decided: list every adjusted attribute (any of
  the 17) as "TAK 35, review +3", and say so when nothing was adjusted. That is all the review
  information `scouting.json` holds, and it satisfies the guard literally.
- **Compare with many offers.** Open-style rolls offer every eligible species of a region and type
  (`candidatesFor`, `src/components/run/runState.ts:98-107`), sometimes more than six. Six dash
  patterns stay distinguishable; more do not. Decided: Compare shows for 2 to 6 offers; Prev and
  Next work for any count above one.

## Implementation decisions

- Offers are controlled by the caller (`offers = { ids, onShow }`), because the slot context
  depends on the species shown and the caller owns it.
- The dossier pushes a history entry only when asked (`historyEntry`, set by the Picker). Pushing
  it everywhere would interact with `router.replace` in `PlayScreen` and the builder's `?b=`
  writes for no gain the row asked for.
- The Picker check is `if (onSheetEntry()) return;` at the top of `onPop`: after the dossier's
  entry pops, the current entry is the sheet's own, which only happens for that case.
- StrictMode: the dossier pushes only when not already on its entry and never pops in effect
  cleanup, the same as the Picker, so a replayed effect does not double push or pop itself.
- Builder selection is derived (`picked` is null when the slot emptied or Randomize animates), so
  Clear all or a formation change cannot leave a stale selection.
- With a selection, tapping an empty slot moves the player there (an engine swap with an empty
  slot), like the draft board's tap swap and the builder's drag.
- The Scout icon sits in the card's top right corner as a sibling of the card button, so its
  pointer down never starts a candidate drag and its tap never signs.
- Spec and test churn, each changed to the new literal behaviour:
  - `ScoutingDossier.test.tsx` "dismisses only the dossier": `history.back` is now called once (the
    dossier's own entry), not zero times. The Picker still stays open and `onClose` is not called.
  - `Builder.test.tsx` `openPicker` taps a filled token twice; `announce-builder.test.tsx` "Clear
    slot gives focus back" taps ST Charmander twice.
  - `e2e/theme-type.spec.ts`, `builder-ratings-layout.spec.ts` (two tests) and
    `platform-experience.spec.ts` tap the filled slot twice; `swap-a11y.spec.ts` "the Picker gives
    focus back" presses Enter twice and checks the first selects; `mobile-acceptance.spec.ts` "after
    a touch drag, the next tap on a slot" now asserts the tap selects the slot (`aria-pressed`),
    which still catches a tap swallowed after a drag.
  - `e2e/draft-safety.spec.ts` keeps its Scout squad path and adds the offer Scout path: "2"
    signs nothing, Arrow Right moves to "2 of n", Escape closes, then "2" signs.

## Brief vs code

- Hand-off code map lines at `34af10e` had moved at `63462b3` (4c): `tapCandidate` is
  `DraftBoard.tsx:291-303`, the selection bar Scout `:806-813`, the dossier mount `:861-867`.
  Builder's dossier mount is `Builder.tsx:383-389` and the tap opener `:275`. Picker's history
  code `:90-119`, search `:136-146`, dossier mount `:496-508`. ScoutingDossier `RADAR_AXES`
  `:25-32` and the inline "★ Best" `:355`. Content matched the hand-off.
- `place` vs `pick`: see "Re-decided".
- The implementation brief's 4f row asks for "ability and move contributions shown as numbers
  from `attributeBreakdowns()`". The function does not exist and `scouting.json` holds no
  per-component breakdowns (hand-off 4.2 confirms). Not shipped; deferred as program data work
  (Red: `src/scouting` and `scripts/data`).
- "nidoran" already matched both Nidoran before the fix (`"nidoran♀".includes("nidoran")`), so
  that guard is labelled a regression guard.

## Gates

At `4114a63` (the merge of `337f9df`; the commits after it change only `e2e/theme-type.spec.ts`
and docs):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0.
  Prettier passed on the 23 files changed against `337f9df`.
- Unit tests: 1,749 passed in 203 files.
- Playwright (`CI=1`, headless, fresh build at `4114a63`), full suite: 940 passed, 63 skipped by
  their own project gates, 0 failed, 1 flaky. The flaky test was `theme-type` "1440 dark": my
  two-tap edit tapped the first slot before Randomize had filled it, so the first tap opened the
  Picker and the second hit the sheet (`<dialog open> intercepts pointer events`). It reproduced
  alone (2 of 12 failed with `--repeat-each 3`). `6b4530c` waits for the slot to fill and to be
  selected; then `theme-type` passed 20 of 20 with `--repeat-each 5`. `dossier-picker` 6 of 6.
- At `6b4530c`, `pnpm lint` exited 0, and `dossier-picker`, `draft-safety`, `live-team-score`,
  `swap-a11y`, `builder` and `keyboard` passed 42 of 42 (chromium), which also wrote the proof
  screenshots.
- Before the merge, at `362539c` (GREEN): 1,743 unit tests in 202 files; full Playwright 925
  passed, 63 skipped, 10 failed, all in the five builder specs that tapped a filled token once to
  open the Picker. `80c33d8` changed them to the two-tap flow: those five specs then passed 303 of
  303 across their projects.

## Browser proof

`docs/reports/dossier-picker/` (chromium, touch emulation, dark theme, ratings on):
`offers-scout-{390,360,320}.png` (Scout icons on the offers), `dossier-gk-{390,360,320}.png`
(slot line, "1 of 3", GK radar), `dossier-compare-{390,360,320}.png` (Compare legend with sample
lines), `builder-selected-390.png` (selected token and the hint).

## Measurements

- Scout button box at 320, 360 and 390: at least 44 by 44 (asserted in the e2e spec).
- No horizontal overflow at 320, 360 and 390 with the offers open (asserted).

## NOT RUN

- Review (coordinator runs GLM) and hosted CI.
- Physical phone check and a real screen reader pass (owner actions), including the dossier
  offer tabs.
- WebKit and the phone projects for the new spec (it runs in the `chromium` project with touch
  emulation; `mobile-*` specs ran on their phone projects in the full suite).
- A full Playwright rerun at `6b4530c`; only the specs listed under Gates ran there.

## Process note

While stopping my own Playwright run before the merge, I ran `pkill -f "next start --port"` for my
user. That pattern also matches a `next start` server of any sibling worktree. I did not check
whether one was running at that moment. If a sibling row saw its local server die around
13:36 local time, this was the cause.

## Carryovers

- Ability and move contributions in the dossier: deferred to program data work (needs breakdowns
  in `scouting.json`, a Red change). Not a Wave 4 carryover.
