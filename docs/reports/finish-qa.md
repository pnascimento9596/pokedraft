# Finish QA checklist (dispatch 5 PR B)

Written before any fix. Each row is run on **production** (`https://pokedraft-woad.vercel.app`) and on a **local production build** (`pnpm build && pnpm start`). Results are filled in below the checklist as `PASS`, `FAIL (finding id)` or `NOT RUN (reason)`. Nothing is marked PASS without a command or screenshot behind it.

## Flows

| # | Flow | Pass condition |
|---|---|---|
| F1 | Home loads, nav links work (Daily, Leaderboard, How to play, History) | no console error, every link 200 |
| F2 | Builder: Randomize, Clear all, Reset, tap-to-place, drag swap | 16 slots fill, swap moves players, ratings stay hidden in challenge modes |
| F3 | Builder: Download image, Copy link | PNG is 1200x630 with every creature drawn, link replays |
| F4 | 8-0 Challenge Open: draft 16, results | wheel stops on each roll, results show a record and finish |
| F5 | 8-0 Challenge Classic: draft 16, results | same, Classic rules label |
| F6 | 151 Challenge: draft 16, results | species wheel, Kanto only |
| F7 | Reroll (type, region, species) | count drops, wheel replays once per reroll, never on a swap |
| F8 | Share link `/r/<token>` and the OG image | replays the same record, OG PNG 1200x630 |
| F9 | Garbage share link | friendly page, HTTP 404 |
| F10 | Daily run, submit, leaderboard row | rank shown, row appears, one submit per run |
| F11 | Leaderboard daily and all-time per mode | rows, no sideways scroll |
| F12 | History and local stats | entries render, bad saved data is dropped, not shown as NaN |
| F13 | Image style: switch pack, reload | choice persists, every picture follows, export follows |
| F14 | Friends gate (when `FRIENDS_PASSCODE` is set) | locked routes redirect, unlock works, throttled after 10 bad tries |

## Viewports

Every flow above that has UI is checked at 360, 390 and 430 px wide (and 1440 px for the desktop layout): no horizontal page scroll, tap targets at least 44 px where the control is a primary action, nothing clipped.

## Accessibility

- A1 Keyboard only: reach and operate every control; visible focus on each.
- A2 The wheel result is announced once, after the last wheel stops.
- A3 Every picture has an alt or a labelled blank fallback; decorative SVG is `aria-hidden`.
- A4 Color contrast of text on grass, chips and the footer meets WCAG AA (4.5:1 body, 3:1 large).
- A5 `prefers-reduced-motion` skips the spin and shows settled faces.
- A6 Landmarks: one `main`, labelled `nav`, `footer`; headings do not skip levels.
- A7 Forms (nickname, passcode) have labels and announce errors with `role="alert"`.

## Performance

- P1 Lighthouse mobile (default throttling) on `/`, `/play?mode=kanto151...`, `/leaderboard`: report measured Performance, Accessibility, Best Practices, SEO, LCP, CLS, TBT.
- P2 If LCP is over 2.5 s: name the LCP element and fix that contributor.
- P3 Layout shift when the display font loads (Big Shoulders metric fallback).

## Copy and chrome

- C1 No em dashes in any user-facing copy (source, rendered pages, OG and card text).
- C2 The fan-project disclaimer footer is on every route, including 404 and the gate.
- C3 When a pack is active, the footer credits that pack's author and license from `pack.json`.

## Data and ratings

- D1 Play 20 seeded drafts (fixed seeds, recorded) and log rating oddities in `docs/reports/finish-ratings-notes.md`. Do not retune anything.

## Dispatch 3 carryovers (each fixed with a test that fails first)

- K1 The wheel announces its result once.
- K2 New rolls key on round and reroll index; swapping a player mid-pick does not replay the wheel.
- K3 Saved stats are validated with Zod on read; bad entries are dropped.
- K4 The unused `challengeSettings` export is removed.
- K5 A font-metric fallback exists for Big Shoulders.

## PR A review warnings carried here

- W1 An end-to-end test for a missing id showing the blank fallback.
- W2 `preloadCreatures` is wired or deleted (no dead exports).
- W3 Hold the image seam to `PlayerImage.tsx` and `PlayerPicture.tsx`.

## Cleanup

- X1 Dead code and unused dependencies removed (checked by tool, not by eye).
- X2 README covers run, test, import a pack, deploy.

## Results

Run on 2026-10-10. "Local" is `pnpm build` then `next start` on this branch. "Production baseline" is `https://pokedraft-woad.vercel.app` at the PR A deploy (`32e966b`), run before this PR merges, so it shows what this PR fixes. The post-deploy production run is part of the live verification after merge and is not recorded in this file.

Tools: Playwright e2e (`pnpm test:e2e`, 23 tests), a throwaway Playwright viewport script (9 routes at 360, 390, 430 and 1440 px: horizontal overflow, footer text, pack credit, em dashes, console errors, axe-core with every rule on), `curl`, Lighthouse.

### Flows

