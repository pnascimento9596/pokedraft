# Dark palette and breakpoints (Wave 4, row 4h2)

Branch `refactor/theme-breakpoints` off `origin/main` at `5c7d4fb` (every Wave 4 row except 4h2
and 4i). Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens
are untouched.

## Scope

- `src/design/tokens.css` keeps one `:root` block (light) and one `:root[data-theme="dark"]` block.
  The two `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` copies are deleted
  and the split `:root` blocks merge. The file header lists the breakpoint scale.
- `src/design/stadium.css`: `:root` holds the light values and `:root[data-theme="dark"]` the dark
  ones for the floodlight vignette (`--stadium-shell`), the glass panels (`--stadium-glass`), their
  edge (`--stadium-border`) and three new picker sheet tokens (`--sheet-fill`, `--sheet-ink`,
  `--sheet-muted`). The `[data-theme="light"]` block and its `prefers-color-scheme: light` copy are
  deleted.
- `src/components/run/DraftBoard.module.css`: the open picker (the phone sheet and the desktop
  modal), its toggle, kicker and drag handle read the `--sheet-*` tokens.
- Every `@media` width in `src` is on the scale 480, 720, 960 and 1200, written as
  `min-width: Npx` and `max-width: (N - 0.02)px`. 23 CSS files.
- `src/components/home/SidePanel.module.css`: the home cards stack by their own width, with an
  `auto-fit` grid, instead of `(max-width: 379px), (min-width: 1024px)`.
- `src/components/ThemeToggle.tsx` and `src/ui/theme.ts`: when the root layout renders on the
  client (the 404 for a share link that does not decode), the boot script's steps run on mount
  (`bootTheme`).
- `src/components/matchday/useCamera.ts`: the camera default reads `(min-width: 720px)`, with the
  touchline sheet it pairs with.
- `scripts/audit/breakpoint-lint.mjs` as `pnpm check:breakpoints`, with
  `scripts/audit/breakpoint-lint.test.ts`, in `package.json` and in `.github/workflows/ci.yml` after
  `check:dashes`.
- `scripts/audit/breakpoint-shots.mts`, the proof screenshot tool.
- `e2e/theme-breakpoints.spec.ts` and `src/design/__tests__/palette-once.test.ts`. The contrast
  test's "mirrors every explicit dark token under the system dark scheme" case is deleted: the
  copy it compared no longer exists, and `palette-once.test.ts` asserts the one-block shape and
  the resolved values instead.
- Comments that named the old widths (600, 420, 1024) now name the new ones.

## RED commit and output (verbatim excerpts)

RED `58cc2ae`. Tool `3b01a06`. GREEN `00ab013`. Second RED `8cce85c` (found by the full suite
at `00ab013`, below), fix `769b134`. `7e39085` swaps the card container query for a grid rule and
makes the CTA spec wait for the resized layout.

`pnpm vitest run scripts/audit/breakpoint-lint.test.ts src/design/__tests__/palette-once.test.ts src/app/__tests__/contrast.test.ts`
at `58cc2ae`, 5 of 57 failed in 2 of 3 files:

```
     × tokens.css holds one :root block, one dark block and no prefers-color-scheme copy 3ms
     × stadium.css holds no prefers-color-scheme copy either 2ms
     × the floodlight vignette is set only in the dark block 1ms
     × glass panels, their edge and the phone picker sheet take light values in light 0ms
     × finds no off-scale media query width in the repository's src today (43 queries before the scale move) 14ms
 Test Files  2 failed | 1 passed (3)
      Tests  5 failed | 52 passed (57)
```

`pnpm check:breakpoints` at `58cc2ae` exited 1:

```
app/globals.css:352: max-width 479px is off the scale
app/globals.css:494: max-width 480px is off the scale
...
components/wheel/Wheel.module.css:151: max-width 959px is off the scale
47 media query widths are off the scale. Use min-width 480, 720, 960, 1200px or max-width 479.98, 719.98, 959.98, 1199.98px.
```

`e2e/theme-breakpoints.spec.ts` (chromium, `CI=1`, against a build of `5c7d4fb`), 3 of 30 failed,
retries included:

```
  1) at 960px wide › home is two columns with settings open and does not overflow (catches the home split at 1024 instead of 960)
    Expected: 2
    Received: 1
  2) the two-column home fits the 320px panel and the builder at 960x800
    Expected: 2
    Received: 1
  3) phone picker sheet › the open picker follows the light theme (catches the night sheet on the light page)
    Expected: "rgb(248, 244, 235)"
    Received: "rgb(15, 23, 42)"
```

