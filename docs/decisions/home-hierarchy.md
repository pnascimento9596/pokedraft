# Home hierarchy (Wave 4, row 4b)

Branch `feat/home-hierarchy` off `origin/main` at `fb03b7a`, with `origin/main` merged at `63462b3`
(PR #116) in merge commit `b9e8225`. Yellow. No file under `src/engine`, `src/data` or
`src/scouting` changed, so the goldens are untouched.

## Scope

The hand-off's 4b decisions, applied as written except where "Brief vs code" says otherwise.

- The home page opens on an h1, "Draft a Pokémon XI and win the cup.", with the sub "Spin for
  players, fill a formation, then play the cup."
- Under it sit three cards: "8-0 Challenge", "151 Challenge" and "Daily". Each has an h2, one rule
  line and its Play control. The 8-0 card also says "Draft style: Open" or "Draft style: Classic".
  The Daily card shows the date `/daily` plays and links to `/daily` ("Play Daily").
- The ratings hint and the Matchday selector stay with the cards, in the same region.
- Settings and records start collapsed below 1024px and open at 1024px and up. One toggle controls
  them. "Challenge Hub" is gone. Setup, Rules and Your records are h3s under the settings h2.
- The builder is an h2 "Friendly builder" with the sub "Build your XI, then play a Friendly cup."
  Its header shows "4% chemistry" beside the fill count.
- The card grid is two columns from 380px to 1023px (Daily spans both) and one column below 380px
  and in the 320px desktop column.

Files:

- `src/components/home/SidePanel.tsx` returns two siblings. The first is the hero section,
  labelled by the h1, with the cards, the hint and `MatchdaySettings`. The second is the
  `Control desk` aside, with the toggle and the `#settings` region. `open` is
  `boolean | null`; `null` means unset, and the region then has no `data-open`. The
  `filled` and `chemistry` props are gone. `DailyCard` reads the date after mount.
- `src/components/home/SidePanel.module.css`: hero, card grid and card styles. The hub rules, the
  grid-row ordering, `.ctas`, `.challengeGroup` and `.bannerTitle` are deleted. Below 1024px the
  region hides unless `data-open="true"`.
- `src/components/home/HomeScreen.tsx` and its CSS: no chemistry prop. At 1024px and up the hero
  and the aside fill column 1 and the builder spans both rows of column 2.
- `src/components/builder/Builder.tsx` and its CSS: the h2 title and sub, and the chemistry line,
  computed from the `rateTeam` or `ratePartialLineup` result the builder already holds.
- `src/components/ui/primitives.tsx`: `ModuleCard`'s `eyebrow` is optional. The builder had used
  "Friendly builder" as its eyebrow, which is now its title.
- `src/ui/labels.ts`: `DAILY_RULE`, the start card's Daily sentence, now shared by
  `PlayScreen.tsx` and the Daily card.
- Tests: new `src/components/home/__tests__/home-hierarchy.test.tsx` and
  `e2e/home-hierarchy.spec.ts`. `PlayCard.test.tsx` and `SidePanel.test.tsx` read the hero region
  instead of the "Play" region or the aside, and the toggle tests start from unset. The "Trainer
  Dugout" test is deleted; the new guard asserts the eyebrow is gone.
- e2e: `openHomeSettings()` in `e2e/helpers.ts` taps the toggle until Formation shows. It is used
  by `one-tap-play`, `silph-stadium` and the "home settings open" scene in `e2e/mobile/scenes.ts`.
  `one-tap-play`, `quick-not-broadcast`, `data-split` and `mobile-acceptance` read the new region
  and headings.

## RED commit and output (verbatim excerpts)

RED `a6f9b9a`. Unit: 8 of 8 failed in 1 file. GREEN `f3b9b40`.

```
     × lists the game pitch h1 first, then the cards, the settings and the friendly builder 63ms
     × gives the h1 its one-line sub and drops the Trainer Dugout eyebrow 36ms
     × puts one rule line and the Play button on each challenge card 97ms
     × shows the New York date /daily plays at 03:30 UTC on 20 October, and links to /daily 45ms
     × leaves the date out of the server HTML, so hydration cannot disagree 8ms
     × has exactly one button pointing at the settings region, and no Challenge Hub 5ms
     × renders the toggle collapsed and the region without data-open in the server HTML 3ms
     × shows 4% chemistry for Bulbasaur and Ivysaur side by side in the builder header 10033ms
AssertionError: expected [ 'H2 Play', …(5) ] to deeply equal [ …(9) ]
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "8-0 Challenge"
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "Daily"
AssertionError: expected '<aside class="panel" aria-label="Cont…' to contain 'Play Daily'
AssertionError: expected [ 'Challenge Hub', …(1) ] to deeply equal [ 'Settings and records' ]
AssertionError: expected '<aside class="panel" aria-label="Cont…' to contain 'aria-expanded="false"'
AssertionError: expected '2/16Fill all 16 to see your Team Score' to contain '4% chemistry'
 Test Files  1 failed (1)
      Tests  8 failed (8)
```

The same commit's `e2e/home-hierarchy.spec.ts` against a build of `a6f9b9a` (`CI=1`, chromium,
no retries): 6 failed, 0 passed.

