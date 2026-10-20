# Results reveal and sync (Wave 5, row 5e)

Branch `feat/results-reveal` off `origin/main` at `9f01b8c` (PR #132, which ships 5b's `versus`
slot). Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are
untouched.

## Scope

- **Staged hero, live results, first view only.** The first time a run's live results mount in a
  tab, the hero plays a CSS sequence: the Team Score counts up from 0 over 900 ms, the W-D-L record
  flips in over 300 ms, the trophy and the gold flawless mark pop in over 300 ms, and the MVP card
  rises in over 300 ms (1,800 ms in all). A shared `/r` page, a revisit in the same tab and reduced
  motion show the final hero at once.
- **Trophy.** `src/components/results/Trophy.tsx` is a small inline SVG beside the finish label
  when `cup.finish === "champion"`. It is `aria-hidden`, because the label already says Champions.
- **Gold.** `--gold-bg`, `--gold-ink` and `--gold-edge` in `src/design/tokens.css` for both themes.
  The flawless mark moves from the ok tokens to the gold ones and gains a gold edge. The trophy is
  `--gold-edge`.
- **MVP card.** A hero card for `cup.awards.playerOfTournament` through `PlayerImage`, with the
  name and, when `potContribution` is non-null, the breakdown (`data-testid="pot-contribution"`).
  A retained-engine run shows the name only. The "Player of the tournament" award tile is gone, so
  the Awards module shows Golden Boot and Top assister.
- **Star badge tap.** It sets the highlights selection as before, then scrolls
  `highlights-stage` into view with `{ block: "nearest" }` (`behavior: "smooth"`, or `"auto"` under
  reduced motion) and focuses the star's name heading with `preventScroll`. A chip tap inside the
  highlights does not scroll.
- **Watch live close.** The `ExhibitionMatchModal.tsx:178-189` pattern. Opening Watch live
  records `document.activeElement` and `scrollY`. Closing focuses that opener with `preventScroll`
  and restores `scrollY`. A replay opened by a goal link has no opener, so its close focuses that
  match's Watch live button.
- **Headings.** The highlights get a visible h2 "Highlights". "Silph Stadium Highlights" stays as
  a small label under it. `star-name` is an h3.

Files: `src/components/results/{ResultsView.tsx,ResultsView.module.css,MatchHighlights.tsx,
MatchHighlights.module.css,Trophy.tsx}`, `src/ui/reveal.ts`,
`src/components/wheel/useReducedMotion.ts`, `src/design/tokens.css`,
`scripts/audit/theme-contrast.mts`. Tests: `src/components/results/__tests__/ResultsView.test.tsx`,
`e2e/results-reveal.spec.ts`.

## RED commit and output (verbatim excerpts)

RED `e2ce665`, tests only. `pnpm vitest run src/components/results/__tests__/ResultsView.test.tsx`:
7 of 36 tests failed.

```
     × stages the hero reveal on the first live view of a run only (catches the count-up replaying on a revisit) 39ms
     × puts a decorative trophy beside Champions and none on an eliminated run 32ms
     × shows the player of the tournament once, on a hero MVP card with the breakdown (catches the same fact on the card and an award tile) 31ms
     × an old-engine run's MVP card shows the name only, with no invented breakdown 29ms
     × a star badge tap scrolls the highlights stage into view and focuses its heading (catches a tap that changes a stage off screen) 44ms
     × a star badge tap jumps without smooth scrolling under reduced motion 37ms
     × the highlights have one visible h2 and the star's name is an h3 (catches a skipped heading level) 30ms
AssertionError: expected null to be 'staged' // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="results-trophy"]
TestingLibraryElementError: Unable to find an element by: [data-testid="results-mvp"]
AssertionError: expected [] to deeply equal [ [ { block: 'nearest', …(1) } ] ]
AssertionError: expected [ 'Talonflame' ] to deeply equal [ 'Highlights' ]
      Tests  7 failed | 29 passed (36)
```

`e2e/results-reveal.spec.ts` against a build of `e2ce665` (`CI=1`, chromium, `--retries=0`):
5 of 7 failed.

```
  ✘  1 [chromium] › e2e/results-reveal.spec.ts:59:7 › staged reveal › the first live view counts the Team Score up from 0, and a reload shows the final hero at once (catches a reveal on every visit) (6.7s)
  ✘  4 [chromium] › e2e/results-reveal.spec.ts:110:7 › a flawless run's mark is gold in light (catches the mark left on the ok green) (5.9s)
  ✘  5 [chromium] › e2e/results-reveal.spec.ts:110:7 › a flawless run's mark is gold in dark (catches the mark left on the ok green) (5.3s)
  ✘  6 [chromium] › e2e/results-reveal.spec.ts:140:7 › Watch live focus › closing Watch live returns focus and scroll to the button that opened it (catches focus lost to the page top) (874ms)
  ✘  7 [chromium] › e2e/results-reveal.spec.ts:161:7 › Watch live focus › closing a goal link's replay focuses that match's Watch live button (570ms)
    Expected: "staged"
    Received: ""
    Error: element(s) not found
      - waiting for getByTestId('results-flawless')
    -   "round": "match-R32",
    -   "testid": "watch-live",
    +   "round": undefined,
    +   "testid": null,
    -   "round": "match-G1",
    -   "testid": "watch-live",
    +   "round": undefined,
    +   "testid": null,
  5 failed
  2 passed (8.1s)
```