Second RED. The first full suite run at `00ab013` (`CI=1`, 991 passed, 4 failed, 1 flaky, 67
skipped) failed `a11y` "dark theme no axe violations on /r/garbage-not-a-token" and
`mobile-acceptance` "2 overflow: broken run link" on iphone-se, iphone-14 and pixel-7:

```
Locator:  locator('body')
Expected: "rgb(11, 18, 32)"
Received: "rgb(231, 234, 226)"

Expected: not "rgb(231, 234, 226) rgb(53, 59, 48)"
```

A share link that does not decode is rewritten to `/run-not-found`, which calls `notFound()`. Next
answers with an error shell (`<html id="__next_error__">`) and React renders the root layout on
the client, so the `<head>` boot script is inserted but never runs and `data-theme` stays unset.
The deleted `prefers-color-scheme` copies had hidden it under Auto; an explicit Night choice on a
light system was already light on this page at the base. `8cce85c` adds the guards: 2 of 5
`ThemeToggle.test.tsx` cases failed, and 2 of 2 new `theme-breakpoints.spec.ts` cases failed
against the `00ab013` build:

```
     × sets the theme when the boot script never ran, as on a page rendered on the client (catches the light 404 page on a dark phone) 5ms
     × applies a stored Day choice when the boot script never ran 3ms
      Tests  2 failed | 3 passed (5)

  ✘  a share link that does not decode › follows a stored Night choice on a light system
  ✘  a share link that does not decode › follows a dark system (catches the light 404 page, whose layout renders on the client without the boot script)
    Expected: "dark"
    Received: ""
```

The dark and light first paint cases passed at the base. They are labelled regression guards: the
4g boot script already set `data-theme` before paint, and the guard holds that true once the
system-scheme copies are gone.

## Measurements

Off-scale widths at the base: 47 widths in 43 queries (42 `@media` preludes in 23 CSS files and one
`matchMedia` string). Moves, by count:

| From | To | Count |
| --- | --- | --- |
| max 480 | max 479.98 | 10 |
| min 768 | min 720 | 7 |
| max 959 | max 959.98 | 6 |
| max 599.98 | max 719.98 | 3 |
| max 1023 | max 959.98 | 2 |
| min 1024 | min 960 | 2 |
| min 520 | min 480 | 2 |
| min 800 | min 960 | 2 |
| max 359, 359.98, 419.98, 479, 520 | max 479.98 | 1 each |
| max 599, 600, 640, 719 | max 719.98 | 1 each |
| min 600 | min 720 | 1 (CSS) plus 1 (`useCamera.ts`) |
| `(max-width: 379px), (min-width: 1024px)` | an `auto-fit` grid, no query | 1 |

Home card grid, measured with Chromium before and after (cards area width, columns): 320 one
column, 379 one (313px), 380 two (152px each), 390 two, 479 two, 959 two. At 960 the base showed
two columns 442px wide in the one-column home; after, one column of 286px in the desktop panel,
the same as the base showed at 1024 and up. The 379 to 380 switch is unchanged.

Two-column home: at 960x800 and 1024x768 the panel is 320px wide, every element in `main` ends
at or before the viewport's right edge, and the page does not scroll sideways (the e2e asserts all
three).

Screenshots (`breakpoint-shots.mts`, 4 scenes x 6 widths x 2 themes, 48 shots): every shot's
`scrollWidth` equals its viewport width. Pixel diff against the same shots of the base build
(`pixel-diff.mts`, home, draft and matchday; the base results shots were full page, so they are
not compared):

- Unchanged (0 pixels): every home and matchday shot at 320, 360, 390, 1280 in both themes,
  matchday at 960 in both themes, home at 720 light, and every dark draft shot except 720.
- Home at 720 dark: 1,685 pixels, largest channel change 1. The 768 to 720 rules change the page
  height, which redraws the vignette gradient one level apart.
- Home at 960, both themes: the two-column home (87% of pixels).
- Draft and matchday at 720, both themes: the 768 to 720 rules (header row, card padding).
- Draft in light at 320, 360, 390, 960 and 1280: the picker sheet turns cream and the glass
  panel edges turn from blue to the light emphasis edge. The masks show no other change.

## Product decisions applied

- Hand-off 4.3 4h2 decides: one dark palette, the vignette scoped to dark, the scale and its
  mapping table, the lint in CI, `@container` exempt, the home split at 960 proved at 960x800 and
  1024x768, the dark first paint e2e, the layout e2e at every scale edge and the full suite before
  review. Applied as written except where noted below.
- The two-column home holds at 960 (no overflow), so 1200 is not needed.
- Blind challenges (decision 3): no new number reaches the player.
- No copy changes.

