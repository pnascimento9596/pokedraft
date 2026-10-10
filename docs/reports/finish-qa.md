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

(Filled in as the checks run. See the sections below.)