| # | Local | Production baseline | Evidence |
|---|---|---|---|
| F1 | PASS | PASS | 9 routes, 4 widths, all 200 (404 on the two bad URLs, as designed); console clean except the expected 503 on `/leaderboard` locally (no database) |
| F2 | PASS (unit) | NOT RUN | `Builder.test.tsx` covers randomize, clear, tap-to-place and drag swap; no manual drag in a real browser this dispatch |
| F3 | PASS | NOT RUN | e2e `shareAndReplay` checks a 1200x630 PNG download and replay; `curl /card` returns 1200x630 for default, art pack and pixel pack with `mirror=0` |
| F4 | PASS | NOT RUN | e2e daily run (8-0 Open) drafts 16 and shows results |
| F5, F6 | PASS | NOT RUN | e2e: 8-0 Classic (seed `e2e-80`, record 2-1-1) and 151 Challenge (seed `e2e-151`, record 3-0-2) draft 16 and show results |
| F7 | PASS (unit) | NOT RUN | `runState.test.ts` and `announce.test.tsx`; see K2 for what that test did and did not prove |
| F8 | PASS | NOT RUN | `/r/<token>/opengraph-image` and `/card` are 1200x630 PNG; e2e replay gives the same record |
| F9 | PASS | PASS | e2e: friendly page, HTTP 404 |
| F10 | NOT RUN | NOT RUN | needs the database; e2e stubs the API. The live suite after deploy covers submit and the board row |
| F11 | PASS (layout, 503 state) | PASS (200, no console error) | no overflow at 4 widths; board rows from the real API are covered by the live suite after deploy |
| F12 | PASS (unit) | PASS (renders) | `runs-validation.test.ts`: a bad saved row is dropped, not shown as NaN |
| F13 | PASS | NOT RUN | e2e: switch pack, reload, choice persists; card follows the pack |
| F14 | PARTIAL | NOT RUN | with `FRIENDS_PASSCODE` set locally `/gate` and `/gate?next=/leaderboard` return 200 with the disclaimer and no em dash. Unlock and throttle were not exercised in this dispatch (dispatch 4 tests cover them) |

### Viewports

PASS at 360, 390, 430 and 1440 on all 9 routes: horizontal overflow 0 everywhere, local and production baseline. Tap-target size (44 px) was not measured.

### Accessibility

| # | Result | Evidence |
|---|---|---|
| A1 | PASS | Tab walk (30 stops on `/`, 8 on `/play`, 15 on `/how-to-play`, 14 on `/leaderboard`, 390 px): every stop is visible and has an outline or shadow ring. The only "no ring" report is the browser's own date-picker button inside the native date input, which is not a page control |
| A2 | PASS | `wheel-announce` holds one sentence (`Region: Galar. Type: Normal.`) after the wheel settles; unit test fails on the old code (K1) |
| A3 | PASS | axe `image-alt` and the labelled blank fallback; `PlayerImage.test.tsx` |
| A4 | PASS with a limit | axe `color-contrast` reports 0 violations on every route after the 404 fix. axe cannot evaluate text over gradients or images, so those spots are unverified |
| A5 | PASS | with reduced motion the 8-0 run shows candidates 1 ms after Start, versus 4808 ms with motion; both end on the same settled faces and the same announcement |
| A6 | PASS | one `main` and one `h1` per route after the fixes (see findings 1 and 2); axe `heading-order` is on in `e2e/a11y.spec.ts` |
| A7 | PARTIAL | axe `label` passes on all routes. `role="alert"` on submit and gate errors was not exercised in a browser |

`e2e/a11y.spec.ts` now runs axe (wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice, plus the experimental `label-content-name-mismatch`) on `/`, `/play` builder, `/how-to-play`, `/history`, a real `/r/<token>`, a bad token and a 404 URL, and expects no violations.

### Findings from QA and what happened to each

1. `/r/<token>` had no `h1` (axe `page-has-heading-one`). Fixed: the hero kicker is the `h1`.
2. `/r/<token>` pitch tokens failed `label-content-name-mismatch` x16: the button name was `Name, SLOT` while the visible text reads `SLOT` then `Name`, with no space between the two spans. Fixed in two steps: name is now `SLOT Name`, and the markup has a space so the visible text matches. The first step alone did not clear the rule; the second did. Four unit tests that named the old string were updated.
3. The default 404 page had no `main`, low-contrast default styling and 2 `region` findings. Fixed with `src/app/not-found.tsx` (a `main`, an `h1`, the site link style).
4. Every route had the footer disclaimer; the pack credit line was missing everywhere. Fixed (`PackCredit`, K-series test first).
5. Production `/play` and `/leaderboard` rendered their main content only after hydration, which put LCP on text that arrived late. Fixed by rendering both on the server (`await connection()` inside Suspense). Measured below.

### Performance (Lighthouse, mobile preset, simulated throttling, local production build)