```
  ✘  2 [chromium] › e2e/home-hierarchy.spec.ts:50:5 › settings collapsed at 390, open at 1280 (5.4s)
  ✘  1 [chromium] › e2e/home-hierarchy.spec.ts:75:5 › Daily card date equals /daily's date (5.4s)
  ✘  3 [chromium] › e2e/home-hierarchy.spec.ts:68:5 › one control for the settings region (5.4s)
  ✘  4 [chromium] › e2e/home-hierarchy.spec.ts:28:5 › home heading order is h1 then h2s in the served page (5.4s)
  ✘  5 [chromium] › e2e/home-hierarchy.spec.ts:93:5 › CTAs one column at 360, two at 390 (262ms)
  ✘  6 [chromium] › e2e/home-hierarchy.spec.ts:107:5 › home fits 390, 360, 320 and 1280 with no side scroll (5.2s)
    Expected: "Draft a Pokémon XI and win the cup."
    Received: "Build your XI"
    Expected: "Monday, October 19, 2026"
    Expected length: 3
    Received length: 0
  6 failed
```

The 4% literal was read once from `ratePartialLineup` for Bulbasaur in `s0` and Ivysaur in `s1` of
a gen 1 4-3-3 (synergy 0.0379). The old hub showed the same number as "4% Chem".

One spec bug was fixed after RED: the toggle locator `/Settings and records/` missed "Hide
settings and records" (lower-case s). It is now `/settings and records/i`.

## Found during GREEN: a store read during hydration dropped an early formation pick

The first GREEN build failed `one-tap-play`'s "a formation picked as the home page loads on a
slow device reaches /play" at 1280 (2 of 2, with retry):
`Expected pattern: /[?&]f=4-4-2&/ Received string: ".../play?mode=cup8&f=4-3-3&..."`.

- `origin/main` (`fb03b7a`, built in a scratch worktree, 8x CPU throttle) passed the same steps
  3 of 3 at 1280 and 3 of 3 at 390. So this row caused it.
- On this row's build, `inputValue()` read `4-3-3` straight after `selectOption("4-4-2")`.
- With `useToday()` swapped for a constant `null`, the race passed 2 of 2.
- Cause: `useToday` is `useSyncExternalStore` with a `null` server snapshot and a date client
  snapshot. The snapshot change during hydration re-rendered home before hydration finished, and
  the re-render reset the select that the player had changed before hydration.
- Fix: `DailyCard` sets the date in a mount effect with `dailyDate(new Date())`, the function
  `useToday` and `/daily` use. `useToday` is unchanged. The test now runs at 1280, because below
  1024px the settings start collapsed and opening them waits for hydration.

## Product decisions applied

- Hand-off 4b, h1, cards, builder h2, one toggle, collapse below 1024px, CTA grid below 380px,
  heading order, "Trainer Dugout" removed.
- Hub line: the 8-0 card shows the draft style. The builder's fill and chemistry sit in its header.
  The 151 card shows no style, because `playTarget` drops style for the 151.