Notes on the RED:

- The two gold cases failed at the missing `results-flawless` test id, before their colour
  assertion ran. GREEN adds the id and the colour assertion then passes, so the colour itself was
  first checked at GREEN.
- Four new cases passed at RED because nothing they forbid existed yet: "never stages the reveal on
  a shared run", "reduced motion renders no count-up overlay on a first live view" (unit and e2e),
  and "a shared run shows the final hero with no count-up" (e2e). "a highlights chip tap does not
  scroll the page" is labelled "regression guard, no RED: behaviour already correct".
- Two test fixes after RED, both to the test's own wrong assumption: the MVP case first asserted
  that "Zarude" is absent from the Awards module, but Zarude also wins an award there, so it now
  asserts the two remaining tile titles; the gold case first expected upper-case hex, and the
  browser reports custom property values in lower case.

GREEN `dbab0bf`: 36 of 36 pass in `ResultsView.test.tsx` and 13 of 13 in `results-reveal.spec.ts`.
`f13d897` adds a console-error watch to the live reveal case. `94fc71b` adds "the reveal shifts no
layout while it plays", labelled "regression guard, no RED: behaviour already correct" (it was
written after GREEN).

## Measurements

- **Contrast** (`pnpm check:theme-contrast`): `--gold-ink` on `--gold-bg` 9.80 in light and 10.79
  in dark (minimum 4.5); `--gold-edge` on `--surface` 4.78 in light and 5.24 in dark (minimum 3).
- **Reveal frames** at 390x844, dark, with every hero animation paused at a set time
  (`e2e/results-reveal.spec.ts`): at 0 ms the overlay shows `--n` 0 and the real Team Score's ink is
  `rgba(0, 0, 0, 0)`; at 600 ms the overlay reads 840 of 868 and the ink is still transparent; at
  2,000 ms the overlay is `visibility: hidden` and the ink is `rgb(244, 247, 250)`, the dark
  `--text`.
- **Layout shift.** The sum of `layout-shift` entries over a first live view, measured for 2.5 s
  after the reveal starts, is exactly 0 at 390x844 (chromium). The reveal moves only `transform`,
  `opacity`, `visibility` and an absolutely positioned overlay.
- **Layout.** `document.documentElement.scrollWidth` equals the viewport width at 390, 360 and
  320 px in both themes with the trophy, gold mark and MVP card showing.

## Gates