| Route | Performance | LCP | CLS | TBT | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|---|---|
| `/` | 88 (3 identical runs) | 3.8 s | 0 to 0.028 | 70 to 150 ms | 100 | 100 | 63 |
| `/play?mode=kanto151...` | 96 | 2.6 s | 0 to 0.028 | 70 to 150 ms | 100 | 100 | 63 |
| `/leaderboard` | 96 (one run 83, LCP 4.4 s) | 2.6 s | 0 to 0.028 | 70 to 150 ms | 100 | 96 locally (the expected 503, no database) | 63 |

- Before the server-render fix (same build otherwise): `/` LCP 2.8 to 5.1 s, `/play` 2.9 s, `/leaderboard` 3.8 s. Production before this PR: `/` 2.5 to 3.7 s, `/play` 3.7 to 3.9 s, `/leaderboard` 3.7 s.
- SEO 63 is the `is-crawlable` audit failing, which is the intended `noindex`.
- Unthrottled LCP in a real browser was 36 to 65 ms on these routes. The numbers above are Lighthouse's simulated slow-4G/4x-CPU model, not what a phone on wifi sees.
- `/` stays at 3.8 s, which is over the 2.5 s target. Its LCP contributor is the 1.33 MB data chunk (`pokedex.json` plus `scouting.json`) that the builder needs before it can draw. Moving that to lazy loading changes engine data loading and is not a finish-pass change; recorded as a follow-up in `docs/decisions/dispatch-5.md`. `/play` and `/leaderboard` are at 2.6 s, still just over 2.5 s; one leaderboard run was worse (4.4 s), so that number is noisy.
- Tried and reverted because they did not help: `experimental.inlineCss`, `display: "optional"` for the display font.
- P3: a `Big Shoulders Fallback` `@font-face` with size-adjust and ascent/descent overrides is in `globals.css` (test first). CLS stayed at 0 to 0.028. Next.js still prints "Failed to find font override values for font `Big Shoulders`" at build time, with or without `adjustFontFallback: false`; the manual fallback is what does the work.
- Production numbers after this PR deploys: measured in the live verification, not here.

### Copy and chrome

| # | Result | Evidence |
|---|---|---|
| C1 | PASS | 0 em dashes in rendered text on all 9 routes at 4 widths, and in `/gate` HTML |
| C2 | PASS | footer disclaimer found on all 9 routes (incl. both 404s) and on `/gate` |
| C3 | PASS | `data-testid="pack-credit"` present on all 9 routes after hydration locally: `Creature art, <label> pack: <author>. License: <license>.`; unit test in `PackCredit.test.tsx`. It renders client-side, so it is not in the first HTML |

### Data and ratings

D1: 20 seeded drafts, 7 oddities logged in `docs/reports/finish-ratings-notes.md`. No retune.

### Dispatch 3 carryovers

| # | Result |
|---|---|
| K1 | Fixed. RED: the announcer spoke every stage line; GREEN: one sentence, after the last stop (`announce.test.tsx`) |
| K2 | The key is now `round:rerollsUsed` (`rollKey`). **No failing test could be written first:** the existing code already replayed only on a new roll and never on a swap, so `runState.test.ts` passed before the change. The tests are kept as guards, and this row is not claimed as a bug fix |
| K3 | Fixed with Zod (`RunRecordSchema`, `BucketStatsSchema`) in `loadHistory` and `loadStats`; RED test first (`runs-validation.test.ts`) |
| K4 | Removed `challengeSettings` (and the unused `ROLE_LABEL`); a test asserts the export is gone |
| K5 | Fixed, see P3 (`fonts.test.ts` first) |

### PR A review warnings

| # | Result |
|---|---|
| W1 | **NOT DONE as an end-to-end test.** Both packs cover 1025 of 1025 Dex ids, so no real route can render a missing id. The blank fallback for a missing id is covered by `PlayerImage.test.tsx`; the e2e image-error test covers the same blank footprint through a failing image |
| W2 | Done: `preloadCreatures` deleted |
| W3 | Held: `check:image-seam` allows only `PlayerImage.tsx` and `PlayerPicture.tsx` |

### Cleanup

| # | Result |
|---|---|
| X1 | knip 5: 0 unused dependencies. 37 exports are flagged unused by other files; every one is still referenced at least twice (in its own file or in tests), so none is dead and none was deleted. 5 files are flagged unused (`play-seeded.mts`, `win-curve.mts`, `review-packet.ts`, `validate-review.ts`, `import-pack.mjs`); they are command-line scripts run by hand. Removed by hand earlier in this PR: `preloadCreatures`, `challengeSettings`, `ROLE_LABEL` |
| X2 | `README.md` rewritten: run, env var names, test, import a pack, deploy |

### NOT RUN

- Browser drag-and-drop of tokens (F2) and manual reroll in the browser (F7).
- Daily submit and a real leaderboard row (F10): live suite after deploy.
- Gate unlock and throttle (F14), `role="alert"` errors (A7).
- 44 px tap-target measurement.
- Lighthouse on production for this PR (after deploy).
- A missing-id end-to-end test (W1).