## Re-decided, because the code broke the premise

- **Stadium card and ink.** The hand-off gives `--stadium-card`, `--stadium-ink` and
  `--stadium-border` light values or moves them to the dark block, after checking every consumer.
  The consumers of card and ink are the pitch frame and its tokens on the dark turf, the offer
  cards, the drag preview, the brand plate behind the yellow wordmark, the challenge cards' white
  text on the rainbow and the match highlights stage. Each is the night stadium, the same art
  direction the hand-off keeps for the broadcast. A light value would put dark ink on the rainbow
  and a cream plate behind the yellow wordmark. Decision: card and ink keep one value in both
  themes. The one consumer that is page chrome, the open picker (`DraftBoard` `.drawer` under
  `[data-drawer]`, with its toggle, kicker and drag handle), moves to new `--sheet-*` tokens that
  are cream with dark text in light and the old navy in dark. Proof:
  `docs/reports/theme-breakpoints/draft-390-light.png` and `draft-1280-light.png`.
- **Stadium border.** Every consumer borders a glass panel, which is already `--surface` in light.
  It gets a light value, `var(--border-emphasis)`, the light theme's emphasis edge.
- **The broadcast and the highlights stage keep one palette in both themes on purpose.** The
  broadcast's `--bc-*` grass and shade tokens already had one value, and the highlights stage is a
  dark panel in both themes. A lit stadium at night is the art direction. The 4h1 carryover asked to theme `--highlights-*` for light; they
  paint the highlights stage, a pitch with turf, so they stay one value. Proof:
  `docs/reports/theme-breakpoints/matchday-390-light.png`, `results-390-light.png`.
- **379px.** The 4b card rule `(max-width: 379px), (min-width: 1024px)` is not in the hand-off's
  table, and the nearest step, 480, would stack the cards on every phone. The rule's intent is
  "two cards fit side by side", which is a fact about the cards' width, not the viewport. The
  grid now says that once: `repeat(auto-fit, minmax(max(152px, calc(50% - 5px)), 1fr))`, two
  columns when each gets 152px and never more than two. That covers phones under 380px and the
  320px desktop panel, and the measured switch is unchanged. The first version was a container
  query on the hero; the grid rule needs no container and no query.
- **The CTA spec waits for layout.** `home-hierarchy` "CTAs one column at 360, two at 390" resizes
  and measures at once. Right after `setViewportSize`, Chromium has the new media state but the
  old layout widths for a frame (measured: `clientWidth` 390, `html` still 360 wide). The base
  passed because the media query flipped the columns on the stale width. Any rule that reads the
  cards' width sees the stale width, so the spec polls for the same literal, two distinct lefts.
  Measured against the grid rule's build, 20 repeats with one retry each: 6 passed, 5 passed on
  retry and 9 failed before the wait; 30 of 30 passed after it. With the container query the
  first full run saw it flaky once.
- **The theme on a client-rendered layout.** The hand-off's premise, "`data-theme` is always set
  before paint", fails on the 404 error shell. Same principle (one palette, `data-theme` decides):
  `ThemeToggle`, which is in the root layout on every page, runs the boot script's steps on mount
  when `data-theme` is unset, including the Auto listener. On that one page the first frame is
  light before hydration under a dark system; the page has no content before hydration either.
- **`matchMedia` widths.** The hand-off's lint covers `@media`. `useCamera.ts` reads
  `(min-width: 600px)` to pick Follow or Full, paired with the touchline sheet below 600px. The
  sheet moves to 720, so the camera moves with it, and the lint also checks quoted media queries
  in TS so the two cannot drift apart again.
- **Hard-coded gradients.** `MatchHighlights.module.css:7-11` already reads
  `--highlights-panel-*` (4h1) and `Broadcast.module.css:717` reads `--bc-shade`. Nothing to do.
- **The dark first paint pixel.** In dark the body paints the vignette over `--canvas`, so the
  first-frame pixel is a vignette colour, not `#0B1220`. The e2e asserts the pixel lies between
  the vignette's two stops (`#080d16` and `#111a2e`), and that the light first frame is exactly
  `--canvas` `#E7EAE2`.

## Implementation decisions

- **Merged values.** The second `:root` block set `--border-control: #7C856F`, overriding the
  first block's `#8E9684`; the merged block keeps `#7C856F`, so the resolved palette is unchanged.
  `palette-once.test.ts` pins the resolved values, and `check:theme-contrast` passes.
- **Light values as the default.** With `data-theme` always set before paint, a default in `:root`
  plus one dark override is the whole rule. Without JavaScript the page is light.