At `dbab0bf` (`f13d897` and `94fc71b` change only `e2e/results-reveal.spec.ts`): `pnpm lint`,
`pnpm typecheck` and `pnpm build` exited 0, and all nine `check:*` scripts exited 0
(`check:client-bundle`: "client bundle holds no retained engine bundle; server build holds 20 files
with it"). 1,873 unit tests passed in 221 files. Prettier passed on the 11 touched code and test
files.

Playwright (`CI=1`, headless, `--retries=0`, on a build of the `dbab0bf` code):

- `results-reveal` passed 14 of 14 at `94fc71b`.
- With `watch-live`, `theme-results` (axe heading order included), `layout-shift`,
  `highlights-honesty`, `results-interactions`, `head-to-head`, `share`, `share-sheet`,
  `challenge`, `run-persist`, `replay-deep-links`, `recorded-saves`, `a11y`, `contrast`,
  `lifetime-history`, `history-controls`, `old-links`, `server-html`, `platform-experience`,
  `draft-modes`, `one-tap-play`, `keyboard` and `resilience-a11y`: 187 passed and 5 skipped by their
  own project gates, at `dbab0bf`.
- The full suite once, with the specs of `f13d897`: 1,039 passed, 67 skipped by their own project
  gates, 0 failed, 0 flaky.

PNGs the other specs rewrote under `docs/reports` were reverted.

## Product decisions applied (hand-off 4.3, 5e)

- The reveal runs on `variant="live"` the first time a token's results mount, keyed
  `pokedraft:revealed:<token hash>` in sessionStorage behind try/catch (`readSession`,
  `writeSession`). Shared pages and revisits show the final state.
- CSS only: `@property --n` (integer) animated 0 to the score, shown by a `::after`
  `counter(n)` overlay. The real text node stays in `results-score` and `results-record`, and the
  score's text is `color: transparent` only while the overlay runs. The 32 px and 600 weight pins and
  `tabular-nums` hold.
- Reduced motion gets the final state and no overlay.
- Trophy beside the finish label for champions, `aria-hidden`, not the card's satori JSX.
- Gold tokens in both themes, ink on background at 4.5:1 or more; the flawless mark uses them.
- MVP card with the name and the breakdown when present, name only for retained engines, the
  award tile removed, `pot-contribution` kept.
- Star badge tap: `scrollIntoView({ block: "nearest" })`, smooth unless reduced motion, then the
  heading focused with `preventScroll`.
- Watch live close restores focus and `scrollY`; a deep link focuses the match's `watch-live`.
- One visible h2 "Highlights", the eyebrow kept as a label, `star-name` an h3.

## Implementation decisions

- **The reveal is decided once, at mount.** A `useState` initializer reads the reduced-motion
  preference and the session key; an effect writes the key. The initializer only reads, so React's
  development double call cannot claim the reveal and skip it. `variant="live"` mounts only in
  `LiveRun`, which `PlayScreen` loads with `import()` after hydration, so the storage read never
  meets a server render and cannot mismatch.
- **Two layers keep reduced motion overlay free.** JavaScript never sets `data-reveal` when the
  preference is on at mount, and a `prefers-reduced-motion` block sets the overlay's `content: none`
  and every reveal animation to `none` if the preference changes mid-reveal. The global reset only
  shortens durations, and the delayed `both` animations would otherwise hold elements hidden for up
  to 1.5 s.
- **The overlay hides itself with keyframes, not with state.** `inkHidden` and `overlayShown` hold
  their values for 900 ms with `step-end` and then fall back to the base styles (normal ink, hidden
  overlay). No timer or `animationend` handler re-renders the hero.
- **The record flips its own text.** A `rotateX` plus opacity animation on the real span, delayed
  900 ms with `both` fill. Only the score needs an overlay, because only it counts.
- **The key hash is `cyrb128` from `src/lib/rng.ts`**, the first 64 bits as 16 hex characters.
  The token itself would make a key several hundred characters long.
- **One reduced-motion read.** `prefersReducedMotion()` joins `useReducedMotion` in
  `src/components/wheel/useReducedMotion.ts`, and both the reveal and the stage scroll call it.
- **Star taps reach the highlights as a counter prop** (`focusStage`). MatchHighlights owns the
  stage and the heading, so it does the scroll and the focus; a counter lets a second tap on the
  same star scroll again, and chip taps inside the highlights leave it alone.
- **Watch live restores in a layout effect**, after the replay unmounts and before paint, so the
  page never shows a frame at the wrong scroll position. When the recorded opener is the body, gone
  or missing (WebKit does not focus a clicked button; a goal link has no opener), focus goes to the
  closed match's `watch-live` button, found by its `match-<round>` and `watch-live` test ids inside
  the results section. A goal link's close focuses without `preventScroll`, so the button scrolls
  into view.
- **The MVP card's label is a kicker, not a heading,** so the hero keeps one h1 and the page's
  heading order stays h1, h2, h3.
- **Award loses its `apps` stat and `contribution` prop**, which only the removed tile used.
- **Gold values.** Light uses `CARD_THEME` as is (`goldHi` #F4D77A background, `goldInk` #3A2A08
  ink, `goldEdge` #8F6414 edge). Dark keeps `goldHi` as the ink and `goldLo` #C28A22 as the edge on
  a new dark background #2E2410. `check:theme-contrast` gains both gold rows so a later edit cannot
  drop below the minimums.
- **The e2e enters live results from a saved checkpoint**, the way a reload does, instead of
  drafting 16 picks. The run is `botCup8Token("e2e-reveal-59")` from `scripts/audit/tokens.mts`
  (8-0-0, Champions, Team Score 868, Dragapult), found by replaying bot drafts on seeds
  `e2e-reveal-0` upward until a flawless champion with a breakdown came up.

## Brief vs code

- **Hero.** `ResultsView.tsx:109-150` at `9f01b8c`, not `:106-147`; 5b's `versus` slot sits at
  `:151`. The award tile was at `:263-269` and `Award` at `:390-433`.
- **Reduced-motion reset.** `globals.css:412-420`, not `:401-408`.
- **Exhibition focus pattern** at `ExhibitionMatchModal.tsx:178-189` matched.
- **`star-name`** was an h2 at `MatchHighlights.tsx:218`; the eyebrow was a span at `:133`.
- **Theme tokens.** `tokens.css` defines dark only under `:root[data-theme="dark"]`, and
  `palette-once.test.ts` forbids a `prefers-color-scheme` copy, so "both themes" means the `:root`
  block and the one dark block.
- **jsdom has no `scrollIntoView`.** Two existing `ResultsView.test.tsx` cases tap a star badge, so
  the file's `beforeEach` now installs a no-op. Spec churn, no test deleted.

## NOT RUN

- Review and hosted CI (the coordinator runs both).
- WebKit and a real phone for the reveal and the focus return (owner phone check).
- A screen reader pass over the MVP card, the highlights heading and the Watch live return (owner
  action).

## Carryovers

None folded into this row.
