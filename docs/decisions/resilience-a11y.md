# Resilience, onboarding and a11y (Wave 4, row 4g)

Branch `feat/resilience-a11y` off `origin/main` at `da44d4b` (after rows 4-0, 4e, 4a, 4c, 4b, 4f
and 4d), with `origin/main` merged at `3d59cee` (PR #120, row 4j) in `69cc0b7`. Yellow. No file
under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- **Error pages.** `src/app/error.tsx` (client, inside the root layout): "Something went wrong."
  and "Your run is saved; reload to continue.", with Reload and Home. `src/app/global-error.tsx`
  renders its own `<html>` and `<body>` with inline styles only (the root layout's CSS never
  reached it), the same copy, Reload and a plain `<a href="/">`.
- **Skip link and main target.** "Skip to content" is the first focusable element. It is
  off-screen until focused and points at `<div id="content" tabIndex={-1}>` around the page.
- **Nav current page.** `NavLinks` (client) sets `aria-current="page"` on the matching link:
  `/` only on `/`, other links on their path and paths under it. The layout renders it inside
  `Suspense` with a server fallback of the same links and no current mark, because `usePathname`
  suspends while prerendering a route with unknown params (`/r/[token]`).
- **Theme.** `THEME_BOOT_SCRIPT` now always sets `data-theme` to the resolved theme, and owns the
  one `<meta name="theme-color">`, which it creates or updates. Under Auto it listens to the OS
  scheme and follows a switch while the page is open. `applyTheme` is the same steps for the
  toggle. The two media `themeColor` entries in the layout viewport are gone. `ThemeToggle` reads
  the stored choice through `useSyncExternalStore` (server snapshot Auto), not `<html>`.
- **Coach mark.** A one-line tip in the draft drawer (in the header while no drawer shows, that is
  Position First before the first slot), shown until the first pick or Got it. Key
  `pokedraft:coach:draft` in `localStorage`, an in-memory flag when storage throws. Got it moves
  focus to the round heading. The server render hides it.
- **Wheel skip focus (carryover W1).** `RollReveal` is a `group` named "Roll" with
  `tabIndex={-1}`. When a skip comes while focus is inside it (the Tap to skip button, which then
  unmounts), focus moves to the group instead of `<body>`. When the players show, `DraftBoard`
  moves focus from the wheel to the first candidate. A tap on the wheel with focus elsewhere
  leaves focus alone.
- **Pitch token names.** The name now comes from the card's own text: "LCB Bulbasaur", "Empty
  LCB slot". The fit ("Best fit", "OK fit", "Poor fit"), the rating note and the types are the
  description. `aria-label` and the long `aria-labelledby` are gone. Role, note, types and the
  empty prompt are `aria-hidden`; "Empty", "slot" and "fit" are visually hidden text.
- **Pictures beside a visible name** get `alt=""`: PitchCard, Picker, ScoutingDossier,
  DraftBoard (two), ResultsView, FitReveal (two), MatchHighlights and RecordedSaves (its caption
  names both players). Squad strips on the leaderboard and History, which show no names, now name
  each picture by species instead of "Squad species 807". `PlayerPicture`'s blank fallback is
  `aria-hidden` when its alt is empty.
- **Builder actions** is `role="group"`, not `toolbar` (it has no arrow-key navigation).
- **Picker rows** get spaces between name, number and types, so the row reads "Pikachu #025
  Electric" and not "Pikachu#025Electric".
- **Trainer Dugout.** The CSS `::before` label on the desktop hub is deleted.
- **How to play** gains Daily, Live match, Manager mode and Leaderboard sections, and the Team
  Score line says "on a scale from 0 to 1000". The Daily line is `DAILY_RULE`, which the home
  Daily card already uses, so they cannot drift apart.

Files: `src/app/{error,global-error}.tsx`, `src/app/layout.tsx`, `src/app/globals.css`,
`src/app/not-found.module.css`, `src/app/how-to-play/page.tsx`, `src/components/NavLinks.tsx`,
`src/components/ThemeToggle.tsx`, `src/ui/theme.ts`, `src/design/theme-color.ts`,
`src/ui/coach.ts`, `src/ui/labels.ts`, `src/components/run/DraftBoard.{tsx,module.css}`,
`src/components/wheel/RollReveal.tsx`, `src/components/pitch/{Pitch,PitchCard}.tsx`,
`src/components/PlayerPicture.tsx`, `src/components/builder/{Builder,Picker}.tsx`, the alt lines
listed above, `playwright.config.ts`, and `dom-accessibility-api@0.7.1` as a dev dependency.

## RED commit and output (verbatim excerpt)

RED `a8d94cf`: 30 of 122 unit tests failed in 11 files, and `error.test.tsx` failed to load.
GREEN `e0503e4`.

```
 ❯ src/app/__tests__/error.test.tsx (0 test)
 ❯ src/ui/__tests__/theme.test.ts (8 tests | 8 failed) 14ms
 ❯ src/components/__tests__/ThemeToggle.test.tsx (2 tests | 1 failed) 69ms
 ❯ src/app/how-to-play/__tests__/page.test.tsx (12 tests | 5 failed) 330ms
 ❯ src/components/wheel/__tests__/skip-focus.test.tsx (3 tests | 2 failed) 153ms
 ❯ src/components/history/__tests__/HistoryList.test.tsx (6 tests | 1 failed) 349ms
 ❯ src/components/pitch/__tests__/Pitch.test.tsx (12 tests | 2 failed) 470ms
 ❯ src/components/run/__tests__/coach-mark.test.tsx (4 tests | 3 failed) 861ms
 ❯ src/components/leaderboard/__tests__/Board.test.tsx (11 tests | 1 failed) 1175ms
 ❯ src/components/builder/__tests__/Picker.test.tsx (17 tests | 1 failed) 1479ms
 ❯ src/components/builder/__tests__/Builder.test.tsx (47 tests | 6 failed) 5627ms
 FAIL  src/app/__tests__/error.test.tsx [ src/app/__tests__/error.test.tsx ]
Error: Failed to resolve import "../global-error" from "src/app/__tests__/error.test.tsx". Does the file exist?

 Test Files  11 failed (11)
      Tests  30 failed | 92 passed (122)
```

The two error page tests were not collected at RED (the import does not resolve). They are
counted in neither number. Five Builder failures are the `toolbar` to `group` rename in existing
cases; the sixth is the new "no role toolbar" guard.

E2E against a build of the RED production sources: 10 of 25 failed. All six cases of the new
`e2e/resilience-a11y.spec.ts` failed (skip link not found, `aria-current` count 0, two
theme-color metas, coach mark not found, `::before` content `"Trainer Dugout"`, no Daily heading),
and the four new "focus after wheel skip is on a candidate" cases in `wheel-results.spec.ts`
(normal and fast, chromium and webkit) failed with the candidate inactive. The new
`server-html` case for `/r/<pinned token>` passed at RED, as labelled: a regression guard, no
RED. The RED build ran with `error.test.tsx` moved aside, because `next build` type-checks it and
it imports files that did not exist yet.

Regression guards with no RED: the coach mark "stays hidden when storage already holds the key",
the wheel "leaves focus alone when the skip came from a tap on the wheel", ThemeToggle's server
render of Auto, and the `/r` server HTML case.

## Spec churn (existing assertions changed, with the reason)

- Slot names were read with `getAttribute("aria-label")` in 5 unit files and 8 e2e files. They
  now read the computed accessible name: `computeAccessibleName` from `dom-accessibility-api` in
  unit tests, and a new `accessibleName(locator)` helper in `e2e/helpers.ts` that reads the ARIA
  snapshot, or `toHaveAccessibleName`. The literal names are unchanged ("ST Gulpin", "Empty LCB
  slot").
- `silph-stadium.test.tsx` asserted the old long labelledby name "LCB Bulbasaur DF LCB Bulbasaur
  Grass Poison"; it now asserts name "LCB Bulbasaur" and description "Grass Poison". The Pitch
  test that checked the labelledby ids now checks the visible slot text and the name.
- `copy-pass.spec.ts`: names match `/^Empty .+ slot$/` and descriptions `/^(Best|OK|Poor) fit$/`
  (was one aria-label with "(Best fit)"). The prompt text now includes the visually hidden "fit".
- `theme-choice.spec.ts`: Auto now sets `data-theme` to the OS scheme instead of removing it, and
  the spec follows it through the OS switch.
- `getByRole("toolbar")` became the group "Builder actions" in `Builder.test.tsx`,
  `data-split.spec.ts` and `run-persist.spec.ts`.
- `builder-ratings-layout.spec.ts` labels overlap reports by slot key instead of aria-label.
- No assertion was loosened. The coach mark is kept out of every other spec by seeding its key in
  `playwright.config.ts` `use.storageState`; `resilience-a11y.spec.ts` clears it to play a first
  visit.

## Product decisions applied

From hand-off 4.3, row 4g, and the W1 carryover:

- Error copy "Something went wrong." and "Your run is saved; reload to continue." It is true:
  every draft action, results and matchday checkpoint the run (`LiveRun.tsx` `writeRunCheckpoint`
  and `saveRun`), and the builder checkpoints through `HomeScreen.tsx`.
- Skip link, `aria-current`, one theme-color source, a coach mark that shows once, focus kept
  through a wheel skip at both speeds, How to play sections, the Team Score scale, the Trainer
  Dugout label removed, `alt=""` where a name is visible, and Builder actions as a group.
- Blind challenges: nothing in this row shows a number, so nothing new hides when ratings are off.

## Re-decisions (brief vs code)

- **Token name "{slot} {name}", not "{name}, {slot label}".** `a11y.spec.ts` runs axe with
  `label-content-name-mismatch` enabled, and WCAG 2.5.3 wants the visible text in the name. With
  any `aria-label` the rule compares it to all of the token's visible text (the role "DF" and the
  rating included), so a short `aria-label` fails it. Taking the name from content puts the rule
  out of scope and reads the slot then the player, as the card shows them.
- **The fit description leaves out the star.** Chrome reads `aria-hidden` text inside a
  described element, so describing the whole prompt read "★ Best fit". The description points at
  a span around the label only.
- **Coach copy per setting.** The brief's "Spin, pick one of three, place it" is false for the
  default draft (Open style shows every match, the wheel spins by itself, 151 rolls one player,
  Position First picks the slot first). The line is built from the draft settings:
  "Watch the spin, pick one that matches, place it on the pitch. Fill all 16 to play the cup."
  for Open, "pick one of three" for Classic, "take the Pokémon it rolls" for 151, and "Pick a
  slot, watch the spin, ..." for Position First.
- **Coach mark in the drawer.** The first 390 proof showed the tip in the header hidden under the
  open player drawer. It now renders at the top of the drawer while there is one.
- **Nav current.** `/play` is not marked as Play; only `/` is. Other links match their path and
  nested paths.
- **STATE paragraph.** The brief said to run `add-merged.py` with the #119 paragraph. #120 merged
  after the brief and its STATE already carries that paragraph at the end of Fast spins, so it was
  run with the #120 paragraph instead, which lands at the end of Pitch density and drag.
- Code map drift: Builder actions at `Builder.tsx:355` (map 304), DraftBoard alt lines 787 and
  958 (map 727 and 866), Trainer Dugout at `DraftBoard.module.css:254-257` (map 246-249),
  `RollReveal` mounted at about 656 (map 603).
- Row 4j's STATE says "the types stay in the token's accessible name". After this row they are
  its description: still read, after the name.

## Implementation decisions

- **Error page reloads, not retries.** A reload restores the checkpoint; `retry` re-renders the
  same client state that threw. Global error uses a plain link on purpose: the root layout that
  client navigation needs has just failed (lint suppression with that reason).
- **The boot script owns the meta.** Next's media `themeColor` entries cannot follow an explicit
  choice, so they are dropped and the script writes one meta. `theme.test.ts` runs the script
  string itself and holds `applyTheme` to the same results.
- **`useSyncExternalStore` for the toggle and the coach mark.** No effect-driven setState, no
  hydration mismatch, and the server snapshot is the safe default (Auto; tip hidden).
- **Coach key seeded in config.** One `storageState` in `playwright.config.ts` covers every
  fixture context. Specs that open their own `browser.newContext()` do not get it; they passed in
  the full run with the tip showing.
- **`dom-accessibility-api@0.7.1`** as a dev dependency, the library Testing Library uses, so
  unit tests read the computed name. 0.5.16 (already in the tree) has no typed `exports`.

## Measurements

None in this row beyond the gate counts. The species data chunk that the leaderboard and History
now import for picture names was already loaded on both pages before this row (checked at the
pre-fix build), so no new data ships there.

## Gates

At `43647ef`. The docs commit after it changes only `STATE.md`, this log and the proof PNGs.

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0. All eight `check:*` scripts exited 0.
  Prettier passed on the 63 text files changed against `origin/main` and this log.
- Unit tests: 1,779 passed in 210 files.
- Playwright (`CI=1`, headless, fresh build at `43647ef`), full suite: 965 passed, 67 skipped by
  their own project gates, 0 failed, 1 flaky (`mobile-acceptance` "7 landscape: draft 151 round
  1" on iphone-14: "Cannot find parent object browser", a harness error, passed on retry).
  `resilience-a11y`, `wheel-results` and `server-html` passed 25 of 25 alone. The run rewrote
  proof PNGs of earlier rows under `docs/reports`; those were reverted with `git checkout --`.
- Round 0, at `69cc0b7` (GREEN plus the merge of #120): same lint, typecheck, build, `check:*`
  and unit results (1,779 in 210 files). The full Playwright run there failed 160 tests: 150 phone target audits in
  `mobile-targets` and `mobile-acceptance` (three phone projects), which count the skip link
  (139x42, at rest off-screen) as a target under 44px; 3 "header menu open" tests, which found
  two "Leaderboard" links (the nav and the new How to play section chip); 3 `pitch-density-drag`
  cases expecting the types in the token name; and 4 `platform-experience` cases reading the old
  "Squad species N" alts. Fix `43647ef`: `min-height: 44px` on the skip link, and those specs follow this
  row's names. The four failed specs then passed 391 of 391 (54 skipped) before the full rerun.

## NOT RUN

- The error page screenshot, by design: no production route throws. The unit test renders both
  pages.
- Review and hosted CI.
- A physical phone check and a real screen reader pass (owner actions).

## Carryovers

- `Wheel.tsx:57` and `BossRoster.tsx:56` keep their picture alt text. BossRoster's tests find
  opponents by picture name; a follow-up can move them to visible text.
- `PlayerImage`'s blank fallback and `PlayerPicture` now agree on empty alt; any new caller that
  shows a name beside the picture should pass `alt=""`.