- **`max-width: N - 0.02`.** Matches the existing 599.98 and 419.98 style, and leaves no gap or
  overlap at fractional widths on zoomed or high-density screens.
- **The lint counts widths, not queries.** A list query with two off-scale widths reports both,
  on the `@media` line.
- **The leaderboard caption.** `(max-width: 359px)` reserved 126px for a three-line caption. It
  now applies below 480, so phones from 360 to 479 reserve 126px instead of the base height: more
  space, never a shift.
- **The tactic names.** `(max-width: 359.98px)` set 11px names in the dense touchline row; that now
  applies below 480.

Principles. Build the Lever: the lint enforces the scale in CI, and the shot tool is committed.
Encode Lessons in Structure: the scale lives in a check, and `matchMedia` strings are in it, so a
JS width cannot drift from its CSS pair. Model the Domain: the card rule reads the cards' width because that is its real
condition. Fix Root Causes: the light 404 is fixed where the theme is set, not by restoring the
media copies that hid it. Laziness Protocol: card and ink keep one value and
only the chrome consumer moved, instead of a light redesign of the stadium. Prove It Works: the
claims rest on the pixel diff, the 48 shots with their scroll widths, and the layout e2e.

## Tests changed by design

- `src/app/__tests__/contrast.test.ts`: the mirror test is deleted (above).
- `e2e/home-hierarchy.spec.ts`: the CTA test polls after the resize (above).
- `src/components/__tests__/ThemeToggle.test.tsx`: three new cases.
- `src/ui/matchday/__tests__/camera.test.ts` and `src/components/home/__tests__/home-hierarchy.test.tsx`:
  names only (600 to 720, 1024 to 960).

## Gates

At `7e39085` (the code head; the docs commit after it changes no runtime file):

- `pnpm lint`, `pnpm typecheck` and `pnpm build` exited 0.
- `pnpm test`: 1,802 passed in 213 files (1,799 at `00ab013`).
- All nine `check:*` scripts exited 0: mirrors, image-seam, image-packs, client-bundle,
  theme-contrast, theme-colors, dashes, breakpoints, theme-cvd.
- Prettier passed on every changed file Prettier formats (`src/design/tokens.css` is in
  `.prettierignore`).
- `e2e/theme-breakpoints.spec.ts`: 30 of 30 passed against a build of the GREEN tree, then 32 of
  32 with the two 404 cases.
- Full Playwright suite at `7e39085` (`CI=1`, headless, 4 workers, server built from that tree):
  998 passed, 67 skipped, 0 failed, 17.8m. No flaky test reported.
- Full Playwright suite at `00ab013`: 991 passed, 4 failed, 1 flaky, 67 skipped, 19.2m. The 4
  failures are the 404 theme bug above; the flaky test is the CTA column test, fixed in `7e39085`.
- `e2e/home-hierarchy.spec.ts` CTA test with the poll: 30 of 30 passed (`--repeat-each`).
- Proof shots retaken against the `7e39085` build: 48 shots, every `scrollWidth` equal to its
  width. Pixel diff against the `00ab013` shots: 46 of 48 identical; `matchday-1280-light` and
  `matchday-960-dark` differ by 4 pixels each in one 1x4 column (a frozen broadcast frame detail;
  no matchday file changed after `00ab013`).

## Brief vs code

- Brief: "the 11 ad-hoc values". Measured 47 off-scale widths in 43 queries: 19 distinct side and
  width pairs over 17 widths, counting `379px` from 4b and the `matchMedia` string.
- Hand-off table (from `34af10e`): no `379px` row, `max-width 1023px` 4 (now 2), and the
  `@container` list is 800, 820, 520, 540 and 300 (now 800 three times, 820, 520, 540 and 300).
- The hand-off places the hard-coded dark gradients at `MatchHighlights.module.css:7-11` and
  `Broadcast.module.css:717`. Both already read tokens.
- `stadium.css` also held a light `prefers-color-scheme` copy, which the hand-off did not list. It
  is deleted with the dark ones.

## NOT RUN

- Review and hosted CI.
- A physical phone check and a real screen reader pass (owner actions).
- WebKit and Firefox screenshots: the shot tool runs Chromium only. The full suite's WebKit
  projects ran.
- A pixel diff of the results page: the base shots were full page and the after shots are viewport
  captures. The results layout is covered by the layout e2e at every edge and the after shots.

## Carryovers

- 4i (built in parallel) adds safe-area padding and overscroll rules; it does not add `@media`
  widths, but any it adds must pass `check:breakpoints`.

Proof: `docs/reports/theme-breakpoints/` (home, draft, results and matchday at 320, 360, 390,
720, 960 and 1280 in light and dark).