- Decision 3 (blind challenges): no new number appears on a challenge surface. The chemistry
  percentage is builder-only and already showed in the hub regardless of ratings.
- Decision 11 (4a): the Matchday selector stays in the same region as the Play buttons.

## Implementation decisions

- One state for the settings, three values. `null` lets CSS decide by width, so the server HTML
  and the first client render agree and nothing flashes. The toggle reads `aria-expanded="false"`
  while unset. It shows only below 1024px, where unset means collapsed.
- The hero sits before the aside in the DOM, so the h1 comes first, and the h1 is not inside the
  `complementary` landmark. At 1024px and up the grid keeps the 320px left column for the hero and
  the settings, and the builder spans column 2, so the pitch stays above the fold.
- `ModuleCard` gets an optional eyebrow rather than a second card component for the builder.
- The Daily card reserves its date line with a no-break space, so the date appearing after mount
  does not move the button.
- Chemistry shows only once a player is placed, so an empty builder does not read "0% chemistry".

## Brief vs code

- The h1 sub. The hand-off's line ends "then play a knockout cup". How to play says the cup opens
  with 3 group games. Re-decided on the hand-off's own principle (state the loop in game terms,
  invent nothing): "then play the cup."
- Daily rule line. How to play has no Daily section yet (4g adds one). The card uses the `/daily`
  start card's own sentence, now the shared `DAILY_RULE`, instead of new copy.
- The 8-0 rule line trims How to play's first 8-0 sentences: "Each round rolls a region and a type.
  Draft one Pokémon that matches both." The 151 line is How to play's text word for word.
- The Daily date basis is New York (`DAILY_TIME_ZONE`), not the device's local date. It still
  renders client-side only, as the hand-off asks for a local basis, because a prerendered page
  must not bake in a date.
- `theme-type.spec.ts:42` clicks "Challenge Hub" on the draft board (`DraftBoard.tsx:502`), not on
  home. It is unaffected and unchanged. The draft board's own hub stays for 4g.
- `draft-safety.spec.ts`'s sticky test reads the aside's next sibling. That is still the builder,
  and the test passes.
- Code map lines from `34af10e` had drifted after 4a. `SidePanel.tsx` at `fb03b7a` had
  `useState(true)` at :96, the hub at :139-153 and the second toggle at :193-201.

## Measurements

Not taken beyond the proof screenshots and the e2e bounds: no side scroll at 390, 360, 320 and 1280,
and every Play control at least 44px tall at those widths.

## Gates

At `b9e8225`, the merge of `origin/main` at `63462b3` (PR #116). The merge had no conflicts.

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,726 passed in 202 files.
- All eight `check:*` scripts exited 0 (`mirrors`, `image-seam`, `image-packs`, `client-bundle`,
  `theme-contrast`, `theme-colors`, `dashes`, `theme-cvd`).
- Prettier passed on the 26 code files changed since `fb03b7a`, which include #116's.
- Playwright full suite (`CI=1`, headless, fresh build at `b9e8225`): 935 passed, 63 skipped, 0
  failed, 0 retries. `home-hierarchy` passed 6 of 6.

The first full run, at `f3b9b40`'s code before the merge and before the scene and Silph Stadium
updates, had 912 passed and 12 failed. The 12 failures were "home settings open" in
`mobile-acceptance` and `mobile-targets` on the phone projects, plus `silph-stadium` at 375 and 390.
All of them picked a formation from settings that now start collapsed. After `openHomeSettings()`,
those three specs passed 369 of 369 on the same build.

Proof PNGs rewritten by the suite were reverted, except this row's four and the four home shots
that show the new layout: `one-tap-play/{320,360,390}-play-card.png` and
`quick-not-broadcast/390-home-manager-plays-live.png`.

## NOT RUN

- Review (the coordinator runs GLM) and hosted CI.
- A physical phone check and a real screen reader pass (owner actions).
- Home first-load JS and CLS before and after.

## Carryovers

- 4h2 moves the two-column breakpoint to 960. The collapse rule, the card grid rule and the home
  grid all read 1024 today and move with it.
- 4g: How to play gains a Daily section. The Daily card's rule line can then come from it.
